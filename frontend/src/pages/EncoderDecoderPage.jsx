import React, { useState, useCallback, useRef } from 'react';
import {
  Code2,
  Lock,
  Unlock,
  Key,
  Hash,
  QrCode,
  Link2,
  ShieldCheck,
  Copy,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Upload,
  Download,
  Fingerprint,
  Zap,
  Eye,
  EyeOff,
  FileText,
  Shuffle,
} from 'lucide-react';
import {
  base64Encode,
  base64Decode,
  fileToBase64,
  aesEncrypt,
  aesDecrypt,
  sha256Hash,
  sha256HashFile,
  generateQRCode,
  hmacSha256,
  urlEncode,
  urlDecode,
} from '../services/cryptoService';

// ─── Tab definitions ──────────────────────────────────────────────────────────
const TABS = [
  { id: 'base64',  label: 'Base64',       icon: Code2,       color: '#38bdf8' },
  { id: 'aes',     label: 'AES Encrypt',  icon: Lock,        color: '#a78bfa' },
  { id: 'sha256',  label: 'SHA-256 Hash', icon: Hash,        color: '#34d399' },
  { id: 'qr',      label: 'QR Code',      icon: QrCode,      color: '#fb923c' },
  { id: 'hmac',    label: 'HMAC Sign',    icon: Fingerprint, color: '#f472b6' },
  { id: 'url',     label: 'URL Encode',   icon: Link2,       color: '#facc15' },
];

// ─── Utility ──────────────────────────────────────────────────────────────────
const useCopy = () => {
  const [copied, setCopied] = useState(null);
  const copy = useCallback((text, id) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(null), 1800);
    });
  }, []);
  return { copied, copy };
};

// ─── Reusable Sub-Components ──────────────────────────────────────────────────

const OutputBox = ({ label, value, copyId, copied, onCopy, mono = true }) => (
  <div className="output-block">
    <div className="output-label-row">
      <span className="output-label">{label}</span>
      {value && (
        <button className="copy-btn" onClick={() => onCopy(value, copyId)}>
          {copied === copyId ? <CheckCircle2 size={14} /> : <Copy size={14} />}
          {copied === copyId ? 'Copied!' : 'Copy'}
        </button>
      )}
    </div>
    <div className={`output-value ${mono ? 'mono' : ''}`}>
      {value || <span className="output-placeholder">Output will appear here...</span>}
    </div>
  </div>
);

const ErrorBox = ({ message }) => (
  <div className="enc-error">
    <AlertTriangle size={16} />
    <span>{message}</span>
  </div>
);

const ActionButtons = ({ onProcess, onReset, processing, label, icon: Icon }) => (
  <div className="action-row">
    <button className="btn btn-primary" onClick={onProcess} disabled={processing}>
      <Icon size={17} />
      {processing ? 'Processing...' : label}
    </button>
    <button className="btn btn-secondary" onClick={onReset}>
      <RotateCcw size={15} /> Reset
    </button>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// TAB: BASE64
// ─────────────────────────────────────────────────────────────────────────────
const Base64Tab = () => {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [mode, setMode] = useState('encode');
  const [processing, setProcessing] = useState(false);
  const [file, setFile] = useState(null);
  const { copied, copy } = useCopy();
  const fileRef = useRef(null);

  const reset = () => { setInput(''); setOutput(''); setError(''); setFile(null); };

  const process = async () => {
    setError(''); setOutput(''); setProcessing(true);
    try {
      if (mode === 'file') {
        if (!file) throw new Error('Please select a file to encode.');
        const dataUrl = await fileToBase64(file);
        setOutput(dataUrl);
      } else if (mode === 'encode') {
        setOutput(base64Encode(input));
      } else {
        setOutput(base64Decode(input));
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="tab-content">
      <div className="tab-header">
        <Code2 size={22} className="tab-icon" style={{ color: '#38bdf8' }} />
        <div>
          <h2 className="tab-title">Base64 Encoder / Decoder</h2>
          <p className="tab-desc">Convert text or files to/from Base64 encoding for safe data transport.</p>
        </div>
      </div>

      <div className="mode-toggle">
        {['encode', 'decode', 'file'].map((m) => (
          <button key={m} className={`mode-btn ${mode === m ? 'active' : ''}`} onClick={() => { setMode(m); reset(); }}>
            {m === 'encode' ? <><Code2 size={14} /> Encode Text</> :
             m === 'decode' ? <><Unlock size={14} /> Decode Text</> :
             <><Upload size={14} /> Encode File</>}
          </button>
        ))}
      </div>

      {mode !== 'file' ? (
        <textarea
          className="enc-textarea"
          placeholder={mode === 'encode' ? 'Enter text to encode to Base64...' : 'Paste Base64 string to decode...'}
          value={input}
          onChange={e => setInput(e.target.value)}
          rows={6}
        />
      ) : (
        <div className="file-drop-zone" onClick={() => fileRef.current?.click()}>
          <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={e => setFile(e.target.files[0])} />
          <Upload size={28} className="file-drop-icon" />
          <span>{file ? file.name : 'Click to select a file to encode as Base64'}</span>
          {file && <span className="file-size-hint">({(file.size / 1024).toFixed(1)} KB)</span>}
        </div>
      )}

      {error && <ErrorBox message={error} />}
      <ActionButtons onProcess={process} onReset={reset} processing={processing}
        label={mode === 'file' || mode === 'encode' ? 'Encode to Base64' : 'Decode from Base64'}
        icon={mode === 'decode' ? Unlock : Code2}
      />
      <OutputBox label={mode === 'decode' ? 'Decoded Text' : 'Base64 Output'} value={output} copyId="b64" copied={copied} onCopy={copy} />

      <div className="info-pills">
        <span className="pill">Safe URL transport</span>
        <span className="pill">Binary-to-text</span>
        <span className="pill">RFC 4648 standard</span>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// TAB: AES ENCRYPTION  (text + image/file support)
// ─────────────────────────────────────────────────────────────────────────────
const AESTab = () => {
  // shared
  const [passphrase, setPassphrase]   = useState('');
  const [output, setOutput]           = useState('');
  const [error, setError]             = useState('');
  const [mode, setMode]               = useState('encrypt');       // 'encrypt' | 'decrypt'
  const [inputMode, setInputMode]     = useState('text');          // 'text' | 'file'
  const [showPass, setShowPass]       = useState(false);
  const [processing, setProcessing]   = useState(false);

  // text-mode
  const [plaintext, setPlaintext]     = useState('');
  const [ciphertext, setCiphertext]   = useState('');

  // file-mode
  const [file, setFile]               = useState(null);
  const [filePreview, setFilePreview] = useState('');  // data-URL for image preview
  const [fileB64, setFileB64]         = useState('');  // raw base64 data URL of file

  // decrypt output — if it's an image data URL we can display it
  const [decryptedDataUrl, setDecryptedDataUrl] = useState('');

  const { copied, copy } = useCopy();
  const fileRef = useRef(null);

  const reset = () => {
    setPlaintext(''); setCiphertext(''); setPassphrase('');
    setOutput(''); setError('');
    setFile(null); setFilePreview(''); setFileB64('');
    setDecryptedDataUrl('');
  };

  // When a file is picked, read it into base64 and generate a preview
  const handleFileChange = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setOutput(''); setError(''); setDecryptedDataUrl('');
    try {
      const dataUrl = await fileToBase64(f);
      setFileB64(dataUrl);
      if (f.type.startsWith('image/')) setFilePreview(dataUrl);
      else setFilePreview('');
    } catch {
      setError('Failed to read file.');
    }
  };

  const process = async () => {
    setError(''); setOutput(''); setDecryptedDataUrl(''); setProcessing(true);
    try {
      if (mode === 'encrypt') {
        if (inputMode === 'file') {
          if (!fileB64) throw new Error('Please select a file to encrypt.');
          setOutput(aesEncrypt(fileB64, passphrase));
        } else {
          setOutput(aesEncrypt(plaintext, passphrase));
        }
      } else {
        // decrypt
        const decrypted = aesDecrypt(ciphertext, passphrase);
        setOutput(decrypted);
        // if decrypted looks like a data URL (Base64-encoded image/file)
        if (decrypted.startsWith('data:')) setDecryptedDataUrl(decrypted);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setProcessing(false);
    }
  };

  const downloadDecrypted = () => {
    if (!decryptedDataUrl) return;
    const a = document.createElement('a');
    a.href = decryptedDataUrl;
    // Try to get extension from the mime type (e.g. data:image/png;base64,...)
    const mimeMatch = decryptedDataUrl.match(/^data:([^;]+);/);
    const ext = mimeMatch ? mimeMatch[1].split('/')[1] : 'bin';
    a.download = `decrypted_image.${ext}`;
    a.click();
  };

  const isImage = (f) => f && f.type.startsWith('image/');

  return (
    <div className="tab-content">
      <div className="tab-header">
        <Lock size={22} className="tab-icon" style={{ color: '#a78bfa' }} />
        <div>
          <h2 className="tab-title">AES-256 Encryption / Decryption</h2>
          <p className="tab-desc">
            Military-grade symmetric encryption — encrypt <strong>text</strong> or any <strong>image / file</strong> with a secret passphrase.
          </p>
        </div>
      </div>

      {/* Encrypt / Decrypt toggle */}
      <div className="mode-toggle">
        {['encrypt', 'decrypt'].map((m) => (
          <button key={m} className={`mode-btn ${mode === m ? 'active' : ''}`} onClick={() => { setMode(m); reset(); }}>
            {m === 'encrypt' ? <><Lock size={14} /> Encrypt</> : <><Unlock size={14} /> Decrypt</>}
          </button>
        ))}
      </div>

      {/* Input mode: text or file (only for encrypt) */}
      {mode === 'encrypt' && (
        <div className="mode-toggle" style={{ marginTop: '-8px' }}>
          {['text', 'file'].map((m) => (
            <button key={m} className={`mode-btn ${inputMode === m ? 'active' : ''}`}
              onClick={() => { setInputMode(m); reset(); }}
              style={{ fontSize: '0.8rem', padding: '6px 13px' }}
            >
              {m === 'text' ? <><FileText size={13} /> Text Input</> : <><Upload size={13} /> Image / File</>}
            </button>
          ))}
        </div>
      )}

      {/* ── Encrypt text ── */}
      {mode === 'encrypt' && inputMode === 'text' && (
        <textarea
          className="enc-textarea"
          placeholder="Enter plaintext to encrypt..."
          value={plaintext}
          onChange={e => setPlaintext(e.target.value)}
          rows={5}
        />
      )}

      {/* ── Encrypt file ── */}
      {mode === 'encrypt' && inputMode === 'file' && (
        <div className="aes-file-section">
          <div className="file-drop-zone" onClick={() => fileRef.current?.click()}>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,.pdf,.txt,.doc,.docx"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
            <Upload size={28} className="file-drop-icon" />
            <span>{file ? file.name : 'Click to select an image or file to AES-encrypt'}</span>
            {file && (
              <span className="file-size-hint">
                {file.type} &nbsp;•&nbsp; {(file.size / 1024).toFixed(1)} KB
              </span>
            )}
          </div>

          {/* Image preview */}
          {filePreview && (
            <div className="aes-img-preview-box">
              <div className="aes-img-preview-label">
                <Eye size={13} /> Original Image Preview
              </div>
              <img src={filePreview} alt="Selected file preview" className="aes-img-preview" />
              <div className="aes-img-badge">
                <ShieldCheck size={12} /> Ready to encrypt
              </div>
            </div>
          )}

          {/* Non-image file indicator */}
          {file && !isImage(file) && (
            <div className="aes-file-badge">
              <FileText size={14} />
              <span>{file.name} selected — will be Base64-encoded then AES-256 encrypted.</span>
            </div>
          )}
        </div>
      )}

      {/* ── Decrypt ciphertext ── */}
      {mode === 'decrypt' && (
        <textarea
          className="enc-textarea"
          placeholder="Paste AES ciphertext here to decrypt..."
          value={ciphertext}
          onChange={e => setCiphertext(e.target.value)}
          rows={5}
        />
      )}

      {/* Passphrase */}
      <div className="passphrase-row">
        <Key size={16} className="pass-icon" />
        <input
          className="enc-input passphrase-input"
          type={showPass ? 'text' : 'password'}
          placeholder="Enter secret passphrase (keep this safe!)"
          value={passphrase}
          onChange={e => setPassphrase(e.target.value)}
        />
        <button className="show-pass-btn" onClick={() => setShowPass(p => !p)}>
          {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>

      <div className="aes-warning">
        <ShieldCheck size={14} />
        <span>All encryption runs entirely in your browser — passphrase &amp; file data never leave your device.</span>
      </div>

      {error && <ErrorBox message={error} />}

      <ActionButtons
        onProcess={process}
        onReset={reset}
        processing={processing}
        label={mode === 'encrypt'
          ? (inputMode === 'file' ? 'Encrypt Image / File' : 'Encrypt Text')
          : 'Decrypt Ciphertext'}
        icon={mode === 'encrypt' ? Lock : Unlock}
      />

      {/* Ciphertext output */}
      {output && mode === 'encrypt' && (
        <OutputBox
          label="AES-256 Ciphertext (save this + your passphrase!)"
          value={output}
          copyId="aes"
          copied={copied}
          onCopy={copy}
        />
      )}

      {/* Decrypted text output (non-image) */}
      {output && mode === 'decrypt' && !decryptedDataUrl && (
        <OutputBox label="Decrypted Plaintext" value={output} copyId="aes" copied={copied} onCopy={copy} />
      )}

      {/* Decrypted image output */}
      {decryptedDataUrl && (
        <div className="aes-decrypted-image-box">
          <div className="aes-decrypted-label">
            <CheckCircle2 size={14} className="aes-dec-icon" />
            Decryption Successful — Recovered Image
          </div>
          {decryptedDataUrl.startsWith('data:image') ? (
            <img src={decryptedDataUrl} alt="Decrypted" className="aes-decrypted-img" />
          ) : (
            <div className="aes-file-badge" style={{ marginTop: '12px' }}>
              <FileText size={14} />
              <span>Non-image file decrypted successfully.</span>
            </div>
          )}
          <button className="btn btn-success aes-dl-btn" onClick={downloadDecrypted}>
            <Download size={16} /> Download Decrypted File
          </button>
        </div>
      )}

      <div className="info-pills">
        <span className="pill">AES-256 CBC</span>
        <span className="pill">Image support</span>
        <span className="pill">Client-side only</span>
        <span className="pill">Zero-knowledge</span>
      </div>

      <style>{`
        .aes-file-section { display: flex; flex-direction: column; gap: 14px; }

        .aes-img-preview-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          padding: 16px;
          background: rgba(167,139,250,0.07);
          border: 1px solid rgba(167,139,250,0.25);
          border-radius: var(--radius-sm);
        }

        .aes-img-preview-label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.75rem;
          font-weight: 700;
          color: #a78bfa;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          align-self: flex-start;
        }

        .aes-img-preview {
          max-width: 100%;
          max-height: 260px;
          object-fit: contain;
          border-radius: 8px;
          border: 1px solid rgba(167,139,250,0.3);
          box-shadow: 0 0 30px rgba(167,139,250,0.15);
        }

        .aes-img-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.75rem;
          font-weight: 600;
          color: #34d399;
          background: rgba(16,185,129,0.1);
          border: 1px solid rgba(16,185,129,0.25);
          border-radius: 6px;
          padding: 5px 12px;
        }

        .aes-file-badge {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          background: rgba(167,139,250,0.08);
          border: 1px solid rgba(167,139,250,0.2);
          border-radius: var(--radius-sm);
          color: #c4b5fd;
          font-size: 0.85rem;
        }

        .aes-decrypted-image-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 14px;
          padding: 20px;
          background: rgba(16,185,129,0.07);
          border: 1px solid rgba(16,185,129,0.3);
          border-radius: var(--radius-md);
        }

        .aes-decrypted-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.82rem;
          font-weight: 700;
          color: #34d399;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          align-self: flex-start;
        }

        .aes-dec-icon { color: #34d399; }

        .aes-decrypted-img {
          max-width: 100%;
          max-height: 320px;
          object-fit: contain;
          border-radius: 10px;
          border: 1px solid rgba(16,185,129,0.3);
          box-shadow: 0 0 40px rgba(16,185,129,0.15);
        }

        .aes-dl-btn { align-self: center; }
      `}</style>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// TAB: SHA-256
// ─────────────────────────────────────────────────────────────────────────────
const SHA256Tab = () => {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [mode, setMode] = useState('text');
  const [file, setFile] = useState(null);
  const [processing, setProcessing] = useState(false);
  const { copied, copy } = useCopy();
  const fileRef = useRef(null);

  const reset = () => { setInput(''); setOutput(''); setError(''); setFile(null); };

  const process = async () => {
    setError(''); setOutput(''); setProcessing(true);
    try {
      if (mode === 'file') {
        if (!file) throw new Error('Please select a file to hash.');
        setOutput(await sha256HashFile(file));
      } else {
        setOutput(await sha256Hash(input));
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="tab-content">
      <div className="tab-header">
        <Hash size={22} className="tab-icon" style={{ color: '#34d399' }} />
        <div>
          <h2 className="tab-title">SHA-256 Cryptographic Hasher</h2>
          <p className="tab-desc">Generate tamper-proof SHA-256 fingerprints - the same algorithm used by this verification system.</p>
        </div>
      </div>

      <div className="mode-toggle">
        {['text', 'file'].map((m) => (
          <button key={m} className={`mode-btn ${mode === m ? 'active' : ''}`} onClick={() => { setMode(m); reset(); }}>
            {m === 'text' ? <><FileText size={14} /> Hash Text</> : <><Upload size={14} /> Hash File</>}
          </button>
        ))}
      </div>

      {mode === 'text' ? (
        <textarea className="enc-textarea" placeholder="Enter any text to compute its SHA-256 fingerprint..." value={input} onChange={e => setInput(e.target.value)} rows={5} />
      ) : (
        <div className="file-drop-zone" onClick={() => fileRef.current?.click()}>
          <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={e => setFile(e.target.files[0])} />
          <Hash size={28} className="file-drop-icon" />
          <span>{file ? file.name : 'Click to select a file to compute SHA-256 hash'}</span>
          {file && <span className="file-size-hint">({(file.size / 1024).toFixed(1)} KB)</span>}
        </div>
      )}

      {error && <ErrorBox message={error} />}
      <ActionButtons onProcess={process} onReset={reset} processing={processing} label="Generate SHA-256 Hash" icon={Hash} />

      {output && (
        <div className="hash-result-box">
          <div className="hash-result-label">SHA-256 Fingerprint (256-bit / 64 hex chars)</div>
          <div className="hash-result-value">
            {output.match(/.{1,8}/g)?.map((chunk, i) => (
              <span key={i} className="hash-chunk">{chunk}</span>
            ))}
          </div>
          <button className="copy-btn hash-copy" onClick={() => copy(output, 'sha256')}>
            {copied === 'sha256' ? <CheckCircle2 size={14} /> : <Copy size={14} />}
            {copied === 'sha256' ? 'Copied!' : 'Copy full hash'}
          </button>
        </div>
      )}

      <div className="info-pills">
        <span className="pill">Web Crypto API</span>
        <span className="pill">256-bit output</span>
        <span className="pill">Tamper-proof</span>
        <span className="pill">One-way function</span>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// TAB: QR CODE
// ─────────────────────────────────────────────────────────────────────────────
const QRTab = () => {
  const [input, setInput] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);
  const [darkColor, setDarkColor] = useState('#0f172a');
  const [lightColor, setLightColor] = useState('#ffffff');
  const [size, setSize] = useState(256);

  const reset = () => { setInput(''); setQrDataUrl(''); setError(''); };

  const process = async () => {
    setError(''); setQrDataUrl(''); setProcessing(true);
    try {
      const url = await generateQRCode(input, { width: size, color: { dark: darkColor, light: lightColor } });
      setQrDataUrl(url);
    } catch (e) {
      setError(e.message);
    } finally {
      setProcessing(false);
    }
  };

  const downloadQR = () => {
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = 'marksheet-qr-code.png';
    a.click();
  };

  return (
    <div className="tab-content">
      <div className="tab-header">
        <QrCode size={22} className="tab-icon" style={{ color: '#fb923c' }} />
        <div>
          <h2 className="tab-title">QR Code Generator</h2>
          <p className="tab-desc">Encode a Verification ID, hash, or any text into a scannable QR code with custom colors.</p>
        </div>
      </div>

      <textarea
        className="enc-textarea"
        placeholder="Enter Verification ID, URL, or any text to encode as QR Code... e.g. VER-2026-000001"
        value={input}
        onChange={e => setInput(e.target.value)}
        rows={4}
      />

      <div className="qr-options">
        <div className="qr-option">
          <label>QR Size (px)</label>
          <input type="range" min={128} max={512} step={32} value={size} onChange={e => setSize(Number(e.target.value))} className="range-input" />
          <span className="range-val">{size}px</span>
        </div>
        <div className="qr-option">
          <label>Dark Color</label>
          <input type="color" value={darkColor} onChange={e => setDarkColor(e.target.value)} className="color-input" />
        </div>
        <div className="qr-option">
          <label>Light Color</label>
          <input type="color" value={lightColor} onChange={e => setLightColor(e.target.value)} className="color-input" />
        </div>
      </div>

      {error && <ErrorBox message={error} />}
      <ActionButtons onProcess={process} onReset={reset} processing={processing} label="Generate QR Code" icon={QrCode} />

      {qrDataUrl && (
        <div className="qr-output-box">
          <div className="qr-image-wrapper">
            <img src={qrDataUrl} alt="Generated QR Code" className="qr-image" />
          </div>
          <button className="btn btn-success qr-download" onClick={downloadQR}>
            <Download size={16} /> Download QR Code
          </button>
          <p className="qr-hint">Scan this QR code to retrieve the encoded verification data.</p>
        </div>
      )}

      <div className="info-pills">
        <span className="pill">Error Correction: High</span>
        <span className="pill">PNG export</span>
        <span className="pill">Custom colors</span>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// TAB: HMAC SIGNING
// ─────────────────────────────────────────────────────────────────────────────
const HMACTab = () => {
  const [message, setMessage] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [processing, setProcessing] = useState(false);
  const { copied, copy } = useCopy();

  const reset = () => { setMessage(''); setSecretKey(''); setOutput(''); setError(''); };

  const generateKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    setSecretKey(Array.from({ length: 32 }, () => chars[Math.floor(Math.random() * chars.length)]).join(''));
  };

  const process = () => {
    setError(''); setOutput(''); setProcessing(true);
    try {
      setOutput(hmacSha256(message, secretKey));
    } catch (e) {
      setError(e.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="tab-content">
      <div className="tab-header">
        <Fingerprint size={22} className="tab-icon" style={{ color: '#f472b6' }} />
        <div>
          <h2 className="tab-title">HMAC-SHA256 Message Signing</h2>
          <p className="tab-desc">Generate a cryptographic signature to verify message authenticity and integrity.</p>
        </div>
      </div>

      <textarea
        className="enc-textarea"
        placeholder="Enter the message to sign (e.g. Verification ID, metadata, payload)..."
        value={message}
        onChange={e => setMessage(e.target.value)}
        rows={4}
      />

      <div className="passphrase-row">
        <Key size={16} className="pass-icon" />
        <input
          className="enc-input passphrase-input"
          type={showKey ? 'text' : 'password'}
          placeholder="Enter HMAC secret key..."
          value={secretKey}
          onChange={e => setSecretKey(e.target.value)}
        />
        <button className="show-pass-btn" onClick={() => setShowKey(p => !p)}>
          {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
        <button className="btn btn-secondary gen-key-btn" onClick={generateKey} title="Generate random key">
          <Shuffle size={14} /> Generate
        </button>
      </div>

      {error && <ErrorBox message={error} />}
      <ActionButtons onProcess={process} onReset={reset} processing={processing} label="Generate HMAC Signature" icon={Fingerprint} />
      <OutputBox label="HMAC-SHA256 Signature (Hex)" value={output} copyId="hmac" copied={copied} onCopy={copy} />

      <div className="info-pills">
        <span className="pill">Message authentication</span>
        <span className="pill">Integrity verification</span>
        <span className="pill">256-bit signature</span>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// TAB: URL ENCODING
// ─────────────────────────────────────────────────────────────────────────────
const URLTab = () => {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [mode, setMode] = useState('encode');
  const { copied, copy } = useCopy();

  const reset = () => { setInput(''); setOutput(''); setError(''); };

  const process = () => {
    setError(''); setOutput('');
    try {
      setOutput(mode === 'encode' ? urlEncode(input) : urlDecode(input));
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="tab-content">
      <div className="tab-header">
        <Link2 size={22} className="tab-icon" style={{ color: '#facc15' }} />
        <div>
          <h2 className="tab-title">URL Encoder / Decoder</h2>
          <p className="tab-desc">Encode special characters for safe URL transmission or decode percent-encoded strings.</p>
        </div>
      </div>

      <div className="mode-toggle">
        {['encode', 'decode'].map((m) => (
          <button key={m} className={`mode-btn ${mode === m ? 'active' : ''}`} onClick={() => { setMode(m); reset(); }}>
            {m === 'encode' ? <><Link2 size={14} /> URL Encode</> : <><Unlock size={14} /> URL Decode</>}
          </button>
        ))}
      </div>

      <textarea
        className="enc-textarea"
        placeholder={mode === 'encode' ? 'Enter text or URL to encode...' : 'Paste URL-encoded string to decode...'}
        value={input}
        onChange={e => setInput(e.target.value)}
        rows={5}
      />

      {error && <ErrorBox message={error} />}
      <ActionButtons onProcess={process} onReset={reset} processing={false}
        label={mode === 'encode' ? 'URL Encode' : 'URL Decode'}
        icon={Link2}
      />
      <OutputBox label={mode === 'encode' ? 'URL Encoded Output' : 'Decoded Output'} value={output} copyId="url" copied={copied} onCopy={copy} />

      <div className="info-pills">
        <span className="pill">RFC 3986 compliant</span>
        <span className="pill">Percent-encoding</span>
        <span className="pill">Safe API parameters</span>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
const EncoderDecoderPage = () => {
  const [activeTab, setActiveTab] = useState('base64');

  const renderTab = () => {
    switch (activeTab) {
      case 'base64': return <Base64Tab />;
      case 'aes':    return <AESTab />;
      case 'sha256': return <SHA256Tab />;
      case 'qr':     return <QRTab />;
      case 'hmac':   return <HMACTab />;
      case 'url':    return <URLTab />;
      default:       return null;
    }
  };

  return (
    <div className="page-body">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <Zap className="text-primary" size={28} /> Encoding &amp; Decoding Laboratory
          </h1>
          <p className="page-subtitle">
            All-in-one cryptographic toolkit - Base64, AES-256 Encryption, SHA-256 Hashing, QR Code, HMAC Signing &amp; URL Encoding.
          </p>
        </div>
      </div>

      <div className="enc-tab-bar">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              className={`enc-tab ${activeTab === tab.id ? 'enc-tab-active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              style={activeTab === tab.id ? { '--tab-color': tab.color } : {}}
            >
              <Icon size={16} style={activeTab === tab.id ? { color: tab.color } : {}} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className="glass-card enc-panel">
        {renderTab()}
      </div>

      <style>{`
        .enc-tab-bar {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          margin-bottom: 20px;
          padding: 6px;
          background: rgba(15, 23, 42, 0.6);
          border-radius: 14px;
          border: 1px solid var(--border-color);
        }

        .enc-tab {
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 9px 16px;
          border-radius: 10px;
          background: transparent;
          border: 1px solid transparent;
          color: var(--text-muted);
          font-size: 0.88rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .enc-tab:hover { color: white; background: rgba(255,255,255,0.05); }

        .enc-tab-active {
          color: white;
          background: linear-gradient(135deg, rgba(59,130,246,0.25) 0%, rgba(37,99,235,0.15) 100%);
          border-color: var(--tab-color, rgba(59,130,246,0.5));
          box-shadow: 0 0 16px -4px var(--tab-color, rgba(59,130,246,0.3));
        }

        .enc-panel { padding: 32px; min-height: 500px; }

        .tab-content { display: flex; flex-direction: column; gap: 18px; }

        .tab-header {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          padding-bottom: 16px;
          border-bottom: 1px solid var(--border-color);
          margin-bottom: 4px;
        }

        .tab-icon { flex-shrink: 0; margin-top: 2px; }

        .tab-title {
          font-family: var(--font-heading);
          font-size: 1.25rem;
          font-weight: 700;
          color: white;
          margin-bottom: 4px;
        }

        .tab-desc { font-size: 0.87rem; color: var(--text-muted); line-height: 1.5; }

        .mode-toggle { display: flex; gap: 8px; flex-wrap: wrap; }

        .mode-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border-radius: 8px;
          border: 1px solid var(--border-color);
          background: rgba(255,255,255,0.04);
          color: var(--text-muted);
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .mode-btn:hover { color: white; background: rgba(255,255,255,0.08); }
        .mode-btn.active { color: white; background: rgba(59,130,246,0.2); border-color: rgba(59,130,246,0.5); }

        .enc-textarea {
          width: 100%;
          padding: 14px 16px;
          background: rgba(0,0,0,0.35);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          color: white;
          font-family: var(--font-mono);
          font-size: 0.88rem;
          resize: vertical;
          outline: none;
          transition: border-color 0.2s;
          box-sizing: border-box;
          line-height: 1.6;
        }

        .enc-textarea:focus { border-color: rgba(59,130,246,0.6); }
        .enc-textarea::placeholder { color: var(--text-dim); }

        .enc-input {
          flex: 1;
          padding: 10px 14px;
          background: rgba(0,0,0,0.35);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          color: white;
          font-size: 0.88rem;
          outline: none;
          transition: border-color 0.2s;
        }

        .enc-input:focus { border-color: rgba(59,130,246,0.6); }
        .enc-input::placeholder { color: var(--text-dim); }

        .passphrase-row {
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(0,0,0,0.3);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          padding: 4px 12px;
        }

        .passphrase-input { border: none !important; background: transparent !important; padding-left: 4px !important; }
        .pass-icon { color: var(--text-muted); flex-shrink: 0; }

        .show-pass-btn {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          flex-shrink: 0;
        }

        .show-pass-btn:hover { color: white; }

        .gen-key-btn { font-size: 0.78rem; padding: 6px 12px; flex-shrink: 0; }

        .aes-warning {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.8rem;
          color: #34d399;
          background: rgba(16,185,129,0.08);
          border: 1px solid rgba(16,185,129,0.2);
          border-radius: 6px;
          padding: 8px 12px;
        }

        .action-row { display: flex; gap: 10px; flex-wrap: wrap; }

        .output-block {
          background: rgba(0,0,0,0.35);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          overflow: hidden;
        }

        .output-label-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 14px;
          background: rgba(255,255,255,0.03);
          border-bottom: 1px solid var(--border-color);
        }

        .output-label {
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--text-dim);
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .copy-btn {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 4px 10px;
          background: rgba(59,130,246,0.15);
          border: 1px solid rgba(59,130,246,0.3);
          border-radius: 5px;
          color: #60a5fa;
          font-size: 0.78rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .copy-btn:hover { background: rgba(59,130,246,0.25); }

        .output-value {
          padding: 14px 16px;
          color: #a5f3fc;
          font-size: 0.88rem;
          word-break: break-all;
          line-height: 1.7;
          min-height: 64px;
        }

        .output-value.mono { font-family: var(--font-mono); }
        .output-placeholder { color: var(--text-dim); font-family: var(--font-sans); font-style: italic; }

        .enc-error {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          background: rgba(244,63,94,0.1);
          border: 1px solid rgba(244,63,94,0.3);
          border-radius: var(--radius-sm);
          color: #fda4af;
          font-size: 0.88rem;
        }

        .info-pills { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 4px; }

        .pill {
          font-size: 0.72rem;
          font-weight: 700;
          font-family: var(--font-mono);
          padding: 3px 10px;
          border-radius: 4px;
          background: rgba(255,255,255,0.06);
          color: var(--text-muted);
          border: 1px solid var(--border-color);
          letter-spacing: 0.03em;
        }

        .file-drop-zone {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 32px;
          border: 2px dashed var(--border-color);
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: center;
          color: var(--text-muted);
          font-size: 0.9rem;
        }

        .file-drop-zone:hover {
          border-color: rgba(59,130,246,0.5);
          background: rgba(59,130,246,0.05);
          color: white;
        }

        .file-drop-icon { color: var(--text-dim); }
        .file-size-hint { font-size: 0.78rem; color: var(--text-dim); }

        .hash-result-box {
          background: rgba(0,0,0,0.5);
          border: 1px solid rgba(52,211,153,0.25);
          border-radius: var(--radius-sm);
          padding: 18px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .hash-result-label {
          font-size: 0.75rem;
          font-weight: 700;
          color: #34d399;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .hash-result-value { display: flex; flex-wrap: wrap; gap: 4px; }

        .hash-chunk {
          font-family: var(--font-mono);
          font-size: 0.88rem;
          color: #a5f3fc;
          background: rgba(165,243,252,0.08);
          padding: 2px 6px;
          border-radius: 4px;
          letter-spacing: 0.08em;
        }

        .hash-copy { align-self: flex-start; }

        .qr-options {
          display: flex;
          gap: 20px;
          flex-wrap: wrap;
          align-items: center;
          padding: 14px 16px;
          background: rgba(0,0,0,0.25);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
        }

        .qr-option { display: flex; align-items: center; gap: 10px; font-size: 0.83rem; color: var(--text-muted); }
        .qr-option label { font-weight: 600; white-space: nowrap; }
        .range-input { accent-color: #fb923c; width: 100px; }
        .range-val { font-family: var(--font-mono); font-size: 0.82rem; color: #fb923c; min-width: 36px; }

        .color-input {
          width: 36px;
          height: 28px;
          border: 1px solid var(--border-color);
          border-radius: 4px;
          cursor: pointer;
          background: none;
          padding: 2px;
        }

        .qr-output-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          padding: 24px;
          background: rgba(0,0,0,0.3);
          border: 1px solid rgba(251,146,60,0.25);
          border-radius: var(--radius-md);
        }

        .qr-image-wrapper {
          background: white;
          padding: 12px;
          border-radius: 12px;
          box-shadow: 0 0 40px rgba(251,146,60,0.2);
        }

        .qr-image { display: block; image-rendering: pixelated; }
        .qr-download { align-self: center; }
        .qr-hint { font-size: 0.8rem; color: var(--text-muted); text-align: center; }

        @media (max-width: 640px) {
          .enc-panel { padding: 18px; }
          .enc-tab-bar { gap: 4px; }
          .enc-tab { padding: 7px 10px; font-size: 0.8rem; }
          .qr-options { flex-direction: column; align-items: flex-start; gap: 12px; }
        }
      `}</style>
    </div>
  );
};

export default EncoderDecoderPage;
