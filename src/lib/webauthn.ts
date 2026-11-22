export async function checkDeviceBiometricAvailable(): Promise<boolean> {
  if (typeof window === "undefined" || !window.PublicKeyCredential) {
    return false;
  }
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch (_: any) {
    return false;
  }
}

export async function authenticateWithDeviceBiometrics(userEmail: string): Promise<boolean> {
  if (typeof window === "undefined" || !window.PublicKeyCredential) {
    throw new Error("WebAuthn device biometrics are not supported on this browser.");
  }

  const challenge = new Uint8Array(32);
  window.crypto.getRandomValues(challenge);

  const userId = new TextEncoder().encode(userEmail || "student@collegetimetable.app");

  const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
    challenge,
    rp: {
      name: "College Timetable Pro",
      id: window.location.hostname,
    },
    user: {
      id: userId,
      name: userEmail || "student@collegetimetable.app",
      displayName: userEmail?.split("@")[0] || "Student",
    },
    pubKeyCredParams: [{ alg: -7, type: "public-key" }],
    authenticatorSelection: {
      authenticatorAttachment: "platform",
      userVerification: "required",
    },
    timeout: 60000,
  };

  try {
    const credential = await navigator.credentials.create({
      publicKey: publicKeyCredentialCreationOptions,
    });
    return !!credential;
  } catch (err: any) {
    if (err.name === "NotAllowedError") {
      throw new Error("Device biometric authentication was canceled.");
    }
    throw new Error(err.message || "Device biometric authentication failed.");
  }
}
