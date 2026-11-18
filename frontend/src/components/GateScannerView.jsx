import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Scan, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Wifi, 
  WifiOff, 
  UploadCloud, 
  ShieldCheck, 
  AlertTriangle,
  FileSpreadsheet,
  ArrowLeft
} from 'lucide-react';
import { scannerService } from '../services/api';
import { 
  verifyPassOffline, 
  getLedgerStats, 
  syncLedgerToCentralCore 
} from '../utils/offlineTurnstileLedger';

function playScannerSound(isGranted) {
  try {
    const soundPref = localStorage.getItem('gt_sound_enabled');
    if (soundPref === 'false') return;

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (isGranted) {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.setValueAtTime(880.00, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
      osc.start();
      osc.stop(ctx.currentTime + 0.28);
    } else {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, ctx.currentTime);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.32);
      osc.start();
      osc.stop(ctx.currentTime + 0.32);
    }
  } catch {
    // Graceful fallback
  }
}

export default function GateScannerView({ passData = null, onExitStaffMode }) {
  const [testToken, setTestToken] = useState(
    passData?.token || 'GT_PASS:89421-AP-TG:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
  );
  const [selectedPlaceId, setSelectedPlaceId] = useState(1);
  const [verificationResult, setVerificationResult] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState(null);

  // Network & Offline Mode
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [workOffline, setWorkOffline] = useState(false);
  const [ledgerStats, setLedgerStats] = useState(() => getLedgerStats());

  const [scanLog, setScanLog] = useState([
    { id: 1, text: 'Gate Terminal Ready', time: '10:00 AM', status: 'INFO' }
  ]);

  // Keep token synced if user booked new pass
  const [prevPassToken, setPrevPassToken] = useState(passData?.token);
  if (passData?.token && passData.token !== prevPassToken) {
    setPrevPassToken(passData.token);
    setTestToken(passData.token);
  }

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

  const effectiveOffline = !isOnline || workOffline;

  const handleVerifyPass = async () => {
    setIsVerifying(true);
    setVerificationResult(null);
    setSyncStatusMsg(null);

    // Offline Verification
    if (effectiveOffline) {
      setTimeout(() => {
        const offRes = verifyPassOffline(testToken, selectedPlaceId, 'Gate-Terminal-01');
        setIsVerifying(false);

        if (offRes.valid) {
          playScannerSound(true);
          setVerificationResult({
            success: true,
            isOffline: true,
            message: offRes.message,
            touristName: offRes.touristName,
            reference: offRes.reference,
            timestamp: offRes.timestamp
          });

          setScanLog((prev) => [
            { id: Date.now(), text: `Pass Verified (Offline): ${offRes.reference || testToken.slice(0, 16)}`, time: offRes.timestamp, status: 'OFFLINE_OK' },
            ...prev
          ]);
        } else {
          playScannerSound(false);
          setVerificationResult({
            success: false,
            isOffline: true,
            isPassback: offRes.isPassback,
            message: offRes.message,
            timestamp: new Date().toLocaleTimeString()
          });

          setScanLog((prev) => [
            { id: Date.now(), text: `Scan Rejected: ${offRes.message}`, time: new Date().toLocaleTimeString(), status: 'ERROR' },
            ...prev
          ]);
        }
        setLedgerStats(getLedgerStats());
      }, 150);
      return;
    }

    // Online Verification
    try {
      const res = await scannerService.verifyPass({
        token: testToken,
        placeId: selectedPlaceId,
        turnstileId: 'Gate-Terminal-01'
      });

      playScannerSound(true);
      setVerificationResult({
        success: true,
        isOffline: false,
        message: res.message || 'Pass verified successfully. Gate unlocked.',
        touristName: res.touristName || 'Verified Visitor',
        reference: res.reference || testToken.slice(0, 16),
        timestamp: new Date().toLocaleTimeString()
      });

      setScanLog((prev) => [
        { id: Date.now(), text: `Pass Verified: ${res.reference || 'Visitor Pass'}`, time: new Date().toLocaleTimeString(), status: 'SUCCESS' },
        ...prev
      ]);
    } catch (err) {
      if (err.message && (err.message.includes('fetch') || err.message.includes('Network') || err.message.includes('Failed to fetch'))) {
        // Fallback to offline
        const offRes = verifyPassOffline(testToken, selectedPlaceId, 'Gate-Terminal-01');
        if (offRes.valid) {
          playScannerSound(true);
          setVerificationResult({
            success: true,
            isOffline: true,
            message: `${offRes.message} (Offline Mode)`,
            touristName: offRes.touristName,
            reference: offRes.reference,
            timestamp: offRes.timestamp
          });

          setScanLog((prev) => [
            { id: Date.now(), text: `Pass Verified (Offline Fallback): ${offRes.reference || testToken.slice(0, 16)}`, time: offRes.timestamp, status: 'OFFLINE_OK' },
            ...prev
          ]);
        } else {
          playScannerSound(false);
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
        playScannerSound(false);
        const isPassback = err.message?.toLowerCase().includes('already used');
        setVerificationResult({
          success: false,
          isOffline: false,
          isPassback,
          message: err.message || 'Verification Failed: Invalid or expired pass',
          timestamp: new Date().toLocaleTimeString()
        });

        setScanLog((prev) => [
          { id: Date.now(), text: `Scan Denied: ${err.message}`, time: new Date().toLocaleTimeString(), status: 'ERROR' },
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
        { id: Date.now(), text: `Sync complete: ${res.syncedCount} passes uploaded`, time: new Date().toLocaleTimeString(), status: 'SUCCESS' },
        ...prev
      ]);
    } catch (err) {
      setSyncStatusMsg({ success: false, text: err.message });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <section id="gate-scanner" className="relative w-full py-16 px-4 md:px-12 bg-[#06080D] text-slate-200">
      <div className="max-w-5xl mx-auto flex flex-col gap-8">
        
        {/* Top Return Anchor & Header */}
        <div className="flex flex-col gap-4">
          {onExitStaffMode && (
            <button
              onClick={onExitStaffMode}
              className="inline-flex items-center gap-2 text-xs font-semibold text-cyan-300 hover:text-cyan-200 transition-colors w-fit px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/10 hover:border-cyan-400/30 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Tourist View</span>
            </button>
          )}

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 mb-2">
                <Scan className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-[10px] uppercase tracking-wider font-semibold text-cyan-300 font-sans-clean">
                  Staff Verification Portal
                </span>
              </div>
              <h2 className="text-2xl md:text-4xl font-bold tracking-tight text-white font-sans-clean">
                Attraction Gate Pass Scanner
              </h2>
              <p className="text-xs md:text-sm text-slate-400 mt-1 max-w-xl">
                Scan visitor entry passes and record check-ins. Works continuously even at remote locations without internet.
              </p>
            </div>

            {/* Network Indicator & Offline Toggle */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/10 text-xs">
                {effectiveOffline ? (
                  <>
                    <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-amber-300 font-semibold text-xs">Offline Mode</span>
                  </>
                ) : (
                  <>
                    <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-300 font-semibold text-xs">Online</span>
                  </>
                )}
              </div>

              <label className="flex items-center gap-2 cursor-pointer px-3 py-1.5 rounded-xl bg-white/[0.02] border border-white/10 hover:border-white/20 transition-colors text-xs">
                <input
                  type="checkbox"
                  checked={workOffline}
                  onChange={(e) => setWorkOffline(e.target.checked)}
                  className="w-4 h-4 rounded text-cyan-500 accent-cyan-400 cursor-pointer"
                />
                <span className="text-slate-300 font-medium">Work Offline</span>
              </label>
            </div>
          </div>
        </div>

        {/* Main Scanner Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* Left Column: Verification Scanner Interface (7 Cols) */}
          <div className="md:col-span-7">
            <div className="rounded-3xl bg-[#0B0F17] border border-white/10 p-6 flex flex-col gap-5 shadow-xl">
              
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="text-xs font-bold text-white tracking-wide">
                  Scanner Terminal 01
                </span>
                <span className={`text-[11px] font-medium ${effectiveOffline ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {effectiveOffline ? 'Offline Ready' : 'System Connected'}
                </span>
              </div>

              {/* Pass Code / QR Input */}
              <div className="flex flex-col gap-2">
                <label className="text-xs text-slate-300 font-medium flex items-center justify-between">
                  <span>Pass Code or QR Token</span>
                  {isVerifying && (
                    <span className="text-[11px] text-cyan-300 animate-pulse">Checking pass...</span>
                  )}
                </label>
                <textarea
                  rows={3}
                  value={testToken}
                  onChange={(e) => setTestToken(e.target.value)}
                  placeholder="Paste or scan visitor pass token..."
                  className="w-full p-3 rounded-2xl bg-white/[0.03] border border-white/10 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-400/50 resize-none"
                />
              </div>

              {/* Attraction Gate Location Select */}
              <div className="flex flex-col gap-2">
                <label className="text-xs text-slate-300 font-medium">
                  Checkpoint Location
                </label>
                <select
                  value={selectedPlaceId}
                  onChange={(e) => setSelectedPlaceId(Number(e.target.value))}
                  className="w-full h-11 px-3 rounded-2xl bg-[#080B11] border border-white/10 text-xs text-slate-200 focus:outline-none focus:border-cyan-400/50"
                >
                  <option value={1}>1 • Araku Tribal Museum (Alluri Sitharama Raju)</option>
                  <option value={2}>2 • Borra Caves Main Gate (Alluri Sitharama Raju)</option>
                  <option value={3}>3 • Belum Caves Entrance (Nandyal)</option>
                  <option value={4}>4 • Coringa Mangrove Boardwalk (Kakinada)</option>
                  <option value={5}>5 • Golconda Fort Main Portico (Hyderabad)</option>
                  <option value={6}>6 • Ramappa Temple UNESCO Gate (Mulugu)</option>
                  <option value={7}>7 • Gandikota Fort Gorge Checkpoint (YSR Kadapa)</option>
                </select>
              </div>

              {/* Scan Trigger Button */}
              <button
                disabled={isVerifying || !testToken}
                onClick={handleVerifyPass}
                className="w-full py-3.5 rounded-2xl bg-cyan-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 hover:bg-cyan-300 transition-colors shadow-md disabled:bg-slate-800 disabled:text-slate-500 cursor-pointer"
              >
                {isVerifying ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying Pass...</span>
                  </>
                ) : (
                  <>
                    <Scan className="w-4 h-4" />
                    <span>Verify Pass & Open Gate</span>
                  </>
                )}
              </button>

              {/* Verification Result Card */}
              {verificationResult && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`p-4 rounded-2xl border flex items-start gap-3.5 ${
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
                  <div className="flex flex-col text-xs w-full">
                    <div className="flex items-center justify-between">
                      <span className={`font-bold text-sm tracking-wide ${
                        verificationResult.success ? 'text-emerald-300' : 'text-red-300'
                      }`}>
                        {verificationResult.success ? 'ENTRY APPROVED' : 'ENTRY DECLINED'}
                      </span>
                      {verificationResult.isOffline && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-medium border border-amber-400/30">
                          Offline Mode
                        </span>
                      )}
                    </div>
                    <span className="mt-1 text-slate-200">{verificationResult.message}</span>
                    {verificationResult.touristName && (
                      <span className="text-slate-400 mt-1 text-[11px]">
                        Visitor: {verificationResult.touristName} • Ref: {verificationResult.reference}
                      </span>
                    )}
                    {verificationResult.isPassback && (
                      <div className="mt-2 p-2 rounded-xl bg-red-950/40 border border-red-500/40 text-red-200 text-[11px] flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                        <span>Pass Already Checked In: This ticket has already been used at this entrance.</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

            </div>
          </div>

          {/* Right Column: Check-in Activity & Offline Sync (5 Cols) */}
          <div className="md:col-span-5 flex flex-col gap-4">
            
            {/* Sync Panel */}
            <div className="p-5 rounded-3xl bg-[#0B0F17] border border-white/10 flex flex-col gap-3 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-bold text-white">
                    Offline Sync Queue
                  </span>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/5 text-cyan-300">
                  {ledgerStats.pending} Pending
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                When network coverage is restored, sync your offline scan records to the central database.
              </p>

              <button
                disabled={isSyncing || ledgerStats.pending === 0}
                onClick={handleBatchSync}
                className="w-full py-2.5 rounded-xl bg-white/[0.04] hover:bg-cyan-500/10 border border-white/10 hover:border-cyan-400/40 text-slate-200 hover:text-cyan-300 font-semibold text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSyncing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                    <span>Syncing Records...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Sync {ledgerStats.pending} Offline Scans</span>
                  </>
                )}
              </button>

              <a
                href="http://localhost:8085/api/admin/analytics/export-csv"
                download="globetrotter_daily_tourism_report.csv"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 hover:border-emerald-400/60 text-emerald-300 hover:text-emerald-200 font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer no-underline"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Export Daily Check-in Report (CSV)</span>
              </a>

              {syncStatusMsg && (
                <div className={`p-2.5 rounded-xl text-xs ${
                  syncStatusMsg.success ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/30' : 'bg-red-950/40 text-red-300 border border-red-500/30'
                }`}>
                  {syncStatusMsg.text}
                </div>
              )}
            </div>

            {/* Recent Scans Log */}
            <div className="p-5 rounded-3xl bg-[#0B0F17] border border-white/10 flex flex-col gap-3 flex-1 shadow-xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                <span className="text-xs font-bold text-white">
                  Recent Scans
                </span>
                <span className="text-[10px] text-slate-400">
                  Live Feed
                </span>
              </div>

              <div className="space-y-2 overflow-y-auto max-h-[220px] scrollbar-none flex-1 text-xs">
                {scanLog.map((log) => (
                  <div
                    key={log.id}
                    className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${
                        log.status === 'SUCCESS' ? 'bg-emerald-400' :
                        log.status === 'OFFLINE_OK' ? 'bg-amber-400' :
                        log.status === 'ERROR' ? 'bg-red-400' : 'bg-slate-400'
                      }`} />
                      <span className="text-slate-300 truncate text-[11px]">{log.text}</span>
                    </div>
                    <span className="text-slate-500 text-[10px] shrink-0">{log.time}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
