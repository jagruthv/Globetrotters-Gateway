import React, { useState, useRef, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Headphones, 
  Play, 
  Pause, 
  SkipForward,
  SkipBack,
  Mic, 
  MicOff, 
  X, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  Send,
  AlertCircle,
  Search,
  MapPin,
  Utensils,
  Landmark,
  Radio,
  Loader2
} from 'lucide-react';
import { MASTER_ATLAS_DATA } from '../utils/masterAtlasData.js';

// Helper: Wraps raw 16-bit 24kHz mono PCM in a standard 44-byte RIFF/WAVE header for HTML5 <audio>
function pcmToWav(pcmData, sampleRate = 24000, numChannels = 1) {
  const wavHeader = new ArrayBuffer(44);
  const view = new DataView(wavHeader);
  const dataLen = pcmData.byteLength;

  view.setUint32(0, 0x52494646, false); // "RIFF"
  view.setUint32(4, 36 + dataLen, true);
  view.setUint32(8, 0x57415645, false); // "WAVE"
  view.setUint32(12, 0x666d7420, false); // "fmt "
  view.setUint32(16, 16, true); // Subchunk1Size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * 2, true);
  view.setUint16(32, numChannels * 2, true);
  view.setUint16(34, 16, true); // Bits per sample
  view.setUint32(36, 0x64617461, false); // "data"
  view.setUint32(40, dataLen, true);

  return new Blob([wavHeader, pcmData], { type: 'audio/wav' });
}

export default function VoiceConciergeModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('stories'); // 'stories' | 'live'
  
  // Gemini 3.8 Flash Neural Voice Guide States
  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [lastUserPrompt, setLastUserPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [activeModel] = useState('Gemini 3.8 Flash TTS');
  const [liveError, setLiveError] = useState(null);
  const [textInput, setTextInput] = useState('');

  // Curated Walk States (Dynamic Across All 646 Destinations)
  const [selectedLanguage, setSelectedLanguage] = useState('en'); // 'en' | 'te' | 'hi'
  const [storySearchQuery, setStorySearchQuery] = useState('');
  const [storyFilter, setStoryFilter] = useState('ALL'); // 'ALL' | 'AP' | 'TG'
  const [selectedSpotId, setSelectedSpotId] = useState(null);
  const [activeStory, setActiveStory] = useState(null);
  const [isLoadingStory, setIsLoadingStory] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isLiveWalkActive, setIsLiveWalkActive] = useState(false); // Continuous sequence walk
  const [audioError, setAudioError] = useState(null);

  // In-Memory Story & TTS Audio Caches (Avoid duplicate LLM/TTS calls)
  const storyCacheRef = useRef({});
  const audioBlobCacheRef = useRef({});
  const currentAudioRef = useRef(null);
  const recognitionRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const playDestinationStoryRef = useRef(null);

  // Extract all 646 destinations dynamically from Master Atlas
  const allAtlasDestinations = useMemo(() => {
    const list = [];
    const processDistricts = (districts, stateName) => {
      if (!Array.isArray(districts)) return;
      districts.forEach(d => {
        if (!Array.isArray(d.spots)) return;
        d.spots.forEach(s => {
          const id = `atlas-${s.slug || s.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
          const safeTimings = s.timings || s.openingTime || '09:00 AM – 06:00 PM';
          const safeFees = s.fees || s.feesDescription || (s.individualPrice ? `₹${s.individualPrice}` : 'Free entry');
          const safeDesc = s.description || s.backstory || 'Historical regional landmark in the tourism corridor.';
          const safeFood = s.culinarySpecialty || '';

          list.push({
            id,
            name: s.name,
            district: d.name,
            state: stateName,
            category: s.category || 'Heritage & Culture',
            timings: safeTimings,
            fees: safeFees,
            description: safeDesc,
            culinarySpecialty: safeFood,
            imageUrl: s.imageUrl || '',
            googlePlaceId: s.googlePlaceId || ''
          });
        });
      });
    };

    processDistricts(MASTER_ATLAS_DATA?.andhraPradesh, 'Andhra Pradesh');
    processDistricts(MASTER_ATLAS_DATA?.telangana, 'Telangana');
    return list;
  }, []);

  // Filtered destinations pool based on state and search query
  const filteredStories = useMemo(() => {
    let pool = allAtlasDestinations;
    if (storyFilter === 'AP') {
      pool = allAtlasDestinations.filter(s => s.state === 'Andhra Pradesh');
    } else if (storyFilter === 'TG') {
      pool = allAtlasDestinations.filter(s => s.state === 'Telangana');
    }

    if (!storySearchQuery.trim()) {
      return pool.slice(0, 35);
    }

    const q = storySearchQuery.toLowerCase().trim();
    return pool.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.district.toLowerCase().includes(q) ||
      (s.category && s.category.toLowerCase().includes(q))
    ).slice(0, 45);
  }, [allAtlasDestinations, storyFilter, storySearchQuery]);

  // Active Spot derived reactively without cascading setState in effects
  const activeSpot = useMemo(() => {
    if (selectedSpotId) {
      const match = filteredStories.find(s => s.id === selectedSpotId);
      if (match) return match;
    }
    return filteredStories[0] || null;
  }, [filteredStories, selectedSpotId]);

  // Preload and cache browser voices on mount
  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    const loadVoices = () => {
      try {
        window.speechSynthesis.getVoices();
      } catch {}
    };
    loadVoices();
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
    };
  }, []);

  // Stop All Audio & Recognition
  const stopAllAudio = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }
    if (window._gtActiveUtterance) {
      window._gtActiveUtterance.onstart = null;
      window._gtActiveUtterance.onend = null;
      window._gtActiveUtterance.onerror = null;
      window._gtActiveUtterance = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlayingAudio(false);
    setIsSpeaking(false);
  }, []);

  // ── Speech Synthesis Engine (Chromium GC-Safe & Resilient) ────────────────
  const speakWithSpeechSynthesis = useCallback((text, lang, onEndCallback) => {
    if (!('speechSynthesis' in window) || !text) {
      if (onEndCallback) onEndCallback();
      return;
    }

    try {
      // 1. Cancel previous speech cleanly
      window.speechSynthesis.cancel();
      if (window._gtActiveUtterance) {
        window._gtActiveUtterance.onstart = null;
        window._gtActiveUtterance.onend = null;
        window._gtActiveUtterance.onerror = null;
        window._gtActiveUtterance = null;
      }

      // 2. Unpause engine if stuck
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }

      // 3. Prevent Chromium V8 Garbage Collection of active utterance
      const utterance = new SpeechSynthesisUtterance(text);
      window._gtActiveUtterance = utterance;

      // 4. Select voice safely
      const voices = window.speechSynthesis.getVoices() || [];
      let matchedVoice = null;

      if (lang === 'te') {
        matchedVoice = voices.find(v => v.lang.toLowerCase().startsWith('te') || v.name.toLowerCase().includes('telugu'));
        if (matchedVoice) {
          utterance.voice = matchedVoice;
          utterance.lang = matchedVoice.lang;
        } else {
          // Telugu voice pack not installed on this OS/device:
          // Fall back to Indian English voice or Hindi voice to avoid Chrome's language-unavailable error
          const indianVoice = voices.find(v => v.lang.toLowerCase().includes('in') || v.name.toLowerCase().includes('india'));
          if (indianVoice) {
            utterance.voice = indianVoice;
            utterance.lang = indianVoice.lang;
          } else {
            utterance.lang = 'en-IN';
          }
        }
        utterance.rate = 0.95;
      } else if (lang === 'hi') {
        matchedVoice = voices.find(v => v.lang.toLowerCase().startsWith('hi') || v.name.toLowerCase().includes('hindi'));
        if (matchedVoice) {
          utterance.voice = matchedVoice;
          utterance.lang = matchedVoice.lang;
        } else {
          const indianVoice = voices.find(v => v.lang.toLowerCase().includes('in'));
          if (indianVoice) {
            utterance.voice = indianVoice;
            utterance.lang = indianVoice.lang;
          } else {
            utterance.lang = 'hi-IN';
          }
        }
        utterance.rate = 1.0;
      } else {
        matchedVoice = voices.find(v => v.lang.toLowerCase() === 'en-in' || v.name.toLowerCase().includes('india') || v.lang.toLowerCase().startsWith('en'));
        if (matchedVoice) {
          utterance.voice = matchedVoice;
          utterance.lang = matchedVoice.lang;
        } else {
          utterance.lang = 'en-IN';
        }
        utterance.rate = 1.02;
      }

      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      utterance.onstart = () => {
        setIsPlayingAudio(true);
        setIsSpeaking(true);
      };

      utterance.onend = () => {
        setIsPlayingAudio(false);
        setIsSpeaking(false);
        window._gtActiveUtterance = null;
        if (onEndCallback) onEndCallback();
      };

      utterance.onerror = (e) => {
        console.warn('Speech synthesis notice:', e.error);
        setIsPlayingAudio(false);
        setIsSpeaking(false);
        window._gtActiveUtterance = null;
        if (onEndCallback) onEndCallback();
      };

      // 5. Short tick before calling speak to allow cancel() to clear engine state
      setTimeout(() => {
        try {
          if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
          }
          window.speechSynthesis.speak(utterance);
          setIsPlayingAudio(true);
        } catch (err) {
          console.warn('SpeechSynthesis invocation notice:', err);
          setIsPlayingAudio(false);
        }
      }, 40);

    } catch (err) {
      console.warn('Speech synthesis setup failed:', err);
      setIsPlayingAudio(false);
      if (onEndCallback) onEndCallback();
    }
  }, []);

  // ── Play Destination Story (Generated Directly via Gemini 3.8 Flash Neural TTS) ───
  const playDestinationStory = useCallback(async (spot, autoAdvance = false) => {
    if (!spot) return;

    // If tapping currently playing spot, toggle pause
    if (!autoAdvance && activeSpot?.id === spot.id && isPlayingAudio) {
      stopAllAudio();
      return;
    }

    stopAllAudio();
    setSelectedSpotId(spot.id);
    setAudioError(null);

    // Synchronously prime AudioContext inside user gesture so browser unlocks HTML5 audio
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!window._gtAudioCtx && AudioCtx) {
        window._gtAudioCtx = new AudioCtx();
      }
      if (window._gtAudioCtx && window._gtAudioCtx.state === 'suspended') {
        window._gtAudioCtx.resume();
      }
    } catch {}

    const cacheKey = `${spot.id}_${selectedLanguage}`;

    // 1. Prepare spot narrative
    let storyData = storyCacheRef.current[cacheKey];
    if (!storyData) {
      const langNotice = selectedLanguage === 'te'
        ? `${spot.name} కు స్వాగతం. ${spot.district}, ${spot.state}. ${spot.description}. సందర్శన సమయాలు ${spot.timings}. ప్రవేశ రుసుము ${spot.fees}.`
        : selectedLanguage === 'hi'
        ? `${spot.name} में आपका स्वागत है। ${spot.district}, ${spot.state}। ${spot.description}। दर्शन का समय ${spot.timings}। प्रवेश शुल्क ${spot.fees}।`
        : `Welcome to ${spot.name} in ${spot.district}, ${spot.state}. ${spot.description}. Visiting hours are ${spot.timings}. Entrance fee is ${spot.fees}. When visiting, be sure to experience ${spot.culinarySpecialty || 'authentic regional dishes'}.`;

      storyData = {
        title: spot.name,
        narrative: langNotice,
        highlights: [
          `Main entrance and historic grounds in ${spot.district}`,
          `Cultural heritage landmark of ${spot.state}`
        ],
        foodRecommendation: spot.culinarySpecialty || 'Authentic regional dishes',
        historicalFact: `Historic cultural destination in ${spot.district}, ${spot.state}.`
      };
      storyCacheRef.current[cacheKey] = storyData;
    }

    setActiveStory(storyData);

    // 2. Playback Completion Handler for Continuous Live Walk
    const onEnded = () => {
      setIsPlayingAudio(false);
      setIsSpeaking(false);
      if (isLiveWalkActive) {
        const currentList = filteredStories;
        if (currentList.length > 1) {
          const currentIdx = currentList.findIndex(s => s.id === spot.id);
          const nextIdx = (currentIdx + 1) % currentList.length;
          const nextSpot = currentList[nextIdx];
          if (nextSpot && playDestinationStoryRef.current) {
            setTimeout(() => {
              playDestinationStoryRef.current(nextSpot, true);
            }, 1000);
          }
        }
      }
    };

    // 3. Fast Path: If Gemini Neural Audio Blob is already cached, play immediately
    const cachedAudioUrl = audioBlobCacheRef.current[cacheKey];
    if (cachedAudioUrl) {
      try {
        const audio = new Audio(cachedAudioUrl);
        currentAudioRef.current = audio;
        audio.onended = onEnded;
        audio.onerror = () => {
          speakWithSpeechSynthesis(storyData.narrative, selectedLanguage, onEnded);
        };
        await audio.play();
        setIsPlayingAudio(true);
        setIsSpeaking(true);
        setIsLoadingStory(false);
        return;
      } catch (playErr) {
        console.warn('Cached audio playback notice:', playErr);
      }
    }

    // 4. Generate Neural Audio directly via Gemini TTS Endpoint on Click
    setIsLoadingStory(true);

    try {
      const ttsRes = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: storyData.narrative,
          voice: 'Puck',
          language: selectedLanguage
        })
      });

      if (ttsRes.ok) {
        const ttsData = await ttsRes.json();
        if (ttsData.audioBase64) {
          const binaryString = atob(ttsData.audioBase64);
          const len = binaryString.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }

          let finalBlob;
          const isRiff = bytes.length > 4 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46;
          if (!isRiff && (!ttsData.mimeType || ttsData.mimeType.includes('pcm') || ttsData.mimeType.includes('wav'))) {
            finalBlob = pcmToWav(bytes.buffer, 24000, 1);
          } else {
            finalBlob = new Blob([bytes], { type: ttsData.mimeType || 'audio/wav' });
          }

          const audioBlobUrl = URL.createObjectURL(finalBlob);
          audioBlobCacheRef.current[cacheKey] = audioBlobUrl;

          const audio = new Audio(audioBlobUrl);
          currentAudioRef.current = audio;
          audio.onended = onEnded;
          audio.onerror = () => {
            speakWithSpeechSynthesis(storyData.narrative, selectedLanguage, onEnded);
          };

          await audio.play();
          setIsPlayingAudio(true);
          setIsSpeaking(true);
          setIsLoadingStory(false);
          return;
        }
      }
    } catch (ttsErr) {
      console.warn('Gemini Flash TTS invocation notice:', ttsErr);
    }

    // 5. Fallback if Gemini TTS endpoint returned fallback or network failed
    speakWithSpeechSynthesis(storyData.narrative, selectedLanguage, onEnded);
    setIsLoadingStory(false);
  }, [activeSpot?.id, isPlayingAudio, selectedLanguage, isLiveWalkActive, filteredStories, stopAllAudio, speakWithSpeechSynthesis]);

  // Keep playDestinationStoryRef synchronized outside of render
  useEffect(() => {
    playDestinationStoryRef.current = playDestinationStory;
  }, [playDestinationStory]);

  // Navigate to Next Spot in Sequence
  const handleNextSpot = () => {
    if (!filteredStories.length) return;
    const currentIdx = filteredStories.findIndex(s => s.id === activeSpot?.id);
    const nextIdx = (currentIdx + 1) % filteredStories.length;
    playDestinationStory(filteredStories[nextIdx], true);
  };

  // Navigate to Previous Spot in Sequence
  const handlePrevSpot = () => {
    if (!filteredStories.length) return;
    const currentIdx = filteredStories.findIndex(s => s.id === activeSpot?.id);
    const prevIdx = (currentIdx - 1 + filteredStories.length) % filteredStories.length;
    playDestinationStory(filteredStories[prevIdx], true);
  };

  // ── Gemini 3.1 Flash Lite Live Voice Q&A (Tab 2) ───────────────────────────
  const sendToGemini = useCallback(async (userText) => {
    if (!userText || !userText.trim()) return;
    const cleanQuery = userText.trim();
    setLastUserPrompt(cleanQuery);
    setLiveTranscript('');
    setIsThinking(true);
    setLiveError(null);

    stopAllAudio();

    // Synchronously prime AudioContext inside user gesture
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!window._gtAudioCtx && AudioCtx) {
        window._gtAudioCtx = new AudioCtx();
      }
      if (window._gtAudioCtx && window._gtAudioCtx.state === 'suspended') {
        window._gtAudioCtx.resume();
      }
    } catch {}

    try {
      let reply = null;
      try {
        const edgeRes = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: cleanQuery })
        });
        if (edgeRes.ok) {
          const data = await edgeRes.json();
          reply = data.response || data.message;
        }
      } catch (netErr) {
        console.warn('Network call to /api/chat notice:', netErr);
      }

      // If backend was unreachable or returned empty, resolve locally from 59-district atlas
      if (!reply) {
        const q = cleanQuery.toLowerCase();
        const matched = allAtlasDestinations.find(s =>
          s.name.toLowerCase().includes(q) ||
          q.includes(s.name.toLowerCase()) ||
          s.district.toLowerCase().includes(q) ||
          q.includes(s.district.toLowerCase())
        );

        if (matched) {
          reply = `${matched.name} is located in ${matched.district}, ${matched.state}. ${matched.description}. Visiting hours are ${matched.timings}, and admission is ${matched.fees}. Local culinary specialty includes ${matched.culinarySpecialty || 'regional cuisine'}.`;
        } else {
          reply = `Welcome to Globetrotter Gateway. You asked about "${cleanQuery}". You can discover heritage destinations across 59 districts of Andhra Pradesh and Telangana, including Charminar, Tirupati, Warangal Fort, and Araku Valley. Select any destination in the Audio Guide tab to hear its live narration.`;
        }
      }

      setAiResponse(reply);

      // Play reply using Gemini Neural TTS directly
      let neuralPlayed = false;
      try {
        const ttsRes = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: reply,
            voice: 'Puck',
            language: 'en'
          })
        });

        if (ttsRes.ok) {
          const ttsData = await ttsRes.json();
          if (ttsData.audioBase64) {
            const binaryString = atob(ttsData.audioBase64);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }

            let finalBlob;
            const isRiff = bytes.length > 4 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46;
            if (!isRiff && (!ttsData.mimeType || ttsData.mimeType.includes('pcm') || ttsData.mimeType.includes('wav'))) {
              finalBlob = pcmToWav(bytes.buffer, 24000, 1);
            } else {
              finalBlob = new Blob([bytes], { type: ttsData.mimeType || 'audio/wav' });
            }

            const audioBlobUrl = URL.createObjectURL(finalBlob);
            const audio = new Audio(audioBlobUrl);
            currentAudioRef.current = audio;
            audio.onended = () => {
              setIsPlayingAudio(false);
              setIsSpeaking(false);
            };
            audio.onerror = () => {
              speakWithSpeechSynthesis(reply, 'en');
            };
            await audio.play();
            setIsPlayingAudio(true);
            setIsSpeaking(true);
            neuralPlayed = true;
          }
        }
      } catch (ttsErr) {
        console.warn('Gemini Live Voice TTS notice:', ttsErr);
      }

      if (!neuralPlayed) {
        speakWithSpeechSynthesis(reply, 'en');
      }
    } catch (err) {
      console.warn('Voice guide response notice:', err);
      const fallbackReply = `I am your verified regional travel guide. Please ask about any destination or district across Andhra Pradesh and Telangana.`;
      setAiResponse(fallbackReply);
      speakWithSpeechSynthesis(fallbackReply, 'en');
    } finally {
      setIsThinking(false);
    }
  }, [allAtlasDestinations, stopAllAudio, speakWithSpeechSynthesis]);

  // Speech Recognition Lifecycle (Fresh Instance on Every Activation)
  const startLiveSession = () => {
    stopAllAudio();
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setLiveError('Microphone speech recognition is not supported in this browser. You can type your query in the box below to hear the voice guide.');
      return;
    }

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
        recognitionRef.current = null;
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-IN';

      recognition.onstart = () => {
        setIsListening(true);
        setLiveError(null);
      };

      recognition.onresult = (event) => {
        let interim = '';
        let finalTrans = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const text = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTrans += text;
          } else {
            interim += text;
          }
        }

        const currentSpeech = finalTrans || interim;
        setLiveTranscript(currentSpeech);

        if (finalTrans.trim().length > 1) {
          setIsListening(false);
          sendToGemini(finalTrans.trim());
        }
      };

      recognition.onerror = (e) => {
        setIsListening(false);
        if (e.error !== 'no-speech') {
          setLiveError(`Microphone notice: ${e.error}. You can also type your question.`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
      setIsListening(true);
    } catch (err) {
      setIsListening(false);
      setLiveError('Could not access microphone: ' + err.message);
    }
  };

  const stopLiveSession = useCallback(() => {
    setIsListening(false);
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
  }, []);

  const toggleLiveSession = () => {
    if (isListening) {
      stopLiveSession();
    } else {
      startLiveSession();
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (textInput.trim()) {
      sendToGemini(textInput.trim());
      setTextInput('');
    }
  };

  // Stop everything on modal close
  const handleClose = () => {
    stopLiveSession();
    stopAllAudio();
    setIsLiveWalkActive(false);
    setActiveTab('stories');
    if (onClose) onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-xl">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        className="relative w-full max-w-3xl bg-[#0E121A] border border-white/10 rounded-3xl p-4 sm:p-6 shadow-2xl text-slate-200 overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Subtle Ambient Background Gradients */}
        <div className="absolute -top-32 -left-32 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Top Bar */}
        <div className="relative z-10 flex items-center justify-between pb-3.5 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
              <Headphones className="w-4 h-4 text-amber-300" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-base font-sans-clean">
                  Live Monument Audio Guide
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 font-sans-clean font-semibold border border-emerald-500/30">
                  {activeTab === 'live' ? activeModel : '646 Destinations'}
                </span>
              </div>
              <span className="text-[11px] text-slate-400">
                Studio-grade narration across all 59 districts in English, Telugu, & Hindi
              </span>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="relative z-10 flex items-center gap-2 pt-3 pb-3 shrink-0">
          <button
            onClick={() => {
              setActiveTab('stories');
              stopLiveSession();
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'stories'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'bg-white/[0.03] text-slate-400 hover:text-slate-200 border border-white/5'
            }`}
          >
            <Headphones className="w-3.5 h-3.5" />
            <span>Monument Audio Player</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('live');
              stopAllAudio();
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'live'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'bg-white/[0.03] text-slate-400 hover:text-slate-200 border border-white/5'
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Interactive Voice Guide</span>
          </button>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TAB 1: DYNAMIC AUDIO WALK PLAYER (646 DESTINATIONS)                 */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'stories' && (
          <div className="relative z-10 flex-1 overflow-y-auto pr-1 flex flex-col gap-3.5">
            
            {/* Top Toolbar: Language Selector + Continuous Walk Mode Toggle */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 p-2.5 rounded-2xl bg-white/[0.02] border border-white/5">
              
              {/* Language Selector */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-400 font-sans-clean pl-1">Narration Language:</span>
                <div className="flex items-center gap-1">
                  {[
                    { code: 'en', label: 'English' },
                    { code: 'te', label: 'తెలుగు' },
                    { code: 'hi', label: 'हिन्दी' }
                  ].map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        if (selectedLanguage !== lang.code) {
                          setSelectedLanguage(lang.code);
                          stopAllAudio();
                          if (activeSpot) {
                            playDestinationStory(activeSpot, false);
                          }
                        }
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                        selectedLanguage === lang.code
                          ? 'bg-amber-400 text-slate-950 font-bold'
                          : 'bg-white/5 text-slate-300 hover:text-white'
                      }`}
                    >
                      {lang.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Continuous Live Circuit Walk Toggle */}
              <button
                onClick={() => setIsLiveWalkActive(prev => !prev)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer border ${
                  isLiveWalkActive
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm'
                    : 'bg-white/[0.03] text-slate-400 hover:text-white border-white/10'
                }`}
                title="When ON, audio guide automatically advances and plays the next destination in sequence"
              >
                <Radio className={`w-3.5 h-3.5 ${isLiveWalkActive ? 'text-emerald-400 animate-pulse' : 'text-slate-400'}`} />
                <span>Hands-Free Live Walk: <strong>{isLiveWalkActive ? 'ON' : 'OFF'}</strong></span>
              </button>
            </div>

            {/* Active Destination Dedicated Sound Deck */}
            {activeSpot && (
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-white/[0.05] to-white/[0.02] border border-white/10 shadow-lg flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 font-semibold flex items-center gap-1 border border-amber-500/30">
                        <MapPin className="w-2.5 h-2.5" />
                        <span>{activeSpot.district} • {activeSpot.state}</span>
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-slate-300 border border-white/10 font-sans-clean">
                        {activeSpot.category}
                      </span>
                      <span className="text-[10px] text-slate-400">{activeSpot.timings}</span>
                    </div>

                    <h3 className="text-base sm:text-lg font-bold text-white font-sans-clean mt-0.5 truncate">
                      {activeStory?.title || activeSpot.name}
                    </h3>
                  </div>

                  {/* Play/Pause Button + Skip Sequence Controls */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={handlePrevSpot}
                      disabled={isLoadingStory}
                      className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-300 hover:text-white cursor-pointer transition-colors disabled:opacity-40"
                      title="Previous Destination"
                    >
                      <SkipBack className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => playDestinationStory(activeSpot)}
                      disabled={isLoadingStory}
                      className={`w-11 h-11 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95 cursor-pointer ${
                        isPlayingAudio
                          ? 'bg-emerald-400 text-slate-950 hover:bg-emerald-300 ring-4 ring-emerald-400/20'
                          : 'bg-amber-400 text-slate-950 hover:bg-amber-300'
                      }`}
                      title={isPlayingAudio ? 'Pause Narration' : 'Play Live Narration'}
                    >
                      {isLoadingStory ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : isPlayingAudio ? (
                        <Pause className="w-5 h-5" />
                      ) : (
                        <Play className="w-5 h-5 ml-0.5" />
                      )}
                    </button>

                    <button
                      onClick={handleNextSpot}
                      disabled={isLoadingStory}
                      className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-300 hover:text-white cursor-pointer transition-colors disabled:opacity-40"
                      title="Next Destination"
                    >
                      <SkipForward className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Animated Sound Waveform Indicator */}
                {isPlayingAudio && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs">
                    <div className="flex items-end gap-1 h-3.5">
                      <span className="w-1 bg-emerald-400 rounded-full animate-[bounce_1s_infinite_100ms] h-2.5" />
                      <span className="w-1 bg-emerald-400 rounded-full animate-[bounce_1s_infinite_300ms] h-3.5" />
                      <span className="w-1 bg-emerald-400 rounded-full animate-[bounce_1s_infinite_200ms] h-2" />
                    </div>
                    <span className="font-sans-clean text-[11px] font-semibold">
                      Live Audio Guide playing {isLiveWalkActive ? '• Auto-advancing to next sight when finished' : ''}
                    </span>
                  </div>
                )}

                {/* Dynamic AI Narration Text */}
                <div className="p-3 rounded-xl bg-black/30 border border-white/5 flex flex-col gap-2">
                  <p className="text-xs sm:text-sm text-slate-200 font-sans-clean leading-relaxed">
                    {isLoadingStory ? (
                      <span className="text-amber-300 flex items-center gap-2 py-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Generating neural voice guide with Gemini 3.8 Flash TTS...
                      </span>
                    ) : (
                      activeStory?.narrative || activeSpot.description
                    )}
                  </p>

                  {/* Highlights & Culinary Chips */}
                  {activeStory && !isLoadingStory && (
                    <div className="pt-2 border-t border-white/5 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      {activeStory.foodRecommendation && (
                        <div className="flex items-center gap-1.5 text-amber-200/90 font-sans-clean">
                          <Utensils className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span className="truncate">Local Taste: <strong>{activeStory.foodRecommendation}</strong></span>
                        </div>
                      )}
                      {activeStory.historicalFact && (
                        <div className="flex items-center gap-1.5 text-slate-300 font-sans-clean">
                          <Landmark className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span className="truncate">{activeStory.historicalFact}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Search Bar for 646 Destinations */}
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                type="text"
                value={storySearchQuery}
                onChange={(e) => setStorySearchQuery(e.target.value)}
                placeholder="Search any of 646 destinations (e.g., Borra Caves, Ramappa, Gandikota)..."
                className="w-full pl-9 pr-9 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400/60 transition-colors"
              />
              {storySearchQuery && (
                <button
                  type="button"
                  onClick={() => setStorySearchQuery('')}
                  className="absolute right-3 text-slate-400 hover:text-white text-xs cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {[
                { id: 'ALL', label: 'All 646 Sights' },
                { id: 'AP', label: 'Andhra Pradesh (312)' },
                { id: 'TG', label: 'Telangana (334)' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setStoryFilter(tab.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                    storyFilter === tab.id
                      ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                      : 'bg-white/[0.02] text-slate-400 hover:text-white border border-white/5'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Error Notice */}
            {audioError && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{audioError}</span>
              </div>
            )}

            {/* Destination Walk List */}
            <div className="flex flex-col gap-2">
              <span className="text-[11px] text-slate-400 font-sans-clean font-semibold pl-1">
                Select Any Destination for Instant Dynamic Narration:
              </span>

              {filteredStories.map((spot) => {
                const isSelected = activeSpot?.id === spot.id;
                const isThisPlaying = isSelected && isPlayingAudio;

                return (
                  <div
                    key={spot.id}
                    onClick={() => playDestinationStory(spot)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-amber-950/20 border-amber-500/40 shadow-sm'
                        : 'bg-white/[0.02] border-white/5 hover:border-white/10 hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white font-sans-clean truncate">
                          {spot.name}
                        </span>
                        {isSelected && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 font-semibold">
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 font-sans-clean mt-0.5 truncate">
                        {spot.district} • {spot.state} • {spot.category}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        playDestinationStory(spot);
                      }}
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-95 ${
                        isThisPlaying
                          ? 'bg-emerald-400 text-slate-950'
                          : 'bg-white/10 hover:bg-amber-400 hover:text-slate-950 text-slate-300'
                      }`}
                    >
                      {isThisPlaying ? (
                        <Pause className="w-3.5 h-3.5" />
                      ) : (
                        <Play className="w-3.5 h-3.5 ml-0.5" />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>

          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TAB 2: INTERACTIVE LIVE VOICE GUIDE (AI CHAT)                      */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'live' && (
          <div className="relative z-10 flex-1 overflow-y-auto pr-1 flex flex-col gap-4">
            
            {/* Visualizer & Mic Button */}
            <div className="flex flex-col items-center justify-center py-6 px-2 bg-white/[0.02] border border-white/5 rounded-2xl relative overflow-hidden">
              <div className="relative flex items-center justify-center my-2">
                <motion.div
                  animate={{
                    scale: isListening ? [1, 1.25, 1] : isSpeaking ? [1, 1.35, 1] : 1,
                    opacity: isListening || isSpeaking ? [0.2, 0.6, 0.2] : 0.15
                  }}
                  transition={{ repeat: Infinity, duration: isSpeaking ? 1.2 : 1.8, ease: 'easeInOut' }}
                  className={`absolute w-28 h-28 rounded-full ${
                    isSpeaking ? 'bg-emerald-500/30' : isListening ? 'bg-amber-500/30' : 'bg-slate-700/20'
                  }`}
                />

                <button
                  onClick={toggleLiveSession}
                  className={`relative z-10 w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-transform active:scale-95 cursor-pointer ${
                    isListening
                      ? 'bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 ring-4 ring-amber-400/30'
                      : isSpeaking
                      ? 'bg-gradient-to-tr from-emerald-500 to-amber-400 text-slate-950'
                      : 'bg-white/10 hover:bg-white/15 text-slate-300 border border-white/15'
                  }`}
                  aria-label={isListening ? 'Pause Listening' : 'Start Live Session'}
                >
                  {isListening ? (
                    <Mic className="w-7 h-7" />
                  ) : (
                    <MicOff className="w-7 h-7" />
                  )}
                </button>
              </div>

              <div className="flex flex-col items-center gap-1.5 mt-2">
                <span className="text-xs font-semibold text-white tracking-wide">
                  {isThinking
                    ? 'Synthesizing travel intel...'
                    : isSpeaking
                    ? 'Regional guide is speaking...'
                    : isListening
                    ? 'Listening... speak anytime'
                    : 'Tap microphone to start hands-free voice consultation'}
                </span>
                <span className="text-[11px] text-slate-400 text-center max-w-sm">
                  {isListening
                    ? 'Ask about monuments, opening timings, entry rules, or authentic cuisine.'
                    : 'Get spoken answers about any destination across Andhra Pradesh & Telangana.'}
                </span>

                {isSpeaking && (
                  <button
                    onClick={stopAllAudio}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-medium cursor-pointer mt-2"
                  >
                    <VolumeX className="w-3.5 h-3.5" />
                    <span>Stop Voice</span>
                  </button>
                )}
              </div>
            </div>

            {/* Speech Transcript */}
            {liveTranscript && (
              <div className="p-3 rounded-2xl bg-amber-950/20 border border-amber-500/30 flex items-start gap-2.5">
                <Mic className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="flex flex-col">
                  <span className="text-[11px] font-sans-clean font-medium text-amber-400">Live speech:</span>
                  <p className="text-sm text-amber-100 font-sans-clean font-medium">
                    "{liveTranscript}"
                  </p>
                </div>
              </div>
            )}

            {/* Error Notice */}
            {liveError && (
              <div className="p-3 rounded-2xl bg-rose-950/30 border border-rose-500/30 flex items-start gap-2 text-rose-300 text-xs">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{liveError}</span>
              </div>
            )}

            {/* AI Response Card */}
            {(lastUserPrompt || aiResponse) && (
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col gap-2.5">
                {lastUserPrompt && (
                  <div className="flex flex-col border-b border-white/5 pb-2">
                    <span className="text-[11px] font-sans-clean font-medium text-slate-400">You asked:</span>
                    <p className="text-sm font-semibold text-slate-200 font-sans-clean">
                      "{lastUserPrompt}"
                    </p>
                  </div>
                )}

                {aiResponse && (
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-sans-clean font-medium text-emerald-400 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Travel Guidance:</span>
                      </span>
                      <button
                        onClick={() => speakWithSpeechSynthesis(aiResponse, 'en')}
                        className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1"
                        title="Replay Voice"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>Replay</span>
                      </button>
                    </div>
                    <p className="text-sm text-slate-300 font-sans-clean leading-relaxed whitespace-pre-wrap">
                      {aiResponse}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Manual Query Input */}
            <form onSubmit={handleManualSubmit} className="flex items-center gap-2 mt-auto pt-2">
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Or type a question (e.g. 'Ghat road safety for Lambasingi')..."
                className="flex-1 py-2.5 px-4 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-amber-400 transition-colors"
              />
              <button
                type="submit"
                disabled={!textInput.trim() || isThinking}
                className="py-2.5 px-4 rounded-full bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1 hover:bg-amber-300 transition-colors disabled:opacity-40"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Ask</span>
              </button>
            </form>

          </div>
        )}

      </motion.div>
    </div>
  );
}
