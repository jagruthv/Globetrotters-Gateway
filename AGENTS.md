# Globetrotter Gateway — Autonomous Agent Operational Directives & Skill Routing

This file defines the mandatory rules and automatic skill activation protocols for all AI agents operating within the `globetrotter's gateway` workspace.

---

## 1. Automatic Skill Activation Protocol

You MUST automatically detect the context of every user prompt or active file and immediately invoke the corresponding specialized skill BEFORE writing any code or answering. Do NOT wait for the user to explicitly name the skill.

### 1.1 Hierarchical Master Skills Router Directive
Whenever working on ANY domain (Frontend, Mobile/Android, Backend, Cloud/SaaS, Testing, Security, AI/ML, Research, Life Sciences, Business):
1. **Mandatory Pre-Flight Lookup**: ALWAYS refer to [MASTER_SKILLS_DIRECTORY_AND_SUBTOPIC_ROUTER.md](file:///d:/globetrotter's%20gateway/MASTER_SKILLS_DIRECTORY_AND_SUBTOPIC_ROUTER.md) first to discover the domain and granular sub-topic.
2. **Sub-topic Selection**: Select the exact sub-topic relevant to your objective (e.g. `Motion, Kinetic Physics & Video Synthesis`, `Android CLI & Project Scaffolding`, `Root Cause Debugging`, `AlphaFold & 3D Structure Viewer`).
3. **Comprehensive Skill Ingestion**: From that sub-topic, identify the available skill names and read the corresponding `SKILL.md` completely (never partial or first 100 lines). Activate multiple complementary skills if they maximize solution quality. Never hold back on tokens.

| Context / Trigger Condition | Automatically Invoked Skill | Required Pre-Flight Action |
| :--- | :--- | :--- |
| **Presentations & Slide Decks** (`.pptx`, `.potx`, `Smart_Tourism_Platform_Review1_1.pptx`, defense reviews) | `@skill:pptx` | Read and adhere to slide layout, shape manipulation, and python-pptx extraction rules. |
| **Word Documents & Proposals** (`.docx`, `.dotx`, `Capstone Project Proposal.docx`, team individual proposals) | `@skill:docx` | Read docx structure, paragraph XML runs, and document formatting guidelines. |
| **PDF Documents & Project Diaries** (`.pdf`, `SCOPE_Capstone_Project_Diary_2026_27.pdf`, generated PDFs) | `@skill:pdf` | Follow PDF extraction, merging, and visual layout protocols. |
| **Frontend UI / UX & Aesthetics** (`AiFluidTripStudio.jsx`, `CircuitShowcase.jsx`, `BentoDistrictExplorer.jsx`, `index.css`, Tailwind styling) | `@skill:unslop`, `@skill:ui-ux-pro-max`, `@skill:vibe-coding-frontend-stack`, `@skill:taste-skill`, `@skill:awesome-design-md`, `@skill:frontend-design` & `@skill:theme-factory` | Follow Damir Sokolovsky's 9-pass Unslop redline protocol (purge purple glows, emoji badges, gradient text, and noisy blobs), query local UI/UX Pro Max BM25 DB (`python search.py`), enforce anti-slop design discipline (variance, motion, density dials), reference 74+ design systems (Airbnb, Linear, Stripe), intentional typography, bespoke color palettes, and avoid generic AI defaults. |
| **$10,000 Web Stack & Animations** (Landing pages, component registry, physics, micro-interactions) | `@skill:vibe-coding-frontend-stack` & `@skill:ui-ux-pro-max` | Use 21st.dev component patterns (`npx @21st-dev/cli search`), Framer Motion (`motion.dev` spring curves, `layoutId`, stagger, exit animations), and 60-30-10 color balance. |
| **UI Audits & Web Standards** (Accessibility, focus rings, forms, React performance, CLS) | `@skill:web-design-guidelines` & `@skill:react-best-practices` | Audit code against Vercel Web Interface Guidelines (`file:line` format), ensure `focus-visible`, a11y labels, and render optimization. |
| **Image-to-Code & Visual Mockups** (Converting screenshots, wireframes, or design images to React) | `@skill:image-to-code` & `@skill:imagegen-frontend-web` | Deeply analyze visual layout, color palette, responsive bounds, and implement pixel-faithful React/Tailwind code without generic clichés. |
| **Web Testing & UI Verification** (Verifying scanner, booking flow, checkout, component rendering) | `@skill:playwright-cli` & `@skill:webapp-testing` | Execute token-efficient browser automation, DOM inspection, and Playwright verification scripts. |
| **Corridor Data & Capstone Defense** (59 Districts of AP & Telangana, 15-point schema, offline route engine, gate security) | `@skill:tourism-corridor-intelligence` | Adhere to ground-truth schemas, zero-modulo data standards, and academic defense definitions. |
| **OpenSERP & Local Open-Source AI Models** (Rate-limit-free search on port 7000, PyTorch, Sentence-Transformers, YOLO, Ollama, ONNX Web, offline heuristics) | `@skill:openserp-and-local-models` | Query OpenSERP (`http://localhost:7000/bing/search?text=...&limit=...`) or Python ML stack for zero-cost search, embeddings, and vision without cloud token burn. |
| **MCP Integration & Tool Building** (Exposing routes or places as AI tools) | `@skill:mcp-builder` | Build standardized Model Context Protocol tools. |
| **Research Papers & Patents Intelligence** (Prior art, academic citations, algorithms, patents) | `@skill:research-and-prior-art-intel`, `@skill:literature-search-arxiv`, `@skill:literature-search-openalex` | Search arXiv, OpenAlex, Google Patents, and SOTA GitHub repos before building custom algorithms; cite references and provide formal credits. |
| **API & Contract Design** (REST/GraphQL contracts, Hyrum's Law, public boundaries) | `@skill:api-and-interface-design` | Follow Addy Osmani's contract-first design, one-version rule, and boundary typing. |
| **Security & Hardening** (Threat modeling, STRIDE, OWASP Top 10, sanitization) | `@skill:security-and-hardening` | Follow Addy Osmani's 3-tier boundary defense, input validation, and security headers. |
| **Observability & Telemetry** (Structured logging, metrics, traces, on-call questions) | `@skill:observability-and-instrumentation` | Follow Addy Osmani's event-not-prose logging, RED/USE metrics, and telemetry design. |
| **Architecture Documentation & ADRs** (Why over what, trade-offs, architecture decisions) | `@skill:documentation-and-adrs` | Follow Addy Osmani's ADR template and context recording standards. |
| **Systematic Debugging & Root Cause** (4-phase root cause, minimal reproduction) | `@skill:systematic-debugging` | Follow Jesse Vincent's (obra) strict root-cause-before-fix debugging methodology. |
| **Verification & Iron Law** (Evidence before assertions, zero completion claims without proof) | `@skill:verification-before-completion` | Follow Jesse Vincent's (obra) Iron Law: identify command, run full, read output, verify. |
| **Subagent Orchestration** (Parallel agent dispatch, context reduction) | `@skill:subagent-driven-development` | Follow Jesse Vincent's (obra) subagent isolation and review handoff protocol. |
| **Domain Modeling & Bounded Contexts** (DDD, glossary, entity relationships) | `@skill:domain-modeling` | Follow Matt Pocock's active domain modeling and GLOSSARY.md crystallization. |
| **Codebase Architecture & De-Tangling** (Refactoring monoliths, dependency inversion) | `@skill:improve-codebase-architecture` | Follow Matt Pocock's modular separation and architecture improvement rules. |
| **Tailwind CSS v4 & Styling** (CSS-first @theme, OKLCH, Lightning CSS, container queries) | `@skill:tailwind-v4-migration` | Enforce pure CSS @theme configuration, eliminate legacy JS configs, and prevent silent border/ring shifts. |
| **Visual Regression & Layout QA** (Playwright screenshot diffs, ARIA snapshots, layout overflow) | `@skill:agentic-visual-regression-auditor` | Execute 3-tier checks (pixels, ARIA semantic trees, vision triage) and strictly ban threshold loosening. |
| **MCP Security & Tool Sandboxing** (Tool containment, SSRF prevention, realpath containment) | `@skill:mcp-security-sandboxing` | Enforce connect-time IP resolution, prevent internal network probing, and restrict shell execution. |
| **Anti-AI Technical Writing** (Clean commit messages, PR descriptions, documentation humanization) | `@skill:humanizer-text-anti-ai` | Strip robotic cadence, buzzwords (delve/leverage/robust), and reflexive triplets; enforce fact-first engineering prose. |
| **Git Diff & PR Synthesis** (Merge-base diffs, breaking change detection, ADR alignment) | `@skill:git-diff-pr-synthesizer` | Analyze three-dot merge-base diffs, categorize changes by concern, and audit breaking contracts. |
| **Spatial / GIS Routing** (Geodesic distance, detour calculations, OSRM road graph, PostGIS) | Agency Persona: `gis-spatial-data-scientist.md` or `gis-geoai-ml-engineer.md` | Adopt advanced spatial routing and GIS graph standards. |
| **Optimization Algorithms** (TSP-TW, multi-objective tour planning, time windows) | Agency Persona: `engineering-autonomous-optimization-architect.md` | Adopt rigorous mathematical formulations (OR-Tools, stochastic optimization). |
| **Omni-Web Frontier Models & Arena** (Gemini 4 Hydrogen, Claude Sonnet 5.5, Arena Side-by-Side, single chat persistence) | `@skill:omni-web` | Strictly reuse the persistent single conversation thread (`persistent_sessions.json`), never create duplicate sidebar chats, and reference `OMNI_WEB_PERSISTENT_MEMORY.md`. |
| **Founder & Startup Simulation** (Idea validation, unit economics, Hormozi/Thiel advisory, 100-persona consumer panel) | `@skill:founder-startup-panel` | Execute 11-member advisory breakdown and quantitative 100-persona consumer simulation report. |
| **Pre-Launch Website Audit & Security Hardening** (Mobile viewport, broken links, OpenGraph, OWASP hardening, API secrets scan) | `@skill:website-prelaunch-audit` | Enforce 12-gate pre-flight functional verification and 10-point OWASP security hardening audit. |
| **High-End Design Assets & Anti-Template Styling** (Ditther halftone, Ultramock 3D mockups, Animos springs, Backgrounds Supply meshes) | `@skill:high-end-design-assets` | Apply dithered textures, 3D device framing, physics-based springs, and ambient mesh lighting. |
| **AiSOC & Incident Response Guard** (Alert clustering, immutable evidence ledger, local triage) | `@skill:aisoc-incident-guard` | Cluster alerts into incidents, build evidence ledger, and enforce human approval before defensive actions. |

---

### 1.2 Mandatory Post-Execution Quality, Security & Error Verification Protocol (The Zero-Regression Sentinel Rule)

After completing ANY code change, file edit, feature implementation, refactoring, or script execution, and BEFORE declaring any turn, subagent task, or user request complete, the agent MUST systematically execute the 4-tier verification pipeline:

1. **Tier 1 — Automated Code Review & Security Sentinel** (In-house $0 CodeRabbit alternative):
   ```powershell
   python tools/codeturtle/codeturtle_reviewer.py
   ```
   *Pass Condition*: Must achieve a verified **100/100 Production Readiness score** with 0 Critical, 0 High, 0 Medium, and 0 Low flaws across Spring Boot and React.
2. **Tier 2 — Frontend Static Linting & Syntax Audit**:
   ```powershell
   Set-Location "frontend"; npx oxlint
   ```
   *Pass Condition*: Must report **0 errors, 0 warnings** across all active frontend files.
3. **Tier 3 — Frontend Production Compilation Build**:
   ```powershell
   Set-Location "frontend"; npm run build
   ```
   *Pass Condition*: Must execute a clean production build (Vite/Rolldown) with exit code 0.
4. **Tier 4 — Backend Concurrency & Test Compilation**:
   ```powershell
   Set-Location "backend"; .\mvnw.cmd test-compile
   ```
   *Pass Condition*: Must report **BUILD SUCCESS** across all Java classes.
5. **The Iron Law (Evidence Before Assertions — `@skill:verification-before-completion`)**:
   Never make completion or success claims without executing the fresh verification command in the current turn and inspecting the actual output. Wording like "should work now" or "looks fixed" without fresh command proof is strictly prohibited.
6. **Continuous Living Documentation Sync**:
   Immediately update the corresponding architectural `.md` files (`MASTER_SYSTEM_ARCHITECTURE_AND_GROUND_TRUTH_INDEX.md`, `REELS_PRIOR_ART_AND_TECH_VAULT.md`, etc.), documenting changes, algorithms, research papers, and video reels referenced with proper citations.

---

### 1.3 Autonomous Pre-Emptive Implementation Rule
Whenever prior art, security defense checklists (e.g. OWASP Top 10, 20-Point Authentication Armor, 21 Big-Tech CVEs), or UI/UX patterns are cataloged or identified from reference materials or prompts, the AI agent **MUST NOT stop at passive documentation or saving notes**.
The agent is strictly mandated to **immediately implement the defensive mechanisms, automated scripts, CodeTurtle audit rules, and UI enhancements** in the active codebase (or stage them cleanly into `sdp_upgrades/` for SDP) without waiting for explicit user prompts.

---

### 1.4 The Andrej Karpathy Agent Blast-Radius Containment Protocol (Reel 21)
To prevent the "200-file PR trap" where an agent refactors unrequested code while fixing small tasks:
1. **Traceability Rule**: Every single modified line must directly trace to the explicit objective or security rule.
2. **Preserve Operational Subsystems**: Never refactor what isn't broken or upgrade dependencies without explicit architectural approval.
3. **Dead Code Protocol**: If dead code, an unused dependency, or an uncalled endpoint is spotted, document it in an audit report — *never delete it autonomously*.
4. **License & Comment Inviolability**: Copyright headers, license declarations, and architectural comments are strictly non-deletable.

---

### 1.5 Secret Quarantine & Client-Side Zero-Exposure Rule (Reel 27)
1. **Zero Client Secrets**: NEVER place private API keys, payment secrets, database credentials, or AI tokens in frontend `.env` or files prefixed with `VITE_` or `REACT_APP_`.
2. **Server Proxy Architecture**: All integrations bearing sensitive credentials (Gemini, Groq, NVIDIA, Razorpay) MUST proxy through Spring Boot backend controllers (`/api/chat`, `/api/payments`, `/api/ai`), where secrets are read exclusively from process environment variables.
3. **Immediate Key Rotation Mandate**: If an API key or secret was ever bundled into client assets or committed to git, it is compromised — deleting the commit does not un-leak it. The secret MUST be rotated immediately.

---

### 1.6 The 7 Core UX Psychology Laws & Cognitive Accessibility Protocol (Reel 34 & @skill:ui-ux-pro-max)
Whenever building or modifying user interfaces, components, or booking flows:
1. **Jakob's Law**: Strictly adhere to familiar web design patterns (standard fixed header, recognized shopping/pass cart icons, clear search input with magnifying glass).
2. **Fitts's Law**: All interactive buttons, inputs, and links MUST have minimum touch target dimensions of $\ge 44 \times 44\text{px}$ with $\ge 8\text{px}$ target separation. On mobile, primary CTAs must be located within comfortable thumb-reach zones.
3. **Hick's Law**: Minimize decision paralysis. Curate options into structured 3-tier models (Single-Day, Heritage 3-Day, All-Access Grand Circuit) rather than unorganized lists.
4. **Miller's Law**: Chunk complex information into groups of $7 \pm 2$ items (e.g. 4–6 stops per daily itinerary; group 59 districts into regional corridors).
5. **Law of Proximity**: Keep related controls, labels, and prices inside bounded visual cards with consistent padding ($16$–$24\text{px}$).
6. **Aesthetic-Usability Effect**: Enforce the $10,000 Web Stack: Cinzel + Plus Jakarta Sans typography, 60-30-10 color balance, and spring micro-interactions.
7. **Zeigarnik Effect**: Multi-step processes (circuit customization, pass checkout) MUST display visual, animated step progress indicators to motivate completion.

---

### 1.7 Autonomous Video Walkthrough & Programmatic Synthesis Protocol (Reel 33 & @skill:brag)
1. **Zero External Editing**: Eliminate manual video tools for launch demos, capstone walk-throughs, or feature reels.
2. **Code-to-Video Synthesis**: Proactively leverage programmatic video generation tools (`@skill:brag`, `@skill:brag-slim`, Remotion) to render cinematic 60 FPS MP4 demos directly from Markdown documentation, component code, and assets.

---

### 1.8 Resilient Data Pipeline UX & Anti-Silent Failure Protocol (Reel 30)
1. **Zero Silent Failures**: Data pipelines, route calculations, and AI services must NEVER fail silently by returning empty screens or crashing the React root.
2. **4-Tier Fallback Hierarchy**: Primary Cloud Engine $\rightarrow$ Tier 1: SWR Cached State (IndexedDB) $\rightarrow$ Tier 2: Deterministic Heuristic (Haversine + $1.48\times$ mountain tortuosity) $\rightarrow$ Tier 3: Contextual Error Boundary with Retry CTA.
3. **Reversible Optimistic UI**: Optimistically update UI state upon user action; if backend validation or payment verification fails, gently animate state rollback and present a descriptive toast.

---

### 1.9 The 13-Point Legal, Privacy & Web Compliance Mandate (Reel 36)
Before deploying or shipping user-facing features, the agent must ensure strict statutory compliance:
1. **Legal Documents**: Verified `privacy.html`, `terms.html`, and 24-hr refund policy files exist in `public/`.
2. **Cookie & Telemetry Consent**: Granular cookie consent controls (Essential vs Analytics) with zero unconsented data transmission.
3. **Data Minimization**: Collect only essential operational attributes; no vanity PII or unnecessary tracker scripts.
4. **Zero Dark Patterns**: Upfront price breakdowns with zero hidden fees or sneak-in checkout items.
5. **Accessibility Standards**: WCAG 2.1 AA compliant color contrast ($\ge 4.5:1$), descriptive `alt` tags, and visible focus rings.
6. **Data Deletion Rights**: Automated user account erasure and travel data purge capabilities under GDPR and India's DPDP Act 2023.

---

### 1.10 Codebase Knowledge Graph & Token Conservation Protocol (Reel 35 & graphify)
1. **Targeted Subgraph Traversal**: Coding agents must avoid whole-repo context dumps. Utilize persistent AST knowledge graphs (`graphify` / dependency maps) to query and walk only the immediate caller/callee subgraphs.
2. **Up to 71x Token Efficiency**: Bound context consumption by reading specific file line ranges rather than loading hundreds of peripheral files.

---

### 1.11 BOLA / IDOR Resource Authorization Boundary (Reels 36 & 37)
1. **Zero Unchecked Direct References**: Every API endpoint accepting a path parameter ID (e.g. `/api/passes/{id}`, `/api/itineraries/{id}`) MUST verify that the requesting authenticated principal matches the entity owner, or holds verified `ADMIN` authority.
2. **Server-Side Enforcement**: Never rely on frontend hiding of IDs or buttons. Direct controller validation is strictly mandatory.

---

### 1.12 Bespoke Kinetic Micro-Interactions & Dwell Engineering (Reels 38 & 40)
1. **Bespoke Kinetic Physics**: Ban generic HTML switches and checkboxes. Implement physical kinetic switches (e.g. `AtmosphereToggle.jsx` with celestial rotation, squish damping, or liquid coalescence) using Framer Motion springs (`stiffness: 280, damping: 22`).
2. **20-Point Dwell Time Optimization**: Cards, buttons, and navigation elements must react dynamically to touch and cursor motion (card parallax tilt, magnetic cursor pull within 40px, shared `layoutId` pill transitions, and ambient dwell indicators) to double user session engagement.
3. **Anti-AI Human Craft**: Never use robotic buzzwords or generic AI aesthetic tropes (purple glows, emoji spam). Present all cultural narratives, route dossiers, and concierge responses with authentic human editorial tone and luxury styling.

---

### 1.13 The 7-Door Burglar Intrusion Defense Protocol (Reels 41 & 42)
1. **Quarantine Client Secrets**: Zero private keys in frontend bundles. All AI tokens and payment keys must proxy through backend controllers.
2. **Web Root Dotfile Lockdown**: Never serve `.env`, `.git`, or hidden configuration files. Automated scanners (`SEC-ENV-001`) must verify no dotfiles exist in static asset roots.
3. **Server-Side Route Authentication**: Never rely on `<ProtectedRoute>` or disabled UI buttons. All private API routes must require verified JWT principals.
4. **IDOR & Multi-Tenant Boundary**: All database queries must enforce tenant and user ownership isolation.
5. **Universal HSTS & TLS 1.3**: Force HTTPS with Strict-Transport-Security preloading headers and automatic 301 redirection.

---

### 1.14 The 20-Point AI Website Pre-Launch Antidote & Design Critique (Reels 39 & 43)
1. **Non-Silent Form Failures**: Forms must never submit into black holes; always provide optimistic loading and an actionable error toast with retry.
2. **Branded 404 Experience**: Dedicated cultural circuit 404 page ensuring lost visitors return seamlessly to core flows.
3. **Pre-Launch Verification Suite**: Run `python tools/seo/launch_verifier.py` to enforce the 20 pre-flight gates (OpenGraph, WebP compression, mobile tap targets, canonical URLs, robots.txt, and sitemap.xml) before deployment.
4. **Automated Design Critique**: Audit visual hierarchy, typography (60-30-10), and WCAG 2.1 AA contrast before merging any visual updates.

---

### 1.15 Google AI Studio Free-Tier-Only Model & Dynamic Rate-Limit Router Protocol
1. **Banned Models & Legacy SDKs**:
   - NEVER use `gemini-1.5-*`, `gemini-2.0-*`, `gemini-2.5-*` (shutting down Dec 1, 2026), or `gemini-3.7-flash`.
   - NEVER use paid-only models (`gemini-4-carbon`, `gemini-4-argon`, `gemini-3.1-pro-preview`, `gemini-omni-1.2-flash`) or `google_maps` grounding (0 Free Tier quota -> 429).
   - NEVER use legacy SDKs (`@google/generative-ai` or `google-generativeai`). Always use unified Google GenAI SDK (`@google/genai` in JS/TS, `google.genai` in Python).
2. **Free-Tier Compliant Routing Hierarchy**:
   - Everyday Coding, Chat, JSON & Multimodal: `gemini-3.8-flash` (~250–500 RPD).
   - Hard Debugging & Architecture: `gemini-4-hydrogen` (STRICT CAP: 5 RPM / 20 RPD — reserve for deep reasoning).
   - High-Volume Loops & Fast Summaries: `gemini-3.5-flash-lite` (500+ RPD).
   - Fast Yes/No Routing: `gemini-decision-1` (200 RPM / 10,000 RPD).
   - Voice / Video: `gemini-3.8-live` / `gemini-3.8-live-extended-thinking`.
   - TTS: `gemini-3.8-flash-lite-tts` (fast) / `gemini-3.8-flash-tts` (expressive, `v1beta`).
   - STT: `gemini-3.5-transcribe` / `gemini-3.5-transcribe-live`.
   - Images: `gemini-3.1-flash-image`.
   - Embeddings: `gemini-embedding-2` / `gemini-embedding-001`.
3. **Backend Dynamic Predictive Rate-Limit Redirection**:
   - Backend tracks RPM and RPD in memory with predictive threshold calculation. Before any model reaches its Free-Tier quota (e.g. at 85% RPM or RPD), the router proactively cascades to the next healthy model (e.g. `gemini-3.8-flash` -> `gemini-3.5-flash-lite` -> Groq / local fallback) before Google returns HTTP 429.

---

## 2. Core Operational Constraints

1. **Never Generate Full Code in Chat**: Always use artifacts or file edit tools for substantial code updates; provide only diffs, summaries, and links in the chat.
2. **Never Claim Without Verifying**: Run compiler checks (`mvnw test-compile`, `npm run build`, `oxlint`) before claiming code works.
3. **No Browser Testing Without Permission**: Never trigger browser subagents or open browser tabs without explicit user confirmation.
4. **Proactive Modernization**: Continually identify opportunities to replace synthetic heuristics with modern technologies (e.g., OSRM for road networks, Ed25519 for gate keys, ONNX Runtime Web for edge AI).
5. **Strict Single-Chat Thread Directive**: NEVER spawn multiple conversations in Claude or Gemini web sessions. Always reuse the single designated persistent conversation ID stored on disk (see `OMNI_WEB_PERSISTENT_MEMORY.md` and `persistent_sessions.json`).
6. **Zero-Plagiarism & Humanized Staff-Engineer Tone**: All documentation, reports, code comments, and project files must achieve a 0% AI/plagiarism score. Purge robotic AI cadence, corporate filler, and cliché buzzwords (*delve, leverage, robust, seamless, comprehensive, streamline, testament, pivotal, paramount, tapestry*). Ban reflexive triplets (*fast, reliable, and scalable*). Write in a direct, natural staff-engineer voice: lead with action and rationale, cite concrete numbers/identifiers, vary sentence rhythm, and eliminate generic AI fluff.
7. **Short, Humanized Git Commits**: Git commit titles must be short, crisp, and humanized (conventional commit format: `feat: ...`, `fix: ...`, `refactor: ...`, `chore: ...`). Never write multi-paragraph AI summaries in git logs. Strictly NEVER mention spelling corrections, file/folder renames, user prompt fixes, or internal AI corrections in git commits, PR titles, or public documentation—this reflects poorly on the user. Describe the technical deliverable naturally as if authored by a human senior engineer.
8. **Lightweight & Private Git Repository Hygiene**: Whenever pushing to GitHub across ANY project: (1) NEVER push heavy binary assets (>5-10MB, raw video, uncompressed photo bundles, large ML weights), build artifacts (`target/`, `dist/`, `build/`, `node_modules/`), or private evaluation/academic documents (`reports/`, `*.docx`, `*.pptx`, `*.pdf`, individual student dossiers) to GitHub. Keep them 100% safe locally, but strictly excluded via `.gitignore`. (2) Maintain ultra-lightweight Git repositories (<5MB pure source code only) for instant, clean cloning and zero push bottlenecks. (3) Automatically sanitize secrets: verify `.gitignore` blocks all local tokens, private API keys, credential caches (`*_token_cache.json`), and `.env` files before any commit or push.
9. **Continuous Workspace Restructuring & Lite Architecture**: Proactively prune dead temporary files, duplicated scripts, stale caches, and synthetic boilerplate. Keep every project modular, lightweight, and fast.

---

## 3. Continuous Living Documentation Protocol (Pre-Flight Check & Post-Task Sync)

1. **Pre-Flight Inspection**: BEFORE writing or modifying large amounts of code, you MUST inspect the relevant architectural `.md` files (`MASTER_SYSTEM_ARCHITECTURE_AND_GROUND_TRUTH_INDEX.md`, `CAPSTONE_COORDINATOR_DEFENSE_GUIDE.md`, `SERVICES_LOGIC.md`, `PAGES_LOGIC.md`, etc.) to understand current state, schemas, and constraints.
2. **Post-Task Documentation Sync**: AFTER completing ANY feature implementation, bug fix, or update, you MUST immediately create or update the corresponding `.md` files.
3. **Mandatory Citation & Credits**: Whenever adopting techniques from a published research paper, open-source GitHub repository, or patent, you MUST document the citation and credits in the corresponding `.md` file and code header comments.


<!-- BEGIN AWS Agent Toolkit rules -->
# AWS Guidance for the new AWS experience

This user has signed up for the new AWS experience. This experience lets you sign into AWS using a social provider and requires the following additional context.

Where this guidance conflicts with the project's own instructions, the project's instructions take precedence.

## Context

### Terminology:

- Say "project" instead of "account" — a project contains an AWS account and settings for sharing with other collaborators
- Say "team member" instead of "IAM user" — users are invited by email, not created or federated in IAM
- Say "AWS Settings" when referring to management tasks at [settings.aws.com](https://settings.aws.com/) (project management, billing, team members, spend limits). Users view their actual AWS resources in the AWS Management Console.
- Say "selected Region" when referring to the user's Region — not "home Region"
- The user has a managed IAM experience. This includes a managed service control policies (SCP) and resource control policies (RCP) that govern the use of AWS. They will still need to use IAM to create policies to let services work with each other. If there are questions about the SCPs or RCPs, go to the documentation at https://docs.aws.amazon.com/accounts/latest/reference/scps-and-rcps-for-projects.html

### Constraints:

- All projects share a single AWS Region determined by the user's contact address. Resources cannot be created in other Regions
- When developing:
  - MUST create all Regional resources in the project's assigned Region
  - You CAN create AWS WAF and Cloudwatch Logs resources in us-east-1 when there are global resources (like a global WAF instance) that require a connection to dependencies in us-east-1. You should not use these for any other reason, because resources in the selected Region will provide lower cost (due to no cross-Region traffic), increased availability (due to no cross-Region traffic), and easier manageability (due to not needing to look in another Region). When you need to do an inventory of resources, you need to look in both the selected Region and us-east-1 for Cloudwatch Logs or WAF resources.
  - MUST NOT attempt to create Lambda, API Gateway, or other Regional resources in any other Region
  - MUST direct users to confirm their Region in AWS Settings > View all projects > Overview > Additional Info > Region. If the user cannot confirm their Region, check in ~/.aws/config
  - MUST NOT use Lambda@Edge — excluded from both Lambda and CloudFront
  - MUST NOT use CloudFormation StackSets — no multi-account or multi-Region deployments
  - MUST NOT attempt cross-Region actions — no cross-Region replication for DynamoDB/S3/RDS, no multi-Region KMS keys
  - MUST NOT use Route 53 cross-Region routing — geolocation, latency-based, and failover routing policies are not available
  - CloudFront is a global service and its actions ARE allowed in `us-east-1`. A user can create a CloudFront distribution pointing to their project-region Lambda function URL or API Gateway. However, Lambda and API Gateway themselves MUST NOT be created in `us-east-1` — they must be in the project Region.
  - Reduced availability in `eu-north-1` specifically: Amazon Rekognition, Amazon Textract, Amazon Personalize, AWS App Runner are not available in that Region.
- IAM permissions for human access are managed by AWS. Don't assign roles to team members unless absolutely necessary
- The user may have a spend limit if they are on the paid plan. The limit that pauses their project if it's exceeded. If resources suddenly become inaccessible, ask if they have a spend limit configured. Only project owners can modify a spend limit.
- When developing:
  - MUST ask about spend limit status if the user reports sudden "Access Denied" errors on operations that previously worked
  - MUST direct users to check spend status in AWS Settings > Billing
  - MUST check if a user has upgraded their account to the paid plan
  - MUST ask the user if they want to clean up the successfully created resources or keep them to reduce cost
- The user sets up billing, creates spend limits, and retrieves and pays invoices in AWS Settings. The user creates budgets and optimizes their costs in the AWS Billing and Cost Management console
- Not all AWS services are available. If a service isn't working, do the following:
  1. Run the command `aws freetier get-account-plan-state`
  2. If accountPlanType": "FREE", check the [Free Tier supported services list](https://docs.aws.amazon.com/accounts/latest/reference/supported-services-sign-up-new.html#supported-services-free-tier) next,
  3. If accountPlanType": "PAID", check the [Paid Tier supported services list](https://docs.aws.amazon.com/accounts/latest/reference/supported-services-sign-up-new.html#supported-services-paid-plan).
  4. If neither list shows the service, check the [Not supported for this experience list](https://docs.aws.amazon.com/accounts/latest/reference/supported-services-sign-up-new.html#unsupported-services). The user will need to activate advanced features to access this service.
- Users can activate advanced AWS services and capabilities for their account.
- For any AWS task or question — building, configuring, migrating, debugging, or operating a service, writing SDK code, authoring CDK/CloudFormation, or answering how a service works — first call `aws___search_documentation` with topic `agent_skills` and load the matching skill with `aws___retrieve_skill`. Do this even when you believe you know the answer: skills carry current service behavior that your training may not. Prefer the skill's guidance over general knowledge. Skip it only for work that does not involve AWS.

### Help level

- help_level: HIGH (Configured by user: explains each step and why, suggests alternatives, flags best practices, and explains trade-offs)

Constraints for each level:

**LOW:**

- MUST follow all constraints in this context file
- MUST execute the user’s request without modification
- MUST NOT ask clarifying questions unless the action would create a security vulnerability
- MUST NOT suggest alternatives or improvements

**MEDIUM:**

- MUST execute the user's request
- MAY ask up to two clarifying questions per task if the request has an ambiguity or a potential issue
- MUST NOT repeat a question or suggestion the user has already dismissed
- MUST NOT explain trade-offs or alternatives unless the user asks

**HIGH:**

- MUST explain what each step does and why before executing it
- MUST suggest alternatives when a better approach exists
- MUST flag best practices and explain trade-offs
- MUST still execute the user's choice if they disagree with a suggestion
<!-- END AWS Agent Toolkit rules -->
