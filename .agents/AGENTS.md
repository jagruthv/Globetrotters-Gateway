# GEMINI API FREE-TIER-ONLY MODEL & SDK RULES (STRICT)

## 1. BANNED MODELS & LEGACY SDKS
- NEVER use `gemini-1.5-*`, `gemini-2.0-*`, `gemini-2.5-*` (shutting down Dec 1, 2026), or `gemini-3.7-flash`.
- NEVER use paid-only models (`gemini-4-carbon`, `gemini-4-argon`, `gemini-3.1-pro-preview`, `gemini-omni-1.2-flash`) or `google_maps` grounding — they have 0 Free Tier quota and will fail with HTTP 429.
- NEVER use legacy SDKs (`@google/generative-ai` or `google-generativeai`).
- ALWAYS use the unified Google GenAI SDK:
  - JS/TS: `import { GoogleGenAI } from '@google/genai';`
  - Python: `from google import genai`

## 2. FREE-TIER MODEL ROUTING (USE ONLY THESE)
- **Everyday Coding, Chat, JSON & Multimodal (Default):** `gemini-3.8-flash` (~250–500 RPD; higher daily quota than Hydrogen).
- **Hard Debugging, Architecture & Complex Reasoning (Save Quota):** `gemini-4-hydrogen` (STRICT CAP: 5 RPM / 20 RPD — reserve for tough reasoning tasks only; supports `thinking_level`: `low` | `medium` | `high` | `xhigh`).
- **High-Volume Loops, Bulk Extraction & Fast Summaries:** `gemini-3.5-flash-lite` (500+ RPD, highest Free Tier throughput).
- **Fast Yes/No Routing & Classification:** `gemini-decision-1` (200 RPM / 10,000 RPD, 0 output tokens).
- **Real-Time Two-Way Voice / Video Agents (WebSocket Live API):** `gemini-3.8-live` (or `gemini-3.8-live-extended-thinking` when background tool reasoning is needed).
- **Text-to-Speech (TTS):** `gemini-3.8-flash-lite-tts` (fast/real-time) or `gemini-3.8-flash-tts` (expressive/multi-speaker; requires `api_version: 'v1beta'`).
- **Speech-to-Text (STT):** `gemini-3.5-transcribe` (audio files up to 1 hr) or `gemini-3.5-transcribe-live` (real-time WebSocket stream).
- **Image Generation & Editing:** `gemini-3.1-flash-image`
- **Embeddings / RAG:** `gemini-embedding-2` (multimodal) or `gemini-embedding-001` (text).

## 3. QUOTA PROTECTION RULES
- Because `gemini-4-hydrogen` only allows 20 RPD and 5 RPM on Free Tier, default standard app calls to `gemini-3.8-flash` or `gemini-3.5-flash-lite`, and add exponential backoff on HTTP 429 errors.
- Only attach `tools=[{"google_search": {}}]` when live web data is explicitly required (1,500 RPD limit).
