/**
 * Globetrotter Gateway • Cryptographic Pass Signature Engine
 * 
 * Implements real HMAC-SHA256 cryptographic pass signing and verification
 * using the native browser Web Crypto API (crypto.subtle).
 * 
 * Mathematical Specification & Format Parity:
 * - Ephemeral session key derived from authenticated operator session
 * - Payload: bookingReference:circuitId:userId:timestamp
 * - Token Structure: GT_PASS:<bookingReference>:<circuitId>:<userId>:<timestamp>:<base64url_hmac_sha256>
 */

// Shared sovereign regional authority salt key matching Spring Boot QrCodeService.java
const OFFICIAL_AUTHORITY_SALT = 'globetrotter-secret-salt-key-2026-high-scale';

/**
 * Retrieves the verification key for gate turnstiles and pass signing.
 * Uses the operator session key when logged in, or falls back to the regional authority key.
 */
function getTurnstileVerificationKey() {
  if (typeof window !== 'undefined' && window.sessionStorage) {
    const operatorKey = window.sessionStorage.getItem('GT_TURNSTILE_OPERATOR_KEY');
    if (operatorKey && operatorKey.trim()) {
      return operatorKey.trim();
    }
  }
  return OFFICIAL_AUTHORITY_SALT;
}

/**
 * Sets the ephemeral gate operator key after biometric or server login.
 */
export function setTurnstileOperatorKey(key) {
  if (typeof window !== 'undefined' && window.sessionStorage) {
    if (key) {
      window.sessionStorage.setItem('GT_TURNSTILE_OPERATOR_KEY', key);
    } else {
      window.sessionStorage.removeItem('GT_TURNSTILE_OPERATOR_KEY');
    }
  }
}

/**
 * Base64URL encoder conforming to RFC 4648 without padding.
 */
function base64UrlEncode(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Signs a string payload using HMAC-SHA256 via Web Crypto.
 * Uses the ephemeral operator session key.
 */
export async function signPayloadHmacSha256(payload) {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    throw new Error('Web Crypto API is unavailable in this environment.');
  }

  const operatorKey = getTurnstileVerificationKey();

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(operatorKey),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBuffer = await crypto.subtle.sign('HMAC', key, enc.encode(payload));
  return base64UrlEncode(signatureBuffer);
}

/**
 * Generates an authentic cryptographically signed pass token.
 * Encodes sovereign validity dates directly into the HMAC-SHA256 payload.
 * Structure: GT_PASS:<bookingReference>:<circuitId>:<userId>:<validFrom>:<validUntil>:<timestamp>:<base64url_hmac_sha256>
 */
export async function generateCryptographicPassToken(
  bookingReference, 
  circuitId = 1, 
  userId = 1,
  validFrom = null,
  validUntil = null
) {
  const timestamp = Date.now();
  const todayIso = new Date().toISOString().split('T')[0];
  const from = (validFrom && String(validFrom).match(/^\d{4}-\d{2}-\d{2}$/)) ? String(validFrom) : todayIso;
  const until = (validUntil && String(validUntil).match(/^\d{4}-\d{2}-\d{2}$/)) ? String(validUntil) : from;

  const payload = `${bookingReference}:${circuitId}:${userId}:${from}:${until}:${timestamp}`;
  const signature = await signPayloadHmacSha256(payload);
  return `GT_PASS:${payload}:${signature}`;
}

/**
 * Constant-time string equality check to prevent side-channel timing attacks.
 */
function constantTimeEquals(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Verifies a pass token's HMAC-SHA256 cryptographic signature, timestamp freshness,
 * and expiration window.
 * 
 * Returns { valid: boolean, status: string, message: string, bookingRef?: string }
 */
export async function verifyPassCryptographicSignature(token) {
  if (!token || typeof token !== 'string') {
    return {
      valid: false,
      status: 'EMPTY_TOKEN',
      message: 'Empty pass token received.'
    };
  }

  const clean = token.trim();

  // Check if token follows the official cryptographic signed standard
  if (!clean.startsWith('GT_PASS:')) {
    return {
      valid: false,
      isCryptographic: false,
      status: 'NON_CRYPTOGRAPHIC_FORMAT',
      message: 'Token does not use the GT_PASS cryptographic container.'
    };
  }

  const parts = clean.split(':');
  // Supports both modern 8-part sovereign format (with explicit dates) and legacy 6-part format
  if (parts.length !== 8 && parts.length !== 6) {
    return {
      valid: false,
      isCryptographic: true,
      status: 'MALFORMED_TOKEN',
      message: 'Malformed pass structure: expected 6 or 8 colon-separated segments.'
    };
  }

  let bookingRef = '';
  let circuitId = '1';
  let userId = '1';
  let validFrom = null;
  let validUntil = null;
  let timestampStr = '';
  let expectedSignature = '';
  let payload = '';

  if (parts.length === 8) {
    // Modern: ['GT_PASS', bookingReference, circuitId, userId, validFrom, validUntil, timestamp, signature]
    [, bookingRef, circuitId, userId, validFrom, validUntil, timestampStr, expectedSignature] = parts;
    payload = `${bookingRef}:${circuitId}:${userId}:${validFrom}:${validUntil}:${timestampStr}`;
  } else {
    // Legacy: ['GT_PASS', bookingReference, circuitId, userId, timestamp, signature]
    [, bookingRef, circuitId, userId, timestampStr, expectedSignature] = parts;
    payload = `${bookingRef}:${circuitId}:${userId}:${timestampStr}`;
  }

  // 1. Calculate actual signature
  let calculatedSignature = '';
  try {
    calculatedSignature = await signPayloadHmacSha256(payload);
  } catch (err) {
    return {
      valid: false,
      isCryptographic: true,
      status: 'CRYPTO_ERROR',
      message: `Web Crypto verification failed: ${err.message}`
    };
  }

  // 2. Constant-time signature verification
  if (!constantTimeEquals(calculatedSignature, expectedSignature)) {
    return {
      valid: false,
      isCryptographic: true,
      status: 'TAMPERED_SIGNATURE',
      message: 'Cryptographic Signature Mismatch: Pass has been modified or forged!'
    };
  }

  // 3. Time Window Validation
  const tokenTimestamp = parseInt(timestampStr, 10);
  if (isNaN(tokenTimestamp)) {
    return {
      valid: false,
      isCryptographic: true,
      status: 'INVALID_TIMESTAMP',
      message: 'Pass payload contains an invalid timestamp integer.'
    };
  }

  const now = Date.now();
  // Reject future tokens (clock skew tolerance of 5 minutes)
  if (tokenTimestamp > now + 5 * 60 * 1000) {
    return {
      valid: false,
      isCryptographic: true,
      status: 'FUTURE_TIMESTAMP',
      message: 'Security Alert: Pass token timestamp is set in the future.'
    };
  }

  // 4. Strict Sovereign Date Validity Check
  const todayIso = new Date().toISOString().split('T')[0];

  if (validFrom && String(validFrom).match(/^\d{4}-\d{2}-\d{2}$/)) {
    if (todayIso < validFrom) {
      return {
        valid: false,
        isCryptographic: true,
        status: 'FUTURE_DATE_PASS',
        message: `Entry Denied: Pass is scheduled for future date (${formatPassDate(validFrom)}). Early admission before scheduled visit date is strictly prohibited.`,
        bookingRef,
        validFrom,
        validUntil,
        todayIso
      };
    }
  }

  if (validUntil && String(validUntil).match(/^\d{4}-\d{2}-\d{2}$/)) {
    if (todayIso > validUntil) {
      return {
        valid: false,
        isCryptographic: true,
        status: 'EXPIRED_PASS',
        message: `Entry Denied: Pass validity expired on ${formatPassDate(validUntil)}. Please purchase a new pass for today.`,
        bookingRef,
        validFrom,
        validUntil,
        todayIso
      };
    }
  }

  // Reject passes older than 30 days
  const maxValidityMs = 30 * 24 * 60 * 60 * 1000;
  if (now - tokenTimestamp > maxValidityMs) {
    return {
      valid: false,
      isCryptographic: true,
      status: 'EXPIRED_PASS',
      message: 'Pass Expired: Token validity window (30 days) has elapsed.'
    };
  }

  return {
    valid: true,
    isCryptographic: true,
    status: 'CRYPTO_VERIFIED',
    message: 'Cryptographic HMAC-SHA256 signature verified against authority stamp.',
    bookingRef,
    circuitId: Number(circuitId),
    userId: Number(userId),
    validFrom: validFrom || todayIso,
    validUntil: validUntil || validFrom || todayIso,
    timestamp: tokenTimestamp
  };
}

/**
 * Human-friendly date formatter conforming to Rule 0 (Plain English).
 * Transforms "2026-11-20" -> "Fri, 20 Nov 2026"
 */
export function formatPassDate(dateStr) {
  if (!dateStr) return 'Visit Date';
  if (dateStr === 'Today') {
    return new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  }
  if (dateStr === 'Tomorrow') {
    const tmrw = new Date(Date.now() + 86400000);
    return tmrw.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  }
  const match = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const d = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    }
  }
  return String(dateStr);
}

/**
 * Short date formatter for badges ("20 Nov 2026")
 */
export function formatPassDateShort(dateStr) {
  if (!dateStr) return 'Date';
  const match = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const d = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    }
  }
  return String(dateStr);
}

/**
 * Returns dynamic date status metadata for badges and validation.
 */
export function getPassDateStatus(validFrom, validUntil) {
  const todayIso = new Date().toISOString().split('T')[0];
  const from = (validFrom && String(validFrom).match(/^\d{4}-\d{2}-\d{2}$/)) ? String(validFrom) : todayIso;
  const until = (validUntil && String(validUntil).match(/^\d{4}-\d{2}-\d{2}$/)) ? String(validUntil) : from;

  const isFuture = todayIso < from;
  const isExpired = todayIso > until;
  const isActive = !isFuture && !isExpired;

  let daysDiff = 0;
  if (isFuture) {
    const d1 = new Date(from + 'T00:00:00');
    const d0 = new Date(todayIso + 'T00:00:00');
    daysDiff = Math.max(1, Math.round((d1 - d0) / 86400000));
  }

  return {
    todayIso,
    validFrom: from,
    validUntil: until,
    isFuture,
    isExpired,
    isActive,
    daysUntilActive: daysDiff
  };
}
