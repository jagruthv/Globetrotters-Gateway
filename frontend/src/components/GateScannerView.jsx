import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Scan, 
  CheckCircle, 
  XCircle, 
  Terminal, 
  Zap, 
  RefreshCw, 
  Wifi, 
  WifiOff, 
  Database, 
  UploadCloud, 
  ShieldCheck, 
  AlertTriangle,
  FileSpreadsheet
} from 'lucide-react';
import { scannerService } from '../services/api';
import { 
  verifyPassOffline, 
  getLedgerStats, 
  syncLedgerToCentralCore 
} from '../utils/offlineTurnstileLedger';

function playTurnstileChime(isGranted) {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (isGranted) {
      // Harmonious double chime (D5 -> A5)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.setValueAtTime(880.00, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
      osc.start();
      osc.stop(ctx.currentTime + 0.28);
    } else {
      // Low dual buzzer (140 Hz sawtooth)
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, ctx.currentTime);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.32);
      osc.start();
      osc.stop(ctx.currentTime + 0.32);
    }
  } catch {
    // Graceful silence if AudioContext not allowed
  }
}

export default function GateScannerView({ passData = null }) {
  const [testToken, setTestToken] = useState(
    passData?.token || 'GT_PASS:89421-AP-TG:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
  );
  const [selectedPlaceId, setSelectedPlaceId] = useState(1);
  const [verificationResult, setVerificationResult] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState(null);

  // Network & Offline Edge state
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [simulateBlackout, setSimulateBlackout] = useState(false);
  const [ledgerStats, setLedgerStats] = useState(() => getLedgerStats());

  const [scanLog, setScanLog] = useState([
    { id: 1, text: 'Turnstile Terminal Alpha-01 Initialized • Ed25519 & HMAC Active', time: '10:00:00 AM', status: 'INFO' }
  ]);

  // Keep token synced if user issued new pass from Hero/Booking
  const [prevPassToken, setPrevPassToken] = useState(passData?.token);
  if (passData?.token && passData.token !== prevPassToken) {
    setPrevPassToken(passData.token);
    setTestToken(passData.token);
  }

  // Monitor network status & ledger changes
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    const handleLedgerUpdate = () => setLedgerStats(getLedgerStats());

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('globetrotter-ledger-updated', handleLedgerUpdate);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('globetrotter-ledger-updated', handleLedgerUpdate);
    };
  }, []);

  const effectiveOffline = !isOnline || simulateBlackout;

  const handleVerifyPass = async () => {
    setIsVerifying(true);
    setVerificationResult(null);
    setSyncStatusMsg(null);

    // Case 1: Operating in 0% Cellular Blackout (Edge Turnstile Engine)
    if (effectiveOffline) {
      setTimeout(() => {
        const offRes = verifyPassOffline(testToken, selectedPlaceId, 'Turnstile-Alpha-01');
        setIsVerifying(false);

        if (offRes.valid) {
          playTurnstileChime(true);
          setVerificationResult({
            success: true,
            isOffline: true,
            message: offRes.message,
            touristName: offRes.touristName,
            reference: offRes.bookingReference,
            timestamp: offRes.timestamp
          });
          setScanLog((prev) => [
            { id: Date.now(), text: `[OFFLINE PASS GRANTED]: ${testToken.slice(0, 18)}... (Logged in Flash Ledger)`, time: offRes.timestamp, status: 'OFFLINE_OK' },
            ...prev
          ]);
        } else {
          playTurnstileChime(false);
          setVerificationResult({
            success: false,
            isOffline: true,
            isPassback: offRes.isPassback,
            message: offRes.message,
            timestamp: new Date().toLocaleTimeString()
          });
          setScanLog((prev) => [
            { id: Date.now(), text: `[ENTRY DENIED]: ${offRes.message}`, time: new Date().toLocaleTimeString(), status: 'ERROR' },
            ...prev
          ]);
        }
        setLedgerStats(getLedgerStats());
      }, 250);
      return;
    }

    // Case 2: Standard Online Mode -> Call Spring Boot Core
    try {
      const result = await scannerService.scanPass(testToken, selectedPlaceId, 'Gate-Terminal-Alpha-01');
      playTurnstileChime(true);
      setVerificationResult({
        success: true,
        isOffline: false,
        message: result.message || 'Pass Verified • Entry Gate Open',
        touristName: result.touristName || 'Verified Visitor',
        reference: result.bookingReference || 'GT-2026-APTG-89421',
        timestamp: new Date().toLocaleTimeString()
      });

      setScanLog((prev) => [
        { id: Date.now(), text: `PASS VALID (CLOUD CORE): ${testToken.slice(0, 18)}...`, time: new Date().toLocaleTimeString(), status: 'SUCCESS' },
        ...prev
      ]);
    } catch (err) {
      // Fallback: If network fetch failed, switch seamlessly to offline ledger
      if (err.message && (err.message.includes('fetch') || err.message.includes('NetworkError') || err.message.includes('Failed to fetch'))) {
        console.warn('[Turnstile Sentinel] Network unreachable. Falling back to Edge Ledger...');
        const offRes = verifyPassOffline(testToken, selectedPlaceId, 'Turnstile-Alpha-01');
        if (offRes.valid) {
          playTurnstileChime(true);
          setVerificationResult({
            success: true,
            isOffline: true,
            message: 'Network Unreachable • Auto-Fallback to Offline Flash Ledger (Entry Granted)',
            touristName: offRes.touristName,
            reference: offRes.bookingReference,
            timestamp: offRes.timestamp
          });
          setScanLog((prev) => [
            { id: Date.now(), text: `[FALLBACK OFFLINE GRANTED]: ${testToken.slice(0, 18)}...`, time: offRes.timestamp, status: 'OFFLINE_OK' },
            ...prev
          ]);
        } else {
          playTurnstileChime(false);
          setVerificationResult({
            success: false,
            isOffline: true,
            isPassback: offRes.isPassback,
            message: offRes.message,
            timestamp: new Date().toLocaleTimeString()
          });
        }
        setLedgerStats(getLedgerStats());
      } else {
        // True server rejection (e.g. invalid signature, already used)
        playTurnstileChime(false);
        const isPassback = err.message?.toLowerCase().includes('already used');
        setVerificationResult({
          success: false,
          isOffline: false,
          isPassback,
          message: err.message || 'Verification Failed: Invalid or expired pass',
          timestamp: new Date().toLocaleTimeString()
        });

        setScanLog((prev) => [
          { id: Date.now(), text: `ENTRY DENIED: ${err.message}`, time: new Date().toLocaleTimeString(), status: 'ERROR' },
          ...prev
        ]);
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleBatchSync = async () => {
    setIsSyncing(true);
    setSyncStatusMsg(null);
    try {
      const res = await syncLedgerToCentralCore();
      setSyncStatusMsg({ success: true, text: res.message });
      setLedgerStats(getLedgerStats());
      setScanLog((prev) => [
        { id: Date.now(), text: `[CORE SYNC COMPLETED]: ${res.syncedCount} records pushed to Central Spring Boot Core`, time: new Date().toLocaleTimeString(), status: 'SUCCESS' },
        ...prev
      ]);
    } catch (err) {
      setSyncStatusMsg({ success: false, text: err.message });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <section id="gate-scanner" className="relative w-full py-24 px-4 md:px-12 bg-[#06080D] text-slate-200">
      <div className="max-w-5xl mx-auto flex flex-col gap-10">
        
        {/* Header */}
        <div className="flex flex-col items-center text-center gap-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20">
            <Scan className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-cyan-300 font-sans-clean">
              Turnstile Gate Entry Sentinel • 0% Cellular Blackout PWA
            </span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white font-sans-clean">
            Attraction Gate Entry Scanner
          </h2>
          <p className="text-sm md:text-base text-slate-400 max-w-2xl leading-relaxed">
            Engineered for subterranean caverns (Borra Caves, Belum Caves) and deep forest ghats with zero cellular coverage. 
            Verifies cryptographic HMAC-SHA256 tokens locally and writes to an append-only turnstile flash ledger.
          </p>

          {/* Network Sentinel & Blackout Simulator Control Bar */}
          <div className="flex flex-wrap items-center justify-center gap-4 mt-2 p-2.5 rounded-2xl bg-white/[0.03] border border-white/10 text-xs">
            {/* Live Network Indicator */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/40 border border-white/5">
              {effectiveOffline ? (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-amber-300 font-semibold text-[11px] font-sans-clean">
                    0% Cellular Mode • Local Edge Turnstile Active
                  </span>
                </>
              ) : (
                <>
                  <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300 font-semibold text-[11px] font-sans-clean">
                    Gateway Cloud Core Online
                  </span>
                </>
              )}
            </div>

            {/* Simulation Toggle */}
            <label className="flex items-center gap-2.5 cursor-pointer px-3 py-1.5 rounded-xl bg-white/[0.02] border border-white/10 hover:border-cyan-500/40 transition-colors">
              <input
                type="checkbox"
                checked={simulateBlackout}
                onChange={(e) => setSimulateBlackout(e.target.checked)}
                className="w-4 h-4 rounded text-cyan-500 focus:ring-0 cursor-pointer accent-cyan-400"
              />
              <span className="text-slate-300 font-medium text-[11px] font-sans-clean">
                Simulate 0% Cellular Blackout (Borra/Belum Mode)
              </span>
            </label>

            {/* Offline Flash Ledger Counter */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-cyan-950/30 border border-cyan-500/20 text-cyan-300 text-[11px] font-mono">
              <Database className="w-3 h-3 text-cyan-400" />
              <span>Pending Scans: <strong className="text-white">{ledgerStats.pending}</strong></span>
            </div>
          </div>
        </div>

        {/* Main Terminal HUD */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          
          {/* Left Column: Verification Scanner Interface (7 Cols) */}
          <div className="md:col-span-7">
            <div className="doppelrand">
              <div className="doppelrand-inner p-6 flex flex-col gap-6">
                
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${effectiveOffline ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                    <span className="text-xs font-bold text-white font-sans-clean tracking-wider">
                      TURNSTILE ALPHA-01 • {effectiveOffline ? 'STANDALONE EDGE MODE' : 'CORE CONNECTED'}
                    </span>
                  </div>
                  <span className={`text-[10px] font-sans-clean font-medium ${effectiveOffline ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {effectiveOffline ? '0% Cellular Buffer' : 'Online & Ready'}
                  </span>
                </div>

                {/* Loaded Pass Banner */}
                {passData?.reference && (
                  <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-between text-xs text-cyan-300 font-sans-clean">
                    <div className="flex items-center gap-2">
                      <Zap className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Loaded Pass: <strong>{passData.reference}</strong> ({passData.touristName || 'Visitor'})</span>
                    </div>
                    <span className="text-[10px] text-emerald-400 font-medium">Auto-Fed</span>
                  </div>
                )}

                {/* Token Input Field with GSAP Laser Reticle */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs text-slate-300 font-medium font-sans-clean flex items-center justify-between">
                    <span>Digital Pass Code / QR Token</span>
                    {isVerifying && (
                      <span className="text-[10px] text-cyan-300 font-mono animate-pulse">Verifying Security Token...</span>
                    )}
                  </label>
                  <div className="relative rounded-xl overflow-hidden">
                    <textarea
                      rows={3}
                      value={testToken}
                      onChange={(e) => setTestToken(e.target.value)}
                      placeholder="Enter or paste tourist pass code..."
                      className="w-full p-3 rounded-xl bg-white/[0.03] border border-white/10 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-400/50 resize-none"
                    />
                  </div>
                </div>

                {/* Attraction Terminal Select */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs text-slate-300 font-medium font-sans-clean">
                    Select Gate Checkpoint
                  </label>
                  <select
                    value={selectedPlaceId}
                    onChange={(e) => setSelectedPlaceId(Number(e.target.value))}
                    className="w-full h-11 px-3 rounded-xl bg-[#0B0F17] border border-white/10 text-xs text-slate-200 font-sans-clean focus:outline-none focus:border-cyan-400/50"
                  >
                    <option value={1}>1 • Araku Tribal Museum (Alluri Sitharama Raju)</option>
                    <option value={2}>2 • Borra Caves Subterranean Gate (Alluri Sitharama Raju)</option>
                    <option value={3}>3 • Belum Caves Karst Passage (Nandyal)</option>
                    <option value={4}>4 • Coringa Mangrove Boardwalk (Kakinada)</option>
                    <option value={5}>5 • Golconda Fort Acoustic Portico (Hyderabad)</option>
                    <option value={6}>6 • Ramappa Temple UNESCO Sanctum (Mulugu)</option>
                    <option value={7}>7 • Gandikota Fort Gorge View (YSR Kadapa)</option>
                  </select>
                </div>

                {/* Scan Trigger Button */}
                <button
                  disabled={isVerifying || !testToken}
                  onClick={handleVerifyPass}
                  className="w-full py-3.5 rounded-full bg-cyan-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 hover:bg-cyan-300 transition-colors duration-150 shadow-md disabled:bg-slate-800 disabled:text-slate-500 font-sans-clean cursor-pointer"
                >
                  {isVerifying ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Verifying Pass Against Edge Cipher...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      <span>{effectiveOffline ? 'Scan Pass (Offline Edge Turnstile)' : 'Scan Pass & Open Entry Gate'}</span>
                    </>
                  )}
                </button>

                {/* Verification Result Display Card */}
                {verificationResult && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`p-4 rounded-xl border flex items-start gap-3.5 ${
                      verificationResult.success
                        ? 'bg-emerald-500/10 border-emerald-400/40 text-emerald-300'
                        : 'bg-red-500/10 border-red-500/30 text-red-300'
                    }`}
                  >
                    {verificationResult.success ? (
                      <CheckCircle className="w-5 h-5 flex-shrink-0 text-emerald-400 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 flex-shrink-0 text-red-400 mt-0.5" />
                    )}
                    <div className="flex flex-col text-xs font-sans-clean w-full">
                      <div className="flex items-center justify-between">
                        <span className={`font-bold text-sm tracking-wide ${
                          verificationResult.success ? 'text-emerald-300' : 'text-red-300'
                        }`}>
                          {verificationResult.success ? 'ACCESS GRANTED • TURNSTILE OPEN' : 'ACCESS DENIED • TURNSTILE LOCKED'}
                        </span>
                        {verificationResult.isOffline && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-mono border border-amber-400/30 font-bold">
                            OFFLINE EDGE
                          </span>
                        )}
                      </div>
                      <span className="mt-1 text-slate-200">{verificationResult.message}</span>
                      {verificationResult.touristName && (
                        <span className="text-slate-400 mt-1 font-mono text-[11px]">
                          Passholder: {verificationResult.touristName} • Ref: {verificationResult.reference}
                        </span>
                      )}
                      {verificationResult.isPassback && (
                        <div className="mt-2 p-2 rounded-lg bg-red-950/40 border border-red-500/40 text-red-200 text-[11px] flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                          <span>Replay Attack Prevented: Token already logged in turnstile lock-table.</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

              </div>
            </div>
          </div>

          {/* Right Column: Check-in Activity Log & Batch Sync HUD (5 Cols) */}
          <div className="md:col-span-5 flex flex-col gap-4">
            
            {/* Batch-Sync Panel */}
            <div className="p-4 rounded-2xl bg-black/50 border border-white/10 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-bold text-white font-sans-clean">
                    End-of-Day Core Sync Sentinel
                  </span>
                </div>
                <span className="text-[10px] font-mono text-cyan-400">
                  {ledgerStats.pending} Pending
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-sans-clean leading-relaxed">
                When mobile or optical satellite sync becomes available, push all offline check-in records to the central Spring Boot reconciliation ledger.
              </p>

              <button
                disabled={isSyncing || ledgerStats.pending === 0}
                onClick={handleBatchSync}
                className="w-full py-2.5 rounded-xl bg-white/[0.04] hover:bg-cyan-500/10 border border-white/10 hover:border-cyan-400/40 text-slate-200 hover:text-cyan-300 font-semibold text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed font-sans-clean cursor-pointer"
              >
                {isSyncing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                    <span>Reconciling Ledger...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Synchronize {ledgerStats.pending} Scans to Cloud Core</span>
                  </>
                )}
              </button>

              <a
                href="http://localhost:8085/api/admin/analytics/export-csv"
                download="globetrotter_daily_tourism_report.csv"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 hover:border-emerald-400/60 text-emerald-300 hover:text-emerald-200 font-semibold text-xs flex items-center justify-center gap-2 transition-all font-sans-clean cursor-pointer no-underline"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Export Daily Audit CSV (Tourism Officer Report)</span>
              </a>

              {syncStatusMsg && (
                <div className={`p-2.5 rounded-lg text-[11px] font-sans-clean ${
                  syncStatusMsg.success ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/30' : 'bg-red-950/40 text-red-300 border border-red-500/30'
                }`}>
                  {syncStatusMsg.text}
                </div>
              )}
            </div>

            {/* Live Log */}
            <div className="p-5 rounded-[2rem] bg-black/60 border border-white/10 flex flex-col gap-3.5 flex-1">
              <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-bold text-white font-sans-clean">
                    Turnstile Flash Log
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-sans-clean">
                  Live Buffer
                </span>
              </div>

              <div className="space-y-2 overflow-y-auto max-h-[300px] scrollbar-none flex-1 text-[11px] font-mono">
                {scanLog.map((log) => (
                  <div
                    key={log.id}
                    className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5 flex flex-col gap-1"
                  >
                    <div className="flex items-center justify-between text-[10px]">
                      <span className={`font-bold ${
                        log.status === 'SUCCESS' ? 'text-emerald-400' :
                        log.status === 'OFFLINE_OK' ? 'text-amber-400' :
                        log.status === 'ERROR' ? 'text-red-400' : 'text-slate-400'
                      }`}>
                        [{log.status}]
                      </span>
                      <span className="text-slate-500 font-sans-clean">{log.time}</span>
                    </div>
                    <span className="text-slate-300 break-words">{log.text}</span>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-white/10 text-[10px] text-slate-400 font-sans-clean text-center">
                ACID Lock & Anti-Passback enforced at local turnstile memory
              </div>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
