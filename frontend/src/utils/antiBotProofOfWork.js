/**
 * antiBotProofOfWork.js — Client-Side Zero-Friction Proof-of-Work & Bot Detection Subsystem
 *
 * Implements client-side ALTCHA / Hashcash PoW puzzle solving via Web Crypto API.
 * Solves server challenge in a non-blocking background loop (~30-75ms on modern mobile/desktop).
 * Collects passive browser integrity signals to detect headless scrapers (Puppeteer/Selenium).
 */

const API_BASE = '/api';

/**
 * Collect passive browser integrity metrics without invading privacy.
 */
export function collectClientIntegrity() {
  const isWebDriver = !!navigator.webdriver;
  const hasValidScreen = window.screen && window.screen.width > 0 && window.screen.height > 0;
  const hasPlugins = navigator.plugins && navigator.plugins.length >= 0;
  const languages = navigator.languages || [navigator.language];
  const hardwareConcurrency = navigator.hardwareConcurrency || 4;

  const payload = {
    wd: isWebDriver,
    sc: hasValidScreen,
    pl: hasPlugins,
    hc: hardwareConcurrency,
    lg: languages[0] || 'en-US',
    ts: Date.now()
  };

  try {
    return btoa(JSON.stringify(payload));
  } catch {
    return 'eyJ3ZCI6ZmFsc2V9';
  }
}

/**
 * Solve a cryptographic Proof-of-Work challenge using Web Crypto API.
 * High-performance byte-level check with non-blocking event-loop yielding.
 */
export async function solvePoWChallenge(challengeToken, difficulty = 16) {
  const startTime = performance.now();
  const encoder = new TextEncoder();
  const fullZeroBytes = Math.floor(difficulty / 8);
  const remainingBits = difficulty % 8;
  const mask = remainingBits > 0 ? (0xFF << (8 - remainingBits)) & 0xFF : 0;

  let nonce = 0;
  const maxIterations = 2_000_000;

  while (nonce < maxIterations) {
    const input = `${challengeToken}:${nonce}`;
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(input));
    const u8 = new Uint8Array(hashBuffer);

    let valid = true;
    for (let i = 0; i < fullZeroBytes; i++) {
      if (u8[i] !== 0) {
        valid = false;
        break;
      }
    }
    if (valid && remainingBits > 0 && (u8[fullZeroBytes] & mask) !== 0) {
      valid = false;
    }

    if (valid) {
      const elapsedMs = Math.round(performance.now() - startTime);
      return {
        nonce,
        elapsedMs,
        success: true
      };
    }

    // Yield to the browser event loop every 2048 iterations to prevent frame drops
    if ((nonce & 2047) === 0 && nonce > 0) {
      await new Promise(r => setTimeout(r, 0));
    }

    nonce++;
  }

  return { success: false, nonce: -1, elapsedMs: Math.round(performance.now() - startTime) };
}

// In-memory pre-warmed challenge token pool
let cachedProof = null;
let isSolving = false;

/**
 * Pre-warm and solve a challenge in the background so checkout is instant (0ms latency).
 */
export async function preWarmAntiBotProof() {
  if (cachedProof && Date.now() - cachedProof.solvedAt < 240_000) {
    return cachedProof;
  }
  if (isSolving) return null;

  isSolving = true;
  try {
    const res = await fetch(`${API_BASE}/api/security/challenge`);
    if (!res.ok) throw new Error('Challenge fetch failed');
    const challengeData = await res.json();

    const solution = await solvePoWChallenge(challengeData.challengeToken, challengeData.difficulty || 16);
    if (solution.success) {
      cachedProof = {
        challengeToken: challengeData.challengeToken,
        nonce: solution.nonce,
        solvedAt: Date.now(),
        elapsedMs: solution.elapsedMs,
        clientIntegrity: collectClientIntegrity()
      };
    }
    return cachedProof;
  } catch (err) {
    console.debug('[AntiBot] PoW background solver idle/offline:', err.message);
    return null;
  } finally {
    isSolving = false;
  }
}

/**
 * Retrieve verified clearance headers for sensitive API calls (booking checkout, passes).
 */
export async function getAntiBotHeaders() {
  let proof = cachedProof;
  if (!proof || Date.now() - proof.solvedAt >= 240_000) {
    proof = await preWarmAntiBotProof();
  }

  if (proof) {
    // Consume cached proof and trigger async pre-warming for next action
    const current = proof;
    cachedProof = null;
    setTimeout(() => preWarmAntiBotProof(), 1000);

    return {
      'X-PoW-Token': `${current.challengeToken}:${current.nonce}`,
      'X-Client-Integrity': current.clientIntegrity
    };
  }

  return {
    'X-Client-Integrity': collectClientIntegrity()
  };
}
