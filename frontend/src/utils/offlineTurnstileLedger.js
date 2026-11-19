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

export function isPassValidForLocation(pass, locationId = 2, keyword = 'borra') {
  if (!pass) return false;
  const kw = keyword.toLowerCase();

  // Check array of destinations
  if (Array.isArray(pass.destinations) && pass.destinations.some(d => typeof d === 'string' && d.toLowerCase().includes(kw))) {
    return true;
  }
  // Check array of places allowed
  if (Array.isArray(pass.placesAllowed) && pass.placesAllowed.some(p => typeof p === 'string' && p.toLowerCase().includes(kw))) {
    return true;
  }
  // Check circuit name
  if (typeof pass.circuitName === 'string' && pass.circuitName.toLowerCase().includes(kw)) {
    return true;
  }
  // Check single destination
  if (typeof pass.destination === 'string' && pass.destination.toLowerCase().includes(kw)) {
    return true;
  }
  // Check circuit ID
  if (pass.circuitId === Number(locationId) || String(pass.circuitId).toLowerCase().includes(kw)) {
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

export function markPassVisited(tokenOrRef, placeId = 2, placeName = 'Borra Caves') {
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
        const alreadyInList = p.visitedPlaces.some(v => v.placeId === Number(placeId) || (v.name && v.name.toLowerCase().includes(placeName.toLowerCase())));
        if (!alreadyInList) {
          p.visitedPlaces.push({
            placeId: Number(placeId),
            name: placeName,
            time: nowTime,
            date: nowDate,
            gate: 'Gate B2 • Turnstile 01'
          });
          p.isBorraCavesVisited = true;
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

    const clean = tokenOrRef.trim().toUpperCase();
    return passes.find((p) => {
      if (!p) return false;
      const refMatch = p.reference && p.reference.toUpperCase() === clean;
      const tokenMatch = p.token && (p.token === tokenOrRef || p.token.includes(tokenOrRef));
      return refMatch || tokenMatch;
    });
  } catch {
    return null;
  }
}

/**
 * Offline Turnstile Verification
 * Evaluates pass validity via real HMAC-SHA256 signature check and enforces anti-passback.
 */
export async function verifyPassOffline(passToken, placeId, gateTerminalId = 'Gate-Alpha-01') {
  if (!passToken || typeof passToken !== 'string') {
    return {
      valid: false,
      status: 'INVALID_FORMAT',
      message: 'Scanner Error: Empty or malformed pass payload'
    };
  }

  const cleanToken = passToken.trim();

  // 1. Anti-Passback / Replay Protection Check
  const admitted = getAdmittedPasses();
  const replayKey = `${cleanToken}::${placeId}`;
  const localMatchCheck = findLocalPass(cleanToken);
  const refReplayKey = localMatchCheck ? `${localMatchCheck.reference}::${placeId}` : null;
  const isAlreadyVisited = localMatchCheck?.visitedPlaces?.some(v => v.placeId === Number(placeId) || (v.name && v.name.toLowerCase().includes('borra'))) ||
                           localMatchCheck?.isBorraCavesVisited;

  if (admitted[replayKey] || (refReplayKey && admitted[refReplayKey]) || isAlreadyVisited) {
    const priorEntry = admitted[replayKey] || (refReplayKey ? admitted[refReplayKey] : null);
    return {
      valid: false,
      isPassback: true,
      status: 'PASSBACK_REJECTED',
      message: `Entry Denied: Tourist already visited Borra Caves. Single admission has been redeemed and cannot be reused.`,
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

    // Signature verified! Extract booking reference
    const ref = cryptoResult.bookingRef || 'GT-SIGNED-PASS';
    const localMatch = findLocalPass(ref);
    const touristName = localMatch?.touristName || 'Verified Corridor Passholder';

    // Verify whether pass includes Borra Caves
    if (localMatch && !isPassValidForLocation(localMatch, placeId, 'borra')) {
      const passTarget = localMatch.circuitName || localMatch.destination || 'other destinations';
      return {
        valid: false,
        isCryptographic: true,
        status: 'LOCATION_MISMATCH',
        message: `Entry Denied: Pass is only valid for "${passTarget}". Not valid for entry at Borra Caves.`,
        bookingReference: ref,
        touristName
      };
    }

    // Record admission and update tourist pass visited status
    markPassVisited(ref, placeId, 'Borra Caves');
    recordAdmittedPass(cleanToken, placeId);

    // Append to offline audit log
    const newEntry = {
      id: `scan_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      passToken: cleanToken,
      placeId: Number(placeId),
      gateTerminalId,
      verifiedAt: new Date().toISOString(),
      displayTime: new Date().toLocaleTimeString(),
      syncStatus: 'PENDING_BATCH_SYNC',
      reference: ref,
      corridor: 'AP-TG Heritage Corridor',
      verificationMethod: 'HMAC_SHA256_WEB_CRYPTO'
    };

    const existingEntries = getOfflineLedgerEntries();
    saveOfflineLedgerEntries([newEntry, ...existingEntries]);

    return {
      valid: true,
      isCryptographic: true,
      status: 'CRYPTO_VERIFIED',
      message: 'Pass Verified • HMAC-SHA256 Cryptographic Signature Valid',
      bookingReference: ref,
      touristName,
      timestamp: newEntry.displayTime,
      offlineEntryId: newEntry.id
    };
  }

  // 3. Sovereign Reference Code Verification (e.g. APTG-89421 or GT-2026-XXXXX)
  const localPass = findLocalPass(cleanToken);

  if (localPass) {
    if (!isPassValidForLocation(localPass, placeId, 'borra')) {
      const passTarget = localPass.circuitName || localPass.destination || 'another destination';
      return {
        valid: false,
        isCryptographic: false,
        status: 'LOCATION_MISMATCH',
        message: `Entry Denied: Pass is issued for "${passTarget}". It does not grant entry to Borra Caves.`,
        bookingReference: localPass.reference,
        touristName: localPass.touristName || 'Ticket Holder'
      };
    }

    markPassVisited(localPass.reference, placeId, 'Borra Caves');
    recordAdmittedPass(cleanToken, placeId);

    const newEntry = {
      id: `scan_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      passToken: cleanToken,
      placeId: Number(placeId),
      gateTerminalId,
      verifiedAt: new Date().toISOString(),
      displayTime: new Date().toLocaleTimeString(),
      syncStatus: 'PENDING_BATCH_SYNC',
      reference: localPass.reference,
      corridor: localPass.circuitName || 'AP-TG Heritage Corridor',
      verificationMethod: 'LOCAL_BOOKING_LEDGER'
    };

    const existingEntries = getOfflineLedgerEntries();
    saveOfflineLedgerEntries([newEntry, ...existingEntries]);

    return {
      valid: true,
      isCryptographic: false,
      status: 'LOCAL_LEDGER_ADMITTED',
      message: `Pass Verified • Booking Record Found (${localPass.circuitName || 'Heritage Pass'})`,
      bookingReference: localPass.reference,
      touristName: localPass.touristName || 'Verified Visitor',
      timestamp: newEntry.displayTime,
      offlineEntryId: newEntry.id
    };
  }

  // Reject unknown tickets that have no verified booking for Borra Caves
  return {
    valid: false,
    isCryptographic: false,
    status: 'UNKNOWN_TICKET',
    message: 'Entry Denied: No valid booking record found for Borra Caves.',
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
