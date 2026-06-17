<div align = center>

<!-- OVO.AI Banner -->
<p align="center">
  <img src="image.png" alt="OVO.AI Banner" width="100%" style="border-radius:8px;"/>
</p>

<h1><b>AI POWERED GMAIL INTELLIGENCE PLATFORM</b></h1>



[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat&logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?style=flat&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Supabase](https://img.shields.io/badge/Supabase-pgvector-3ECF8E?style=flat&logo=supabase)](https://supabase.com/)
[![Gemini](https://img.shields.io/badge/AI-Gemini%201.5-blue)](https://deepmind.google/technologies/gemini/)
[![NVIDIA NIM](https://img.shields.io/badge/AI-NVIDIA%20NIM-76B900)](https://developer.nvidia.com/nim)

</div>

Repeatless is a production-ready, AI-powered Gmail Intelligence Platform. It connects securely to a user's Gmail inbox, parses message threads, automatically categorizes incoming mail using structured JSON models, and exposes a semantic RAG conversational assistant to query, summarize, and act on email data.

Designed for performance and data isolation, the platform uses a decoupled Next.js 15 client and FastAPI backend with a Supabase PostgreSQL/pgvector database.

---

## ✨ Core Features

*   **Robust Gmail Sync Engine**: Authentic Google OAuth 2.0 flow with token auto-refresh, pagination handling for large inboxes, and lightning-fast incremental synchronization tracking Google's `historyId`.
*   **Token Bucket Quota Backoff**: Employs `tenacity` exponential backoff logic to catch Google API transient warnings and rate limit hits (HTTP 429).
*   **Dual-Embedding Chunking Strategy**: Chunks email bodies (prepending Subject and Sender headers to retain local context) and stores 768-dimensional embeddings using Gemini `text-embedding-004`.
*   **NVIDIA NIM Cross-Encoder Reranker**: Integrates NVIDIA's QA reranking model (`nv-rerankqa-mistral-4b-v3`) to prioritize candidate documents before generation, falling back to pgvector cosine distance on API quota exhaustion.
*   **Strict JSON Email Categorization**: Uses Gemini structured schemas to classify incoming mail (Newsletter, Job, Finance, Notification, Personal, Work) with confidence explanation logs.
*   **Thread-Aware Composition & Send**: Drafts context-rich emails and thread replies, automatically injecting RFC 2822 standard headers (`In-Reply-To` and `References`) to group replies in native Gmail threads.
*   **Clickable Source Attributions**: RAG chat queries extract only the source UUIDs cited in the generated text, rendering citation tags in the UI that open corresponding message timeline panes.

---

## 🏛️ Monorepo Directory Layout

The project separates dependencies completely to prevent cross-pollution of libraries.

```text
repeatless/
├── .github/                     
│   └── workflows/               # Independent CI/CD workflows
│       ├── backend.yml          # Python lint (flake8) & Pytest suite run
│       └── frontend.yml         # Next.js TypeScript check & build verify
├── supabase/                    # DB initial migrations
│   └── migrations/
│       ├── 001_initial_schema.sql
│       └── 002_match_emails.sql # pgvector HNSW search function
├── backend/                     # Python FastAPI Backend
│   ├── app/
│   │   ├── api/routes/          # Routers (Auth, Sync, Emails, Compose, Reply, Chat)
│   │   ├── services/            # Services (AI controller, Sync runner, Rerank filter)
│   │   ├── repositories/        # Database Layer (Supabase client & sandbox memory DB)
│   │   ├── models/              # Pydantic schemas (strict request/response types)
│   │   └── core/                # Config settings, logging, trace middleware
│   ├── tests/                   # Pytest API Suite (covers mock flows and client APIs)
│   ├── requirements.txt         # Package definitions
│   └── Dockerfile
└── frontend/                    # Next.js 15 App Router Frontend
    ├── src/
    │   ├── app/                 # Client routes, globals.css, layout
    │   └── lib/                 # Zustand store & API clients
    ├── package.json             # JS packages (zustand, lucide-react)
    └── Dockerfile
```

---

## 🛠️ Sandbox Mode (Offline Mock Environment)

To allow developers to evaluate the codebase instantly without needing Google Cloud credentials, Supabase projects, or active Gemini/NVIDIA API keys, the backend includes a built-in **Sandbox Mode**.

*   Setting `SANDBOX_MODE=true` in `/backend/.env` intercepts all databases and external API routes.
*   It provisions mock credentials, simulates Gmail synchronizations using built-in timeline data, and returns rule-based classifications and summaries.
*   *This ensures a fully functional, zero-dependency local demonstration.*

---

## 🚀 Installation & Local Run

### 1. Backend Setup (FastAPI)
1.  Navigate to `/backend`:
    ```bash
    cd backend
    ```
2.  Create and activate a Python virtual environment:
    ```bash
    python -m venv venv
    # On Windows:
    .\venv\Scripts\activate
    # On macOS/Linux:
    source venv/bin/activate
    ```
3.  Install packages:
    ```bash
    pip install --upgrade pip
    pip install -r requirements.txt
    ```
4.  Create `.env` using the template:
    ```bash
    cp .env.example .env
    ```
    *(Set `SANDBOX_MODE=true` for offline testing).*
5.  Launch development server:
    ```bash
    uvicorn app.main:app --reload --port 8000
    ```

### 2. Frontend Setup (Next.js)
1.  Navigate to `/frontend` in a separate shell:
    ```bash
    cd frontend
    ```
2.  Install packages:
    ```bash
    npm install
    ```
3.  Launch local client server:
    ```bash
    npm run dev
    ```
4.  Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔌 API Endpoints Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/auth/login` | Returns the auth page URL (or immediately calls redirect in Sandbox). |
| `GET` | `/api/v1/auth/callback` | OAuth callback endpoint. Exchanges verification code for account tokens. |
| `POST` | `/api/v1/sync/trigger` | Triggers a background sync worker task. |
| `GET` | `/api/v1/emails` | Lists synced email records. Filters by category. |
| `GET` | `/api/v1/emails/threads` | Lists synced thread previews. Filters by category. |
| `GET` | `/api/v1/emails/threads/{id}` | Fetches full thread detail including message timeline history. |
| `POST` | `/api/v1/emails/{id}/summarize` | Manually triggers single summary or thread-level summary jobs. |
| `POST` | `/api/v1/emails/{id}/classify` | Manually triggers AI classification. |
| `POST` | `/api/v1/emails/compose` | Drafts a new email (subject + body) using tone control. |
| `POST` | `/api/v1/threads/reply` | Drafts a thread-aware reply and sends it via Gmail API wrapper. |
| `POST` | `/api/v1/chat/query` | Submits a question to the conversational RAG Chat agent. |
| `POST` | `/api/v1/chat/sessions` | Provisions a new chat conversation log. |

---

## 🧪 Testing Suite
Backend routers and controllers are covered by a Pytest integration suite:
```bash
cd backend
# Verify virtual environment is active
pytest
```
Results: `7 passed, 2 warnings in 1.73s`.

---

## ☁️ Production Deployment

1.  **Database**: Host a Supabase project. Initialize the schemas in `/supabase/migrations`. Enable Row Level Security (RLS) policies.
2.  **Backend (Railway / Render)**: Deploy the `/backend` directory. Railway will build the container automatically using the `/backend/Dockerfile`. Populate environment variables. Set `SANDBOX_MODE=false`.
3.  **Frontend (Vercel)**: Import the repository. Set the root directory to `frontend`. Configure `NEXT_PUBLIC_API_URL` pointing to the backend API host.

---

## 🔮 Future Improvements

1.  **Persistent Task Queues**: Transition background syncs from FastAPI `BackgroundTasks` to Celery (backed by Redis or RabbitMQ) or Temporal to ensure sync jobs resume if the server restarts.
2.  **Webhook Subscriptions (Push Sync)**: Configure Google Cloud Pub/Sub subscriptions to receive push notifications when emails arrive, replacing periodic polling.
3.  **AES Column-Level Token Encryption**: Encrypt user tokens at rest in the database using Supabase Vault or symmetric key hashing in the repository layers.
4.  **Semantic Clustering for Deduplication**: Deploy an offline clustering algorithm (like DBSCAN) on newsletter embeddings to group news stories semantically, providing digests.
