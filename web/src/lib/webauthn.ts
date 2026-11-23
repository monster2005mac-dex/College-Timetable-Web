type StoredBiometricSetting = {
  userId: string;
  enabled?: boolean;
  credentialId?: string;
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

  const database = await openCredentialDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put({ userId, enabled: true } satisfies StoredBiometricSetting);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Could not save biometric settings."));
    transaction.onabort = () => reject(transaction.error ?? new Error("Could not save biometric settings."));
  }).finally(() => database.close());
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

export async function removeDeviceBiometrics(userId: string): Promise<void> {
  const database = await openCredentialDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).delete(userId);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Could not remove biometric settings."));
    transaction.onabort = () => reject(transaction.error ?? new Error("Could not remove biometric settings."));
  }).finally(() => database.close());
}
