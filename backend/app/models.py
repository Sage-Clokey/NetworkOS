from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List
from datetime import date, datetime


class EventCreate(BaseModel):
    name: str
    location: Optional[str] = None
    date: Optional[str] = None


class EventOut(BaseModel):
    id: int
    name: str
    location: Optional[str] = None
    date: Optional[str] = None
    created_at: Optional[str] = None


class TagCreate(BaseModel):
    name: str


class TagOut(BaseModel):
    id: int
    name: str


class NoteCreate(BaseModel):
    content: str


class NoteOut(BaseModel):
    id: int
    contact_id: int
    content: str
    created_at: Optional[str] = None


class ContactCreate(BaseModel):
    name: str
    organization: Optional[str] = None
    role: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    linkedin: Optional[str] = None
    website: Optional[str] = None
    where_met: Optional[str] = None
    event_id: Optional[int] = None
    date_met: Optional[str] = None
    follow_up_date: Optional[str] = None
    notes: Optional[str] = None
    tag_ids: Optional[List[int]] = []


class ContactUpdate(BaseModel):
    name: Optional[str] = None
    organization: Optional[str] = None
    role: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    linkedin: Optional[str] = None
    website: Optional[str] = None
    where_met: Optional[str] = None
    event_id: Optional[int] = None
    date_met: Optional[str] = None
    follow_up_date: Optional[str] = None
    notes: Optional[str] = None
    tag_ids: Optional[List[int]] = None


class ContactOut(BaseModel):
    id: int
    name: str
    organization: Optional[str] = None
    role: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    linkedin: Optional[str] = None
    website: Optional[str] = None
    where_met: Optional[str] = None
    event_id: Optional[int] = None
    event_name: Optional[str] = None
    date_met: Optional[str] = None
    follow_up_date: Optional[str] = None
    notes: Optional[str] = None
    tags: List[TagOut] = []
    note_list: List[NoteOut] = []
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class ScanRequest(BaseModel):
    text: str


class ScanResult(BaseModel):
    name: Optional[str] = None
    organization: Optional[str] = None
    role: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    linkedin: Optional[str] = None
    raw_text: str


class VoiceNoteRequest(BaseModel):
    transcription: str
    contact_id: Optional[int] = None


class PublicContactCreate(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    linkedin: Optional[str] = None
    what_working_on: Optional[str] = None


class GraphData(BaseModel):
    nodes: list
    links: list
