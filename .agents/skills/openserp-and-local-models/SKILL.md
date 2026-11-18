---
name: openserp-and-local-models
description: Operational protocols and executable recipes for using local OpenSERP search (http://localhost:7000), local Python ML/AI models (PyTorch, Hugging Face transformers, sentence-transformers, Ultralytics YOLO, PyTesseract), Ollama, and browser Edge AI (ONNX Runtime Web, Laya Engine) for zero-cost, rate-limit-free search, vision, embeddings, and inference.
---

# OpenSERP & Local Open-Source Models Skill

This skill defines the operational directives, architectural guidelines, and executable recipes for utilizing **OpenSERP** and local/open-source AI models across the universal D: drive environment (Android, ML, Full Stack, SaaS, and Automation).

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                         LOCAL OPEN-SOURCE INTELLIGENCE & INFERENCE STACK                        │
├──────────────────────────────────┬─────────────────────────────────┬─────────────────────────────┤
│ 1. OPENSERP SEARCH (Port 7000)   │ 2. PYTHON LOCAL ML (PyTorch)    │ 3. EDGE & CLIENT RUNTIMES   │
│ • Docker: karust/openserp        │ • sentence-transformers 5.2.0   │ • ONNX Runtime Web (ort-web)│
│ • Bing, Google, DDG, MegaSearch  │ • transformers 4.49.0 / PyTorch │ • Laya Edge Decision Engine │
│ • 0 token cost, 0 rate limits    │ • ultralytics 8.3 (YOLO Vision) │ • WebAssembly / WebGPU      │
│ • Cached SERP JSON responses     │ • pytesseract 0.3.13 (OCR)      │ • Ollama (localhost:11434)  │
└──────────────────────────────────┴─────────────────────────────────┴─────────────────────────────┘
```

---

## 1. OpenSERP Local Search Protocol (`http://localhost:7000`)

### Overview & Service Architecture
- **Engine**: `karust/openserp:latest` running in Docker as container `openserp-service`.
- **Host Binding**: `http://localhost:7000` (or `http://127.0.0.1:7000`).
- **Features**: Browser-rendered scraping with built-in in-memory caching (`cache_max_size=1000`, `cache_ttl=300`), circuit breakers (`cb_failures=5`, `cb_recovery=60s`), and zero external API keys.

### Verified Endpoints & Query Signatures

| Endpoint | Method | Parameters | Best Use Case |
| :--- | :--- | :--- | :--- |
| `/bing/search` | `GET` | `text` (query), `limit` (int, default 10) | **Default primary search engine** (fastest, high resilience, no IP blocks) |
| `/duckduckgo/search` | `GET` | `text` (query), `limit` (int, default 10) | Privacy-friendly fallback search |
| `/google/search` | `GET` | `text` (query), `limit` (int, default 10) | Deep Google SERP index (fallback if Bing lacks domain coverage) |
| `/mega/search` | `GET` | `engines` (comma-separated, e.g. `bing,duckduckgo`), `text`, `limit` | Aggregated multi-engine metasearch for maximum coverage |
| `/health` | `HEAD` / `GET` | None | Container liveness and health probe |

### Standard JSON Response Schema
```json
{
  "meta": { "took_ms": 2, "version": "2.1", "request_id": "..." },
  "query": { "engines_requested": ["bing"], "text": "Visakhapatnam tourism" },
  "results": [
    {
      "rank": 1,
      "title": "Visakhapatnam Tourism - Places to Visit...",
      "url": "https://visakhapatnam.ap.gov.in/...",
      "domain": "visakhapatnam.ap.gov.in",
      "snippet": "Official district portal with tourist attractions, tickets, and timings...",
      "engine": "bing"
    }
  ]
}
```

### Executable Python Recipe for Agents
Whenever the agent needs to search the web without burning search credits:
```python
import urllib.request
import urllib.parse
import json

def query_openserp(query: str, engine: str = "bing", limit: int = 5) -> list[dict]:
    """Queries local OpenSERP instance and returns list of results."""
    encoded_query = urllib.parse.quote(query)
    url = f"http://localhost:7000/{engine}/search?text={encoded_query}&limit={limit}"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data.get("results", [])
    except Exception as e:
        # Fallback to mega search or python ddgs
        print(f"OpenSERP query failed on {engine}: {e}")
        return []
```

### Container Lifecycle & Troubleshooting
If OpenSERP is not responding on port 7000:
1. Check status: `docker ps --filter "name=openserp-service"`
2. Restart container: `docker start openserp-service`
3. If container missing, spin up:
   `docker run -d --name openserp-service --restart unless-stopped -p 7000:7000 karust/openserp:latest serve -a 0.0.0.0 -p 7000`
4. Fallback if Docker is unavailable: Use Python `duckduckgo_search` library directly:
   ```python
   from duckduckgo_search import DDGS
   results = list(DDGS().text("query", max_results=5))
   ```

---

## 2. Local Open-Source ML Models (Python 3.12 Runtime)

The host system has a fully loaded, local Python AI ecosystem (`PyTorch 2.6.0`, `transformers 4.49.0`, `sentence-transformers 5.2.0`, `ultralytics 8.3.240`, `pytesseract 0.3.13`, `scikit-learn 1.8.0`, `shapely 2.1.2`).

### A. Local Vector Embeddings & Semantic Search (`sentence-transformers`)
Use for local semantic search, document retrieval, and place clustering with zero OpenAI embedding cost.
```python
from sentence_transformers import SentenceTransformer, util

# Lightweight, ultra-fast embedding model (runs in CPU RAM < 100MB)
model = SentenceTransformer("all-MiniLM-L6-v2")

documents = ["Kailasagiri ropeway viewpoint Visakhapatnam", "Charminar heritage monument Hyderabad"]
query = "cable car ocean hill view"

doc_embeddings = model.encode(documents, convert_to_tensor=True)
query_embedding = model.encode(query, convert_to_tensor=True)

scores = util.cos_sim(query_embedding, doc_embeddings)[0]
top_idx = scores.argmax().item()
print(f"Best Match: {documents[top_idx]} (Score: {scores[top_idx]:.4f})")
```

### B. Local Computer Vision & Landmark Verification (`ultralytics` YOLO)
Use for automated verification of landmark photos, detecting vehicles, crowds, architectural structures, and signboards.
```python
from ultralytics import YOLO

# Load pre-trained lightweight vision model
model = YOLO("yolov8n.pt")  # Auto-downloads ~6MB weights on first call

# Run inference on downloaded photo
results = model("candidate_image.jpg")
for box in results[0].boxes:
    cls_name = model.names[int(box.cls)]
    conf = float(box.conf)
    print(f"Detected: {cls_name} (Confidence: {conf:.2f})")
```

### C. Local OCR for Tickets, Signboards & Passes (`pytesseract`)
Use for extracting gate timings, ticket pricing, and official notification texts from scanned photos or PDF documents.
```python
import pytesseract
from PIL import Image

def extract_signboard_text(image_path: str) -> str:
    image = Image.open(image_path)
    return pytesseract.image_to_string(image)
```

### D. Local Hugging Face Transformers Pipeline
Use for zero-shot text classification, sentiment analysis, or local summarization:
```python
from transformers import pipeline

classifier = pipeline("zero-shot-classification", model="facebook/bart-large-mnli")
candidate_labels = ["Heritage Monument", "Nature & Wildlife", "Spiritual Temple", "Beach & Coast"]
res = classifier("Thotlakonda Buddhist Complex on hilltop", candidate_labels)
print(res["labels"][0], res["scores"][0])
```

---

## 3. Local LLM Serving Engines (Ollama & vLLM)

### Ollama Protocol (`http://localhost:11434`)
When local LLM services are booted by the user:
- Endpoint: `POST http://localhost:11434/api/generate`
- Request body:
  ```json
  {
    "model": "qwen2.5:7b",
    "prompt": "Summarize the 3 key rules for visiting Araku Borra Caves:",
    "stream": false
  }
  ```
- Use for local batch transformations, prompt completions, and synthetic dataset cleaning without API token consumption.

---

## 4. Edge & In-Browser Intelligence (Laya Edge Engine & ONNX Runtime Web)

### Laya Client-Side Engine (`frontend/src/utils/layaEdgeEngine.js`)
- Runs directly on the tourist's browser or mobile device via WebAssembly/JS.
- **Latency**: `< 15ms` execution with **0% network dependency** in cellular dead-zones (forest valleys, cave depths, hilltops).
- **Core Algorithms**:
  - Deterministic 15-point schema evaluation.
  - Perpendicular corridor detour projections ($\le 30\,\text{km}$).
  - Solar ephemeris calculation for golden hour photography timings.

---

## 5. Mandatory Agent Execution Rules

1. **Check Local OpenSERP First**: When tasked with finding live URLs, verifying official district portals, or obtaining gazette facts, check `http://localhost:7000/bing/search` before issuing external requests.
2. **Zero-Token Local Embeddings**: When computing embeddings for RAG, clustering, or duplicate deduplication, default to local `sentence-transformers` (`all-MiniLM-L6-v2`) instead of commercial cloud APIs.
3. **Verify Ground Truth**: Even when using local open-source models, never hallucinate facts. Check outputs against verified local datasets (`MASTER_59_DISTRICT_TOURISM_ATLAS.md`) before persisting to database.
4. **Universal Applicability**: Apply this skill across all projects in the D: drive workspace — whether building Android apps, Python ML pipelines, full-stack React/Spring systems, or automation bots.
