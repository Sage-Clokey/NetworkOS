from fastapi import APIRouter, Depends, HTTPException
from typing import List
from datetime import datetime

from ..database import get_db
from ..models import TagCreate, TagOut

router = APIRouter(prefix="/tags", tags=["tags"])


@router.get("", response_model=List[TagOut])
async def list_tags(db=Depends(get_db)):
    rows = await db.execute_fetchall("SELECT * FROM tags ORDER BY name ASC")
    return [TagOut(**dict(r)) for r in rows]


@router.post("", response_model=TagOut, status_code=201)
async def create_tag(body: TagCreate, db=Depends(get_db)):
    existing = await db.execute_fetchall("SELECT * FROM tags WHERE name = ?", (body.name.lower().strip(),))
    if existing:
        return TagOut(**dict(existing[0]))
    cursor = await db.execute(
        "INSERT INTO tags (name) VALUES (?)",
        (body.name.lower().strip(),)
    )
    await db.commit()
    row = await db.execute_fetchall("SELECT * FROM tags WHERE id = ?", (cursor.lastrowid,))
    return TagOut(**dict(row[0]))


@router.delete("/{tag_id}", status_code=204)
async def delete_tag(tag_id: int, db=Depends(get_db)):
    existing = await db.execute_fetchall("SELECT id FROM tags WHERE id = ?", (tag_id,))
    if not existing:
        raise HTTPException(status_code=404, detail="Tag not found")
    await db.execute("DELETE FROM tags WHERE id = ?", (tag_id,))
    await db.commit()
