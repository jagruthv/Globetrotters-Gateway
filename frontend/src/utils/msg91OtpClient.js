/**
 * Globetrotter Gateway • MSG91 Secure OTP Widget Client
 *
 * Widget Name: SecureOTPWidgetADE4
 * Widget ID: 366b7364466f323431363330
 * Auth Token: 591496TLRJgL2B6afe7e24P1
 * Official State Tourism Carrier SMS & WhatsApp Verification Engine
 */

export const MSG91_WIDGET_ID = '366b7364466f323431363330';
export const MSG91_AUTH_TOKEN = '591496TLRJgL2B6afe7e24P1';

/**
 * Checks if the MSG91 SendOTP Web SDK is loaded in the window.
 */
export function isMsg91Loaded() {
  return typeof window !== 'undefined' && typeof window.initSendOTP === 'function';
}

/**
 * Ensures the MSG91 SDK script tag is loaded and ready in the document.
 */
export function loadMsg91Script() {
  if (isMsg91Loaded()) return Promise.resolve(true);

  return new Promise((resolve) => {
    const existing = document.querySelector('script[src*="otp-provider.js"]');
    if (existing) {
      if (typeof window.initSendOTP === 'function') {
        resolve(true);
        return;
      }
      existing.addEventListener('load', () => resolve(typeof window.initSendOTP === 'function'));
      existing.addEventListener('error', () => resolve(false));
      setTimeout(() => resolve(typeof window.initSendOTP === 'function'), 2000);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://control.msg91.com/app/assets/otp-provider/otp-provider.js';
    script.async = true;
    script.onload = () => resolve(typeof window.initSendOTP === 'function');
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
}

/**
 * Launches the official MSG91 OTP Widget popup for phone verification.
 *
 * @param {Object} options
 * @param {string} options.phoneNumber - 10-digit Indian phone number
 * @param {Function} options.onSuccess - Callback on verification success
 * @param {Function} options.onFailure - Callback on error or dismissal
 */
export async function launchMsg91Otp({
  phoneNumber,
  onSuccess,
  onFailure
}) {
  const isLoaded = await loadMsg91Script();
  if (!isLoaded || !isMsg91Loaded()) {
    const error = new Error('MSG91 OTP service is not available. Using gateway fallback.');
    if (onFailure) onFailure(error);
    return false;
  }

  const cleanPhone = String(phoneNumber || '').replace(/\D/g, '').slice(-10);
  const identifier = cleanPhone ? `91${cleanPhone}` : '';

  const configuration = {
    widgetId: MSG91_WIDGET_ID,
    tokenAuth: MSG91_AUTH_TOKEN,
    identifier: identifier || undefined,
    exposeMethods: false,
    success: (data) => {
      console.log('[MSG91] Verification Succeeded:', data);
      if (onSuccess) onSuccess(data);
    },
    failure: (error) => {
      console.warn('[MSG91] Verification Failed:', error);
      if (onFailure) onFailure(error);
    }
  };

  try {
    window.initSendOTP(configuration);
    return true;
  } catch (err) {
    console.error('[MSG91] Init Exception:', err);
    if (onFailure) onFailure(err);
    return false;
  }
}
