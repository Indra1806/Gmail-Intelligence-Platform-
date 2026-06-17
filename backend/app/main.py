import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.middleware import RequestTracingMiddleware
from app.core.exceptions import register_exception_handlers
from app.core.logging import setup_logging
from app.api.routes.api_router import api_router

# Setup logging configuration on startup
setup_logging()
logger = logging.getLogger(__name__)

def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.PROJECT_NAME,
        description="Gmail Sync, Summarization, and RAG Assistant API platform",
        version="1.0.0"
    )

    # 1. Mount Request Tracing Middleware
    app.add_middleware(RequestTracingMiddleware)
    
    # 2. CORS Configuration
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"], # In production, restrict to frontend domain
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # 3. Register custom exception handlers
    register_exception_handlers(app)

    # 4. Include API routers
    app.include_router(api_router, prefix=settings.API_V1_STR)

    @app.get("/")
    async def root_health_check():
        return {
            "status": "healthy",
            "project": settings.PROJECT_NAME,
            "sandbox_mode": False
        }

    logger.info("FastAPI Application Scaffolding Initialized.")
    return app

app = create_app()
