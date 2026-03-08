import os
import json
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials
from datetime import datetime

from ..database import get_db

router = APIRouter(prefix="/google", tags=["google"])

SCOPES = ["https://www.googleapis.com/auth/contacts.readonly"]
TOKEN_FILE = str(Path(__file__).parent.parent.parent.parent / "database" / "google_token.json")

GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET", "")
BACKEND_URL = os.environ.get("BACKEND_URL", "http://localhost:8000")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:5173")


def _make_flow():
    return Flow.from_client_config(
        {
            "web": {
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [f"{BACKEND_URL}/google/callback"],
            }
        },
        scopes=SCOPES,
        redirect_uri=f"{BACKEND_URL}/google/callback",
    )


def _save_token(credentials: Credentials):
    os.makedirs(os.path.dirname(TOKEN_FILE), exist_ok=True)
    with open(TOKEN_FILE, "w") as f:
        json.dump({
            "token": credentials.token,
            "refresh_token": credentials.refresh_token,
            "token_uri": credentials.token_uri,
            "client_id": credentials.client_id,
            "client_secret": credentials.client_secret,
            "scopes": list(credentials.scopes) if credentials.scopes else SCOPES,
        }, f)


def _load_credentials():
    if not os.path.exists(TOKEN_FILE):
        return None
    with open(TOKEN_FILE) as f:
        data = json.load(f)
    return Credentials(
        token=data["token"],
        refresh_token=data["refresh_token"],
        token_uri=data["token_uri"],
        client_id=data["client_id"],
        client_secret=data["client_secret"],
        scopes=data["scopes"],
    )


def _parse_google_contact(person: dict) -> dict:
    """Extract useful fields from a Google People API person resource."""
    names = person.get("names", [])
    emails = person.get("emailAddresses", [])
    phones = person.get("phoneNumbers", [])
    orgs = person.get("organizations", [])
    urls = person.get("urls", [])

    name = names[0].get("displayName", "") if names else ""
    email = emails[0].get("value", "") if emails else ""
    phone = phones[0].get("value", "") if phones else ""
    organization = orgs[0].get("name", "") if orgs else ""
    role = orgs[0].get("title", "") if orgs else ""

    linkedin = ""
    for url in urls:
        val = url.get("value", "")
        if "linkedin.com" in val:
            linkedin = val
            break

    return {
        "name": name,
        "email": email,
        "phone": phone,
        "organization": organization,
        "role": role,
        "linkedin": linkedin,
        "resource_name": person.get("resourceName", ""),
    }


@router.get("/status")
async def google_status():
    """Check if Google account is connected."""
    creds = _load_credentials()
    if not creds:
        return {"connected": False}
    configured = bool(GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET)
    return {"connected": True, "configured": configured}


@router.get("/auth")
async def google_auth():
    """Start the OAuth flow — returns the Google authorization URL."""
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        raise HTTPException(
            status_code=400,
            detail="GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables not set."
        )
    flow = _make_flow()
    auth_url, _ = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent",
    )
    return {"auth_url": auth_url}


@router.get("/callback")
async def google_callback(code: str = None, error: str = None):
    """Handle the OAuth callback from Google."""
    if error:
        return RedirectResponse(f"{FRONTEND_URL}/#/google?error={error}")
    if not code:
        return RedirectResponse(f"{FRONTEND_URL}/#/google?error=no_code")

    flow = _make_flow()
    flow.fetch_token(code=code)
    _save_token(flow.credentials)
    return RedirectResponse(f"{FRONTEND_URL}/#/google?connected=true")


@router.get("/contacts")
async def list_google_contacts(page_token: str = None, page_size: int = 50):
    """Fetch contacts from Google People API."""
    creds = _load_credentials()
    if not creds:
        raise HTTPException(status_code=401, detail="Google account not connected")

    service = build("people", "v1", credentials=creds)
    kwargs = {
        "resourceName": "people/me",
        "pageSize": page_size,
        "personFields": "names,emailAddresses,phoneNumbers,organizations,urls",
    }
    if page_token:
        kwargs["pageToken"] = page_token

    result = service.people().connections().list(**kwargs).execute()
    connections = result.get("connections", [])
    next_page_token = result.get("nextPageToken")
    total = result.get("totalItems", 0)

    contacts = [_parse_google_contact(p) for p in connections]
    contacts = [c for c in contacts if c["name"]]  # skip empty

    return {
        "contacts": contacts,
        "next_page_token": next_page_token,
        "total": total,
    }


@router.post("/import")
async def import_google_contacts(body: dict, db=Depends(get_db)):
    """Import selected Google contacts into NetworkOS."""
    contacts_data = body.get("contacts", [])
    if not contacts_data:
        raise HTTPException(status_code=400, detail="No contacts provided")

    now = datetime.utcnow().isoformat()

    # Ensure google_import tag exists
    tag_row = await db.execute_fetchall("SELECT id FROM tags WHERE name = 'google_contacts'")
    if not tag_row:
        cursor = await db.execute("INSERT INTO tags (name) VALUES ('google_contacts')")
        tag_id = cursor.lastrowid
    else:
        tag_id = tag_row[0]["id"]

    imported = 0
    skipped = 0

    for c in contacts_data:
        name = c.get("name", "").strip()
        if not name:
            continue

        email = c.get("email", "")

        # Skip duplicates by email
        if email:
            existing = await db.execute_fetchall(
                "SELECT id FROM contacts WHERE email = ?", (email,)
            )
            if existing:
                skipped += 1
                continue

        cursor = await db.execute(
            """INSERT INTO contacts (name, organization, role, email, phone, linkedin,
               notes, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                name,
                c.get("organization", ""),
                c.get("role", ""),
                email,
                c.get("phone", ""),
                c.get("linkedin", ""),
                "Imported from Google Contacts",
                now,
                now,
            )
        )
        contact_id = cursor.lastrowid
        await db.execute(
            "INSERT OR IGNORE INTO contact_tags (contact_id, tag_id) VALUES (?, ?)",
            (contact_id, tag_id)
        )
        imported += 1

    await db.commit()
    return {"imported": imported, "skipped": skipped}


@router.delete("/disconnect")
async def disconnect_google():
    """Remove stored Google credentials."""
    if os.path.exists(TOKEN_FILE):
        os.remove(TOKEN_FILE)
    return {"status": "disconnected"}
