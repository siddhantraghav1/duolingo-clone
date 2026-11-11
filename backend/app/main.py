
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routes import learn, practice, user
from .seed import seed_if_empty

CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
ENABLE_DEV_TOOLS = os.getenv("ENABLE_DEV_TOOLS", "true").lower() == "true"


@asynccontextmanager
async def lifespan(_app: FastAPI):
    seed_if_empty()  # runs once when the server starts
    yield


app = FastAPI(title="Duolingo Clone API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(user.router)
app.include_router(learn.router)
app.include_router(practice.router)
if ENABLE_DEV_TOOLS:
    app.include_router(user.dev_router)


@app.get("/", tags=["health"])
def health_check():
    return {"status": "ok", "docs": "/docs"}
