from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from datetime import datetime
import os
import re

from ..database import get_db
from ..models import ScanRequest, ScanResult, VoiceNoteRequest, PublicContactCreate, ContactOut, TagOut, NoteOut

router = APIRouter(tags=["scanning"])


def _parse_contact_from_text(text: str) -> dict:
    """Simple regex-based extraction as fallback when no LLM is configured."""
    result = {
        "name": None,
        "organization": None,
        "role": None,
        "email": None,
        "phone": None,
        "linkedin": None,
    }

    email_match = re.search(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}", text)
    if email_match:
        result["email"] = email_match.group()

    phone_match = re.search(r"[\+]?[\d\s\-\(\)]{7,15}", text)
    if phone_match:
        result["phone"] = phone_match.group().strip()

    linkedin_match = re.search(r"linkedin\.com/in/[\w\-]+", text, re.IGNORECASE)
    if linkedin_match:
        result["linkedin"] = "https://" + linkedin_match.group()

    lines = [l.strip() for l in text.strip().splitlines() if l.strip()]
    if lines:
        result["name"] = lines[0]
    if len(lines) > 1:
        result["organization"] = lines[1]
    if len(lines) > 2:
        result["role"] = lines[2]

    return result


async def _llm_parse_contact(text: str) -> dict:
    """Use Anthropic API to parse contact info from OCR text."""
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        return _parse_contact_from_text(text)

    try:
        import anthropic
        client = anthropic.Anthropic(api_key=api_key)
        message = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=512,
            messages=[{
                "role": "user",
                "content": f"""Extract contact information from this text and return ONLY a JSON object with these exact keys:
name, organization, role, email, phone, linkedin

Text:
{text}

Return only valid JSON, no explanation."""
            }]
        )
        import json
        content = message.content[0].text.strip()
        content = re.sub(r"```json\s*|\s*```", "", content)
        return json.loads(content)
    except Exception:
        return _parse_contact_from_text(text)


@router.post("/scan", response_model=ScanResult)
async def scan_text(body: ScanRequest):
    parsed = await _llm_parse_contact(body.text)
    return ScanResult(
        name=parsed.get("name"),
        organization=parsed.get("organization"),
        role=parsed.get("role"),
        email=parsed.get("email"),
        phone=parsed.get("phone"),
        linkedin=parsed.get("linkedin"),
        raw_text=body.text,
    )


@router.post("/voice-note")
async def process_voice_note(body: VoiceNoteRequest, db=Depends(get_db)):
    """Save a voice note transcription, optionally linked to a contact."""
    now = datetime.utcnow().isoformat()

    if body.contact_id:
        existing = await db.execute_fetchall("SELECT id FROM contacts WHERE id = ?", (body.contact_id,))
        if not existing:
            raise HTTPException(status_code=404, detail="Contact not found")
        await db.execute(
            "INSERT INTO notes (contact_id, content, created_at) VALUES (?, ?, ?)",
            (body.contact_id, f"[Voice] {body.transcription}", now)
        )
        await db.commit()
        return {"status": "ok", "contact_id": body.contact_id}

    # No contact linked — return transcription for user to decide
    return {"status": "ok", "transcription": body.transcription}


@router.post("/public-contact", status_code=201)
async def public_contact_form(body: PublicContactCreate, db=Depends(get_db)):
    """QR code landing page — visitor submits their own info."""
    now = datetime.utcnow().isoformat()

    # Ensure self_submitted tag exists
    tag_row = await db.execute_fetchall("SELECT id FROM tags WHERE name = 'self_submitted'")
    if not tag_row:
        cursor = await db.execute("INSERT INTO tags (name) VALUES ('self_submitted')")
        tag_id = cursor.lastrowid
    else:
        tag_id = tag_row[0]["id"]

    notes_text = body.what_working_on or ""

    cursor = await db.execute(
        """INSERT INTO contacts (name, email, phone, linkedin, notes, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (body.name, body.email, body.phone, body.linkedin, notes_text, now, now)
    )
    contact_id = cursor.lastrowid
    await db.execute(
        "INSERT OR IGNORE INTO contact_tags (contact_id, tag_id) VALUES (?, ?)",
        (contact_id, tag_id)
    )
    await db.commit()
    return {"status": "ok", "contact_id": contact_id}


@router.get("/graph")
async def get_graph(db=Depends(get_db)):
    """Return graph data: nodes and links for D3 visualization."""
    nodes = []
    links = []

    # User node
    nodes.append({"id": "user_0", "type": "user", "label": "You", "group": 0})

    events = await db.execute_fetchall("SELECT * FROM events")
    for e in events:
        eid = f"event_{e['id']}"
        nodes.append({"id": eid, "type": "event", "label": e["name"], "group": 1})
        links.append({"source": "user_0", "target": eid, "type": "attended"})

    tags = await db.execute_fetchall("SELECT * FROM tags")
    for t in tags:
        tid = f"tag_{t['id']}"
        nodes.append({"id": tid, "type": "tag", "label": t["name"], "group": 3})

    contacts = await db.execute_fetchall("SELECT * FROM contacts")
    for c in contacts:
        cid = f"contact_{c['id']}"
        nodes.append({"id": cid, "type": "contact", "label": c["name"], "group": 2,
                       "organization": c["organization"], "role": c["role"]})

        if c["event_id"]:
            links.append({"source": f"event_{c['event_id']}", "target": cid, "type": "met_at"})
        else:
            links.append({"source": "user_0", "target": cid, "type": "met"})

        ctags = await db.execute_fetchall(
            "SELECT tag_id FROM contact_tags WHERE contact_id = ?", (c["id"],)
        )
        for ct in ctags:
            links.append({"source": cid, "target": f"tag_{ct['tag_id']}", "type": "tagged"})

    return {"nodes": nodes, "links": links}


@router.get("/qr")
async def generate_qr(base_url: str = "http://localhost:5173"):
    """Generate a QR code pointing to the public /connect form."""
    import qrcode
    import io
    import base64

    url = f"{base_url}/connect"
    qr = qrcode.QRCode(version=1, box_size=10, border=4)
    qr.add_data(url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")

    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)
    b64 = base64.b64encode(buffer.read()).decode()

    return {"qr_code": f"data:image/png;base64,{b64}", "url": url}
