const { initializeApp } = require("firebase-admin/app");
const { FieldValue, getFirestore } = require("firebase-admin/firestore");
const { HttpsError, onCall } = require("firebase-functions/v2/https");
const { randomBytes, scrypt, timingSafeEqual } = require("node:crypto");
const { promisify } = require("node:util");

initializeApp();

const db = getFirestore();
const scryptAsync = promisify(scrypt);
const FUNCTION_OPTIONS = {
  region: "us-central1",
  memory: "256MiB",
  timeoutSeconds: 30,
  maxInstances: 10,
};
const PIN_PATTERN = /^\d{6}$/;
const PIN_HASH_BYTES = 32;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 5 * 60 * 1000;
const SCRYPT_OPTIONS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

function getUid(request) {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Sign in to manage this device PIN.");
  }
  return request.auth.uid;
}

function getDeviceId(request) {
  const deviceId = request.data?.deviceId;
  if (typeof deviceId !== "string" || !/^[a-f0-9]{64}$/.test(deviceId)) {
    throw new HttpsError("invalid-argument", "This device could not be identified. Set up the PIN again.");
  }
  return deviceId;
}

function getPinReference(uid, deviceId) {
  return db.collection("users").doc(uid).collection("devicePins").doc(deviceId);
}

function validatePin(pin, label = "PIN") {
  if (typeof pin !== "string" || !PIN_PATTERN.test(pin)) {
    throw new HttpsError("invalid-argument", `${label} must contain exactly 6 digits.`);
  }
}

function validateNewPin(pin) {
  validatePin(pin, "New PIN");
  const predictablePins = new Set([
    "012345", "123456", "234567", "345678", "456789",
    "987654", "876543", "765432", "654321", "543210",
  ]);
  if (/^(\d)\1{5}$/.test(pin) || predictablePins.has(pin)) {
    throw new HttpsError("invalid-argument", "Choose a PIN that is not repeated or sequential digits.");
  }
}

async function derivePinHash(pin, salt) {
  return scryptAsync(pin, salt, PIN_HASH_BYTES, SCRYPT_OPTIONS);
}

function pinMatches(candidate, storedHash) {
  const expected = Buffer.from(storedHash, "base64");
  return expected.length === PIN_HASH_BYTES && timingSafeEqual(candidate, expected);
}

function applyFailedAttempt(transaction, reference, data, now) {
  const attemptsBefore = Number(data.lockedUntil) <= now ? 0 : Number(data.failedAttempts) || 0;
  const failedAttempts = attemptsBefore + 1;
  const isLocked = failedAttempts >= MAX_FAILED_ATTEMPTS;
  const lockedUntil = isLocked ? now + LOCKOUT_MS : 0;

  transaction.update(reference, {
    failedAttempts: isLocked ? 0 : failedAttempts,
    lockedUntil,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return isLocked ? { status: "locked", lockedUntil } : { status: "incorrect" };
}

function throwAttemptResult(result) {
  if (result.status === "locked") {
    const seconds = Math.max(1, Math.ceil((result.lockedUntil - Date.now()) / 1000));
    throw new HttpsError("resource-exhausted", `Too many attempts. Try again in ${seconds} seconds.`);
  }
  if (result.status === "incorrect") {
    throw new HttpsError("permission-denied", "That PIN is incorrect. Try again.");
  }
  if (result.status === "current-required") {
    throw new HttpsError("failed-precondition", "Enter your current PIN before changing it.");
  }
  if (result.status === "missing") {
    throw new HttpsError("not-found", "No PIN is set for this device.");
  }
}

exports.hasDevicePin = onCall(FUNCTION_OPTIONS, async (request) => {
  const uid = getUid(request);
  const deviceId = getDeviceId(request);
  const snapshot = await getPinReference(uid, deviceId).get();
  return { hasPin: snapshot.exists };
});

exports.setDevicePin = onCall(FUNCTION_OPTIONS, async (request) => {
  const uid = getUid(request);
  const deviceId = getDeviceId(request);
  const pin = request.data?.pin;
  const currentPin = request.data?.currentPin;
  validateNewPin(pin);
  if (currentPin !== undefined && currentPin !== "") validatePin(currentPin, "Current PIN");

  const reference = getPinReference(uid, deviceId);
  const salt = randomBytes(16);
  const pinHash = await derivePinHash(pin, salt);
  const result = await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(reference);
    const now = Date.now();

    if (snapshot.exists) {
      const data = snapshot.data();
      if (Number(data.lockedUntil) > now) return { status: "locked", lockedUntil: data.lockedUntil };
      if (!currentPin) return { status: "current-required" };

      const currentHash = await derivePinHash(currentPin, Buffer.from(data.salt, "base64"));
      if (!pinMatches(currentHash, data.hash)) {
        return applyFailedAttempt(transaction, reference, data, now);
      }
    }

    transaction.set(reference, {
      salt: salt.toString("base64"),
      hash: pinHash.toString("base64"),
      failedAttempts: 0,
      lockedUntil: 0,
      createdAt: snapshot.exists ? snapshot.get("createdAt") || FieldValue.serverTimestamp() : FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { status: "saved" };
  });

  throwAttemptResult(result);
  return { saved: true };
});

exports.verifyDevicePin = onCall(FUNCTION_OPTIONS, async (request) => {
  const uid = getUid(request);
  const deviceId = getDeviceId(request);
  const pin = request.data?.pin;
  validatePin(pin);

  const reference = getPinReference(uid, deviceId);
  const result = await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(reference);
    if (!snapshot.exists) return { status: "missing" };

    const data = snapshot.data();
    const now = Date.now();
    if (Number(data.lockedUntil) > now) return { status: "locked", lockedUntil: data.lockedUntil };

    const candidateHash = await derivePinHash(pin, Buffer.from(data.salt, "base64"));
    if (!pinMatches(candidateHash, data.hash)) {
      return applyFailedAttempt(transaction, reference, data, now);
    }

    transaction.update(reference, {
      failedAttempts: 0,
      lockedUntil: 0,
      lastVerifiedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { status: "verified" };
  });

  throwAttemptResult(result);
  return { verified: true };
});

exports.removeDevicePin = onCall(FUNCTION_OPTIONS, async (request) => {
  const uid = getUid(request);
  const deviceId = getDeviceId(request);
  await getPinReference(uid, deviceId).delete();
  return { removed: true };
});

exports.clearAllDevicePins = onCall(FUNCTION_OPTIONS, async (request) => {
  const uid = getUid(request);
  const collection = db.collection("users").doc(uid).collection("devicePins");
  const snapshot = await collection.get();

  for (let offset = 0; offset < snapshot.docs.length; offset += 450) {
    const batch = db.batch();
    snapshot.docs.slice(offset, offset + 450).forEach((document) => batch.delete(document.ref));
    await batch.commit();
  }

  return { removed: snapshot.size };
});
