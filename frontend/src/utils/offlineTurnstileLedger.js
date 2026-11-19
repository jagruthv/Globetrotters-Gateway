/**
 * Globetrotter Gateway • Edge Turnstile Offline Ledger Engine
 * 
 * Implements Offline Verification for Remote Underground & Canyon Gates
 * (Borra Caves, Belum Caves, Gandikota, Ramappa Temple).
 * 
 * Cryptographic Architecture:
 * 1. HMAC-SHA256 Cryptographic Signature Verification via Web Crypto API (crypto.subtle)
 *    Matching Spring Boot QrCodeService.java token format:
 *    GT_PASS:<ref>:<circuitId>:<userId>:<timestamp>:<base64url_hmac_sha256>
 * 2. Client-Side Anti-Passback Replay Defense (Local Session Gate Cache)
 * 3. Append-Only Turnstile Flash Ledger (Stored in browser LocalStorage / IndexedDB)
 * 4. End-of-Day Core Batch-Sync Pipeline (POST /api/verify/batch-sync)
 */

import { scannerService } from '../services/api.js';
import { verifyPassCryptographicSignature } from './cryptoPassService.js';

const LEDGER_KEY = 'globetrotter_turnstile_ledger';
const ADMITTED_SET_KEY = 'globetrotter_admitted_passes_cache';

export function isPassValidForLocation(pass, locationId = 1, keyword = 'borra', checkpointName = '') {
  if (!pass) return false;
  const kw = (keyword || '').toLowerCase().trim();
  const cName = (checkpointName || '').toLowerCase().trim();

  const matchesText = (val) => {
    if (!val || typeof val !== 'string') return false;
    const lower = val.toLowerCase();
    if (kw && lower.includes(kw)) return true;
    if (cName && (lower.includes(cName) || cName.includes(lower))) return true;
    return false;
  };

  // Check array of destinations
  if (Array.isArray(pass.destinations) && pass.destinations.some(d => matchesText(typeof d === 'string' ? d : d?.name || d?.spotName))) {
    return true;
  }
  // Check array of places allowed
  if (Array.isArray(pass.placesAllowed) && pass.placesAllowed.some(p => matchesText(typeof p === 'string' ? p : p?.name || p?.spotName))) {
    return true;
  }
  // Check circuit name
  if (matchesText(pass.circuitName)) {
    return true;
  }
  // Check single destination
  if (matchesText(pass.destination)) {
    return true;
  }
  // Check circuit ID
  if (pass.circuitId === Number(locationId) || String(pass.circuitId).toLowerCase().includes(kw)) {
    return true;
  }

  // Universal corridor all-access pass
  if (typeof pass.circuitName === 'string' && (pass.circuitName.includes('All-Access') || pass.circuitName.includes('All Access') || pass.circuitName.includes('Corridor Pass'))) {
    return true;
  }

  return false;
}

export function getOfflineLedgerEntries() {
  try {
    const raw = localStorage.getItem(LEDGER_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    if (import.meta.env.DEV) console.warn('[Turnstile Ledger] Read notice:', e);
    return [];
  }
}

export function saveOfflineLedgerEntries(entries) {
  try {
    localStorage.setItem(LEDGER_KEY, JSON.stringify(entries));
    window.dispatchEvent(new CustomEvent('globetrotter-ledger-updated', { detail: { count: entries.length } }));
  } catch (e) {
    if (import.meta.env.DEV) console.warn('[Turnstile Ledger] Write notice:', e);
  }
}

export function getAdmittedPasses() {
  try {
    const raw = localStorage.getItem(ADMITTED_SET_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function recordAdmittedPass(token, placeId) {
  try {
    const admitted = getAdmittedPasses();
    const key = `${token.trim()}::${placeId}`;
    admitted[key] = {
      admittedAt: new Date().toISOString(),
      timestamp: Date.now()
    };
    localStorage.setItem(ADMITTED_SET_KEY, JSON.stringify(admitted));
  } catch (e) {
    if (import.meta.env.DEV) console.warn('[Turnstile Ledger] Replay cache notice:', e);
  }
}

export function markPassVisited(tokenOrRef, placeId = 1, placeName = 'Borra Caves', gateName = 'Gate 01') {
  try {
    recordAdmittedPass(tokenOrRef, placeId);
    const raw = localStorage.getItem('globetrotter_passes');
    if (!raw) return;
    const passes = JSON.parse(raw);
    if (!Array.isArray(passes)) return;

    const clean = tokenOrRef.trim().toUpperCase();
    let modified = false;
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const nowDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    passes.forEach((p) => {
      if (!p) return;
      const refMatch = p.reference && p.reference.toUpperCase() === clean;
      const tokenMatch = p.token && (p.token === tokenOrRef || p.token.includes(tokenOrRef) || tokenOrRef.includes(p.reference));
      if (refMatch || tokenMatch) {
        if (!p.visitedPlaces) p.visitedPlaces = [];
        const alreadyInList = p.visitedPlaces.some(v => 
          v.placeId === Number(placeId) || 
          (v.name && placeName && v.name.toLowerCase().includes(placeName.toLowerCase()))
        );
        if (!alreadyInList) {
          p.visitedPlaces.push({
            placeId: Number(placeId),
            name: placeName,
            time: nowTime,
            date: nowDate,
            gate: gateName
          });
          if (placeName.toLowerCase().includes('borra')) {
            p.isBorraCavesVisited = true;
          }
          modified = true;
        }
      }
    });

    if (modified) {
      localStorage.setItem('globetrotter_passes', JSON.stringify(passes));
      window.dispatchEvent(new CustomEvent('pass-visited-updated', { detail: { placeId, placeName } }));
    }
  } catch (e) {
    if (import.meta.env.DEV) console.warn('[Turnstile Ledger] markPassVisited notice:', e);
  }
}

/**
 * Searches local stored passes for matching reference or token
 */
function findLocalPass(tokenOrRef) {
  try {
    const raw = localStorage.getItem('globetrotter_passes');
    if (!raw) return null;
    const passes = JSON.parse(raw);
    if (!Array.isArray(passes)) return null;

    let target = (tokenOrRef || '').trim();
    const urlMatch = target.match(/[?&]t=([^&#]+)/);
    if (urlMatch && urlMatch[1]) {
      target = decodeURIComponent(urlMatch[1]).trim();
    }
    const clean = target.toUpperCase();
    return passes.find((p) => {
      if (!p) return false;
      const refMatch = p.reference && p.reference.toUpperCase() === clean;
      const tokenMatch = p.token && (p.token === target || target.includes(p.token) || (p.reference && target.includes(p.reference)));
      return refMatch || tokenMatch;
    });
  } catch {
    return null;
  }
}

/**
 * Offline Turnstile Verification
 * Evaluates pass validity via real HMAC-SHA256 signature check, location matching, and anti-revisit.
 */
export async function verifyPassOffline(
  passToken, 
  placeId = 1, 
  gateTerminalId = 'Gate-01',
  checkpointName = 'Borra Caves',
  keyword = 'borra'
) {
  if (!passToken || typeof passToken !== 'string') {
    return {
      valid: false,
      status: 'INVALID_FORMAT',
      message: 'Scanner Error: Empty or malformed ticket payload'
    };
  }

  let cleanToken = passToken.trim();
  const urlMatch = cleanToken.match(/[?&]t=([^&#]+)/);
  if (urlMatch && urlMatch[1]) {
    cleanToken = decodeURIComponent(urlMatch[1]).trim();
  }
  const numPlaceId = Number(placeId);
  const kw = (keyword || '').toLowerCase();

  // 1. Anti-Passback / Replay Protection Check
  const admitted = getAdmittedPasses();
  const replayKey = `${cleanToken}::${numPlaceId}`;
  const localMatchCheck = findLocalPass(cleanToken);
  const refReplayKey = localMatchCheck ? `${localMatchCheck.reference}::${numPlaceId}` : null;
  const isAlreadyVisited = 
    Boolean(admitted[replayKey]) ||
    Boolean(refReplayKey && admitted[refReplayKey]) ||
    Boolean(localMatchCheck?.visitedPlaces?.some(v => v.placeId === numPlaceId || (v.name && kw && v.name.toLowerCase().includes(kw))));

  if (isAlreadyVisited) {
    const priorEntry = admitted[replayKey] || (refReplayKey ? admitted[refReplayKey] : null);
    return {
      valid: false,
      isPassback: true,
      status: 'PASSBACK_REJECTED',
      message: `Entry Denied: Single admission for ${checkpointName} was already redeemed. Re-entry is strictly prohibited.`,
      priorTimestamp: priorEntry?.admittedAt || new Date().toISOString()
    };
  }

  // 2. Real Cryptographic HMAC-SHA256 Verification (for GT_PASS tokens)
  if (cleanToken.startsWith('GT_PASS:')) {
    const cryptoResult = await verifyPassCryptographicSignature(cleanToken);

    if (!cryptoResult.valid) {
      return {
        valid: false,
        isCryptographic: true,
        status: cryptoResult.status,
        message: cryptoResult.message
      };
    }

    const ref = cryptoResult.bookingRef || 'GT-SIGNED-PASS';
    const localMatch = findLocalPass(ref);
    const touristName = localMatch?.touristName || 'Verified Passholder';

    if (localMatch && !isPassValidForLocation(localMatch, numPlaceId, kw, checkpointName)) {
      const passTarget = localMatch.circuitName || localMatch.destination || 'other attractions';
      return {
        valid: false,
        isCryptographic: true,
        status: 'LOCATION_MISMATCH',
        message: `Entry Denied: Pass is only valid for "${passTarget}". Not valid for entry at ${checkpointName}.`,
        bookingReference: ref,
        touristName
      };
    }

    markPassVisited(ref, numPlaceId, checkpointName, gateTerminalId);
    recordAdmittedPass(cleanToken, numPlaceId);

    const newEntry = {
      id: `scan_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      passToken: cleanToken,
      placeId: numPlaceId,
      gateTerminalId,
      verifiedAt: new Date().toISOString(),
      displayTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      syncStatus: 'PENDING_BATCH_SYNC',
      reference: ref,
      corridor: checkpointName,
      verificationMethod: 'HMAC_SHA256_WEB_CRYPTO'
    };

    const existingEntries = getOfflineLedgerEntries();
    saveOfflineLedgerEntries([newEntry, ...existingEntries]);

    return {
      valid: true,
      isCryptographic: true,
      status: 'CRYPTO_VERIFIED',
      message: `Entry Granted • Admit 1 (${checkpointName})`,
      bookingReference: ref,
      touristName,
      timestamp: newEntry.displayTime,
      offlineEntryId: newEntry.id
    };
  }

  // 3. Sovereign Reference Code Verification (e.g. APTG-89421 or GT-2026-XXXXX)
  const localPass = findLocalPass(cleanToken);

  if (localPass) {
    if (!isPassValidForLocation(localPass, numPlaceId, kw, checkpointName)) {
      const passTarget = localPass.circuitName || localPass.destination || 'other attractions';
      return {
        valid: false,
        isCryptographic: false,
        status: 'LOCATION_MISMATCH',
        message: `Entry Denied: Pass is issued for "${passTarget}". It does not grant entry to ${checkpointName}.`,
        bookingReference: localPass.reference,
        touristName: localPass.touristName || 'Ticket Holder'
      };
    }

    markPassVisited(localPass.reference, numPlaceId, checkpointName, gateTerminalId);
    recordAdmittedPass(cleanToken, numPlaceId);

    const newEntry = {
      id: `scan_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      passToken: cleanToken,
      placeId: numPlaceId,
      gateTerminalId,
      verifiedAt: new Date().toISOString(),
      displayTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      syncStatus: 'PENDING_BATCH_SYNC',
      reference: localPass.reference,
      corridor: checkpointName,
      verificationMethod: 'LOCAL_BOOKING_LEDGER'
    };

    const existingEntries = getOfflineLedgerEntries();
    saveOfflineLedgerEntries([newEntry, ...existingEntries]);

    return {
      valid: true,
      isCryptographic: false,
      status: 'LOCAL_LEDGER_ADMITTED',
      message: `Entry Granted • Admit 1 (${checkpointName})`,
      bookingReference: localPass.reference,
      touristName: localPass.touristName || 'Verified Visitor',
      timestamp: newEntry.displayTime,
      offlineEntryId: newEntry.id
    };
  }

  // Reject unknown tickets that have no verified booking
  return {
    valid: false,
    isCryptographic: false,
    status: 'UNKNOWN_TICKET',
    message: `Entry Denied: No valid booking record found for ${checkpointName}.`,
    bookingReference: cleanToken,
    touristName: 'Unregistered Visitor'
  };
}

/**
 * Returns offline ledger stats
 */
export function getLedgerStats() {
  const entries = getOfflineLedgerEntries();
  const pending = entries.filter((e) => e.syncStatus === 'PENDING_BATCH_SYNC').length;
  const synced = entries.filter((e) => e.syncStatus === 'SYNCED_TO_CORE').length;
  return {
    total: entries.length,
    pending,
    synced,
    entries
  };
}

/**
 * Batch-syncs all pending offline scans to Spring Boot Central Core
 */
export async function syncLedgerToCentralCore() {
  const entries = getOfflineLedgerEntries();
  const pendingScans = entries.filter((e) => e.syncStatus === 'PENDING_BATCH_SYNC');

  if (pendingScans.length === 0) {
    return {
      syncedCount: 0,
      message: 'No pending offline scans. All records are synchronized.'
    };
  }

  // Construct Spring Boot ScanRequest payload array
  const syncPayload = pendingScans.map((s) => ({
    passToken: s.passToken,
    placeId: s.placeId,
    gateTerminalId: s.gateTerminalId || 'Edge-Turnstile-Offline'
  }));

  try {
    const response = await scannerService.batchSyncOfflineScans(syncPayload);
    
    // Mark these as synced in local ledger
    const pendingIds = new Set(pendingScans.map((s) => s.id));
    const updatedEntries = entries.map((entry) => {
      if (pendingIds.has(entry.id)) {
        return {
          ...entry,
          syncStatus: 'SYNCED_TO_CORE',
          syncedAt: new Date().toISOString()
        };
      }
      return entry;
    });

    saveOfflineLedgerEntries(updatedEntries);

    return {
      success: true,
      syncedCount: pendingScans.length,
      response,
      message: `Successfully synchronized ${pendingScans.length} offline check-in records.`
    };
  } catch (error) {
    if (import.meta.env.DEV) console.warn('[Turnstile Ledger] Batch sync notice:', error);
    throw new Error(error.message || 'Batch sync to Gateway Core failed. Will retry on next heartbeat.');
  }
}
