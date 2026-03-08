import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { scanText } from '../services/api';
import VoiceRecorder from '../components/VoiceRecorder';

export default function Scanner() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('ocr'); // 'ocr' | 'voice'
  const [imageData, setImageData] = useState(null);
  const [ocrText, setOcrText] = useState('');
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const fileRef = useRef();
  const videoRef = useRef();
  const [streaming, setStreaming] = useState(false);
  const [stream, setStream] = useState(null);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setImageData(ev.target.result);
    reader.readAsDataURL(file);
  };

  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setStream(s);
      setStreaming(true);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        videoRef.current.play();
      }
    } catch (err) {
      setError('Camera access denied: ' + err.message);
    }
  };

  const capture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
    setImageData(canvas.toDataURL('image/jpeg'));
    stream.getTracks().forEach(t => t.stop());
    setStreaming(false);
  };

  const runOCR = async () => {
    if (!imageData && !ocrText) { setError('Provide an image or paste text'); return; }
    setScanning(true);
    setError('');
    setResult(null);
    try {
      let text = ocrText;
      if (imageData && !ocrText) {
        // Run Tesseract in browser
        const { createWorker } = await import('tesseract.js');
        const worker = await createWorker('eng');
        const { data: { text: t } } = await worker.recognize(imageData);
        await worker.terminate();
        text = t;
        setOcrText(text);
      }
      const parsed = await scanText(text);
      setResult(parsed);
    } catch (err) {
      setError('OCR failed: ' + err.message);
    } finally {
      setScanning(false);
    }
  };

  const handleUseContact = () => {
    navigate('/add', {
      state: {
        name: result.name || '',
        organization: result.organization || '',
        role: result.role || '',
        email: result.email || '',
        phone: result.phone || '',
        linkedin: result.linkedin || '',
      }
    });
  };

  const handleVoiceTranscription = (transcription) => {
    navigate('/add', { state: { notes: transcription } });
  };

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Scanner</h1>
      <p className="text-sm text-gray-500 mb-5">Scan a business card or badge to auto-fill contact info.</p>

      {/* Tab switcher */}
      <div className="flex gap-2 mb-5">
        <button
          onClick={() => setTab('ocr')}
          className={`btn-sm flex-1 ${tab === 'ocr' ? 'btn-primary' : 'btn-secondary'}`}
        >
          Camera / OCR
        </button>
        <button
          onClick={() => setTab('voice')}
          className={`btn-sm flex-1 ${tab === 'voice' ? 'btn-primary' : 'btn-secondary'}`}
        >
          Voice Note
        </button>
      </div>

      {tab === 'ocr' ? (
        <div className="card space-y-4">
          {/* Camera stream */}
          {streaming && (
            <div className="space-y-2">
              <video ref={videoRef} className="w-full rounded-lg" autoPlay playsInline muted />
              <button onClick={capture} className="btn-primary w-full">Capture Photo</button>
            </div>
          )}

          {/* Image preview */}
          {imageData && (
            <img src={imageData} alt="Captured" className="w-full rounded-lg border border-gray-200 max-h-64 object-contain" />
          )}

          {/* Controls */}
          {!streaming && (
            <div className="flex gap-2">
              <button onClick={startCamera} className="btn-secondary btn-sm flex-1">Use Camera</button>
              <button onClick={() => fileRef.current.click()} className="btn-secondary btn-sm flex-1">Upload Image</button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
            </div>
          )}

          <div>
            <label className="label">Or paste text manually</label>
            <textarea
              className="input"
              rows={4}
              placeholder="Paste business card text here..."
              value={ocrText}
              onChange={e => setOcrText(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            onClick={runOCR}
            disabled={scanning}
            className="btn-primary w-full"
          >
            {scanning ? 'Scanning...' : 'Extract Contact Info'}
          </button>

          {result && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
              <h3 className="font-semibold text-blue-800 text-sm">Extracted Info</h3>
              {[
                { label: 'Name', val: result.name },
                { label: 'Organization', val: result.organization },
                { label: 'Role', val: result.role },
                { label: 'Email', val: result.email },
                { label: 'Phone', val: result.phone },
                { label: 'LinkedIn', val: result.linkedin },
              ].map(({ label, val }) => val && (
                <div key={label} className="flex gap-2 text-sm">
                  <span className="text-blue-600 font-medium w-28">{label}:</span>
                  <span className="text-blue-900">{val}</span>
                </div>
              ))}
              <button onClick={handleUseContact} className="btn-primary w-full mt-3">
                Use This Contact
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="card">
          <p className="text-sm text-gray-600 mb-4">
            Record a voice memo describing who you met. The transcription will be saved as a note on the new contact.
          </p>
          <VoiceRecorder onTranscription={handleVoiceTranscription} />
        </div>
      )}
    </div>
  );
}
