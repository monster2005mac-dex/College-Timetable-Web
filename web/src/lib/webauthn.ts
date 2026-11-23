import { httpsCallable } from "firebase/functions";
import { auth, functions } from "./firebase";

type StoredBiometricSetting = {
  userId: string;
  enabled?: boolean;
  credentialId?: string;
  deviceId?: string;
};

const DATABASE_NAME = "campus-orbit-device-lock";
const STORE_NAME = "credentials";

function openCredentialDatabase(): Promise<IDBDatabase> {
  if (typeof window === "undefined" || !window.indexedDB) {
    return Promise.reject(new Error("This browser cannot store a device biometric credential."));
  }

  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME, { keyPath: "userId" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open biometric storage."));
  });
}

function createChallenge(): ArrayBuffer {
  const challenge = new ArrayBuffer(32);
  window.crypto.getRandomValues(new Uint8Array(challenge));
  return challenge;
}

function encodeUserId(value: string): ArrayBuffer {
  const encoded = new TextEncoder().encode(value);
  const userId = new ArrayBuffer(encoded.length);
  new Uint8Array(userId).set(encoded);
  return userId;
}

function decodeCredentialId(value: string): ArrayBuffer {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  const decoded = Uint8Array.from(window.atob(padded), (character) => character.charCodeAt(0));
  const credentialId = new ArrayBuffer(decoded.length);
  new Uint8Array(credentialId).set(decoded);
  return credentialId;
}

function matchesUserHandle(userHandle: ArrayBuffer | null, userId: string): boolean {
  if (!userHandle) return false;
  const expected = new Uint8Array(encodeUserId(userId));
  const actual = new Uint8Array(userHandle);
  return expected.length === actual.length && expected.every((value, index) => value === actual[index]);
}

function writeBiometricSetting(setting: StoredBiometricSetting): Promise<void> {
  return openCredentialDatabase().then((database) => new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(setting);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Could not save device lock settings."));
    transaction.onabort = () => reject(transaction.error ?? new Error("Could not save device lock settings."));
  }).finally(() => database.close()));
}

export async function checkDeviceBiometricAvailable(): Promise<boolean> {
  if (typeof window === "undefined" || !window.PublicKeyCredential) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

function readBiometricSetting(userId: string): Promise<StoredBiometricSetting | undefined> {
  return openCredentialDatabase().then((database) => new Promise((resolve, reject) => {
    const request = database.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(userId);
    request.onsuccess = () => {
      database.close();
      resolve(request.result as StoredBiometricSetting | undefined);
    };
    request.onerror = () => {
      database.close();
      reject(request.error ?? new Error("Could not read biometric settings."));
    };
  }));
}

function assertCurrentUser(userId: string): void {
  if (auth.currentUser?.uid !== userId) {
    throw new Error("Sign in to manage this device PIN.");
  }
}

async function getExistingDeviceId(userId: string): Promise<string | undefined> {
  return (await readBiometricSetting(userId))?.deviceId;
}

async function getOrCreateDeviceId(userId: string): Promise<string> {
  const setting = await readBiometricSetting(userId);
  if (setting?.deviceId) return setting.deviceId;

  const bytes = window.crypto.getRandomValues(new Uint8Array(32));
  const deviceId = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  await writeBiometricSetting({ ...setting, userId, deviceId });
  return deviceId;
}

export async function isDeviceBiometricEnabled(userId: string): Promise<boolean> {
  const setting = await readBiometricSetting(userId);
  return Boolean(setting?.enabled || setting?.credentialId);
}

export async function registerDeviceBiometrics(userId: string, email: string, displayName: string): Promise<void> {
  if (!(await checkDeviceBiometricAvailable())) {
    throw new Error("This device does not have a supported fingerprint, face, or screen-lock authenticator.");
  }

  const accountName = email || userId;
  const credential = await navigator.credentials.create({
    publicKey: {
      challenge: createChallenge(),
      rp: { name: "Campus Orbit", id: window.location.hostname },
      user: {
        id: encodeUserId(userId),
        name: accountName,
        displayName: displayName || email || "Student",
      },
      pubKeyCredParams: [{ type: "public-key", alg: -7 }],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        residentKey: "required",
        requireResidentKey: true,
        userVerification: "required",
      },
      timeout: 60000,
      attestation: "none",
    },
  });

  if (!(credential instanceof PublicKeyCredential)) {
    throw new Error("Your device did not create a biometric credential.");
  }

  const setting = await readBiometricSetting(userId);
  await writeBiometricSetting({ ...setting, userId, enabled: true });
}

export async function authenticateWithDeviceBiometrics(userId: string): Promise<void> {
  if (!window.PublicKeyCredential) {
    throw new Error("Biometric authentication is not supported in this browser.");
  }

  const setting = await readBiometricSetting(userId);
  if (!setting?.enabled && !setting?.credentialId) {
    throw new Error("No device passkey is enabled for this account.");
  }

  const credential = await navigator.credentials.get({
    publicKey: {
      challenge: createChallenge(),
      rpId: window.location.hostname,
      allowCredentials: setting.credentialId
        ? [{ type: "public-key", id: decodeCredentialId(setting.credentialId) }]
        : [],
      userVerification: "required",
      timeout: 60000,
    },
  });

  if (!(credential instanceof PublicKeyCredential) || !(credential.response instanceof AuthenticatorAssertionResponse)) {
    throw new Error("Your device could not verify the passkey. Try again.");
  }

  if (setting.credentialId ? credential.id !== setting.credentialId : !matchesUserHandle(credential.response.userHandle, userId)) {
    throw new Error("The selected device passkey does not match this signed-in account.");
  }
}

async function callPinFunction<RequestData, ResponseData>(name: string, data: RequestData): Promise<ResponseData> {
  const callable = httpsCallable<RequestData, ResponseData>(functions, name);
  return (await callable(data)).data;
}

export async function hasDevicePin(userId: string): Promise<boolean> {
  assertCurrentUser(userId);
  const deviceId = await getExistingDeviceId(userId);
  if (!deviceId) return false;

  const result = await callPinFunction<{ deviceId: string }, { hasPin: boolean }>("hasDevicePin", { deviceId });
  return result.hasPin;
}

export async function setDevicePin(userId: string, pin: string, currentPin?: string): Promise<void> {
  assertCurrentUser(userId);
  if (!/^\d{6}$/.test(pin)) throw new Error("Choose a 6-digit PIN.");
  if (currentPin && !/^\d{6}$/.test(currentPin)) throw new Error("Enter your current 6-digit PIN.");

  const biometricEnabled = await isDeviceBiometricEnabled(userId);
  const biometricAvailable = await checkDeviceBiometricAvailable();
  if (biometricAvailable && !biometricEnabled) {
    throw new Error("Set up the device passkey before adding a PIN fallback.");
  }

  const existingDeviceId = await getExistingDeviceId(userId);
  const deviceId = existingDeviceId ?? await getOrCreateDeviceId(userId);
  const requestData = currentPin ? { deviceId, pin, currentPin } : { deviceId, pin };
  try {
    await callPinFunction<typeof requestData, { saved: boolean }>("setDevicePin", requestData);
  } catch (error) {
    const errorCode = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
    if (!existingDeviceId && ["functions/not-found", "functions/unauthenticated", "functions/invalid-argument"].includes(errorCode)) {
      const setting = await readBiometricSetting(userId);
      if (setting?.deviceId === deviceId) {
        const updated = { ...setting };
        delete updated.deviceId;
        await writeBiometricSetting(updated);
      }
    }
    throw error;
  }
}

export async function verifyDevicePin(userId: string, pin: string): Promise<void> {
  assertCurrentUser(userId);
  if (!/^\d{6}$/.test(pin)) throw new Error("Enter your 6-digit PIN.");
  const deviceId = await getExistingDeviceId(userId);
  if (!deviceId) throw new Error("No PIN is set for this device.");

  await callPinFunction<{ deviceId: string; pin: string }, { verified: boolean }>(
    "verifyDevicePin",
    { deviceId, pin },
  );
}

export async function removeDevicePin(userId: string): Promise<void> {
  assertCurrentUser(userId);
  const setting = await readBiometricSetting(userId);
  if (!setting?.deviceId) return;
  await callPinFunction<{ deviceId: string }, { removed: boolean }>("removeDevicePin", { deviceId: setting.deviceId });

  const updated = { ...setting };
  delete updated.deviceId;
  await writeBiometricSetting(updated);
}

export async function clearAllDevicePins(userId: string): Promise<void> {
  assertCurrentUser(userId);
  await callPinFunction<Record<string, never>, { removed: number }>("clearAllDevicePins", {});
}

export async function removeDeviceBiometrics(userId: string): Promise<void> {
  await removeDevicePin(userId);
  const database = await openCredentialDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).delete(userId);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Could not remove biometric settings."));
    transaction.onabort = () => reject(transaction.error ?? new Error("Could not remove biometric settings."));
  }).finally(() => database.close());
}
