# Omni-Web & Multi-Model Permanent Memory & Operational Protocols

> **Core Directive**: STRICT SINGLE-CHAT PERSISTENCE. Never spawn multiple chat conversations in Claude or Gemini web sessions. Always resume and continue in the designated persistent conversation ID stored on disk.

---

## 1. Permanent Chat Identifiers & Configuration

| Service | Persistent Session Identifier | Default / Active Model | Storage Location |
| :--- | :--- | :--- | :--- |
| **Anthropic Claude** (`claude.ai`) | `337b46bf-d31d-4752-92c8-1e22b6b5fc80` | `claude-sonnet-5-5` | `C:\Users\HP\.gemini\omni-web-mcp\persistent_sessions.json` |
| **Google Gemini** (`gemini.google.com`) | `cid`: `c_2ba65295b71f76c1`<br>`rid`: `r_24c521cf141e13e0`<br>`rcid`: `rc_548e3c1020d0b07b` | `gemini-4-hydrogen`<br>*(also `gemini-pro`, `gemini-carbon`)* | `C:\Users\HP\.gemini\omni-web-mcp\persistent_sessions.json` |
| **LMSYS Chatbot Arena** (`arena.ai`) | Live Browser Tab Relay | Side-by-Side: `https://arena.ai/text/side-by-side?model_a=gemini-4-argon-high&model_b=claude-sonnet-5-5-high` | Port `8765` (`http://127.0.0.1:8765/relay`) |

---

## 2. Gemini Model Mapping & Quota Ground Truth

- **Active Authenticated Slot**: Account Slot 1 (`SECURE_1PSID` in `.env`)
- **Quota Status**: ~40,500 / 48,384 credits remaining, abuse status: **Clean** (No flags).
- **Available Models in Client Registry**:
  - `gemini-4-hydrogen` (ID: `56fdd199312815e2`, Description: *4 Hydrogen*) — **Primary Reasoning Model**
  - `gemini-pro` (ID: `e6fa609c3fa255c0`, Description: *3.1 Pro*) — **General Balanced Model**
  - `gemini-carbon` (ID: `95a4c0abcba24364`, Description: *4 Carbon*) — **High-Speed Model**
  - `gemini-flash-lite` (ID: `8c46e95b1a07cecc`, Description: *3.5 Flash-Lite*) — **Lightweight Fallback**
- **Alias Resolution**:
  - Any request for `argon`, `argon 4`, `hydrogen`, or `gemini-4` automatically routes to `gemini-4-hydrogen`.
  - Passing invalid model names is blocked; `server.py` auto-resolves to registered models.

---

## 3. LMSYS Chatbot Arena Side-by-Side & Community Rating

- **Mode**: "Side-by-Side (choose 2 models)" / "Direct Chat" on `https://arena.ai` or `https://lmarena.ai`.
- **How It Operates**:
  1. User keeps an active tab with `arena.ai` open in Chrome with the **Omni-Web Cookie Sync & Tab Relay** extension enabled.
  2. The MCP tool `arena_web_chat(prompt, mode="side_by_side", vote=...)` sends the prompt to the background relay on port `8765`.
  3. The extension content script types into the Arena textarea, tracks newly rendered assistant nodes, and waits for streaming to complete.
  4. Both Model A and Model B responses are captured in a single turn:
     ```markdown
     ### 🅰️ Model A Response:
     ...
     ---
     ### 🅱️ Model B Response:
     ...
     ```
  5. **Community Rating Contribution**:
     - If `vote` is provided (`model_a`, `model_b`, `tie`, `both_bad`), the content script automatically clicks the voting button on the page to register our community contribution.

---

## 4. Agent Reach Tool Security & Scope

- **Tool Path**: `C:\Users\HP\.local\bin\agent-reach.exe` (v1.6.1)
- **Initialized Platforms**: GitHub, YouTube, Bilibili, V2EX, General Web.
- **Safety Guarantee**: Pure read-only data extraction and search. No authentication elevation, no write access to external accounts, zero local system modification.
- **Usage**: Used autonomously by the AI when research on forums, video transcripts, or open-source issues is required.

---

## 5. Strict Operational Directives for All AI Sessions

1. **NO MULTIPLE CHATS**:
   - Before calling `claude_web_ask` or `claude_web_chat`, verify that `persistent_sessions.json` is loaded and `conversation_id="337b46bf-d31d-4752-92c8-1e22b6b5fc80"` is passed.
   - For `gemini_web_ask` and `gemini_web_chat`, ensure `cid="c_2ba65295b71f76c1"` is used.
2. **NO ROBOTIC AI CADENCE / NO CHINESE TEXT**:
   - The user is fluent in English, Hindi, and Telugu. All outputs and explanations must be clean, precise English with zero foreign untranslated logs.
3. **NEVER DUMP FULL CODE IN CHAT**:
   - Always make edits via file modification tools; provide only diff summaries and clickable file links.

