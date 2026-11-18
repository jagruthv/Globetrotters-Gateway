import React, { useState, useEffect, useRef } from 'react';
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
  Users,
  Camera,
  CameraOff,
  RotateCcw,
  FlipHorizontal,
  Ticket,
  AlertCircle
} from 'lucide-react';
import jsQR from 'jsqr';
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
  { id: 2, name: 'Borra Caves Cave Entrance (Alluri Sitharama Raju)', gate: 'Turnstile B2' },
  { id: 3, name: 'Belum Caves Main Gate (Nandyal)', gate: 'Turnstile C1' },
  { id: 4, name: 'Coringa Mangrove Boardwalk (Kakinada)', gate: 'North Turnstile' },
  { id: 5, name: 'Golconda Fort Main Gate (Hyderabad)', gate: 'Fateh Darwaza Turnstile' },
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

  // Authentic Session Telemetry (Starts fresh or loads actual logged shift data)
  const [scanStats, setScanStats] = useState(() => {
    try {
      const stored = localStorage.getItem('globetrotter_agent_shift_stats');
      return stored ? JSON.parse(stored) : { total: 0, approved: 0, denied: 0 };
    } catch {
      return { total: 0, approved: 0, denied: 0 };
    }
  });

  const [recentScans, setRecentScans] = useState(() => {
    try {
      const stored = localStorage.getItem('globetrotter_agent_recent_scans');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Real Camera Scanner State
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraScanning, setCameraScanning] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [facingMode, setFacingMode] = useState('environment');

  const videoRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const scanAnimationRef = useRef(null);

  // Retrieve active booked pass from localStorage if available (for easy 1-click test)
  const activeBookedPass = (() => {
    try {
      const stored = localStorage.getItem('globetrotter_passes');
      if (stored) {
        const list = JSON.parse(stored);
        if (Array.isArray(list) && list.length > 0) return list[0];
      }
    } catch {
      return null;
    }
    return null;
  })();

  // Keep token synced if a pass was passed in props
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

  // Cleanup camera stream when component unmounts
  useEffect(() => {
    return () => {
      if (scanAnimationRef.current) {
        cancelAnimationFrame(scanAnimationRef.current);
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // Start Camera
  const startCamera = async (mode = facingMode) => {
    setCameraError(null);
    try {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsCameraActive(true);
      setCameraScanning(true);
    } catch (err) {
      console.warn('Camera initiation notice:', err);
      setCameraError('Camera access not available or permission denied. You can manually enter or paste the ticket code below.');
      setIsCameraActive(false);
      setCameraScanning(false);
    }
  };

  // Stop Camera
  const stopCamera = () => {
    if (scanAnimationRef.current) {
      cancelAnimationFrame(scanAnimationRef.current);
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setCameraScanning(false);
  };

  // Flip Camera (environment <-> user)
  const toggleFlipCamera = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  // Frame Processing Loop using jsQR
  useEffect(() => {
    if (!isCameraActive || !cameraScanning) return;

    let active = true;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    const scanLoop = () => {
      if (!active) return;
      const video = videoRef.current;
      if (video && video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert'
        });

        if (code && code.data) {
          let extracted = code.data.trim();
          // If code is a URL, extract ?t= parameter
          if (extracted.includes('?t=')) {
            try {
              const url = new URL(extracted);
              extracted = url.searchParams.get('t') || extracted;
            } catch {
              const match = extracted.match(/[?&]t=([^&#]+)/);
              if (match) extracted = match[1];
            }
          } else if (extracted.includes('/verify?t=')) {
            const match = extracted.match(/t=([^&#]+)/);
            if (match) extracted = match[1];
          }

          setTokenInput(extracted);
          handleScanPass(extracted);

          // Pause camera scanning for 3.5s to clearly display verdict
          setCameraScanning(false);
          setTimeout(() => {
            if (active) setCameraScanning(true);
          }, 3500);
          return;
        }
      }
      scanAnimationRef.current = requestAnimationFrame(scanLoop);
    };

    scanAnimationRef.current = requestAnimationFrame(scanLoop);

    return () => {
      active = false;
      if (scanAnimationRef.current) {
        cancelAnimationFrame(scanAnimationRef.current);
      }
    };
  }, [isCameraActive, cameraScanning]);

  const handleToggleSound = () => {
    const nextVal = !soundEnabled;
    setSoundEnabled(nextVal);
    localStorage.setItem('gt_sound_enabled', String(nextVal));
  };

  const recordScanResult = (result, isOk, tokenToVerify, checkpointName) => {
    setScanStats((prev) => {
      const updated = {
        total: prev.total + 1,
        approved: isOk ? prev.approved + 1 : prev.approved,
        denied: !isOk ? prev.denied + 1 : prev.denied
      };
      try {
        localStorage.setItem('globetrotter_agent_shift_stats', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    setRecentScans((prev) => {
      const updated = [
        { 
          id: Date.now(), 
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), 
          name: result.touristName, 
          code: tokenToVerify.slice(0, 16), 
          success: isOk, 
          checkpoint: checkpointName 
        },
        ...prev.slice(0, 9)
      ];
      try {
        localStorage.setItem('globetrotter_agent_recent_scans', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handleResetShiftStats = () => {
    const emptyStats = { total: 0, approved: 0, denied: 0 };
    setScanStats(emptyStats);
    setRecentScans([]);
    try {
      localStorage.removeItem('globetrotter_agent_shift_stats');
      localStorage.removeItem('globetrotter_agent_recent_scans');
    } catch {}
  };

  const handleScanPass = async (overrideToken) => {
    const tokenToVerify = (typeof overrideToken === 'string' ? overrideToken : tokenInput).trim();
    if (!tokenToVerify || isScanning) return;

    setIsScanning(true);
    setVerdict(null);

    const placeObj = CHECKPOINTS.find((c) => c.id === Number(selectedPlaceId));
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
        recordScanResult(result, isOk, tokenToVerify, checkpointName);
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
      recordScanResult(result, true, tokenToVerify, checkpointName);
      setTimeout(() => setVerdict(null), 5000);
    } catch {
      // Fallback to local offline ledger
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
      recordScanResult(result, isOk, tokenToVerify, checkpointName);
      setTimeout(() => setVerdict(null), 5000);
    } finally {
      setIsScanning(false);
    }
  };

  const handleRevokeAgentStatus = () => {
    stopCamera();
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

          {/* RETURN TO TOURIST VIEW */}
          <button
            onClick={() => {
              stopCamera();
              onExitAgentMode();
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs transition-colors shadow-md cursor-pointer font-sans-clean"
            title="Switch back to tourist exploration interface"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-slate-950" />
            <span>Tourist View</span>
          </button>
        </div>

      </header>

      {/* AGENT OPERATIONAL WORKSPACE BODY */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 md:p-8 flex flex-col gap-6">

        {/* AUTHENTIC SHIFT COUNTERS (STARTS AT 0 • ZERO FAKE DATA) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 rounded-2xl bg-[#0E121A] border border-white/10 flex flex-col gap-1 shadow-md">
            <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-amber-400" />
              Shift Scans
            </span>
            <span className="text-2xl font-extrabold text-white font-mono">
              {scanStats.total}
            </span>
            <span className="text-[10px] text-slate-400 font-sans-clean">Active Session Log</span>
          </div>

          <div className="p-4 rounded-2xl bg-[#0E121A] border border-white/10 flex flex-col gap-1 shadow-md">
            <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              Admitted
            </span>
            <span className="text-2xl font-extrabold text-emerald-400 font-mono">
              {scanStats.approved}
            </span>
            <span className="text-[10px] text-emerald-400 font-sans-clean">Verified Gate Passes</span>
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

          <div className="p-4 rounded-2xl bg-[#0E121A] border border-white/10 flex flex-col justify-between gap-1 shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider flex items-center gap-1.5">
                <Scan className="w-3.5 h-3.5 text-amber-400" />
                Shift Reset
              </span>
            </div>
            <button
              onClick={handleResetShiftStats}
              disabled={scanStats.total === 0}
              className="mt-1 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
              title="Reset shift verification counters"
            >
              <RotateCcw className="w-3 h-3 text-amber-400" />
              <span>Reset Shift</span>
            </button>
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
        <div className="p-6 sm:p-8 rounded-3xl bg-[#0E121A] border border-amber-500/20 shadow-xl flex flex-col gap-6">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-4">
            <div className="flex flex-col">
              <h2 className="text-lg font-bold text-white font-sans-clean flex items-center gap-2">
                <Scan className="w-5 h-5 text-amber-400" />
                <span>Gate Pass Verification</span>
              </h2>
              <span className="text-xs text-slate-400 font-sans-clean">
                Scan visitor QR ticket using your device camera or enter code manually
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-slate-400">Checkpoint:</span>
              <span className="text-xs font-semibold text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                {CHECKPOINTS.find((c) => c.id === selectedPlaceId)?.gate || 'Gate 01'}
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

          {/* LIVE CAMERA SCANNER VIEWPORT */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-2">
                <Camera className="w-4 h-4 text-amber-400" />
                <span>Live Optical Camera Scanner</span>
              </span>

              {isCameraActive && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleFlipCamera}
                    className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs flex items-center gap-1 transition-colors cursor-pointer"
                    title="Flip camera"
                  >
                    <FlipHorizontal className="w-3.5 h-3.5 text-amber-400" />
                    <span>Flip Camera</span>
                  </button>
                  <button
                    onClick={stopCamera}
                    className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <CameraOff className="w-3.5 h-3.5" />
                    <span>Close Camera</span>
                  </button>
                </div>
              )}
            </div>

            {cameraError && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2 font-sans-clean">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{cameraError}</span>
              </div>
            )}

            {isCameraActive ? (
              <div className="relative w-full aspect-video sm:aspect-[21/9] max-h-72 rounded-2xl overflow-hidden bg-black border-2 border-amber-400/40 shadow-inner flex items-center justify-center">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />

                {/* Holographic Scanner Overlay */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  {/* Viewfinder Target Frame */}
                  <div className="relative w-48 h-48 sm:w-56 sm:h-56 border-2 border-amber-400/60 rounded-2xl shadow-lg">
                    {/* Corner Guides */}
                    <div className="absolute -top-1 -left-1 w-4 h-4 border-t-3 border-l-3 border-amber-400" />
                    <div className="absolute -top-1 -right-1 w-4 h-4 border-t-3 border-r-3 border-amber-400" />
                    <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-3 border-l-3 border-amber-400" />
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-3 border-r-3 border-amber-400" />
                    
                    {/* Animated Scanning Laser Line */}
                    <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent absolute top-0 animate-[scanLaser_2s_ease-in-out_infinite]" />
                  </div>

                  <span className="absolute bottom-3 text-[10px] font-mono text-amber-300 bg-black/60 px-3 py-1 rounded-full border border-white/10">
                    Align visitor QR code inside target box
                  </span>
                </div>
              </div>
            ) : (
              <button
                onClick={() => startCamera()}
                className="w-full py-5 rounded-2xl border-2 border-dashed border-amber-500/30 hover:border-amber-400/60 bg-amber-500/[0.04] hover:bg-amber-500/[0.08] flex flex-col items-center justify-center gap-2 text-center transition-all cursor-pointer group"
              >
                <div className="w-12 h-12 rounded-xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-300 group-hover:scale-105 transition-transform">
                  <Camera className="w-6 h-6 text-amber-400" />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-bold text-white font-sans-clean">
                    Open Camera Scanner
                  </span>
                  <span className="text-xs text-slate-400 font-sans-clean">
                    Point phone or webcam to instantly verify and admit visitors
                  </span>
                </div>
              </button>
            )}
          </div>

          {/* MANUAL TICKET REFERENCE INPUT (ALWAYS ACCESSIBLE FALLBACK) */}
          <div className="flex flex-col gap-1.5 pt-2 border-t border-white/5">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
              <span>Manual Ticket Reference / Barcode Input</span>
              <span className="text-[10px] text-amber-400 font-mono">enter code if camera is busy</span>
            </div>
            <div className="relative">
              <input
                type="text"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleScanPass();
                }}
                placeholder="Enter or paste ticket code (e.g. APTG-89421 or GT-2026-XXXXX)..."
                className="w-full px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-mono focus:outline-none focus:border-amber-400 pr-24"
              />
              {tokenInput && (
                <button
                  onClick={() => setTokenInput('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-1 text-[10px] text-slate-400 hover:text-white bg-white/5 rounded-md font-mono cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* 1-Click Test Chips */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-[11px] text-slate-400 font-mono">Quick Test:</span>
            
            {activeBookedPass && (
              <button
                onClick={() => {
                  setTokenInput(activeBookedPass.reference);
                  handleScanPass(activeBookedPass.reference);
                }}
                className="px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/40 text-amber-300 font-medium font-sans-clean transition-colors cursor-pointer flex items-center gap-1"
              >
                <Ticket className="w-3.5 h-3.5 text-amber-400" />
                <span>Test Your Booked Ticket ({activeBookedPass.reference})</span>
              </button>
            )}

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

          {/* Big Action Verify Button */}
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
                <span>Verify Pass & Open Gate</span>
              </>
            )}
          </button>
        </div>

        {/* AUTHENTIC RECENT SCAN ACTIVITY LOG (NO FAKE NAMES) */}
        <div className="p-6 rounded-3xl bg-[#0E121A] border border-white/10 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
              Live Gate Scanner Feed
            </span>
            <span className="text-[10px] text-amber-400 font-mono">
              {recentScans.length} Verified in Current Shift
            </span>
          </div>

          {recentScans.length === 0 ? (
            <div className="py-8 px-4 rounded-2xl bg-white/[0.01] border border-dashed border-white/10 flex flex-col items-center justify-center text-center gap-2">
              <Scan className="w-8 h-8 text-slate-500" />
              <span className="text-xs font-semibold text-slate-300 font-sans-clean">
                No tickets scanned in this shift yet
              </span>
              <p className="text-[11px] text-slate-500 max-w-sm font-sans-clean">
                Point the live camera at a visitor's QR code or enter their ticket code above to record admission.
              </p>
            </div>
          ) : (
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
          )}
        </div>

        {/* BOTTOM AGENT CONTROLS & EXIT */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-[#0E121A] border border-white/5 text-xs">
          <div className="flex items-center gap-2 text-slate-400 font-sans-clean">
            <span>Field Terminal #AGT-8942</span>
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
            onClick={() => {
              stopCamera();
              onExitAgentMode();
            }}
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
