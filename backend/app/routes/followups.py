from fastapi import APIRouter, Depends
from typing import List
from datetime import datetime, date

from ..database import get_db
from ..models import ContactOut, TagOut, NoteOut

router = APIRouter(prefix="/followups", tags=["followups"])


@router.get("", response_model=List[ContactOut])
async def get_followups(db=Depends(get_db)):
    today = date.today().isoformat()
    rows = await db.execute_fetchall(
        """
        SELECT c.*, e.name as event_name
        FROM contacts c
        LEFT JOIN events e ON c.event_id = e.id
        WHERE c.follow_up_date IS NOT NULL AND c.follow_up_date != ''
        ORDER BY c.follow_up_date ASC
        """,
    )

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
