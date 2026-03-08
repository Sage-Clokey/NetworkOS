import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createContact, getEvents, getTags, createTag } from '../services/api';
import TagBadge from '../components/TagBadge';
import { todayISO } from '../utils/dates';

export default function AddContact() {
  const navigate = useNavigate();
  const location = useLocation();
  const prefill = location.state || {};

  const [form, setForm] = useState({
    name: prefill.name || '',
    organization: prefill.organization || '',
    role: prefill.role || '',
    email: prefill.email || '',
    phone: prefill.phone || '',
    linkedin: prefill.linkedin || '',
    website: '',
    event_id: '',
    where_met: '',
    date_met: todayISO(),
    follow_up_date: '',
    notes: '',
  });
  const [events, setEvents] = useState([]);
  const [tags, setTags] = useState([]);
  const [selectedTagIds, setSelectedTagIds] = useState([]);
  const [newTag, setNewTag] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([getEvents(), getTags()]).then(([e, t]) => {
      setEvents(e);
      setTags(t);
    });
  }, []);

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const toggleTag = (id) => {
    setSelectedTagIds(ids => ids.includes(id) ? ids.filter(i => i !== id) : [...ids, id]);
  };

  const handleAddTag = async () => {
    const n = newTag.trim();
    if (!n) return;
    try {
      const tag = await createTag(n);
      setTags(prev => prev.find(t => t.id === tag.id) ? prev : [...prev, tag]);
      setSelectedTagIds(ids => ids.includes(tag.id) ? ids : [...ids, tag.id]);
      setNewTag('');
    } catch {}
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Name is required'); return; }
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...form,
        event_id: form.event_id ? Number(form.event_id) : null,
        tag_ids: selectedTagIds,
      };
      await createContact(payload);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">Add Contact</h1>
      <p className="text-sm text-gray-500 mb-5">Fill in what you know — every field is optional except name.</p>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2 mb-4 text-sm">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Core quick-capture fields */}
        <div className="card space-y-3">
          <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Essential</h2>
          <div>
            <label className="label">Name *</label>
            <input className="input text-lg" placeholder="Full name" value={form.name} onChange={set('name')} autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Organization</label>
              <input className="input" placeholder="Company / Lab" value={form.organization} onChange={set('organization')} />
            </div>
            <div>
              <label className="label">Role</label>
              <input className="input" placeholder="CEO / Researcher" value={form.role} onChange={set('role')} />
            </div>
          </div>
          <div>
            <label className="label">Where Met</label>
            <select className="input" value={form.event_id} onChange={set('event_id')}>
              <option value="">Select event...</option>
              {events.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea
              className="input"
              rows={3}
              placeholder="What did you talk about? Key takeaways..."
              value={form.notes}
              onChange={set('notes')}
            />
          </div>
        </div>

        {/* Tags */}
        <div className="card space-y-3">
          <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Tags</h2>
          <div className="flex flex-wrap gap-2">
            {tags.map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => toggleTag(t.id)}
                className={`badge cursor-pointer transition-all ${
                  selectedTagIds.includes(t.id)
                    ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {t.name}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              className="input flex-1"
              placeholder="New tag name..."
              value={newTag}
              onChange={e => setNewTag(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
            />
            <button type="button" onClick={handleAddTag} className="btn-secondary btn-sm">Add</button>
          </div>
        </div>

        {/* Contact details */}
        <div className="card space-y-3">
          <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Contact Details</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" placeholder="email@example.com" value={form.email} onChange={set('email')} />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input" type="tel" placeholder="+1 555..." value={form.phone} onChange={set('phone')} />
            </div>
          </div>
          <div>
            <label className="label">LinkedIn</label>
            <input className="input" placeholder="linkedin.com/in/..." value={form.linkedin} onChange={set('linkedin')} />
          </div>
          <div>
            <label className="label">Website</label>
            <input className="input" placeholder="https://..." value={form.website} onChange={set('website')} />
          </div>
        </div>

        {/* Scheduling */}
        <div className="card space-y-3">
          <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Scheduling</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Date Met</label>
              <input className="input" type="date" value={form.date_met} onChange={set('date_met')} />
            </div>
            <div>
              <label className="label">Follow-up Date</label>
              <input className="input" type="date" value={form.follow_up_date} onChange={set('follow_up_date')} />
            </div>
          </div>
        </div>

        <div className="flex gap-3 pb-4">
          <button type="submit" disabled={saving} className="btn-primary flex-1 text-base py-3">
            {saving ? 'Saving...' : 'Save Contact'}
          </button>
          <button type="button" onClick={() => navigate('/')} className="btn-secondary px-6">Cancel</button>
        </div>
      </form>
    </div>
  );
}
