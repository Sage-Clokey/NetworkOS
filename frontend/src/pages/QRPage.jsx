import { useState, useEffect } from 'react';
import { getQR } from '../services/api';

export default function QRPage() {
  const [qrData, setQrData] = useState(null);
  const [baseUrl, setBaseUrl] = useState(window.location.origin);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getQR(baseUrl);
      setQrData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="max-w-md mx-auto text-center">
      <h1 className="text-2xl font-bold mb-2">My QR Code</h1>
      <p className="text-gray-500 text-sm mb-6">
        Share this QR code at events. Visitors scan it to submit their contact info directly.
      </p>

      <div className="card mb-4">
        <div className="flex gap-2 mb-4">
          <input
            className="input flex-1 text-sm"
            value={baseUrl}
            onChange={e => setBaseUrl(e.target.value)}
            placeholder="https://yourapp.com"
          />
          <button onClick={load} className="btn-secondary btn-sm">Regenerate</button>
        </div>

        {loading && <div className="py-16 text-gray-400">Generating QR code...</div>}
        {error && <div className="py-8 text-red-500 text-sm">{error}</div>}
        {qrData && (
          <div>
            <img
              src={qrData.qr_code}
              alt="QR Code"
              className="mx-auto max-w-xs w-full rounded-xl border border-gray-100"
            />
            <p className="text-sm text-gray-500 mt-3 font-mono break-all">{qrData.url}</p>
          </div>
        )}
      </div>

      {qrData && (
        <div className="space-y-2">
          <a
            href={qrData.qr_code}
            download="networkos-qr.png"
            className="btn-primary w-full block"
          >
            Download QR Code
          </a>
          <a
            href={qrData.url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary w-full block"
          >
            Open Connect Form
          </a>
        </div>
      )}
    </div>
  );
}
