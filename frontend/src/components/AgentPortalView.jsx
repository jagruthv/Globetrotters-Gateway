import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Scan, 
  CheckCircle, 
  XCircle, 
  Wifi, 
  WifiOff, 
  ArrowLeft,
  Volume2,
  VolumeX,
  MapPin,
  Clock,
  Users
} from 'lucide-react';
import { scannerService } from '../services/api';
import { 
  verifyPassOffline, 
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
      // Crisp positive double-chime
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.setValueAtTime(880.00, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } else {
      // Low buzz alert
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(130, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    }
  } catch {
    // Sound fallback
  }
}

const CHECKPOINTS = [
  { id: 1, name: 'Araku Tribal Museum (Alluri Sitharama Raju)', gate: 'Turnstile A1' },
  { id: 2, name: 'Borra Caves Subterranean Gate (Alluri Sitharama Raju)', gate: 'Turnstile B2' },
  { id: 3, name: 'Belum Caves Karst Passage (Nandyal)', gate: 'Turnstile C1' },
  { id: 4, name: 'Coringa Mangrove Boardwalk (Kakinada)', gate: 'North Turnstile' },
  { id: 5, name: 'Golconda Fort Acoustic Portico (Hyderabad)', gate: 'Fateh Darwaza Turnstile' },
  { id: 6, name: 'Ramappa Temple UNESCO Sanctum (Mulugu)', gate: 'Main Mandapa Gate' },
  { id: 7, name: 'Gandikota Fort Gorge View (YSR Kadapa)', gate: 'Canyon Viewpoint Turnstile' }
];

export default function AgentPortalView({ 
  onExitAgentMode,
  passData = null
}) {
  const [tokenInput, setTokenInput] = useState(passData?.token || 'APTG-89421');
  const [selectedPlaceId, setSelectedPlaceId] = useState(1);
  const [verdict, setVerdict] = useState(null); // { success: boolean, touristName: string, message: string }
  const [isScanning, setIsScanning] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem('gt_sound_enabled') !== 'false';
  });

  const [scanStats, setScanStats] = useState({
    total: 142,
    approved: 139,
    denied: 3
  });

  const [recentScans, setRecentScans] = useState([
    { id: 1, time: '10:04 AM', name: 'Rajesh Sharma', code: 'APTG-74129', success: true, checkpoint: 'Araku Tribal Museum' },
    { id: 2, time: '09:58 AM', name: 'Pooja Reddy', code: 'APTG-63012', success: true, checkpoint: 'Araku Tribal Museum' },
    { id: 3, time: '09:45 AM', name: 'Unknown Visitor', code: 'EXP-99201', success: false, checkpoint: 'Araku Tribal Museum' },
    { id: 4, time: '09:30 AM', name: 'Ananya Rao', code: 'APTG-51204', success: true, checkpoint: 'Araku Tribal Museum' }
  ]);

  // Keep token synced if a pass was booked in the session
  const [prevToken, setPrevToken] = useState(passData?.token);
  if (passData?.token && passData.token !== prevToken) {
    setPrevToken(passData.token);
    setTokenInput(passData.token);
  }

  // Network Detection & Silent Auto-Sync
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncLedgerToCentralCore().catch(() => {});
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleToggleSound = () => {
    const nextVal = !soundEnabled;
    setSoundEnabled(nextVal);
    localStorage.setItem('gt_sound_enabled', String(nextVal));
  };

  const handleScanPass = async (overrideToken) => {
    const tokenToVerify = (typeof overrideToken === 'string' ? overrideToken : tokenInput).trim();
    if (!tokenToVerify || isScanning) return;

    setIsScanning(true);
    setVerdict(null);

    const placeObj = CHECKPOINTS.find(c => c.id === Number(selectedPlaceId));
    const checkpointName = placeObj ? placeObj.name : 'Monument Gate';

    // 1. Local Offline Engine verification
    if (!isOnline) {
      setTimeout(() => {
        const offRes = verifyPassOffline(tokenToVerify, selectedPlaceId, checkpointName);
        setIsScanning(false);
        const isOk = offRes.valid;
        playScannerSound(isOk);

        const result = {
          success: isOk,
          touristName: offRes.touristName || (isOk ? 'Verified Visitor' : 'Unregistered Ticket'),
          message: isOk ? 'ENTRY GRANTED • ADMIT 1' : offRes.message || 'ENTRY DENIED • INVALID TICKET',
          checkpoint: checkpointName,
          token: tokenToVerify
        };

        setVerdict(result);
        setScanStats(prev => ({
          total: prev.total + 1,
          approved: isOk ? prev.approved + 1 : prev.approved,
          denied: !isOk ? prev.denied + 1 : prev.denied
        }));

        setRecentScans(prev => [
          { 
            id: Date.now(), 
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), 
            name: result.touristName, 
            code: tokenToVerify.slice(0, 14), 
            success: isOk, 
            checkpoint: checkpointName 
          },
          ...prev.slice(0, 6)
        ]);

        setTimeout(() => setVerdict(null), 5000);
      }, 250);
      return;
    }

    // 2. Cloud Server verification with offline fallback
    try {
      const res = await scannerService.verifyPass({
        token: tokenToVerify,
        placeId: selectedPlaceId,
        turnstileId: 'Gate-01'
      });

      playScannerSound(true);
      const result = {
        success: true,
        touristName: res.touristName || 'Verified Visitor',
        message: 'ENTRY GRANTED • ADMIT 1',
        checkpoint: checkpointName,
        token: tokenToVerify
      };

      setVerdict(result);
      setScanStats(prev => ({
        total: prev.total + 1,
        approved: prev.approved + 1,
        denied: prev.denied
      }));

      setRecentScans(prev => [
        { 
          id: Date.now(), 
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), 
          name: result.touristName, 
          code: tokenToVerify.slice(0, 14), 
          success: true, 
          checkpoint: checkpointName 
        },
        ...prev.slice(0, 6)
      ]);
      setTimeout(() => setVerdict(null), 5000);
    } catch {
      // Fallback to local ledger
      const offRes = verifyPassOffline(tokenToVerify, selectedPlaceId, checkpointName);
      const isOk = offRes.valid;
      playScannerSound(isOk);

      const result = {
        success: isOk,
        touristName: offRes.touristName || (isOk ? 'Verified Visitor' : 'Unregistered Ticket'),
        message: isOk ? 'ENTRY GRANTED • ADMIT 1' : offRes.message || 'ENTRY DENIED • INVALID TICKET',
        checkpoint: checkpointName,
        token: tokenToVerify
      };

      setVerdict(result);
      setScanStats(prev => ({
        total: prev.total + 1,
        approved: isOk ? prev.approved + 1 : prev.approved,
        denied: !isOk ? prev.denied + 1 : prev.denied
      }));

      setRecentScans(prev => [
        { 
          id: Date.now(), 
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), 
          name: result.touristName, 
          code: tokenToVerify.slice(0, 14), 
          success: isOk, 
          checkpoint: checkpointName 
        },
        ...prev.slice(0, 6)
      ]);
      setTimeout(() => setVerdict(null), 5000);
    } finally {
      setIsScanning(false);
    }
  };

  const handleRevokeAgentStatus = () => {
    localStorage.removeItem('globetrotter_is_agent');
    window.dispatchEvent(new Event('agent-status-changed'));
    onExitAgentMode();
  };

  return (
    <div className="relative min-h-[100dvh] bg-[#080A0F] text-slate-100 font-sans-clean overflow-x-hidden selection:bg-amber-500/20 flex flex-col">
      
      {/* EXCLUSIVE AGENT TOP OPERATIONS BAR */}
      <header className="sticky top-0 z-50 w-full bg-[#0E121A]/95 backdrop-blur-xl border-b border-amber-500/20 px-4 md:px-8 py-3.5 flex items-center justify-between shadow-xl">
        
        {/* Left: Agent Brand & Operational Badge */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-400 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-amber-500/20">
            <Scan className="w-5 h-5 text-slate-950" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-display font-extrabold tracking-wider text-sm sm:text-base text-white">
                GLOBETROTTER FIELD AGENT
              </span>
              <span className="hidden sm:inline-block text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono font-semibold uppercase tracking-wider border border-amber-500/30">
                Gate Terminal 01
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-sans-clean flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>AP & TG Tourism Authority • Operations Portal</span>
            </span>
          </div>
        </div>

        {/* Right: Operational Controls & Return to Tourist View */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Network Pill */}
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs">
            {isOnline ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300 text-[11px] font-medium">Cloud Synced</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-amber-300 text-[11px] font-medium">Offline Core</span>
              </>
            )}
          </div>

          {/* Sound Toggle */}
          <button
            onClick={handleToggleSound}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer"
            title={soundEnabled ? 'Scanner Audio Enabled' : 'Scanner Audio Muted'}
          >
            {soundEnabled ? (
              <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <VolumeX className="w-3.5 h-3.5 text-slate-500" />
            )}
          </button>

          {/* Agent Badge */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span className="font-mono text-[11px] font-semibold">Agent #AGT-8942</span>
          </div>

          {/* RETURN TO TOURIST VIEW (CLEAR VISIBLE EXIT) */}
          <button
            onClick={onExitAgentMode}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs transition-colors shadow-md cursor-pointer font-sans-clean"
            title="Switch back to standard tourist exploration interface"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-slate-950" />
            <span>Tourist View</span>
          </button>
        </div>

      </header>

      {/* AGENT OPERATIONAL WORKSPACE BODY */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 md:p-8 flex flex-col gap-6">

        {/* TOP SHIFT STATS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 rounded-2xl bg-[#0E121A] border border-white/10 flex flex-col gap-1 shadow-md">
            <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-amber-400" />
              Scans Today
            </span>
            <span className="text-2xl font-extrabold text-white font-mono">
              {scanStats.total}
            </span>
            <span className="text-[10px] text-emerald-400 font-sans-clean">Active Shift Gate Feed</span>
          </div>

          <div className="p-4 rounded-2xl bg-[#0E121A] border border-white/10 flex flex-col gap-1 shadow-md">
            <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              Admitted
            </span>
            <span className="text-2xl font-extrabold text-emerald-400 font-mono">
              {scanStats.approved}
            </span>
            <span className="text-[10px] text-slate-400 font-sans-clean">97.9% Pass Rate</span>
          </div>

          <div className="p-4 rounded-2xl bg-[#0E121A] border border-white/10 flex flex-col gap-1 shadow-md">
            <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider flex items-center gap-1.5">
              <XCircle className="w-3.5 h-3.5 text-rose-400" />
              Denied / Flagged
            </span>
            <span className="text-2xl font-extrabold text-rose-400 font-mono">
              {scanStats.denied}
            </span>
            <span className="text-[10px] text-slate-400 font-sans-clean">Zero Passback Leaks</span>
          </div>

          <div className="p-4 rounded-2xl bg-[#0E121A] border border-white/10 flex flex-col gap-1 shadow-md">
            <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              Avg Gate Speed
            </span>
            <span className="text-2xl font-extrabold text-amber-300 font-mono">
              1.4s
            </span>
            <span className="text-[10px] text-amber-400 font-sans-clean">Instant Verification</span>
          </div>
        </div>

        {/* GIANT INSTANT VERDICT BANNER (HIGH-CONTRAST GREEN OR RED) */}
        <AnimatePresence>
          {verdict && (
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className={`p-6 sm:p-8 rounded-3xl border-2 flex flex-col items-center justify-center text-center gap-3 shadow-2xl ${
                verdict.success
                  ? 'bg-emerald-950/90 border-emerald-400 text-emerald-100 shadow-emerald-500/20'
                  : 'bg-rose-950/90 border-rose-400 text-rose-100 shadow-rose-500/20'
              }`}
            >
              {verdict.success ? (
                <CheckCircle className="w-20 h-20 text-emerald-400 animate-bounce" />
              ) : (
                <XCircle className="w-20 h-20 text-rose-400" />
              )}

              <div className="flex flex-col gap-1">
                <span className="text-2xl sm:text-4xl font-extrabold tracking-tight font-sans-clean">
                  {verdict.message}
                </span>
                <span className="text-base sm:text-lg font-bold text-white mt-1">
                  Visitor: {verdict.touristName}
                </span>
                <span className="text-xs text-slate-300 font-mono">
                  {verdict.checkpoint} • Token: {verdict.token}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* PRIMARY GATE SCANNER CONSOLE */}
        <div className="p-6 sm:p-8 rounded-3xl bg-[#0E121A] border border-amber-500/20 shadow-xl flex flex-col gap-5">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-4">
            <div className="flex flex-col">
              <h2 className="text-lg font-bold text-white font-sans-clean flex items-center gap-2">
                <Scan className="w-5 h-5 text-amber-400" />
                <span>Turnstile Gate Verification</span>
              </h2>
              <span className="text-xs text-slate-400 font-sans-clean">
                Point barcode scanner at visitor phone or manually enter ticket code
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-slate-400">Checkpoint:</span>
              <span className="text-xs font-semibold text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                {CHECKPOINTS.find(c => c.id === selectedPlaceId)?.gate || 'Gate 01'}
              </span>
            </div>
          </div>

          {/* Checkpoint Dropdown */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-amber-400" />
              <span>Assigned Monument Gate</span>
            </label>
            <select
              value={selectedPlaceId}
              onChange={(e) => setSelectedPlaceId(Number(e.target.value))}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-amber-400 cursor-pointer font-sans-clean"
            >
              {CHECKPOINTS.map((cp) => (
                <option key={cp.id} value={cp.id} className="bg-[#0E121A] text-white">
                  {cp.name} • {cp.gate}
                </option>
              ))}
            </select>
          </div>

          {/* Scanned Code / QR Token Input */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
              <span>Scanned Ticket Reference / QR Token</span>
              <span className="text-[10px] text-amber-400 lowercase font-mono">camera or optical reader ready</span>
            </div>
            <div className="relative">
              <input
                type="text"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleScanPass();
                }}
                placeholder="Scan visitor QR code or enter code (e.g. APTG-89421)..."
                className="w-full px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-mono focus:outline-none focus:border-amber-400 pr-24"
              />
              {tokenInput && (
                <button
                  onClick={() => setTokenInput('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-1 text-[10px] text-slate-400 hover:text-white bg-white/5 rounded-md font-mono"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Quick 1-Click Simulation Buttons */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-[11px] text-slate-400 font-mono">Quick Test:</span>
            <button
              onClick={() => {
                setTokenInput('APTG-89421');
                handleScanPass('APTG-89421');
              }}
              className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-medium font-sans-clean transition-colors cursor-pointer"
            >
              Test Valid Pass (APTG-89421)
            </button>
            <button
              onClick={() => {
                setTokenInput('INVALID-TKT-0000');
                handleScanPass('INVALID-TKT-0000');
              }}
              className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 font-medium font-sans-clean transition-colors cursor-pointer"
            >
              Test Invalid Pass
            </button>
          </div>

          {/* Giant Scan Button */}
          <button
            onClick={() => handleScanPass()}
            disabled={isScanning || !tokenInput.trim()}
            className="w-full py-4 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-base flex items-center justify-center gap-2.5 transition-all shadow-md cursor-pointer disabled:opacity-50 font-sans-clean active:scale-[0.99]"
          >
            {isScanning ? (
              <span>Verifying Ticket Signature...</span>
            ) : (
              <>
                <Scan className="w-5 h-5 text-slate-950" />
                <span>Verify Pass & Open Turnstile</span>
              </>
            )}
          </button>
        </div>

        {/* RECENT SCAN ACTIVITY LOG */}
        <div className="p-6 rounded-3xl bg-[#0E121A] border border-white/10 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
              Live Gate Turnstile Feed
            </span>
            <span className="text-[10px] text-amber-400 font-mono">Auto-Synced</span>
          </div>

          <div className="flex flex-col gap-2">
            {recentScans.map((scan) => (
              <div 
                key={scan.id}
                className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5 text-xs font-sans-clean hover:bg-white/[0.04] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className={`w-2.5 h-2.5 rounded-full ${scan.success ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                  <div className="flex flex-col">
                    <span className="font-semibold text-white">{scan.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{scan.code} • {scan.checkpoint}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md font-mono ${
                    scan.success ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                  }`}>
                    {scan.success ? 'ADMITTED' : 'DENIED'}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">{scan.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* BOTTOM AGENT CONTROLS & EXIT */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-[#0E121A] border border-white/5 text-xs">
          <div className="flex items-center gap-2 text-slate-400 font-sans-clean">
            <span>Logged in as Field Agent #AGT-8942</span>
            <span>•</span>
            <button
              onClick={handleRevokeAgentStatus}
              className="text-slate-400 hover:text-rose-400 underline underline-offset-2 transition-colors cursor-pointer"
              title="Reset agent credentials to test the application modal again"
            >
              Reset Agent Accreditation
            </button>
          </div>

          <button
            onClick={onExitAgentMode}
            className="px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold flex items-center gap-2 transition-colors cursor-pointer font-sans-clean"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-amber-400" />
            <span>Switch to Tourist Website</span>
          </button>
        </div>

      </main>

    </div>
  );
}
