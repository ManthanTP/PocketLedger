import { Capacitor, registerPlugin } from '@capacitor/core';

export interface BiometricStatus {
  isAvailable: boolean;
  hasHardware: boolean;
  isEnrolled: boolean;
  biometryType: 'fingerprint' | 'face' | 'passkey' | 'none';
  platform: 'android' | 'web' | 'none';
  status: string;
  message?: string;
}

export interface BiometricAuthResult {
  success: boolean;
  code?: 'SUCCESS' | 'NONE_ENROLLED' | 'NO_HARDWARE' | 'HW_UNAVAILABLE' | 'USER_CANCELED' | 'LOCKOUT' | 'ERROR';
  message?: string;
}

interface NativeBiometricAuthPlugin {
  checkBiometry(): Promise<{
    isAvailable: boolean;
    hasHardware: boolean;
    isEnrolled: boolean;
    biometryType: string;
    statusCode: number;
    status: string;
  }>;
  authenticate(options?: {
    title?: string;
    subtitle?: string;
    negativeButtonText?: string;
  }): Promise<BiometricAuthResult>;
  openBiometricSettings(): Promise<{ success: boolean }>;
}

const NativeBiometric = registerPlugin<NativeBiometricAuthPlugin>('BiometricAuth');

const WEBAUTHN_CREDENTIAL_KEY = 'pocketledger_webauthn_credential_id';

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export class BiometricService {
  /**
   * Checks whether biometric hardware exists and whether fingerprints are enrolled
   */
  static async checkStatus(): Promise<BiometricStatus> {
    if (Capacitor.isNativePlatform()) {
      try {
        const res = await NativeBiometric.checkBiometry();
        return {
          isAvailable: res.isAvailable,
          hasHardware: res.hasHardware,
          isEnrolled: res.isEnrolled,
          biometryType: 'fingerprint',
          platform: 'android',
          status: res.status,
          message:
            res.status === 'NONE_ENROLLED'
              ? 'No fingerprint registered on this phone.'
              : res.status === 'NO_HARDWARE'
              ? 'This device does not have a fingerprint sensor.'
              : res.isAvailable
              ? 'Fingerprint scanner ready.'
              : 'Biometric hardware unavailable.'
        };
      } catch (err: unknown) {
        console.warn('Native biometric check failed:', err);
        return {
          isAvailable: false,
          hasHardware: false,
          isEnrolled: false,
          biometryType: 'none',
          platform: 'android',
          status: 'ERROR',
          message: 'Unable to check biometric status.'
        };
      }
    }

    // Web Browser environment (WebAuthn / Passkeys)
    if (typeof window !== 'undefined' && window.PublicKeyCredential) {
      try {
        const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        if (!available) {
          return {
            isAvailable: false,
            hasHardware: false,
            isEnrolled: false,
            biometryType: 'none',
            platform: 'web',
            status: 'NO_HARDWARE',
            message: 'Platform biometric authenticator not supported in this browser.'
          };
        }

        const savedCredentialId = localStorage.getItem(WEBAUTHN_CREDENTIAL_KEY);
        const isEnrolled = !!savedCredentialId;

        return {
          isAvailable: true,
          hasHardware: true,
          isEnrolled,
          biometryType: 'passkey',
          platform: 'web',
          status: isEnrolled ? 'SUCCESS' : 'NONE_ENROLLED',
          message: isEnrolled
            ? 'Device biometric passkey active.'
            : 'Biometric authenticator ready to register.'
        };
      } catch (err: unknown) {
        console.warn('WebAuthn check failed:', err);
      }
    }

    return {
      isAvailable: false,
      hasHardware: false,
      isEnrolled: false,
      biometryType: 'none',
      platform: 'none',
      status: 'NOT_SUPPORTED',
      message: 'Biometrics not supported on this platform.'
    };
  }

  /**
   * Prompts the native Android BiometricPrompt or WebAuthn assertion
   */
  static async authenticate(options?: {
    title?: string;
    subtitle?: string;
    negativeButtonText?: string;
  }): Promise<BiometricAuthResult> {
    if (Capacitor.isNativePlatform()) {
      try {
        return await NativeBiometric.authenticate({
          title: options?.title || 'Unlock Pocket Ledger Pro',
          subtitle: options?.subtitle || 'Scan registered fingerprint to verify identity',
          negativeButtonText: options?.negativeButtonText || 'Use PIN'
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          success: false,
          code: 'ERROR',
          message
        };
      }
    }

    // Web Auth / Passkey verification
    if (typeof window !== 'undefined' && window.PublicKeyCredential) {
      try {
        const credentialIdBase64 = localStorage.getItem(WEBAUTHN_CREDENTIAL_KEY);
        if (!credentialIdBase64) {
          return {
            success: false,
            code: 'NONE_ENROLLED',
            message: 'No biometric credential registered on this device yet.'
          };
        }

        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);

        const assertion = await navigator.credentials.get({
          publicKey: {
            challenge,
            allowCredentials: [
              {
                id: base64ToBuffer(credentialIdBase64),
                type: 'public-key',
                transports: ['internal']
              }
            ],
            userVerification: 'required',
            timeout: 60000
          }
        });

        if (assertion) {
          return { success: true, code: 'SUCCESS' };
        }
        return { success: false, code: 'ERROR', message: 'Biometric verification failed.' };
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'NotAllowedError') {
          return { success: false, code: 'USER_CANCELED', message: 'User canceled biometric scan.' };
        }
        return {
          success: false,
          code: 'ERROR',
          message: err instanceof Error ? err.message : 'Web biometric error.'
        };
      }
    }

    return {
      success: false,
      code: 'NO_HARDWARE',
      message: 'Biometric authentication is not supported.'
    };
  }

  /**
   * Opens Android Settings to enroll fingerprints or registers WebAuthn passkey on Web
   */
  static async enrollOrOpenSettings(): Promise<{ success: boolean; message?: string }> {
    if (Capacitor.isNativePlatform()) {
      try {
        await NativeBiometric.openBiometricSettings();
        return { success: true };
      } catch (err: unknown) {
        return {
          success: false,
          message: err instanceof Error ? err.message : 'Could not open device settings.'
        };
      }
    }

    // Web Enrollment
    if (typeof window !== 'undefined' && window.PublicKeyCredential) {
      try {
        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);
        const userId = new Uint8Array(16);
        window.crypto.getRandomValues(userId);

        const credential = (await navigator.credentials.create({
          publicKey: {
            challenge,
            rp: {
              name: 'Pocket Ledger Pro',
              id: window.location.hostname
            },
            user: {
              id: userId,
              name: 'Pocket Ledger Owner',
              displayName: 'Device Owner'
            },
            pubKeyCredParams: [
              { type: 'public-key', alg: -7 }, // ES256
              { type: 'public-key', alg: -257 } // RS256
            ],
            authenticatorSelection: {
              authenticatorAttachment: 'platform',
              userVerification: 'required'
            },
            timeout: 60000
          }
        })) as PublicKeyCredential | null;

        if (credential) {
          const rawId = bufferToBase64(credential.rawId);
          localStorage.setItem(WEBAUTHN_CREDENTIAL_KEY, rawId);
          return { success: true, message: 'Fingerprint / Biometric registered successfully!' };
        }
        return { success: false, message: 'Registration cancelled.' };
      } catch (err: unknown) {
        return {
          success: false,
          message: err instanceof Error ? err.message : 'Registration failed.'
        };
      }
    }

    return { success: false, message: 'Biometrics unavailable.' };
  }

  /**
   * Removes any registered WebAuthn credential
   */
  static clearWebCredential(): void {
    localStorage.removeItem(WEBAUTHN_CREDENTIAL_KEY);
  }
}
