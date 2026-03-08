import { useState } from 'react';
import { submitPublicContact } from '../services/api';

export default function PublicConnect() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', linkedin: '', what_working_on: '' });
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Name is required'); return; }
    setSaving(true);
    setError('');
    try {
      await submitPublicContact(form);
      setSubmitted(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-50">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">✓</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Thanks for connecting!</h1>
          <p className="text-gray-500">Your info has been saved. We'll be in touch!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-blue-50 p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Let's Connect!</h1>
        <p className="text-gray-500 text-sm mb-6">Leave your info and I'll follow up.</p>

        {error && <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg px-4 py-2 mb-4 text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Your Name *</label>
            <input className="input" placeholder="Full name" value={form.name} onChange={set('name')} autoFocus />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" placeholder="you@example.com" value={form.email} onChange={set('email')} />
          </div>
          <div>
            <label className="label">Phone</label>
            <input className="input" type="tel" placeholder="+1 555 0000" value={form.phone} onChange={set('phone')} />
          </div>
          <div>
            <label className="label">LinkedIn</label>
            <input className="input" placeholder="linkedin.com/in/yourprofile" value={form.linkedin} onChange={set('linkedin')} />
          </div>
          <div>
            <label className="label">What are you working on?</label>
            <textarea
              className="input"
              rows={3}
              placeholder="Tell me about your project..."
              value={form.what_working_on}
              onChange={set('what_working_on')}
            />
          </div>
          <button type="submit" disabled={saving} className="btn-primary w-full py-3 text-base">
            {saving ? 'Sending...' : 'Connect'}
          </button>
        </form>
      </div>
    </div>
  );
}
