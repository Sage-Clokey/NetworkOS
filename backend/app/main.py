from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from .database import init_db
from .routes import contacts, events, tags, followups, scanning, google_contacts


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(title="NetworkOS API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(contacts.router)
app.include_router(events.router)
app.include_router(tags.router)
app.include_router(followups.router)
app.include_router(scanning.router)
app.include_router(google_contacts.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
