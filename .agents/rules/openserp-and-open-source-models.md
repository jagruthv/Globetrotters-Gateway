# Operational Rules: OpenSERP & Local Open-Source Models Protocol

These rules govern the autonomous discovery and usage of **OpenSERP** and local open-source models across all workspaces in the D: drive (Android, ML, Full Stack, SaaS, and Automation).

---

## 1. Zero-Cost Search Protocol (OpenSERP via Docker)

1. **Autonomous Search Engine Selection**:
   - Whenever a user asks to search the web, crawl information, verify official government portals, look up recent facts, or find landmark coordinates, **always query local OpenSERP first** (`http://localhost:7000`) before using external web tools or commercial search APIs.
   - **Primary Endpoint**: `http://localhost:7000/bing/search?text=<query>&limit=<n>`
   - **Multi-Engine Aggregation**: `http://localhost:7000/mega/search?engines=bing,duckduckgo&text=<query>&limit=<n>`
   - **Fallback Endpoints**: `/duckduckgo/search`, `/google/search`

2. **Zero-Credit Web Scraping**:
   - OpenSERP runs locally inside Docker container `openserp-service` on port 7000 with zero token expenditure and zero billing.
   - If the container is stopped, run `docker start openserp-service` to restore the service immediately.
   - If Docker is offline, fall back to Python `duckduckgo_search` (`DDGS().text(...)`).

3. **Data Caching & Hygiene**:
   - Always cache harvested results locally in structured JSON or relevant documentation (`.md`) to prevent repetitive queries.

---

## 2. Local Open-Source ML & Inference Rules (Python 3.12 Host Environment)

1. **Semantic Embeddings & Search**:
   - For RAG, similarity matching, text clustering, and deduplication, **strictly use local `sentence-transformers`** (`SentenceTransformer('all-MiniLM-L6-v2')`).
   - Do NOT spend external API credits on OpenAI or other proprietary embedding APIs when local models run in CPU RAM in < 50ms.

2. **Computer Vision & OCR**:
   - For landmark photo verification, crowd detection, and scene analysis, use local **Ultralytics YOLO** (`from ultralytics import YOLO`).
   - For extracting text from tourist signboards, timetables, tickets, and entry passes, use local **PyTesseract** (`import pytesseract`).

3. **Local LLM Inference (Ollama / vLLM)**:
   - When the user runs Ollama on `http://localhost:11434` or vLLM on port 8000, leverage local endpoints for bulk text processing, synthetic data generation, and offline assistant summarization.

---

## 3. Client & Edge AI Architecture (Laya Edge Engine & ONNX Runtime Web)

1. **In-Browser Execution**:
   - All high-frequency corridor calculations (15-point schema evaluation, geodesic perpendicular offsets, solar ephemeris calculations) must remain client-side in `frontend/src/utils/layaEdgeEngine.js` or via ONNX Runtime Web.
   - Never introduce unnecessary remote network round-trips for calculations that can run deterministically on the client device in < 15ms.

---

## 4. Universal Workspace Applicability

- These directives apply universally across all subdirectories of the D: drive. Do not restrict these capabilities to Globetrotter Gateway; apply them to any Android app, ML model, SaaS system, or automation pipeline.
