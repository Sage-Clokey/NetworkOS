# NetworkOS

Personal networking intelligence system for conferences, meetups, and professional events.

## Features

- **Quick Add** — Capture a new contact in under 10 seconds
- **Dashboard** — Search, filter by event/tag, sort by follow-up date
- **Contact Profiles** — Full details, notes history, tags, follow-up reminders
- **Event System** — Organize contacts by event (SynBioBeta, FreedomFest, etc.)
- **Tag System** — Multi-tag contacts and filter by tag
- **Follow-up Reminders** — Visual highlights for today/overdue follow-ups
- **QR Contact Form** — Share `/connect` link; visitors self-submit
- **OCR Scanner** — Snap a business card or badge, extract contact fields
- **Voice Notes** — Dictate a note using Web Speech API
- **Network Graph** — D3.js visualization of your contact network

---

## Project Structure

```
networkos/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI app
│   │   ├── database.py      # SQLite async connection
│   │   ├── models.py        # Pydantic models
│   │   └── routes/
│   │       ├── contacts.py
│   │       ├── events.py
│   │       ├── tags.py
│   │       ├── followups.py
│   │       └── scanning.py  # OCR, voice, QR, graph
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── pages/           # Dashboard, AddContact, ContactProfile, Events, Scanner, NetworkGraph, QRPage, PublicConnect
│       ├── components/      # Layout, TagBadge, FollowUpBadge, VoiceRecorder
│       ├── services/api.js  # All API calls
│       └── utils/dates.js
└── database/
    └── schema.sql
```

---

## Setup Instructions

### 1. Backend

```bash
cd networkos/backend

# Create and activate a virtual environment
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# (Optional) Set Anthropic API key for LLM-enhanced OCR parsing
export ANTHROPIC_API_KEY=sk-ant-...

# Start the FastAPI server
uvicorn app.main:app --reload --port 8000
```

The backend initializes the SQLite database automatically on first run.

### 2. Frontend

```bash
cd networkos/frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

Open http://localhost:5173 in your browser.

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | _(none)_ | Enables LLM-powered OCR extraction. Without it, a regex parser is used. |
| `VITE_API_URL` | `http://localhost:8000` | Backend URL for frontend API calls |
| `DATABASE_URL` | `../database/networkos.db` | Path to SQLite database file |

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | /contacts | List contacts (supports search, event_id, tag_id, sort_by) |
| POST | /contacts | Create contact |
| GET | /contacts/:id | Get contact |
| PUT | /contacts/:id | Update contact |
| DELETE | /contacts/:id | Delete contact |
| POST | /contacts/:id/notes | Add a note |
| GET | /events | List events |
| POST | /events | Create event |
| DELETE | /events/:id | Delete event |
| GET | /tags | List tags |
| POST | /tags | Create tag |
| DELETE | /tags/:id | Delete tag |
| GET | /followups | Contacts with follow-up dates |
| POST | /scan | Parse OCR/text into structured contact |
| POST | /voice-note | Save voice transcription as note |
| POST | /public-contact | Public /connect form submission |
| GET | /graph | D3 graph data |
| GET | /qr | Generate QR code image |

---

## Migrating to PostgreSQL

The schema uses standard SQL with no SQLite-specific features (except `AUTOINCREMENT` → use `SERIAL` in PostgreSQL). To migrate:

1. Replace `aiosqlite` with `asyncpg` or `databases`
2. Update `DATABASE_URL` to a PostgreSQL connection string
3. Change `INTEGER PRIMARY KEY AUTOINCREMENT` → `SERIAL PRIMARY KEY`
4. Change `datetime('now')` → `NOW()`
