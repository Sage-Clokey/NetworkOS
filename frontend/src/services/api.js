const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

async function request(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Request failed');
  }
  if (res.status === 204) return null;
  return res.json();
}

// Contacts
export const getContacts = (params = {}) => {
  const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v != null && v !== ''));
  return request('GET', `/contacts${q.toString() ? '?' + q : ''}`);
};
export const getContact = (id) => request('GET', `/contacts/${id}`);
export const createContact = (data) => request('POST', '/contacts', data);
export const updateContact = (id, data) => request('PUT', `/contacts/${id}`, data);
export const deleteContact = (id) => request('DELETE', `/contacts/${id}`);
export const addNote = (id, content) => request('POST', `/contacts/${id}/notes`, { content });

// Events
export const getEvents = () => request('GET', '/events');
export const createEvent = (data) => request('POST', '/events', data);
export const deleteEvent = (id) => request('DELETE', `/events/${id}`);

// Tags
export const getTags = () => request('GET', '/tags');
export const createTag = (name) => request('POST', '/tags', { name });
export const deleteTag = (id) => request('DELETE', `/tags/${id}`);

// Follow-ups
export const getFollowups = () => request('GET', '/followups');

// Scanning
export const scanText = (text) => request('POST', '/scan', { text });
export const submitPublicContact = (data) => request('POST', '/public-contact', data);
export const processVoiceNote = (transcription, contact_id) =>
  request('POST', '/voice-note', { transcription, contact_id });

// Graph
export const getGraph = () => request('GET', '/graph');

// QR
export const getQR = (base_url) =>
  request('GET', `/qr${base_url ? `?base_url=${encodeURIComponent(base_url)}` : ''}`);
