import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Scan, 
  CheckCircle, 
  XCircle, 
  Wifi, 
  WifiOff, 
  ArrowLeft
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
  { id: 1, name: 'Araku Tribal Museum (Alluri Sitharama Raju)' },
  { id: 2, name: 'Borra Caves Cave Entrance (Alluri Sitharama Raju)' },
  { id: 3, name: 'Belum Caves Main Gate (Nandyal)' },
  { id: 4, name: 'Coringa Mangrove Boardwalk (Kakinada)' },
  { id: 5, name: 'Golconda Fort Main Gate (Hyderabad)' },
  { id: 6, name: 'Ramappa Temple UNESCO Sanctum (Mulugu)' },
  { id: 7, name: 'Gandikota Fort Gorge View (YSR Kadapa)' }
];

export default function GateScannerView({ passData = null, onExitAgentMode }) {
  const [tokenInput, setTokenInput] = useState(
    passData?.reference || passData?.token || 'APTG-89421'
  );
  const [selectedPlaceId, setSelectedPlaceId] = useState(1);
  const [verdict, setVerdict] = useState(null); // { success: boolean, touristName: string, message: string }
  const [isScanning, setIsScanning] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  const [recentScans, setRecentScans] = useState([
    { id: 1, time: '10:00 AM', name: 'Gate Scanner Ready', success: true }
  ]);

  // Keep token in sync if new pass was generated
  const [prevPassToken, setPrevPassToken] = useState(passData?.token);
  if (passData?.token && passData.token !== prevPassToken) {
    setPrevPassToken(passData.token);
    setTokenInput(passData.token);
  }

  // Automatic Network Detection & Silent Background Sync
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Auto-sync offline check-ins silently without bothering the gate person
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

  const handleScanPass = async () => {
    if (!tokenInput.trim() || isScanning) return;
    setIsScanning(true);
    setVerdict(null);

    const placeObj = CHECKPOINTS.find(c => c.id === Number(selectedPlaceId));
    const checkpointName = placeObj ? placeObj.name : 'Monument Gate';

    // 1. If device is offline, verify offline immediately
    if (!isOnline) {
      setTimeout(() => {
        const offRes = verifyPassOffline(tokenInput, selectedPlaceId, checkpointName);
        setIsScanning(false);
        const isOk = offRes.valid;
        playScannerSound(isOk);

        const result = {
          success: isOk,
          touristName: offRes.touristName || (isOk ? 'Verified Visitor' : 'Unknown'),
          message: isOk ? 'ENTRY GRANTED • ADMIT 1' : offRes.message || 'ENTRY DENIED • INVALID TICKET',
          isPassback: offRes.isPassback,
          checkpoint: checkpointName
        };

        setVerdict(result);
        setRecentScans(prev => [
          { id: Date.now(), time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), name: result.touristName, success: isOk },
          ...prev.slice(0, 4)
        ]);

        // Auto-clear after 4 seconds for next visitor
        setTimeout(() => setVerdict(null), 4000);
      }, 200);
      return;
    }

    // 2. If online, verify with cloud, fallback to offline if network fails
    try {
      const res = await scannerService.verifyPass({
        token: tokenInput,
        placeId: selectedPlaceId,
        turnstileId: 'Gate-01'
      });

      playScannerSound(true);
      const result = {
        success: true,
        touristName: res.touristName || 'Verified Visitor',
        message: 'ENTRY GRANTED • ADMIT 1',
        checkpoint: checkpointName
      };

      setVerdict(result);
      setRecentScans(prev => [
        { id: Date.now(), time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), name: result.touristName, success: true },
        ...prev.slice(0, 4)
      ]);
      setTimeout(() => setVerdict(null), 4000);
    } catch {
      // Silent fallback to local verification
      const offRes = verifyPassOffline(tokenInput, selectedPlaceId, checkpointName);
      const isOk = offRes.valid;
      playScannerSound(isOk);

      const result = {
        success: isOk,
        touristName: offRes.touristName || (isOk ? 'Verified Visitor' : 'Unknown'),
        message: isOk ? 'ENTRY GRANTED • ADMIT 1' : offRes.message || 'ENTRY DENIED • INVALID TICKET',
        isPassback: offRes.isPassback,
        checkpoint: checkpointName
      };

      setVerdict(result);
      setRecentScans(prev => [
        { id: Date.now(), time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), name: result.touristName, success: isOk },
        ...prev.slice(0, 4)
      ]);
      setTimeout(() => setVerdict(null), 4000);
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <section className="relative w-full py-16 px-4 md:px-12 bg-[#06080D] text-slate-100 min-h-[85vh]">
      <div className="max-w-3xl mx-auto flex flex-col gap-6">

        {/* Top Return Button & Status Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          {onExitAgentMode && (
            <button
              onClick={onExitAgentMode}
              className="inline-flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-white px-3.5 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Tourist Mode</span>
            </button>
          )}

          {/* Simple Network Indicator (Automatic) */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs">
            {isOnline ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300 font-semibold text-[11px]">Online</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-amber-300 font-semibold text-[11px]">Offline Scanner Active</span>
              </>
            )}
          </div>
        </div>

        {/* BIG INSTANT VERDICT BANNER (GREEN OR RED) */}
        <AnimatePresence>
          {verdict && (
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className={`p-6 sm:p-8 rounded-3xl border-2 flex flex-col items-center justify-center text-center gap-3 shadow-2xl ${
                verdict.success
                  ? 'bg-emerald-950/90 border-emerald-400 text-emerald-100'
                  : 'bg-rose-950/90 border-rose-400 text-rose-100'
              }`}
            >
              {verdict.success ? (
                <CheckCircle className="w-20 h-20 text-emerald-400 animate-bounce" />
              ) : (
                <XCircle className="w-20 h-20 text-rose-400" />
              )}

              <div className="flex flex-col gap-1">
                <span className="text-3xl sm:text-4xl font-extrabold tracking-tight font-sans-clean">
                  {verdict.message}
                </span>
                <span className="text-base sm:text-lg font-bold text-white mt-1">
                  Visitor: {verdict.touristName}
                </span>
                <span className="text-xs text-slate-300 font-mono">
                  {verdict.checkpoint}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* SCANNER WORKSPACE CARD */}
        <div className="p-6 sm:p-8 rounded-3xl bg-[#0B0F17] border border-white/10 shadow-xl flex flex-col gap-5">
          
          {/* Checkpoint Dropdown */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
              Gate Checkpoint
            </label>
            <select
              value={selectedPlaceId}
              onChange={(e) => setSelectedPlaceId(Number(e.target.value))}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-amber-400 cursor-pointer font-sans-clean"
            >
              {CHECKPOINTS.map((cp) => (
                <option key={cp.id} value={cp.id} className="bg-[#0B0F17] text-white">
                  {cp.name}
                </option>
              ))}
            </select>
          </div>

          {/* QR Token Input / Simulation Area */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono flex items-center justify-between">
              <span>Scanned Ticket Token</span>
              <span className="text-[10px] text-amber-400 font-normal">Ready for optical reader or camera</span>
            </label>
            <input
              type="text"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="Scan QR code or enter token..."
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* Giant Scan Button */}
          <button
            onClick={handleScanPass}
            disabled={isScanning || !tokenInput.trim()}
            className="w-full py-4 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-base flex items-center justify-center gap-2.5 transition-all shadow-md cursor-pointer disabled:opacity-50 font-sans-clean active:scale-[0.99]"
          >
            {isScanning ? (
              <span>Verifying Ticket...</span>
            ) : (
              <>
                <Scan className="w-5 h-5 text-slate-950" />
                <span>Verify Ticket & Check In</span>
              </>
            )}
          </button>
        </div>

        {/* RECENT SCAN ACTIVITY (SIMPLE GREEN / RED LOG) */}
        <div className="p-4 rounded-2xl bg-[#0B0F17] border border-white/5 flex flex-col gap-2.5">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-mono">
            Recent Gate Scans
          </span>
          <div className="flex flex-col gap-1.5">
            {recentScans.map((scan) => (
              <div 
                key={scan.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-xs font-sans-clean"
              >
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${scan.success ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                  <span className="font-medium text-white">{scan.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold ${scan.success ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {scan.success ? 'APPROVED' : 'DENIED'}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">{scan.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
