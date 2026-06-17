![BANNER](image.png)


# FastAPI Backend Architecture: Clean Architecture Design

This document details the production-ready structure for the FastAPI backend, utilizing a clean architecture pattern to separate concerns between routing, business logic, data access, and external APIs.

## 1. Folder & File Structure

```text
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                  # FastAPI application instance & entrypoint
│   ├── core/                    # Core application configurations
│   │   ├── config.py            # Pydantic BaseSettings for env vars
│   │   ├── exceptions.py        # Global custom exceptions and handlers
│   │   ├── logging.py           # Structured logging configuration
│   │   └── middleware.py        # Request ID, CORS, and timing middleware
│   ├── api/                     # Presentation Layer (API)
│   │   ├── dependencies.py      # FastAPI dependency injection (DI) container
│   │   └── routes/              # API endpoints
│   │       ├── api_router.py    # Main router consolidating all routes
│   │       ├── chat.py
│   │       ├── emails.py
│   │       ├── sync.py
│   │       └── auth.py
│   ├── services/                # Business Logic Layer
│   │   ├── ai/                  # AI integrations
│   │   │   ├── gemini.py        # Gemini Flash/Pro wrapper
│   │   │   └── nim.py           # NVIDIA NIM (Llama 3.1) wrapper
│   │   ├── gmail_service.py     # Gmail API interaction
│   │   ├── sync_service.py      # Sync orchestration logic
│   │   └── chat_service.py      # RAG pipeline orchestration
│   ├── repositories/            # Data Access Layer (Supabase)
│   │   ├── base_repo.py         # Base generic repository
│   │   ├── email_repo.py        # Email & Vector DB operations
│   │   └── user_repo.py
│   └── models/                  # Data Models
│       ├── domain/              # Pydantic schemas for API requests/responses
│       └── entity/              # Pydantic schemas mapping to DB tables
├── requirements.txt
└── .env
```

## 2. Configuration Layer (`core/config.py`)

We use Pydantic's `BaseSettings` for robust, type-checked environment variable loading.

```python
from pydantic_settings import BaseSettings
from pydantic import SecretStr

class Settings(BaseSettings):
    PROJECT_NAME: str = "Repeatless AI"
    API_V1_STR: str = "/api/v1"
    
    # Supabase
    SUPABASE_URL: str
    SUPABASE_SERVICE_ROLE_KEY: SecretStr
    
    # Google/Gmail
    GOOGLE_CLIENT_ID: str
    GOOGLE_CLIENT_SECRET: SecretStr
    
    # AI Models
    GEMINI_API_KEY: SecretStr
    NVIDIA_NIM_API_KEY: SecretStr

    class Config:
        env_file = ".env"

settings = Settings()
```

## 3. Repository Layer (`repositories/`)

The Data Access layer isolates the Supabase PostgreSQL client from business logic. We use the `supabase-py` client.

```python
# repositories/base_repo.py
from supabase import Client

class BaseRepository:
    def __init__(self, db_client: Client):
        self.db = db_client

# repositories/email_repo.py
from app.repositories.base_repo import BaseRepository

class EmailRepository(BaseRepository):
    async def get_by_id(self, email_id: str):
        response = self.db.table("emails").select("*").eq("id", email_id).execute()
        return response.data[0] if response.data else None

    async def vector_search(self, embedding: list[float], limit: int = 10):
        # Uses a Supabase RPC call to hit the pgvector HNSW index
        response = self.db.rpc(
            "match_emails", 
            {"query_embedding": embedding, "match_limit": limit}
        ).execute()
        return response.data
```

## 4. Service Layer (`services/`)

Services contain pure business logic and orchestrate between external APIs (Gmail, AI) and Repositories.

```python
# services/chat_service.py
from app.repositories.email_repo import EmailRepository
from app.services.ai.gemini import GeminiService

class ChatService:
    def __init__(self, email_repo: EmailRepository, ai_service: GeminiService):
        self.email_repo = email_repo
        self.ai_service = ai_service

    async def handle_query(self, query: str) -> str:
        # 1. Embed query
        embedding = await self.ai_service.embed_text(query)
        # 2. Vector search via Repo
        context_emails = await self.email_repo.vector_search(embedding)
        # 3. Generate response with RAG
        return await self.ai_service.generate_rag_response(query, context_emails)
```

## 5. Dependency Injection (`api/dependencies.py`)

FastAPI's `Depends` is used to wire Repositories and Services together per request. This makes testing incredibly easy (we can mock DB clients or AI services).

```python
from fastapi import Depends
from supabase import create_client, Client
from app.core.config import settings
from app.repositories.email_repo import EmailRepository
from app.services.chat_service import ChatService
from app.services.ai.gemini import GeminiService

# DB Client Dependency
def get_db_client() -> Client:
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY.get_secret_value())

# Repository Dependencies
def get_email_repo(db: Client = Depends(get_db_client)) -> EmailRepository:
    return EmailRepository(db)

# Service Dependencies
def get_gemini_service() -> GeminiService:
    return GeminiService(api_key=settings.GEMINI_API_KEY.get_secret_value())

def get_chat_service(
    email_repo: EmailRepository = Depends(get_email_repo),
    ai_service: GeminiService = Depends(get_gemini_service)
) -> ChatService:
    return ChatService(email_repo, ai_service)
```

## 6. API Layer (`api/routes/chat.py`)

The API layer is extremely thin. It only handles HTTP concerns (status codes, payload validation) and delegates all work to the injected Service.

```python
from fastapi import APIRouter, Depends
from app.models.domain import ChatRequest, ChatResponse
from app.services.chat_service import ChatService
from app.api.dependencies import get_chat_service

router = APIRouter()

@router.post("/query", response_model=ChatResponse)
async def ask_agent(
    request: ChatRequest, 
    chat_service: ChatService = Depends(get_chat_service)
):
    answer = await chat_service.handle_query(request.query)
    return ChatResponse(answer=answer)
```

## 7. Global Error Handling (`core/exceptions.py`)

We map domain exceptions to standard HTTP responses to keep routers clean.

```python
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

class APIError(Exception):
    def __init__(self, message: str, status_code: int = 400):
        self.message = message
        self.status_code = status_code

def register_exception_handlers(app: FastAPI):
    @app.exception_handler(APIError)
    async def api_error_handler(request: Request, exc: APIError):
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": exc.message, "path": request.url.path},
        )
```

## 8. Middleware & Logging (`core/middleware.py` & `core/logging.py`)

Structured JSON logging (using `structlog` or `loguru`) combined with a Request ID middleware ensures traceability across async operations.

```python
# core/middleware.py
import time
import uuid
from starlette.middleware.base import BaseHTTPMiddleware
import logging

logger = logging.getLogger("api")

class RequestTracingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        
        start_time = time.time()
        response = await call_next(request)
        process_time = time.time() - start_time
        
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Process-Time"] = str(process_time)
        
        logger.info(f"Request {request.method} {request.url.path} completed in {process_time:.4f}s [ID: {request_id}]")
        return response
```

## 9. Main Application (`main.py`)

The entrypoint ties it all together cleanly.

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.middleware import RequestTracingMiddleware
from app.core.exceptions import register_exception_handlers
from app.api.routes.api_router import api_router

def create_app() -> FastAPI:
    app = FastAPI(title=settings.PROJECT_NAME)

    # Middleware
    app.add_middleware(RequestTracingMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"], # Configure properly for prod
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Exception Handlers
    register_exception_handlers(app)

    # Routes
    app.include_router(api_router, prefix=settings.API_V1_STR)

    return app

app = create_app()
```

### Architectural Principles Applied:
1.  **Separation of Concerns:** Routers only know about HTTP. Services only know about business rules. Repositories only know about Supabase.
2.  **Dependency Inversion:** Services depend on abstractions (injected via `Depends`), not concrete instantiations, making the system highly testable.
3.  **Fail Fast:** Pydantic models validate all I/O strictly at the edge. Configuration is validated securely on startup.
