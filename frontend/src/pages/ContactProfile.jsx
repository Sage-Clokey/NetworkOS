import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getContact, updateContact, deleteContact, addNote, getTags, createTag } from '../services/api';
import TagBadge from '../components/TagBadge';
import FollowUpBadge from '../components/FollowUpBadge';
import VoiceRecorder from '../components/VoiceRecorder';

export default function ContactProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [contact, setContact] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [allTags, setAllTags] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [newTag, setNewTag] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [c, t] = await Promise.all([getContact(id), getTags()]);
      setContact(c);
      setForm({
        name: c.name,
        organization: c.organization || '',
        role: c.role || '',
        email: c.email || '',
        phone: c.phone || '',
        linkedin: c.linkedin || '',
        website: c.website || '',
        where_met: c.where_met || '',
        date_met: c.date_met || '',
        follow_up_date: c.follow_up_date || '',
        notes: c.notes || '',
        tag_ids: c.tags.map(t => t.id),
      });
      setAllTags(t);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const toggleTag = (tid) => {
    setForm(f => ({
      ...f,
      tag_ids: f.tag_ids.includes(tid) ? f.tag_ids.filter(i => i !== tid) : [...f.tag_ids, tid],
    }));
  };

  const handleAddTag = async () => {
    const n = newTag.trim();
    if (!n) return;
    const tag = await createTag(n);
    setAllTags(prev => prev.find(t => t.id === tag.id) ? prev : [...prev, tag]);
    setForm(f => ({ ...f, tag_ids: f.tag_ids.includes(tag.id) ? f.tag_ids : [...f.tag_ids, tag.id] }));
    setNewTag('');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateContact(id, {
        ...form,
        event_id: contact.event_id,
        tag_ids: form.tag_ids,
      });
      await load();
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete ${contact.name}?`)) return;
    await deleteContact(id);
    navigate('/');
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    await addNote(id, newNote.trim());
    setNewNote('');
    load();
  };

  const handleVoiceNote = async (transcription) => {
    await addNote(id, `[Voice] ${transcription}`);
    load();
  };

  if (loading) return <div className="text-center py-20 text-gray-400">Loading...</div>;
  if (!contact) return <div className="text-center py-20 text-red-500">Contact not found</div>;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <button onClick={() => navigate(-1)} className="text-sm text-gray-500 hover:text-gray-700 mb-2 block">
            ← Back
          </button>
          {editing ? (
            <input className="input text-2xl font-bold mb-1" value={form.name} onChange={set('name')} />
          ) : (
            <h1 className="text-3xl font-bold">{contact.name}</h1>
          )}
          <p className="text-gray-500">{contact.organization}{contact.role ? ` · ${contact.role}` : ''}</p>
          <div className="mt-2">
            <FollowUpBadge date={contact.follow_up_date} />
          </div>
        </div>
        <div className="flex gap-2 mt-6">
          {editing ? (
            <>
              <button onClick={handleSave} disabled={saving} className="btn-primary btn-sm">
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button onClick={() => setEditing(false)} className="btn-secondary btn-sm">Cancel</button>
            </>
          ) : (
            <>
              <button onClick={() => setEditing(true)} className="btn-secondary btn-sm">Edit</button>
              <button onClick={handleDelete} className="btn-danger btn-sm">Delete</button>
            </>
          )}
        </div>
      </div>

      {/* Details */}
      <div className="card mb-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Contact Info</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { label: 'Email', field: 'email', type: 'email' },
            { label: 'Phone', field: 'phone', type: 'tel' },
            { label: 'LinkedIn', field: 'linkedin', type: 'url' },
            { label: 'Website', field: 'website', type: 'url' },
            { label: 'Organization', field: 'organization', type: 'text' },
            { label: 'Role', field: 'role', type: 'text' },
            { label: 'Date Met', field: 'date_met', type: 'date' },
            { label: 'Follow-up Date', field: 'follow_up_date', type: 'date' },
          ].map(({ label, field, type }) => (
            <div key={field}>
              <p className="text-xs text-gray-400 mb-0.5">{label}</p>
              {editing ? (
                <input className="input text-sm" type={type} value={form[field] || ''} onChange={set(field)} />
              ) : (
                <p className="text-sm text-gray-800">
                  {contact[field] ? (
                    (field === 'email' || field === 'linkedin' || field === 'website') ? (
                      <a
                        href={field === 'email' ? `mailto:${contact[field]}` : contact[field]}
                        className="text-blue-600 hover:underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {contact[field]}
                      </a>
                    ) : contact[field]
                  ) : <span className="text-gray-400">—</span>}
                </p>
              )}
            </div>
          ))}
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Where Met</p>
            <p className="text-sm text-gray-800">{contact.event_name || contact.where_met || <span className="text-gray-400">—</span>}</p>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="card mb-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Quick Notes</h2>
        {editing ? (
          <textarea
            className="input"
            rows={3}
            value={form.notes}
            onChange={set('notes')}
            placeholder="Key notes about this person..."
          />
        ) : (
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{contact.notes || <span className="text-gray-400">No notes</span>}</p>
        )}
      </div>

      {/* Tags */}
      <div className="card mb-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Tags</h2>
        {editing ? (
          <>
            <div className="flex flex-wrap gap-2 mb-2">
              {allTags.map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => toggleTag(t.id)}
                  className={`badge cursor-pointer transition-all ${
                    form.tag_ids.includes(t.id)
                      ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {t.name}
                </button>
              ))}
            </div>
            <div className="flex gap-2 mt-2">
              <input
                className="input flex-1"
                placeholder="New tag..."
                value={newTag}
                onChange={e => setNewTag(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
              />
              <button type="button" onClick={handleAddTag} className="btn-secondary btn-sm">Add</button>
            </div>
          </>
        ) : (
          <div className="flex flex-wrap gap-2">
            {contact.tags.length > 0
              ? contact.tags.map(t => <TagBadge key={t.id} name={t.name} />)
              : <span className="text-sm text-gray-400">No tags</span>}
          </div>
        )}
      </div>

      {/* Note history */}
      <div className="card mb-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Note History</h2>
        <div className="space-y-3 mb-4">
          {contact.note_list.length === 0
            ? <p className="text-sm text-gray-400">No notes yet</p>
            : contact.note_list.map(n => (
                <div key={n.id} className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">{n.content}</p>
                  <p className="text-xs text-gray-400 mt-1">{new Date(n.created_at).toLocaleString()}</p>
                </div>
              ))
          }
        </div>
        <form onSubmit={handleAddNote} className="flex gap-2">
          <input
            className="input flex-1"
            placeholder="Add a note..."
            value={newNote}
            onChange={e => setNewNote(e.target.value)}
          />
          <button type="submit" className="btn-primary btn-sm">Add</button>
        </form>
      </div>

      {/* Voice note */}
      <div className="card mb-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Voice Note</h2>
        <VoiceRecorder onTranscription={handleVoiceNote} />
      </div>
    </div>
  );
}
