from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
import aiosqlite
from datetime import datetime

from ..database import get_db
from ..models import ContactCreate, ContactUpdate, ContactOut, TagOut, NoteOut

router = APIRouter(prefix="/contacts", tags=["contacts"])


async def _fetch_contact(db, contact_id: int) -> ContactOut:
    row = await db.execute_fetchall(
        """
        SELECT c.*, e.name as event_name
        FROM contacts c
        LEFT JOIN events e ON c.event_id = e.id
        WHERE c.id = ?
        """,
        (contact_id,)
    )
    if not row:
        raise HTTPException(status_code=404, detail="Contact not found")
    c = row[0]

    tags = await db.execute_fetchall(
        "SELECT t.id, t.name FROM tags t JOIN contact_tags ct ON t.id = ct.tag_id WHERE ct.contact_id = ?",
        (contact_id,)
    )
    notes = await db.execute_fetchall(
        "SELECT * FROM notes WHERE contact_id = ? ORDER BY created_at ASC",
        (contact_id,)
    )

    return ContactOut(
        id=c["id"],
        name=c["name"],
        organization=c["organization"],
        role=c["role"],
        email=c["email"],
        phone=c["phone"],
        linkedin=c["linkedin"],
        website=c["website"],
        where_met=c["where_met"],
        event_id=c["event_id"],
        event_name=c["event_name"],
        date_met=c["date_met"],
        follow_up_date=c["follow_up_date"],
        notes=c["notes"],
        tags=[TagOut(id=t["id"], name=t["name"]) for t in tags],
        note_list=[NoteOut(id=n["id"], contact_id=n["contact_id"], content=n["content"], created_at=n["created_at"]) for n in notes],
        created_at=c["created_at"],
        updated_at=c["updated_at"],
    )


@router.get("", response_model=List[ContactOut])
async def list_contacts(
    search: Optional[str] = None,
    event_id: Optional[int] = None,
    tag_id: Optional[int] = None,
    sort_by: Optional[str] = "created_at",
    db=Depends(get_db)
):
    query = """
        SELECT DISTINCT c.id, c.name, c.organization, c.role, c.email, c.phone,
               c.linkedin, c.website, c.where_met, c.event_id, c.date_met,
               c.follow_up_date, c.notes, c.created_at, c.updated_at,
               e.name as event_name
        FROM contacts c
        LEFT JOIN events e ON c.event_id = e.id
        LEFT JOIN contact_tags ct ON c.id = ct.contact_id
        LEFT JOIN tags t ON ct.tag_id = t.id
        WHERE 1=1
    """
    params = []

    if search:
        query += " AND (c.name LIKE ? OR c.organization LIKE ? OR c.role LIKE ? OR c.email LIKE ?)"
        s = f"%{search}%"
        params.extend([s, s, s, s])

    if event_id:
        query += " AND c.event_id = ?"
        params.append(event_id)

    if tag_id:
        query += " AND ct.tag_id = ?"
        params.append(tag_id)

    sort_col = "c.created_at"
    if sort_by == "follow_up_date":
        sort_col = "c.follow_up_date"
    elif sort_by == "name":
        sort_col = "c.name"

    query += f" ORDER BY {sort_col} DESC"

    rows = await db.execute_fetchall(query, params)

    contacts = []
    for row in rows:
        cid = row["id"]
        tags = await db.execute_fetchall(
            "SELECT t.id, t.name FROM tags t JOIN contact_tags ct ON t.id = ct.tag_id WHERE ct.contact_id = ?",
            (cid,)
        )
        notes = await db.execute_fetchall(
            "SELECT * FROM notes WHERE contact_id = ? ORDER BY created_at ASC",
            (cid,)
        )
        contacts.append(ContactOut(
            id=row["id"],
            name=row["name"],
            organization=row["organization"],
            role=row["role"],
            email=row["email"],
            phone=row["phone"],
            linkedin=row["linkedin"],
            website=row["website"],
            where_met=row["where_met"],
            event_id=row["event_id"],
            event_name=row["event_name"],
            date_met=row["date_met"],
            follow_up_date=row["follow_up_date"],
            notes=row["notes"],
            tags=[TagOut(id=t["id"], name=t["name"]) for t in tags],
            note_list=[NoteOut(id=n["id"], contact_id=n["contact_id"], content=n["content"], created_at=n["created_at"]) for n in notes],
            created_at=row["created_at"],
            updated_at=row["updated_at"],
        ))
    return contacts


@router.post("", response_model=ContactOut, status_code=201)
async def create_contact(body: ContactCreate, db=Depends(get_db)):
    now = datetime.utcnow().isoformat()
    cursor = await db.execute(
        """INSERT INTO contacts (name, organization, role, email, phone, linkedin, website,
           where_met, event_id, date_met, follow_up_date, notes, created_at, updated_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
        (body.name, body.organization, body.role, body.email, body.phone,
         body.linkedin, body.website, body.where_met, body.event_id,
         body.date_met, body.follow_up_date, body.notes, now, now)
    )
    contact_id = cursor.lastrowid

    if body.tag_ids:
        for tag_id in body.tag_ids:
            await db.execute(
                "INSERT OR IGNORE INTO contact_tags (contact_id, tag_id) VALUES (?, ?)",
                (contact_id, tag_id)
            )

    await db.commit()
    return await _fetch_contact(db, contact_id)


@router.get("/{contact_id}", response_model=ContactOut)
async def get_contact(contact_id: int, db=Depends(get_db)):
    return await _fetch_contact(db, contact_id)


@router.put("/{contact_id}", response_model=ContactOut)
async def update_contact(contact_id: int, body: ContactUpdate, db=Depends(get_db)):
    existing = await db.execute_fetchall("SELECT id FROM contacts WHERE id = ?", (contact_id,))
    if not existing:
        raise HTTPException(status_code=404, detail="Contact not found")

    updates = {k: v for k, v in body.model_dump(exclude={"tag_ids"}).items() if v is not None}
    if updates:
        updates["updated_at"] = datetime.utcnow().isoformat()
        set_clause = ", ".join(f"{k} = ?" for k in updates)
        values = list(updates.values()) + [contact_id]
        await db.execute(f"UPDATE contacts SET {set_clause} WHERE id = ?", values)

    if body.tag_ids is not None:
        await db.execute("DELETE FROM contact_tags WHERE contact_id = ?", (contact_id,))
        for tag_id in body.tag_ids:
            await db.execute(
                "INSERT OR IGNORE INTO contact_tags (contact_id, tag_id) VALUES (?, ?)",
                (contact_id, tag_id)
            )

    await db.commit()
    return await _fetch_contact(db, contact_id)


@router.delete("/{contact_id}", status_code=204)
async def delete_contact(contact_id: int, db=Depends(get_db)):
    existing = await db.execute_fetchall("SELECT id FROM contacts WHERE id = ?", (contact_id,))
    if not existing:
        raise HTTPException(status_code=404, detail="Contact not found")
    await db.execute("DELETE FROM contacts WHERE id = ?", (contact_id,))
    await db.commit()


@router.post("/{contact_id}/notes", status_code=201)
async def add_note(contact_id: int, body: dict, db=Depends(get_db)):
    content = body.get("content", "").strip()
    if not content:
        raise HTTPException(status_code=400, detail="Note content required")
    now = datetime.utcnow().isoformat()
    await db.execute(
        "INSERT INTO notes (contact_id, content, created_at) VALUES (?, ?, ?)",
        (contact_id, content, now)
    )
    await db.commit()
    return {"status": "ok"}
