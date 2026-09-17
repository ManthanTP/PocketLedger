package com.pocketledger.pro;

import android.content.Intent;
import android.os.Build;
import android.provider.Settings;
import androidx.annotation.NonNull;
import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricPrompt;
import androidx.core.content.ContextCompat;
import androidx.fragment.app.FragmentActivity;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "BiometricAuth")
public class BiometricPlugin extends Plugin {

    @PluginMethod
    public void checkBiometry(PluginCall call) {
        try {
            BiometricManager biometricManager = BiometricManager.from(getContext());
            int authenticators = BiometricManager.Authenticators.BIOMETRIC_STRONG;
            int canAuth = biometricManager.canAuthenticate(authenticators);

            JSObject ret = new JSObject();
            boolean isAvailable = (canAuth == BiometricManager.BIOMETRIC_SUCCESS);
            boolean hasHardware = (canAuth != BiometricManager.BIOMETRIC_ERROR_NO_HARDWARE);
            boolean isEnrolled = (canAuth != BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED);

            ret.put("isAvailable", isAvailable);
            ret.put("hasHardware", hasHardware);
            ret.put("isEnrolled", isEnrolled);
            ret.put("biometryType", "fingerprint");
            ret.put("statusCode", canAuth);

            switch (canAuth) {
                case BiometricManager.BIOMETRIC_SUCCESS:
                    ret.put("status", "SUCCESS");
                    break;
                case BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED:
                    ret.put("status", "NONE_ENROLLED");
                    break;
                case BiometricManager.BIOMETRIC_ERROR_NO_HARDWARE:
                    ret.put("status", "NO_HARDWARE");
                    break;
                case BiometricManager.BIOMETRIC_ERROR_HW_UNAVAILABLE:
                    ret.put("status", "HW_UNAVAILABLE");
                    break;
                case BiometricManager.BIOMETRIC_ERROR_SECURITY_UPDATE_REQUIRED:
                    ret.put("status", "SECURITY_UPDATE_REQUIRED");
                    break;
                default:
                    ret.put("status", "UNKNOWN");
                    break;
            }

            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Error checking biometric status: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void authenticate(PluginCall call) {
        try {
            BiometricManager biometricManager = BiometricManager.from(getContext());
            int authenticators = BiometricManager.Authenticators.BIOMETRIC_STRONG;
            int canAuth = biometricManager.canAuthenticate(authenticators);

            if (canAuth == BiometricManager.BIOMETRIC_ERROR_NO_HARDWARE) {
                JSObject ret = new JSObject();
                ret.put("success", false);
                ret.put("code", "NO_HARDWARE");
                ret.put("message", "Device does not have a fingerprint biometric sensor.");
                call.resolve(ret);
                return;
            }

            if (canAuth == BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED) {
                JSObject ret = new JSObject();
                ret.put("success", false);
                ret.put("code", "NONE_ENROLLED");
                ret.put("message", "No fingerprint enrolled on this device.");
                call.resolve(ret);
                return;
            }

            if (canAuth == BiometricManager.BIOMETRIC_ERROR_HW_UNAVAILABLE) {
                JSObject ret = new JSObject();
                ret.put("success", false);
                ret.put("code", "HW_UNAVAILABLE");
                ret.put("message", "Fingerprint sensor is currently busy or unavailable.");
                call.resolve(ret);
                return;
            }

            String title = call.getString("title", "Unlock Pocket Ledger Pro");
            String subtitle = call.getString("subtitle", "Scan registered fingerprint to verify identity");
            String negativeButtonText = call.getString("negativeButtonText", "Use PIN");

            getActivity().runOnUiThread(() -> {
                try {
                    BiometricPrompt.PromptInfo promptInfo = new BiometricPrompt.PromptInfo.Builder()
                            .setTitle(title)
                            .setSubtitle(subtitle)
                            .setNegativeButtonText(negativeButtonText)
                            .setAllowedAuthenticators(BiometricManager.Authenticators.BIOMETRIC_STRONG)
                            .build();

                    BiometricPrompt biometricPrompt = new BiometricPrompt(
                            (FragmentActivity) getActivity(),
                            ContextCompat.getMainExecutor(getContext()),
                            new BiometricPrompt.AuthenticationCallback() {
                                @Override
                                public void onAuthenticationSucceeded(@NonNull BiometricPrompt.AuthenticationResult result) {
                                    super.onAuthenticationSucceeded(result);
                                    JSObject ret = new JSObject();
                                    ret.put("success", true);
                                    ret.put("code", "SUCCESS");
                                    call.resolve(ret);
                                }

                                @Override
                                public void onAuthenticationError(int errorCode, @NonNull CharSequence errString) {
                                    super.onAuthenticationError(errorCode, errString);
                                    JSObject ret = new JSObject();
                                    ret.put("success", false);
                                    if (errorCode == BiometricPrompt.ERROR_NEGATIVE_BUTTON || errorCode == BiometricPrompt.ERROR_USER_CANCELED) {
                                        ret.put("code", "USER_CANCELED");
                                    } else if (errorCode == BiometricPrompt.ERROR_LOCKOUT || errorCode == BiometricPrompt.ERROR_LOCKOUT_PERMANENT) {
                                        ret.put("code", "LOCKOUT");
                                    } else {
                                        ret.put("code", "ERROR");
                                    }
                                    ret.put("message", errString.toString());
                                    call.resolve(ret);
                                }

                                @Override
                                public void onAuthenticationFailed() {
                                    super.onAuthenticationFailed();
                                    // Android OS automatically provides "Not recognized" feedback and vibration.
                                }
                            }
                    );

                    biometricPrompt.authenticate(promptInfo);
                } catch (Exception e) {
                    call.reject("Error launching biometric prompt: " + e.getMessage(), e);
                }
            });

        } catch (Exception e) {
            call.reject("Biometric authentication failed: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void openBiometricSettings(PluginCall call) {
        try {
            Intent intent;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                intent = new Intent(Settings.ACTION_BIOMETRIC_ENROLL);
                intent.putExtra(
                        Settings.EXTRA_BIOMETRIC_AUTHENTICATORS_ALLOWED,
                        BiometricManager.Authenticators.BIOMETRIC_STRONG
                );
            } else {
                intent = new Intent(Settings.ACTION_SECURITY_SETTINGS);
            }
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);

            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            try {
                Intent fallback = new Intent(Settings.ACTION_SETTINGS);
                fallback.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(fallback);

                JSObject ret = new JSObject();
                ret.put("success", true);
                call.resolve(ret);
            } catch (Exception ex) {
                call.reject("Unable to open device settings: " + ex.getMessage(), ex);
            }
        }
    }
}
