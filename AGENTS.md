# Globetrotter Gateway — Project Rules & Agent Guide

> **Core Philosophy**: Build things cleanly, speak simply, and never claim what hasn't been done.

---

## Rule 0: Write & Speak in Simple, Human Words (Mandatory)
- **Plain English First**: Write so simply and clearly that every citizen, even someone with basic English, can understand immediately.
- **Zero AI Clichés & Fluff**: Never use robotic buzzwords (*delve, leverage, robust, seamless, comprehensive, streamline, testament, pivotal, paramount, tapestry*). Ban reflexive triplets (*fast, reliable, and scalable*).
- **Honest & Direct**: Never make fake claims or show fake data. Lead with concrete actions and clear facts.

---

## Rule 1: Honest Application State & Real Tickets
- **No Fake Issued Tickets on Homepage**: The home page is for discovering Andhra Pradesh and Telangana. Never show an issued ticket with "VALID & ACTIVE" to a visitor who hasn't bought one.
- **Real Scannable QR Codes**: Always generate real scannable QR codes using the `qrcode` engine. Never use static dummy icons. Every QR code must decode the actual pass token when scanned by a phone camera or gate turnstile.
- **Ticket Page Logic**:
  - If the user has not booked a pass yet, show a clean, friendly empty state with buttons to "Explore Tour Packages" and "Plan a Custom Trip".
  - Only show the curated movie-style ticket after the user actually books a tour or pass.

---

## Rule 2: Clean Subpage URL Links & Sharing
- **Distinct Subpage URLs**: Every main section must have its own clear shareable link:
  - Overview / Home: `/#/`
  - 59 Districts: `/#/districts`
  - Tour Planner: `/#/planner`
  - Tour Packages: `/#/packages`
  - Entry Passes: `/#/passes`
- **Browser Navigation**: Support browser back/forward buttons and page refreshes so users never lose their place. Users must be able to copy the URL and share that exact page with friends.

---

## Rule 3: Gemini Free-Tier AI Model Directive
- **Allowed Models Only**:
  - Primary (Chat, Planning, Multimodal): `gemini-3.8-flash` (~250–500 free requests/day).
  - Fast Loops & Fallback: `gemini-3.5-flash-lite` (500+ free requests/day).
- **Strictly Banned Models**:
  - Never use `gemini-1.5-*`, `gemini-2.0-*`, `gemini-2.5-*` (discontinued Dec 2026), or `gemini-3.7-flash`.
  - Never use paid-only models (`gemini-4-carbon`, `gemini-4-argon`, `gemini-omni-1.2-flash`) or `google_maps` grounding (causes HTTP 429).
- **Agent Operator (MCP)**:
  - The AI assistant acts as an account concierge. When a user asks to book a pass, save a trip, or view passes, the AI executes the action and updates the user's account state.

---

## Rule 4: Multi-Provider Login & Account Linking
- **Multiple Sign-In Options**:
  1. Google One-Click
  2. WhatsApp / Mobile Number OTP
  3. Email & Password
  4. Instant Explorer Guest Pass
- **Unified Account Linking**:
  - Users can link Google, WhatsApp, and Email to the same account in Settings.
  - Logging in with any linked method recovers the same tickets and saved trips.

---

## Rule 5: 4-Tier Verification Sentinel (Run Before Every Completion)
Before claiming any task is complete, run and verify all 4 tiers:
1. **Tier 1 — Code Review**: `python tools/codeturtle/codeturtle_reviewer.py` (Must score 100/100).
2. **Tier 2 — Linting**: `cd frontend; npx oxlint` (Must report 0 errors, 0 warnings).
3. **Tier 3 — Production Build**: `cd frontend; npm run build` (Must compile cleanly with exit code 0).
4. **Tier 4 — Backend Compilation**: `cd backend; .\mvnw.cmd test-compile` (Must report BUILD SUCCESS).

---

## Rule 6: Git Hygiene & Clean Pushes
- **Commit Titles**: Short, lowercase, and conventional (`feat: ...`, `fix: ...`, `refactor: ...`, `chore: ...`).
- **No Internal Mentions**: Strictly never mention spelling corrections, prompt fixes, or internal AI steps in commit titles. Describe the actual feature authored.
- **Lightweight Repository**: Keep git tracking pure source code only (<5MB). Never commit heavy video, large photos, `dist/`, `target/`, or private docs (`*.docx`, `*.pptx`, `*.pdf`).
- **Zero Secrets**: Never commit `.env` files, API keys, or token caches. All private keys stay in server environment variables.

---

## Rule 7: $0 Modern Cloud Infrastructure
- **Frontend & Edge**: Cloudflare Pages + Edge Worker (`_worker.js`) at [globetrotter-gateway.pages.dev](https://globetrotter-gateway.pages.dev).
- **Database**: AWS RDS PostgreSQL 24/7 (`globetrotter-db.cx2cek6kon94.ap-south-1.rds.amazonaws.com:5432`) runs without requiring any local laptop.
- **Real-Time Client State**: `localStorage` + Edge synchronization.

---

## Rule 8: Mandatory Per-Turn Sub-Topic Skill Routing & Complete Reading (Strict)
Before writing code or answering any prompt, the agent MUST execute this 3-step routing protocol:
1. **Classify Active Task Domain & Sub-Topic**: Consult [MASTER_SKILLS_DIRECTORY_AND_SUBTOPIC_ROUTER.md](file:///d:/globtroter's%20gateway/MASTER_SKILLS_DIRECTORY_AND_SUBTOPIC_ROUTER.md) to locate the exact domain:
   - **UI/UX & Aesthetics**: [`taste-skill`](file:///C:/Users/HP/.gemini/config/skills/taste-skill/SKILL.md), [`soft-skill`](file:///C:/Users/HP/.gemini/config/skills/soft-skill/SKILL.md), [`unslop`](file:///C:/Users/HP/.gemini/config/skills/unslop/SKILL.md), [`ui-ux-pro-max`](file:///C:/Users/HP/.gemini/config/skills/ui-ux-pro-max/SKILL.md)
   - **Auth, Verification & Security**: [`security-and-hardening`](file:///C:/Users/HP/.gemini/config/skills/security-and-hardening/SKILL.md), [`website-prelaunch-audit`](file:///C:/Users/HP/.gemini/config/skills/website-prelaunch-audit/SKILL.md)
   - **GIS Corridor Routing & Tourism Atlas**: [`tourism-corridor-intelligence`](file:///d:/globtroter's%20gateway/.agents/skills/tourism-corridor-intelligence/SKILL.md)
   - **Testing & Verification**: [`verification-before-completion`](file:///C:/Users/HP/.gemini/config/skills/verification-before-completion/SKILL.md), [`playwright-cli`](file:///C:/Users/HP/.gemini/config/skills/playwright-cli/SKILL.md)
   - **Debugging & Error Recovery**: [`systematic-debugging`](file:///C:/Users/HP/.gemini/config/skills/systematic-debugging/SKILL.md)
   - **Cloud Infrastructure & SaaS**: [`zero-cost-saas-stack`](file:///C:/Users/HP/.gemini/config/skills/zero-cost-saas-stack/SKILL.md)
2. **Read Skill Completely**: Read the target skill completely (never skim or stop at 100 lines). Internalize its constraints and anti-patterns before touching code.
3. **Execute Without AI Slop**:
   - **No Uniform Cyan/Purple Glow**: Use calm, titanium/graphite dark surfaces with high-contrast, purposeful accents.
   - **Double-Bezel Architecture**: Outer shell + inner core for all modal dialogs, pass containers, and auth cards.
   - **Authentic Verification Loops**: Mobile OTP requires real 6-digit verification code dispatch and entry, never unverified text inputs.
   - **Unified Account Identity**: Google OAuth represents the user's verified Gmail address, not an isolated disconnected entity.

---

## Rule 9: Dedicated Field Agent Interface & Accreditation
- **No Public Staff Clutter**: Normal tourists only see consumer features. Never clutter the main navigation dock with operational staff buttons.
- **Accreditation Request & 5-Second Approval**: Users requesting agent access see the accreditation screen. Submitting a request runs a 5-second verification countdown, after which accreditation is automatically approved (`globetrotter_is_agent: true`).
- **Dedicated Agent Workspace**: Accredited agents enter a completely separate operational interface with turnstile scanner, live attendance feed, checkpoint selection, and shift stats.
- **Tourist Mode Return**: Inside the Agent Interface, an explicit "Tourist View" button returns the user directly back to the consumer website.
