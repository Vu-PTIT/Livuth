import json
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from backend.core.config import settings
from backend.core.database import db
from backend.api.api_user_mongo import router as user_router
from backend.api.api_auth_mongo import router as auth_router
from backend.api.api_event_mongo import router as event_router
from backend.api.api_tour_provider_mongo import router as tour_provider_router
from backend.api.api_chat_mongo import router as chat_router
from backend.api.api_review_mongo import router as review_router
from backend.api.api_post_mongo import router as post_router
from backend.api.api_notification_mongo import router as notification_router
from backend.utils.exception_handler import (
    CustomException,
    fastapi_error_handler,
    custom_error_handler,
    validation_exception_handler
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifespan events"""
    print("🚀 Starting up FastAPI application...")
    # Connect to MongoDB
    await db.connect_db()
    yield
    # Close MongoDB connection
    await db.close_db()
    print("👋 Shutting down...")


# Initialize FastAPI app
app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_PREFIX}/openapi.json",
    lifespan=lifespan,
)

# Setup CORS - Allow all origins for development
try:
    if settings.BACKEND_CORS_ORIGINS:
        origins = json.loads(settings.BACKEND_CORS_ORIGINS)
    else:
        origins = ["*"]
except:
    origins = ["*"]

# Always add common development origins
dev_origins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:8080",
    "https://localhost",
    "http://localhost",
    "capacitor://localhost",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:8080",
]
for origin in dev_origins:
    if origin not in origins:
        origins.append(origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
from fastapi.staticfiles import StaticFiles
from backend.api.api_upload import router as upload_router

# ... imports ...

# Include routers
app.include_router(auth_router, prefix=settings.API_PREFIX, tags=["Authentication"])
app.include_router(user_router, prefix=settings.API_PREFIX, tags=["Users"])
app.include_router(event_router, prefix=settings.API_PREFIX, tags=["Events"])
app.include_router(tour_provider_router, prefix=settings.API_PREFIX, tags=["Tour Providers"])
app.include_router(chat_router, prefix=settings.API_PREFIX, tags=["Chat"])
app.include_router(review_router, prefix=settings.API_PREFIX, tags=["Reviews"])
app.include_router(post_router, prefix=settings.API_PREFIX, tags=["Posts"])
app.include_router(notification_router, prefix=settings.API_PREFIX, tags=["Notifications"])
app.include_router(upload_router, prefix=settings.API_PREFIX, tags=["Uploads"])

# Mount static files
app.mount("/static", StaticFiles(directory="backend/static"), name="static")

# Register exception handlers
app.add_exception_handler(Exception, fastapi_error_handler)
app.add_exception_handler(CustomException, custom_error_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)

@app.get("/")
async def root():
    """Root endpoint - health check"""
    return {
        "message": f"Welcome to {settings.PROJECT_NAME}",
        "status": "running",
        "docs": "/docs",
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "database": "MongoDB Atlas"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )