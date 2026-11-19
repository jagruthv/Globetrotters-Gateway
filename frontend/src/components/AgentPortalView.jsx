import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  syncLedgerToCentralCore,
  getAdmittedPasses,
  markPassVisited,
  isPassValidForLocation
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
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } else {
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

// 10 Distinct Paid Attractions across 10 Different Districts with verified entry fees
const CHECKPOINTS = [
  { 
    id: 1, 
    name: 'Borra Caves', 
    fullName: 'Borra Caves Cave Entrance',
    district: 'Alluri Sitharama Raju (ASR)', 
    state: 'Andhra Pradesh',
    fee: 80, 
    gate: 'Gate B2 • Entrance 01',
    keyword: 'borra'
  },
  { 
    id: 2, 
    name: 'INS Kurusura Submarine Museum', 
    fullName: 'INS Kurusura Submarine Museum Deck',
    district: 'Visakhapatnam', 
    state: 'Andhra Pradesh',
    fee: 70, 
    gate: 'Gangway North Gate',
    keyword: 'kurusura'
  },
  { 
    id: 3, 
    name: 'Kondakarla Ava Lake', 
    fullName: 'Kondakarla Ava Bird Sanctuary & Lake',
    district: 'Anakapalli', 
    state: 'Andhra Pradesh',
    fee: 20, 
    gate: 'Jetty Gate 01',
    keyword: 'kondakarla'
  },
  { 
    id: 4, 
    name: 'Belum Caves', 
    fullName: 'Belum Caves Underground Passages',
    district: 'Nandyal', 
    state: 'Andhra Pradesh',
    fee: 70, 
    gate: 'Cave Descent Gate 01',
    keyword: 'belum'
  },
  { 
    id: 5, 
    name: 'Kondapalli Fort', 
    fullName: 'Kondapalli Fort & Heritage Complex',
    district: 'NTR', 
    state: 'Andhra Pradesh',
    fee: 25, 
    gate: 'Rani Mahal Gate',
    keyword: 'kondapalli'
  },
  { 
    id: 6, 
    name: 'Chandragiri Fort & Palaces', 
    fullName: 'Chandragiri Fort & Raja Mahal',
    district: 'Tirupati', 
    state: 'Andhra Pradesh',
    fee: 25, 
    gate: 'Raja Mahal Main Gate',
    keyword: 'chandragiri'
  },
  { 
    id: 7, 
    name: 'Golconda Fort', 
    fullName: 'Golconda Fort & Acoustic Portico',
    district: 'Hyderabad', 
    state: 'Telangana',
    fee: 25, 
    gate: 'Fateh Darwaza Gate',
    keyword: 'golconda'
  },
  { 
    id: 8, 
    name: 'Warangal Fort', 
    fullName: 'Warangal Fort & Kala Thoranam',
    district: 'Warangal', 
    state: 'Telangana',
    fee: 25, 
    gate: 'Kirti Torana Gate',
    keyword: 'warangal'
  },
  { 
    id: 9, 
    name: 'Ramappa Temple (UNESCO)', 
    fullName: 'Ramappa Temple UNESCO Complex',
    district: 'Mulugu', 
    state: 'Telangana',
    fee: 25, 
    gate: 'Eastern Mandapa Gate',
    keyword: 'ramappa'
  },
  { 
    id: 10, 
    name: 'Kinnerasani Wildlife Sanctuary', 
    fullName: 'Kinnerasani Sanctuary & Dam',
    district: 'Bhadradri Kothagudem', 
    state: 'Telangana',
    fee: 30, 
    gate: 'Eco-Park Entrance Gate',
    keyword: 'kinnerasani'
  }
];

export default function AgentPortalView({ 
  onExitAgentMode,
  passData = null
}) {
  const [tokenInput, setTokenInput] = useState(passData?.token || '');
  const [selectedPlaceId, setSelectedPlaceId] = useState(1);
  const [verdict, setVerdict] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem('gt_sound_enabled') !== 'false';
  });

  const activeCheckpoint = CHECKPOINTS.find((c) => c.id === Number(selectedPlaceId)) || CHECKPOINTS[0];

  // Shift Counters
  const [scanStats, setScanStats] = useState(() => {
    try {
      const stored = localStorage.getItem('globetrotter_agent_shift_stats');
      return stored ? JSON.parse(stored) : { approved: 0, denied: 0 };
    } catch {
      return { approved: 0, denied: 0 };
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

  // Camera Scanner State
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraScanning, setCameraScanning] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [facingMode, setFacingMode] = useState('environment');

  const videoRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const scanAnimationRef = useRef(null);
  const handleScanPassRef = useRef(null);

  // Callback ref: immediately attaches stream and plays when <video> mounts into DOM
  const setVideoRef = useCallback((node) => {
    videoRef.current = node;
    if (node && mediaStreamRef.current) {
      node.srcObject = mediaStreamRef.current;
      node.play().catch(() => {});
    }
  }, []);

  // Retrieve active booked pass from localStorage for 1-click testing
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

  // Keep token synced if passData passed in props
  const [prevToken, setPrevToken] = useState(passData?.token);
  if (passData?.token && passData.token !== prevToken) {
    setPrevToken(passData.token);
    setTokenInput(passData.token);
  }

  // Network Detection & Auto-Sync
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

  // Stop camera tracks helper
  const stopCameraStream = useCallback(() => {
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
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, [stopCameraStream]);

  // Start Camera with resilient mobile-first constraints
  const startCamera = async (mode = facingMode) => {
    setCameraError(null);
    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error('Camera hardware or browser API not available.');
      }

      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }

      let stream = null;
      // Relaxed mobile constraints: do not enforce rigid landscape dimensions
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: mode } }
        });
      } catch {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: mode }
          });
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({
            video: true
          });
        }
      }

      mediaStreamRef.current = stream;
      setIsCameraActive(true);
      setCameraScanning(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err) {
      const errMsg = err?.name === 'NotAllowedError'
        ? 'Camera permission denied. Please allow camera access in browser site settings, or enter the ticket code below.'
        : 'Camera access not available. You can enter or paste the ticket code manually.';
      setCameraError(errMsg);
      setIsCameraActive(false);
      setCameraScanning(false);
    }
  };

  // Auto-boot camera if officer navigated to #/scanner
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash.includes('scanner')) {
      const timer = setTimeout(() => {
        startCamera();
      }, 350);
      return () => clearTimeout(timer);
    }
  }, []);

  const toggleFlipCamera = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  // QR Code Processing Loop
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
          inversionAttempts: 'attemptBoth'
        });

        if (code && code.data) {
          let extracted = code.data.trim();
          const match = extracted.match(/[?&]t=([^&#]+)/);
          if (match && match[1]) {
            extracted = decodeURIComponent(match[1]).trim();
          }

          setTokenInput(extracted);
          handleScanPassRef.current?.(extracted);

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
        ...prev.slice(0, 7)
      ];
      try {
        localStorage.setItem('globetrotter_agent_recent_scans', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handleResetShiftStats = () => {
    const emptyStats = { approved: 0, denied: 0 };
    setScanStats(emptyStats);
    setRecentScans([]);
    try {
      localStorage.removeItem('globetrotter_agent_shift_stats');
      localStorage.removeItem('globetrotter_agent_recent_scans');
    } catch {}
  };

  const handleScanPass = useCallback(async (overrideToken) => {
    let tokenToVerify = (typeof overrideToken === 'string' ? overrideToken : tokenInput).trim();
    if (!tokenToVerify || isScanning) return;

    // Sanitize if scanned or pasted token is full URL
    const urlMatch = tokenToVerify.match(/[?&]t=([^&#]+)/);
    if (urlMatch && urlMatch[1]) {
      tokenToVerify = decodeURIComponent(urlMatch[1]).trim();
    }

    setIsScanning(true);
    setVerdict(null);

    // Load local stored passes
    const storedPasses = (() => {
      try {
        const raw = localStorage.getItem('globetrotter_passes');
        return raw ? JSON.parse(raw) : [];
      } catch {
        return [];
      }
    })();
    const cleanRef = tokenToVerify.trim().toUpperCase();
    const matchedPass = Array.isArray(storedPasses) ? storedPasses.find(p => 
      (p?.reference && p.reference.toUpperCase() === cleanRef) ||
      (p?.token && (p.token === tokenToVerify || tokenToVerify.includes(p.token) || (p.reference && tokenToVerify.includes(p.reference))))
    ) : null;

    let cp = activeCheckpoint;
    // Auto-align checkpoint if pass belongs to another valid checkpoint
    if (matchedPass) {
      const targetCheckpoint = CHECKPOINTS.find(c => isPassValidForLocation(matchedPass, c.id, c.keyword, c.name));
      if (targetCheckpoint && targetCheckpoint.id !== cp.id) {
        setSelectedPlaceId(targetCheckpoint.id);
        cp = targetCheckpoint;
      }
    }

    const checkpointName = cp.name;
    const placeId = cp.id;
    const gateId = cp.gate;
    const kw = cp.keyword;

    // 1. Destination Matching Check: Verify whether pass is valid for this monument
    if (matchedPass && !isPassValidForLocation(matchedPass, placeId, kw, checkpointName)) {
      setIsScanning(false);
      playScannerSound(false);
      const passTarget = matchedPass.circuitName || matchedPass.destination || 'other destinations';
      const result = {
        success: false,
        touristName: matchedPass.touristName || 'Ticket Holder',
        message: `ENTRY DENIED: Pass is only valid for "${passTarget}". It cannot be used at ${checkpointName}.`,
        checkpoint: checkpointName,
        token: tokenToVerify
      };
      setVerdict(result);
      recordScanResult(result, false, tokenToVerify, checkpointName);
      setTimeout(() => setVerdict(null), 5000);
      return;
    }

    // 2. Anti-Revisit Check: Check local offline cache and pass visited history
    const admittedCache = getAdmittedPasses();
    const isAlreadyVisited = 
      Boolean(admittedCache[`${tokenToVerify.trim()}::${placeId}`]) ||
      Boolean(matchedPass?.reference && admittedCache[`${matchedPass.reference}::${placeId}`]) ||
      Boolean(matchedPass?.visitedPlaces?.some(v => v.placeId === placeId || (v.name && v.name.toLowerCase().includes(kw))));

    if (isAlreadyVisited) {
      setIsScanning(false);
      playScannerSound(false);
      const result = {
        success: false,
        touristName: matchedPass?.touristName || 'Ticket Holder',
        message: `ENTRY DENIED: Single entry for ${checkpointName} was already redeemed. Re-entry prohibited.`,
        checkpoint: checkpointName,
        token: tokenToVerify
      };
      setVerdict(result);
      recordScanResult(result, false, tokenToVerify, checkpointName);
      setTimeout(() => setVerdict(null), 5000);
      return;
    }

    // 3. Local Offline Verification if offline
    if (!isOnline) {
      setTimeout(async () => {
        const offRes = await verifyPassOffline(tokenToVerify, placeId, gateId, checkpointName, kw);
        setIsScanning(false);
        const isOk = offRes.valid;
        if (isOk) {
          markPassVisited(tokenToVerify, placeId, checkpointName, gateId);
        }
        playScannerSound(isOk);

        const result = {
          success: isOk,
          touristName: offRes.touristName || matchedPass?.touristName || (isOk ? 'Verified Visitor' : 'Unregistered Ticket'),
          message: isOk ? `ENTRY GRANTED • ADMIT 1 (${checkpointName})` : offRes.message,
          checkpoint: checkpointName,
          token: tokenToVerify
        };

        setVerdict(result);
        recordScanResult(result, isOk, tokenToVerify, checkpointName);
        setTimeout(() => setVerdict(null), 5000);
      }, 200);
      return;
    }

    // 4. Cloud Server verification with offline fallback
    try {
      const res = await scannerService.verifyPass({
        token: tokenToVerify,
        placeId: placeId,
        turnstileId: gateId
      });

      if (!res.valid) {
        playScannerSound(false);
        const result = {
          success: false,
          touristName: res.touristName || matchedPass?.touristName || 'Ticket Holder',
          message: res.message || `ENTRY DENIED: Ticket not valid for ${checkpointName}.`,
          checkpoint: checkpointName,
          token: tokenToVerify
        };
        setVerdict(result);
        recordScanResult(result, false, tokenToVerify, checkpointName);
        setTimeout(() => setVerdict(null), 5000);
        return;
      }

      markPassVisited(tokenToVerify, placeId, checkpointName, gateId);
      playScannerSound(true);
      const result = {
        success: true,
        touristName: res.touristName || matchedPass?.touristName || 'Verified Visitor',
        message: `ENTRY GRANTED • ADMIT 1 (${checkpointName})`,
        checkpoint: checkpointName,
        token: tokenToVerify
      };

      setVerdict(result);
      recordScanResult(result, true, tokenToVerify, checkpointName);
      setTimeout(() => setVerdict(null), 5000);
    } catch {
      // Fallback to local offline ledger
      const offRes = await verifyPassOffline(tokenToVerify, placeId, gateId, checkpointName, kw);
      const isOk = offRes.valid;
      if (isOk) {
        markPassVisited(tokenToVerify, placeId, checkpointName, gateId);
      }
      playScannerSound(isOk);

      const result = {
        success: isOk,
        touristName: offRes.touristName || matchedPass?.touristName || (isOk ? 'Verified Visitor' : 'Unregistered Ticket'),
        message: isOk ? `ENTRY GRANTED • ADMIT 1 (${checkpointName})` : offRes.message,
        checkpoint: checkpointName,
        token: tokenToVerify
      };

      setVerdict(result);
      recordScanResult(result, isOk, tokenToVerify, checkpointName);
      setTimeout(() => setVerdict(null), 5000);
    } finally {
      setIsScanning(false);
    }
  }, [tokenInput, isScanning, activeCheckpoint, isOnline]);

  useEffect(() => {
    handleScanPassRef.current = handleScanPass;
  }, [handleScanPass]);

  return (
    <div className="relative min-h-[100dvh] bg-[#080A0F] text-slate-100 font-sans-clean overflow-x-hidden flex flex-col">
      
      {/* MINIMAL HEADER */}
      <header className="sticky top-0 z-50 w-full bg-[#0E121A]/95 backdrop-blur-xl border-b border-white/10 px-4 md:px-8 py-3 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-300">
            <Scan className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-sm text-white">Gate Admission Scanner</span>
            <span className="text-[10px] text-slate-400">AP & TG Tourism Corridor</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Online/Offline status dot */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-xs">
            {isOnline ? (
              <>
                <Wifi className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-300 text-[11px] font-medium hidden sm:inline">Online</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3 h-3 text-amber-400" />
                <span className="text-amber-300 text-[11px] font-medium hidden sm:inline">Offline</span>
              </>
            )}
          </div>

          {/* Sound Toggle */}
          <button
            onClick={handleToggleSound}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer"
            title={soundEnabled ? 'Mute' : 'Unmute'}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> : <VolumeX className="w-3.5 h-3.5 text-slate-500" />}
          </button>

          {/* Return to Tourist View */}
          <button
            onClick={() => {
              stopCameraStream();
              onExitAgentMode();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Tourist View</span>
          </button>
        </div>
      </header>

      {/* MAIN SCANNER INTERFACE */}
      <main className="flex-1 max-w-3xl w-full mx-auto p-4 sm:p-6 flex flex-col gap-5">

        {/* ACTIVE CHECKPOINT SELECTOR (10 DISTRICTS) */}
        <div className="p-4 rounded-2xl bg-[#0E121A] border border-white/10 flex flex-col gap-2">
          <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-amber-400" />
              <span>Assigned Monument Checkpoint</span>
            </span>
            <span className="text-[10px] font-mono text-amber-400">
              Entry: ₹{activeCheckpoint.fee} • {activeCheckpoint.gate}
            </span>
          </label>

          <select
            value={selectedPlaceId}
            onChange={(e) => {
              setSelectedPlaceId(Number(e.target.value));
              setVerdict(null);
            }}
            className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-amber-400/30 text-white text-xs sm:text-sm font-medium focus:outline-none focus:border-amber-400 cursor-pointer"
          >
            {CHECKPOINTS.map((cp) => (
              <option key={cp.id} value={cp.id} className="bg-[#0E121A] text-white py-1">
                {cp.name} — {cp.district} ({cp.state}) • ₹{cp.fee}
              </option>
            ))}
          </select>
        </div>

        {/* SHIFT COUNTERS */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-[#0E121A] border border-white/10 flex flex-col items-center justify-center">
            <span className="text-[11px] text-slate-400">Admitted</span>
            <span className="text-xl font-bold text-emerald-400 font-mono">{scanStats.approved}</span>
          </div>

          <div className="p-3 rounded-xl bg-[#0E121A] border border-white/10 flex flex-col items-center justify-center">
            <span className="text-[11px] text-slate-400">Denied</span>
            <span className="text-xl font-bold text-rose-400 font-mono">{scanStats.denied}</span>
          </div>

          <div className="p-3 rounded-xl bg-[#0E121A] border border-white/10 flex items-center justify-center">
            <button
              onClick={handleResetShiftStats}
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3 text-amber-400" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* INSTANT VERDICT BANNER */}
        <AnimatePresence>
          {verdict && (
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className={`p-5 rounded-2xl border-2 flex flex-col items-center text-center gap-2 shadow-xl ${
                verdict.success
                  ? 'bg-emerald-950/90 border-emerald-400 text-emerald-100'
                  : 'bg-rose-950/90 border-rose-400 text-rose-100'
              }`}
            >
              {verdict.success ? (
                <CheckCircle className="w-12 h-12 text-emerald-400" />
              ) : (
                <XCircle className="w-12 h-12 text-rose-400" />
              )}
              <div className="flex flex-col gap-0.5">
                <span className="text-lg sm:text-xl font-bold">{verdict.message}</span>
                <span className="text-xs text-slate-300">Visitor: {verdict.touristName}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* CAMERA VIEWPORT OR OPEN BUTTON */}
        <div className="p-5 rounded-2xl bg-[#0E121A] border border-white/10 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Camera className="w-4 h-4 text-amber-400" />
              <span>Camera Scanner</span>
            </span>

            {isCameraActive && (
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleFlipCamera}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <FlipHorizontal className="w-3 h-3 text-amber-400" />
                  <span>Flip</span>
                </button>
                <button
                  onClick={stopCameraStream}
                  className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <CameraOff className="w-3 h-3" />
                  <span>Close</span>
                </button>
              </div>
            )}
          </div>

          {cameraError && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{cameraError}</span>
            </div>
          )}

          {isCameraActive ? (
            <div className="relative w-full aspect-video max-h-64 rounded-xl overflow-hidden bg-black border border-amber-400/30 flex items-center justify-center">
              <video
                ref={setVideoRef}
                autoPlay
                playsInline
                webkit-playsinline="true"
                muted
                onLoadedMetadata={() => videoRef.current?.play().catch(() => {})}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-44 h-44 border-2 border-amber-400/70 rounded-2xl relative shadow-lg">
                  <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent absolute top-0 animate-[scanLaser_2s_ease-in-out_infinite]" />
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={() => startCamera()}
              className="w-full py-4 rounded-xl border border-dashed border-white/20 hover:border-amber-400/50 bg-white/[0.02] hover:bg-amber-400/[0.05] flex items-center justify-center gap-2 text-xs font-semibold text-white transition-colors cursor-pointer"
            >
              <Camera className="w-4 h-4 text-amber-400" />
              <span>Open Device Camera</span>
            </button>
          )}

          {/* MANUAL INPUT */}
          <div className="flex gap-2 pt-2">
            <input
              type="text"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleScanPass();
              }}
              placeholder="Paste ticket code or pass reference..."
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-amber-400"
            />
            <button
              onClick={() => handleScanPass()}
              disabled={isScanning || !tokenInput.trim()}
              className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
            >
              <Scan className="w-3.5 h-3.5" />
              <span>{isScanning ? 'Verifying...' : 'Scan'}</span>
            </button>
          </div>

          {/* Active Booked Pass Quick Scan Shortcut */}
          {activeBookedPass && (
            <div className="flex items-center gap-2 text-xs pt-1">
              <span className="text-[10px] text-slate-400 font-mono">Quick scan:</span>
              <button
                onClick={() => {
                  setTokenInput(activeBookedPass.reference);
                  handleScanPass(activeBookedPass.reference);
                }}
                className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-400/30 text-amber-300 text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1"
              >
                <Ticket className="w-3 h-3" />
                <span>Active Pass ({activeBookedPass.reference})</span>
              </button>
            </div>
          )}
        </div>

        {/* RECENT SCANS LOG */}
        {recentScans.length > 0 && (
          <div className="p-4 rounded-2xl bg-[#0E121A] border border-white/10 flex flex-col gap-2">
            <span className="text-xs font-semibold text-slate-400">Recent Shift Check-ins</span>
            <div className="flex flex-col gap-1.5">
              {recentScans.map((scan) => (
                <div 
                  key={scan.id}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.02] border border-white/5 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${scan.success ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                    <span className="font-medium text-white">{scan.name}</span>
                    <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">{scan.code} • {scan.checkpoint}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      scan.success ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10'
                    }`}>
                      {scan.success ? 'Admitted' : 'Denied'}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">{scan.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>

    </div>
  );
}