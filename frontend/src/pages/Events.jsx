import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getEvents, createEvent, deleteEvent } from '../services/api';

export default function Events() {
  const [events, setEvents] = useState([]);
  const [form, setForm] = useState({ name: '', location: '', date: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    const e = await getEvents();
    setEvents(e);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Event name required'); return; }
    setSaving(true);
    setError('');
    try {
      await createEvent(form);
      setForm({ name: '', location: '', date: '' });
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete event "${name}"? Contacts from this event will remain.`)) return;
    await deleteEvent(id);
    load();
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Events</h1>

      {/* Create form */}
      <div className="card mb-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Create Event</h2>
        {error && <div className="text-red-600 text-sm mb-3">{error}</div>}
        <form onSubmit={handleCreate} className="space-y-3">
          <div>
            <label className="label">Event Name</label>
            <input
              className="input"
              placeholder="SynBioBeta 2026"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Location</label>
              <input
                className="input"
                placeholder="San Francisco, CA"
                value={form.location}
                onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Date</label>
              <input
                className="input"
                type="date"
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              />
            </div>
          </div>
          <button type="submit" disabled={saving} className="btn-primary w-full">
            {saving ? 'Creating...' : 'Create Event'}
          </button>
        </form>
      </div>

      {/* Events list */}
      <div className="space-y-3">
        {events.length === 0 ? (
          <div className="card text-center py-10 text-gray-400">No events yet. Create your first event above.</div>
        ) : events.map(ev => (
          <div key={ev.id} className="card flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-900">{ev.name}</p>
              <p className="text-sm text-gray-500">
                {[ev.location, ev.date].filter(Boolean).join(' · ')}
              </p>
            </div>
            <div className="flex gap-2">
              <Link
                to={`/?event_id=${ev.id}`}
                className="btn-secondary btn-sm"
              >
                View Contacts
              </Link>
              <button onClick={() => handleDelete(ev.id, ev.name)} className="btn-danger btn-sm">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
