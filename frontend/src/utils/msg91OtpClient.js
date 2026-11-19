/**
 * Globetrotter Gateway • MSG91 Secure OTP Widget Client
 *
 * Widget Name: SecureOTPWidgetADE4
 * Widget ID: 366b7364466f323431363330
 * Auth Token: 591496TLRJgL2B6afe7e24P1
 * Official State Tourism Carrier SMS & WhatsApp Verification Engine
 */

export const MSG91_WIDGET_ID = '366b7364466f323431363330';
export const MSG91_DEFAULT_TOKEN = '591496TLRJgL2B6afe7e24P1';

/**
 * Checks if the MSG91 SendOTP Web SDK is loaded in the window.
 */
export function isMsg91Loaded() {
  return typeof window !== 'undefined' && typeof window.initSendOTP === 'function';
}

/**
 * Launches the official MSG91 OTP Widget popup for phone verification.
 *
 * @param {Object} options
 * @param {string} options.phoneNumber - 10-digit Indian phone number
 * @param {string} [options.tokenAuth] - Auth token override (defaults to configured widget token)
 * @param {Function} options.onSuccess - Callback on verification success with verified token data
 * @param {Function} options.onFailure - Callback on error or widget dismissal
 */
export function launchMsg91Otp({
  phoneNumber,
  tokenAuth = MSG91_DEFAULT_TOKEN,
  onSuccess,
  onFailure,
}) {
  if (!isMsg91Loaded()) {
    const error = new Error('MSG91 SDK script not loaded yet. Please check your internet connection.');
    if (onFailure) onFailure(error);
    return;
  }

  const cleanPhone = String(phoneNumber || '').replace(/\D/g, '').slice(-10);
  const identifier = cleanPhone ? `91${cleanPhone}` : '';

  const configuration = {
    widgetId: MSG91_WIDGET_ID,
    tokenAuth: tokenAuth || MSG91_DEFAULT_TOKEN,
    identifier: identifier,
    exposeMethods: true,
    success: (data) => {
      console.log('[MSG91] Verification Succeeded:', data);
      if (onSuccess) onSuccess(data);
    },
    failure: (error) => {
      console.warn('[MSG91] Verification Failed:', error);
      if (onFailure) onFailure(error);
    },
  };

  try {
    window.initSendOTP(configuration);
  } catch (err) {
    console.error('[MSG91] Init error:', err);
    if (onFailure) onFailure(err);
  }
}
