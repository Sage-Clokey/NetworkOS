import { useState, useRef } from 'react';

export default function VoiceRecorder({ onTranscription }) {
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');
  const recognitionRef = useRef(null);

  const supported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;

  const startRecording = () => {
    setError('');
    setTranscript('');
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let full = '';
      for (let i = 0; i < event.results.length; i++) {
        full += event.results[i][0].transcript;
      }
      setTranscript(full);
    };

    recognition.onerror = (event) => {
      setError(`Speech recognition error: ${event.error}`);
      setRecording(false);
    };

    recognition.onend = () => {
      setRecording(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setRecording(true);
  };

  const stopRecording = () => {
    if (recognitionRef.current) recognitionRef.current.stop();
    setRecording(false);
  };

  const handleSave = () => {
    if (transcript.trim() && onTranscription) {
      onTranscription(transcript.trim());
      setTranscript('');
    }
  };

  if (!supported) {
    return (
      <p className="text-sm text-gray-400">
        Voice notes require a browser that supports the Web Speech API (Chrome recommended).
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {recording ? (
          <button onClick={stopRecording} className="btn-danger btn-sm flex items-center gap-2">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
            Stop Recording
          </button>
        ) : (
          <button onClick={startRecording} className="btn-primary btn-sm">
            Start Recording
          </button>
        )}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      {transcript && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
          <p className="text-sm text-gray-700 italic">"{transcript}"</p>
          <button onClick={handleSave} className="btn-primary btn-sm mt-2">Save as Note</button>
        </div>
      )}
    </div>
  );
}
