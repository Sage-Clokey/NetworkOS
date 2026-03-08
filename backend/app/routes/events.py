from fastapi import APIRouter, Depends, HTTPException
from typing import List
from datetime import datetime

from ..database import get_db
from ..models import EventCreate, EventOut

router = APIRouter(prefix="/events", tags=["events"])


@router.get("", response_model=List[EventOut])
async def list_events(db=Depends(get_db)):
    rows = await db.execute_fetchall("SELECT * FROM events ORDER BY date DESC, created_at DESC")
    return [EventOut(**dict(r)) for r in rows]


@router.post("", response_model=EventOut, status_code=201)
async def create_event(body: EventCreate, db=Depends(get_db)):
    now = datetime.utcnow().isoformat()
    cursor = await db.execute(
        "INSERT INTO events (name, location, date, created_at) VALUES (?, ?, ?, ?)",
        (body.name, body.location, body.date, now)
    )
    await db.commit()
    row = await db.execute_fetchall("SELECT * FROM events WHERE id = ?", (cursor.lastrowid,))
    return EventOut(**dict(row[0]))


@router.delete("/{event_id}", status_code=204)
async def delete_event(event_id: int, db=Depends(get_db)):
    existing = await db.execute_fetchall("SELECT id FROM events WHERE id = ?", (event_id,))
    if not existing:
        raise HTTPException(status_code=404, detail="Event not found")
    await db.execute("DELETE FROM events WHERE id = ?", (event_id,))
    await db.commit()
