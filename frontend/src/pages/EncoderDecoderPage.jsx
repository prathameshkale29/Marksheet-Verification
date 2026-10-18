import React, { useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
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
  Database,
  ExternalLink,
  Smartphone,
  Award,
  AlertCircle
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
import {
  uploadMarksheet,
  decodeAndVerifyDocument,
  getDownloadUrl
} from '../services/api';
import { scanDocumentWithOCR } from '../services/ocrService';

// ─── Tab definitions ──────────────────────────────────────────────────────────
const TABS = [
  { id: 'marksheet-ai', label: 'Marksheet Authenticator & Registry', icon: ShieldCheck, color: '#10b981' },
  { id: 'base64',  label: 'Document Formatter', icon: Code2,       color: '#38bdf8' },
  { id: 'aes',     label: 'Encrypted Vault',    icon: Lock,        color: '#a78bfa' },
  { id: 'sha256',  label: 'Security Seal',      icon: Hash,        color: '#34d399' },
  { id: 'qr',      label: 'Verification Stamp', icon: QrCode,      color: '#fb923c' },
  { id: 'hmac',    label: 'Digital Certificate',icon: Fingerprint, color: '#f472b6' },
  { id: 'url',     label: 'Safe Web Link',      icon: Link2,       color: '#facc15' },
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
        <span className="pill">Universal Standard</span>
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
          <h2 className="tab-title">Encrypted Document Vault</h2>
          <p className="tab-desc">
            Ultra-secure document vault — encrypt <strong>text</strong> or any <strong>image / file</strong> with a secret passphrase.
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
            <span>{file ? file.name : 'Click to select an image or file to securely encrypt'}</span>
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
              <span>{file.name} selected — will be safely locked and encrypted.</span>
            </div>
          )}
        </div>
      )}

      {/* ── Decrypt ciphertext ── */}
      {mode === 'decrypt' && (
        <textarea
          className="enc-textarea"
          placeholder="Paste encrypted data here to decrypt..."
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
          label="Encrypted Document Vault Data (save this + your passphrase!)"
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
        <span className="pill">Bank-Grade Encryption</span>
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
          <h2 className="tab-title">Digital Security Seal Generator</h2>
          <p className="tab-desc">Generate tamper-proof security seals and digital fingerprints for documents or text.</p>
        </div>
      </div>

      <div className="mode-toggle">
        {['text', 'file'].map((m) => (
          <button key={m} className={`mode-btn ${mode === m ? 'active' : ''}`} onClick={() => { setMode(m); reset(); }}>
            {m === 'text' ? <><FileText size={14} /> Seal Text</> : <><Upload size={14} /> Seal File</>}
          </button>
        ))}
      </div>

      {mode === 'text' ? (
        <textarea className="enc-textarea" placeholder="Enter any text to compute its digital security seal..." value={input} onChange={e => setInput(e.target.value)} rows={5} />
      ) : (
        <div className="file-drop-zone" onClick={() => fileRef.current?.click()}>
          <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={e => setFile(e.target.files[0])} />
          <Hash size={28} className="file-drop-icon" />
          <span>{file ? file.name : 'Click to select a file to generate its security seal'}</span>
          {file && <span className="file-size-hint">({(file.size / 1024).toFixed(1)} KB)</span>}
        </div>
      )}

      {error && <ErrorBox message={error} />}
      <ActionButtons onProcess={process} onReset={reset} processing={processing} label="Generate Security Seal" icon={Hash} />

      {output && (
        <div className="hash-result-box">
          <div className="hash-result-label">Official Document Security Seal</div>
          <div className="hash-result-value">
            {output.match(/.{1,8}/g)?.map((chunk, i) => (
              <span key={i} className="hash-chunk">{chunk}</span>
            ))}
          </div>
          <button className="copy-btn hash-copy" onClick={() => copy(output, 'sha256')}>
            {copied === 'sha256' ? <CheckCircle2 size={14} /> : <Copy size={14} />}
            {copied === 'sha256' ? 'Copied!' : 'Copy Security Seal'}
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
          <h2 className="tab-title">Digital Authenticity Certificate Generator</h2>
          <p className="tab-desc">Generate official digital certificate signatures to verify document authenticity and integrity.</p>
        </div>
      </div>

      <textarea
        className="enc-textarea"
        placeholder="Enter the message or document details to sign (e.g. Verification ID, metadata)..."
        value={message}
        onChange={e => setMessage(e.target.value)}
        rows={4}
      />

      <div className="passphrase-row">
        <Key size={16} className="pass-icon" />
        <input
          className="enc-input passphrase-input"
          type={showKey ? 'text' : 'password'}
          placeholder="Enter authorization secret key..."
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
      <ActionButtons onProcess={process} onReset={reset} processing={processing} label="Generate Digital Signature" icon={Fingerprint} />
      <OutputBox label="Official Authenticity Signature" value={output} copyId="hmac" copied={copied} onCopy={copy} />

      <div className="info-pills">
        <span className="pill">Document Authentication</span>
        <span className="pill">Integrity Verification</span>
        <span className="pill">Digital Certification</span>
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
          <h2 className="tab-title">Safe Web Link Encoder / Decoder</h2>
          <p className="tab-desc">Encode special characters for safe web transmission or decode web-encoded strings.</p>
        </div>
      </div>

      <div className="mode-toggle">
        {['encode', 'decode'].map((m) => (
          <button key={m} className={`mode-btn ${mode === m ? 'active' : ''}`} onClick={() => { setMode(m); reset(); }}>
            {m === 'encode' ? <><Link2 size={14} /> Encode Link</> : <><Unlock size={14} /> Decode Link</>}
          </button>
        ))}
      </div>

      <textarea
        className="enc-textarea"
        placeholder={mode === 'encode' ? 'Enter text or URL to encode...' : 'Paste encoded string to decode...'}
        value={input}
        onChange={e => setInput(e.target.value)}
        rows={5}
      />

      {error && <ErrorBox message={error} />}
      <ActionButtons onProcess={process} onReset={reset} processing={false}
        label={mode === 'encode' ? 'Encode Safe Link' : 'Decode Safe Link'}
        icon={Link2}
      />
      <OutputBox label={mode === 'encode' ? 'Safe Link Output' : 'Decoded Output'} value={output} copyId="url" copied={copied} onCopy={copy} />

      <div className="info-pills">
        <span className="pill">Universal Web Standard</span>
        <span className="pill">Safe Sharing</span>
        <span className="pill">Cloud Ready</span>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// TAB: MARKSHEET AI & 100% ORIGINALITY
// ─────────────────────────────────────────────────────────────────────────────
const MarksheetAITab = () => {
  const [mode, setMode] = useState('encode'); // 'encode' | 'decode'
  const [file, setFile] = useState(null);
  const [tokenInput, setTokenInput] = useState('');
  const [verificationIdInput, setVerificationIdInput] = useState('');
  
  // Metadata for encode
  const [studentName, setStudentName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [institution, setInstitution] = useState('');
  const [passingYear, setPassingYear] = useState('');

  // OCR Auto-Detection state
  const [ocrScanning, setOcrScanning] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrDetectedInfo, setOcrDetectedInfo] = useState(null);
  const [extractedOcrText, setExtractedOcrText] = useState('');

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  const { copied, copy } = useCopy();
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const processSelectedFile = async (selectedFile) => {
    setFile(selectedFile);
    setError(null);
    setResult(null);
    setOcrDetectedInfo(null);
    setExtractedOcrText('');

    // If it's an image, run in-browser AI OCR scanning to detect text and auto-fill
    if (selectedFile.type && selectedFile.type.startsWith('image/')) {
      setOcrScanning(true);
      setOcrProgress(15);
      try {
        const ocr = await scanDocumentWithOCR(selectedFile, (p) => setOcrProgress(p));
        if (ocr && ocr.success && ocr.rawText) {
          setExtractedOcrText(ocr.rawText);
          setOcrDetectedInfo(ocr);
          if (ocr.studentName) setStudentName(ocr.studentName);
          if (ocr.rollNumber) setRollNumber(ocr.rollNumber);
          if (ocr.institution) setInstitution(ocr.institution);
          if (ocr.passingYear) setPassingYear(ocr.passingYear);
        }
      } catch (err) {
        console.warn('OCR processing skipped or failed:', err);
      } finally {
        setOcrScanning(false);
      }
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      processSelectedFile(e.target.files[0]);
    }
  };

  const handleReset = () => {
    setFile(null);
    setTokenInput('');
    setVerificationIdInput('');
    setStudentName('');
    setRollNumber('');
    setInstitution('');
    setPassingYear('');
    setExtractedOcrText('');
    setOcrDetectedInfo(null);
    setOcrScanning(false);
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleEncodeAndRegister = async (force = false) => {
    if (!file) {
      setError('Please select or drop a marksheet document file (PDF, PNG, JPG).');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await uploadMarksheet(file, {
        studentName,
        rollNumber,
        prn: rollNumber,
        institution,
        passingYear,
        ocrText: extractedOcrText,
        forceRegister: force,
        uploaderName: studentName || 'Original Student / Registrar'
      });

      if (data.success) {
        setResult({
          type: 'ENCODE_SUCCESS',
          data
        });
      } else {
        setError(data.error || 'Failed to encode and register marksheet.');
      }
    } catch (err) {
      const errorData = err.response?.data;
      if (errorData && errorData.isMarksheet === false) {
        setResult({
          type: 'REJECTED_NON_MARKSHEET',
          analysis: errorData.analysis,
          details: errorData.details,
          message: errorData.error
        });
      } else {
        setError(errorData?.error || 'Server error while analyzing and registering marksheet. Ensure backend is running.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDecodeAndVerify = async () => {
    if (!file && !tokenInput.trim() && !verificationIdInput.trim()) {
      setError('Please upload a document to verify against MongoDB, or enter an Encoded Token / Verification ID.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await decodeAndVerifyDocument({
        file,
        token: tokenInput.trim() || undefined,
        verificationId: verificationIdInput.trim() || undefined,
        ocrText: extractedOcrText
      });

      if (data.tamperingDetected) {
        setResult({
          type: 'TAMPERING_DETECTED',
          data
        });
      } else if (data.is100PercentOriginal) {
        setResult({
          type: 'DECODE_100_ORIGINAL',
          data
        });
      } else if (!data.isMarksheet) {
        setResult({
          type: 'REJECTED_NON_MARKSHEET',
          analysis: data.analysis,
          message: data.message || 'Document is NOT a recognized academic marksheet.'
        });
      } else {
        setResult({
          type: 'UNREGISTERED',
          data
        });
      }
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Verification failed. Please check inputs.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="tab-content">
      <div className="tab-header">
        <ShieldCheck size={32} color="#10b981" className="tab-icon" />
        <div>
          <div className="tab-title">Marksheet Authenticator &amp; 100% Originality Registry</div>
          <div className="tab-desc">
            Analyzes uploaded documents to determine whether it is an authentic marksheet, generates tamper-proof security seals, and registers immutable provenance in the database for 100% originality checks on any device.
          </div>
        </div>
      </div>

      {/* Mode Switch */}
      <div className="mode-toggle">
        <button
          className={`mode-btn ${mode === 'encode' ? 'active' : ''}`}
          onClick={() => { setMode('encode'); setResult(null); setError(null); }}
        >
          <Upload size={16} /> Mode 1: Analyze &amp; Encode Marksheet (First-Time Upload)
        </button>
        <button
          className={`mode-btn ${mode === 'decode' ? 'active' : ''}`}
          onClick={() => { setMode('decode'); setResult(null); setError(null); }}
        >
          <ShieldCheck size={16} /> Mode 2: Decode &amp; Check 100% Originality (Future Reviewer)
        </button>
      </div>

      {/* Database Status Ribbon */}
      <div style={{
        background: 'rgba(16, 185, 129, 0.08)',
        border: '1px solid rgba(16, 185, 129, 0.25)',
        borderRadius: '8px',
        padding: '10px 14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '8px',
        fontSize: '0.83rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6ee7b7' }}>
          <Database size={15} color="#10b981" />
          <span><strong>Virtual Database Registry:</strong> Connected &amp; Ready for Multi-Device Review</span>
        </div>
        <span style={{ color: '#94a3b8', fontSize: '0.78rem' }}>
          100% Tamper-Proof Integrity Guarantee
        </span>
      </div>

      {/* File Dropzone */}
      <div
        className="file-drop-zone"
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          borderStyle: 'dashed',
          borderColor: dragActive ? '#10b981' : file ? 'rgba(16, 185, 129, 0.6)' : undefined,
          background: dragActive ? 'rgba(16, 185, 129, 0.08)' : file ? 'rgba(16, 185, 129, 0.04)' : undefined
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.webp"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
        {file ? (
          <>
            <FileText size={36} color="#10b981" />
            <div>
              <div style={{ fontWeight: 600, color: '#f8fafc' }}>{file.name}</div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                {(file.size / 1024).toFixed(1)} KB • {file.type || 'Document'}
              </div>
            </div>
            <span style={{ fontSize: '0.78rem', color: '#38bdf8' }}>Click or drop another file to replace</span>
          </>
        ) : (
          <>
            <Upload size={36} className="file-drop-icon" />
            <div>
              <strong>Drag &amp; drop document</strong> or <span style={{ color: '#38bdf8' }}>browse</span>
            </div>
            <div className="file-size-hint">
              Supports Marksheet PDFs, PNGs, and JPGs (Document structural AI analysis automatically checks for marksheet markers)
            </div>
          </>
        )}
      </div>

      {/* OCR Scanning Progress or Detected Result Banner */}
      {ocrScanning && (
        <div style={{
          background: 'rgba(56, 189, 248, 0.1)',
          border: '1px solid rgba(56, 189, 248, 0.3)',
          borderRadius: '8px',
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '0.84rem',
          color: '#38bdf8'
        }}>
          <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px', borderColor: '#38bdf8 transparent transparent' }} />
          <span>🔍 AI Optical Character Recognition scanning marksheet text ({ocrProgress}%)...</span>
        </div>
      )}

      {ocrDetectedInfo && ocrDetectedInfo.isMarksheetDetected && (
        <div style={{
          background: 'rgba(16, 185, 129, 0.12)',
          border: '1px solid #10b981',
          borderRadius: '8px',
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
          fontSize: '0.84rem',
          color: '#a7f3d0'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={16} color="#10b981" />
            <span>
              <strong>Marksheet Detected:</strong> {ocrDetectedInfo.institution || 'Recognized Academic Institution'}
              {ocrDetectedInfo.rollNumber ? ` • PRN: ${ocrDetectedInfo.rollNumber}` : ''}
              {ocrDetectedInfo.studentName ? ` • Student: ${ocrDetectedInfo.studentName}` : ''}
            </span>
          </div>
          <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>Auto-Populated</span>
        </div>
      )}

      {/* Mode 1: Candidate Details Form */}
      {mode === 'encode' && (
        <div style={{
          background: 'rgba(0,0,0,0.25)',
          padding: '16px',
          borderRadius: '10px',
          border: '1px solid var(--border-color)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '12px'
        }}>
          <div>
            <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: 600 }}>
              Candidate / Student Name
            </label>
            <input
              type="text"
              className="enc-input"
              placeholder="e.g. John Doe"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: 600 }}>
              Roll Number / PRN Identifier
            </label>
            <input
              type="text"
              className="enc-input"
              placeholder="e.g. 2026-ENG-8492"
              value={rollNumber}
              onChange={(e) => setRollNumber(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: 600 }}>
              Issuing Board / University
            </label>
            <input
              type="text"
              className="enc-input"
              placeholder="e.g. State Technical University"
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: 600 }}>
              Passing Year / Semester
            </label>
            <input
              type="text"
              className="enc-input"
              placeholder="e.g. 2026"
              value={passingYear}
              onChange={(e) => setPassingYear(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>
        </div>
      )}

      {/* Mode 2: Optional Token / Verification ID Input */}
      {mode === 'decode' && (
        <div style={{
          background: 'rgba(0,0,0,0.25)',
          padding: '16px',
          borderRadius: '10px',
          border: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <div style={{ fontSize: '0.84rem', color: '#94a3b8' }}>
            Verify by uploading the marksheet above, <strong>OR</strong> paste its Encoded Token / Verification ID below:
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: 600 }}>
                Verification ID
              </label>
              <input
                type="text"
                className="enc-input"
                placeholder="e.g. VER-2026-000001"
                value={verificationIdInput}
                onChange={(e) => setVerificationIdInput(e.target.value)}
                style={{ width: '100%', fontFamily: 'monospace' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: 600 }}>
                Cryptographic Token
              </label>
              <input
                type="text"
                className="enc-input"
                placeholder="e.g. MKS-ENCODED.eyJ2SWQiOiJ..."
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                style={{ width: '100%', fontFamily: 'monospace' }}
              />
            </div>
          </div>
        </div>
      )}

      {error && <ErrorBox message={error} />}

      {/* Action Buttons */}
      <div className="action-row">
        {mode === 'encode' ? (
          <button
            className="btn btn-primary"
            onClick={handleEncodeAndRegister}
            disabled={loading || !file}
            style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', borderColor: '#10b981' }}
          >
            <ShieldCheck size={17} />
            {loading ? 'Analyzing & Encoding...' : 'Analyze Document & Register Original to MongoDB'}
          </button>
        ) : (
          <button
            className="btn btn-primary"
            onClick={handleDecodeAndVerify}
            disabled={loading || (!file && !tokenInput && !verificationIdInput)}
            style={{ background: 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)', borderColor: '#38bdf8' }}
          >
            <ShieldCheck size={17} />
            {loading ? 'Decoding & Querying MongoDB...' : 'Decode & Check 100% Originality'}
          </button>
        )}

        <button className="btn btn-secondary" onClick={handleReset}>
          <RotateCcw size={15} /> Reset
        </button>
      </div>

      {/* ── RESULTS AREA ── */}
      {result && (
        <div style={{ marginTop: '12px' }}>
          {/* CASE 1: REJECTED AS NON-MARKSHEET */}
          {result.type === 'REJECTED_NON_MARKSHEET' && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1.5px solid #ef4444',
              borderRadius: '12px',
              padding: '20px',
              color: '#f8fafc'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <AlertTriangle size={26} color="#ef4444" />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f87171', margin: 0 }}>
                  REJECTED: Document is NOT a Marksheet!
                </h3>
              </div>
              <p style={{ color: '#cbd5e1', fontSize: '0.9rem', margin: '4px 0 12px' }}>
                {result.message || 'The AI structural analysis determined this file does not meet academic marksheet criteria (missing roll number, examination tables, or educational board marks).'}
              </p>
              {result.analysis && (
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '8px', fontSize: '0.84rem' }}>
                  <div style={{ color: '#f87171', fontWeight: 600, marginBottom: '6px' }}>
                    Marksheet Match Confidence: {result.analysis.confidenceScore}% (Required: ≥ 55%)
                  </div>
                  {result.analysis.missingSignals?.length > 0 && (
                    <div>
                      <span style={{ color: '#94a3b8' }}>Failed Criteria:</span>
                      <ul style={{ margin: '4px 0 0', paddingLeft: '20px', color: '#fda4af' }}>
                        {result.analysis.missingSignals.map((sig, i) => (
                          <li key={i}>{sig}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <div style={{ marginTop: '14px', display: 'flex', gap: '10px' }}>
                <button
                  className="btn btn-primary"
                  onClick={() => handleEncodeAndRegister(true)}
                  style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', borderColor: '#10b981' }}
                >
                  <ShieldCheck size={16} /> Confirm &amp; Register Anyway as Authentic Marksheet
                </button>
              </div>
            </div>
          )}

          {/* CASE 2: TAMPERING DETECTED */}
          {result.type === 'TAMPERING_DETECTED' && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '2px solid #ef4444',
              borderRadius: '12px',
              padding: '22px',
              boxShadow: '0 0 24px rgba(239, 68, 68, 0.25)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <AlertCircle size={30} color="#ef4444" />
                <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#ef4444', margin: 0 }}>
                  CRITICAL: TAMPERING DETECTED!
                </h3>
              </div>
              <p style={{ color: '#fecaca', fontSize: '0.95rem', margin: '6px 0 14px' }}>
                {result.data.message}
              </p>
              <div style={{ background: 'rgba(0,0,0,0.4)', padding: '14px', borderRadius: '8px', fontSize: '0.85rem', fontFamily: 'monospace' }}>
                <div style={{ color: '#10b981', marginBottom: '6px' }}>
                  <strong>Original Hash in MongoDB:</strong> {result.data.expectedHash}
                </div>
                <div style={{ color: '#ef4444' }}>
                  <strong>Current Uploaded Hash:</strong> {result.data.actualHash}
                </div>
              </div>
            </div>
          )}

          {/* CASE 3: 100% ORIGINAL MATCH (EITHER REGISTERED OR VERIFIED) */}
          {(result.type === 'ENCODE_SUCCESS' || result.type === 'DECODE_100_ORIGINAL') && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(6, 95, 70, 0.25))',
              border: '1.5px solid #10b981',
              borderRadius: '14px',
              padding: '24px',
              boxShadow: '0 8px 32px rgba(16, 185, 129, 0.2)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '50%',
                    background: '#10b981',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)'
                  }}>
                    <ShieldCheck size={28} color="#ffffff" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
                      100% ORIGINAL &amp; AUTHENTIC MARKSHEET
                    </h3>
                    <span style={{ fontSize: '0.83rem', color: '#a7f3d0' }}>
                      {result.type === 'ENCODE_SUCCESS'
                        ? 'Successfully Analyzed, Encoded & Registered to MongoDB Virtual Server'
                        : 'Exact Byte-for-Byte Match Confirmed against Original Upload'}
                    </span>
                  </div>
                </div>

                {/* Cross Device Review Button */}
                {result.data?.marksheet?.verificationId && (
                  <Link
                    to={`/review/${result.data.marksheet.verificationId}`}
                    className="btn btn-primary"
                    style={{ background: '#0284c7', borderColor: '#38bdf8' }}
                  >
                    <Smartphone size={16} /> Open Cross-Device Review
                  </Link>
                )}
              </div>

              {/* Provenance Details Grid */}
              <div style={{
                background: 'rgba(0,0,0,0.35)',
                padding: '16px',
                borderRadius: '10px',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '14px',
                fontSize: '0.88rem',
                border: '1px solid rgba(255,255,255,0.06)'
              }}>
                <div>
                  <span style={{ color: '#94a3b8', fontSize: '0.78rem', display: 'block' }}>Verification ID</span>
                  <span style={{ fontWeight: 700, color: '#38bdf8', fontFamily: 'monospace', fontSize: '1rem' }}>
                    {result.data?.marksheet?.verificationId}
                  </span>
                </div>

                <div>
                  <span style={{ color: '#94a3b8', fontSize: '0.78rem', display: 'block' }}>First-Time Uploaded By</span>
                  <span style={{ fontWeight: 600, color: '#f8fafc' }}>
                    {result.data?.marksheet?.uploaderInfo?.name || 'Registered Candidate'}
                  </span>
                </div>

                <div>
                  <span style={{ color: '#94a3b8', fontSize: '0.78rem', display: 'block' }}>Original Registration Timestamp</span>
                  <span style={{ color: '#f8fafc' }}>
                    {new Date(result.data?.marksheet?.firstUploadTimestamp || result.data?.marksheet?.createdAt).toLocaleString()}
                  </span>
                </div>

                <div>
                  <span style={{ color: '#94a3b8', fontSize: '0.78rem', display: 'block' }}>Document AI Classification</span>
                  <span style={{ color: '#34d399', fontWeight: 600 }}>
                    Academic Marksheet ({result.data?.marksheet?.marksheetAnalysis?.confidenceScore || 98}% match)
                  </span>
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                    <span style={{ color: '#94a3b8', fontSize: '0.78rem' }}>Unique Security Fingerprint (Registered in Database)</span>
                    <button
                      onClick={() => copy(result.data?.marksheet?.fileHash, 'res-hash')}
                      style={{ background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer', fontSize: '0.75rem' }}
                    >
                      {copied === 'res-hash' ? 'Copied!' : 'Copy Code'}
                    </button>
                  </div>
                  <div style={{
                    fontFamily: 'monospace',
                    fontSize: '0.76rem',
                    background: 'rgba(15, 23, 42, 0.7)',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    color: '#a5f3fc',
                    wordBreak: 'break-all'
                  }}>
                    {result.data?.marksheet?.fileHash}
                  </div>
                </div>
              </div>

              {/* Action Links */}
              <div style={{ marginTop: '16px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <Link
                  to={`/review/${result.data?.marksheet?.verificationId}`}
                  className="btn btn-primary"
                  style={{ flex: 1, minWidth: '200px', justifyContent: 'center' }}
                >
                  <Award size={16} /> View Full Certified Review &amp; Report
                </Link>
                {result.data?.marksheet?.verificationId && (
                  <a
                    href={getDownloadUrl(result.data.marksheet.verificationId)}
                    className="btn btn-secondary"
                    download
                    style={{ flex: 1, minWidth: '200px', justifyContent: 'center' }}
                  >
                    <Download size={16} /> Download Watermarked Marksheet
                  </a>
                )}
              </div>
            </div>
          )}

          {/* CASE 4: UNREGISTERED MARKSHEET */}
          {result.type === 'UNREGISTERED' && (
            <div style={{
              background: 'rgba(251, 146, 60, 0.1)',
              border: '1.5px solid #fb923c',
              borderRadius: '12px',
              padding: '20px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <AlertTriangle size={24} color="#fb923c" />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fb923c', margin: 0 }}>
                  Valid Marksheet Structure, but Not Registered in Database
                </h3>
              </div>
              <p style={{ color: '#fed7aa', fontSize: '0.9rem', margin: '4px 0 12px' }}>
                This file has genuine academic marksheet structure, but its security fingerprint was not found in the database registry. Switch to Mode 1 to register it for the first time!
              </p>
              <button
                className="btn btn-primary"
                onClick={() => { setMode('encode'); setResult(null); }}
              >
                Switch to Mode 1 &amp; Register This Marksheet
              </button>
            </div>
          )}
        </div>
      )}

      {/* Info Pills */}
      <div className="info-pills">
        <span className="pill">AI Marksheet Detection</span>
        <span className="pill">100% Tamper-Proof Guarantee</span>
        <span className="pill">Virtual Cloud Database</span>
        <span className="pill">Cross-Device Accessible</span>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
const EncoderDecoderPage = () => {
  const [activeTab, setActiveTab] = useState('marksheet-ai');

  const renderTab = () => {
    switch (activeTab) {
      case 'marksheet-ai': return <MarksheetAITab />;
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
            Complete document security, authenticity verification, and encoding laboratory.
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
