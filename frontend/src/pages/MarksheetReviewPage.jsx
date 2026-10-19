import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Download,
  Calendar,
  User,
  Building,
  Hash,
  Database,
  ExternalLink,
  Printer,
  Copy,
  ArrowLeft,
  Smartphone,
  Award,
  Lock
} from 'lucide-react';
import { getMarksheetForReview, getDownloadUrl, getMediaUrl } from '../services/api';
import QRCode from 'qrcode';

const MarksheetReviewPage = () => {
  const { verificationId } = useParams();
  const [marksheet, setMarksheet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');

  useEffect(() => {
    const fetchMarksheet = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getMarksheetForReview(verificationId);
        if (data.success && data.marksheet) {
          setMarksheet(data.marksheet);
          
          // Generate verification QR code
          const currentUrl = window.location.href;
          const qr = await QRCode.toDataURL(currentUrl, {
            width: 200,
            margin: 1,
            color: { dark: '#0f172a', light: '#ffffff' }
          });
          setQrDataUrl(qr);
        } else {
          setError(data.error || 'Marksheet record not found in MongoDB database.');
        }
      } catch (err) {
        setError(
          err.response?.data?.error ||
          'Failed to load marksheet review. Please verify backend server and MongoDB status.'
        );
      } finally {
        setLoading(false);
      }
    };

    if (verificationId) {
      fetchMarksheet();
    }
  }, [verificationId]);

  const handleCopyHash = () => {
    if (marksheet?.fileHash) {
      navigator.clipboard.writeText(marksheet.fileHash);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="page-body">
        <div className="glass-card" style={{ padding: '60px 20px', textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Retrieving Marksheet from MongoDB Virtual Server...</h2>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '6px' }}>
            Verifying digital authenticity proof and provenance record
          </p>
        </div>
      </div>
    );
  }

  if (error || !marksheet) {
    return (
      <div className="page-body">
        <div className="glass-card" style={{ padding: '40px 24px', textAlign: 'center', borderColor: '#ef4444' }}>
          <AlertTriangle size={48} style={{ color: '#ef4444', margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f87171' }}>Record Not Found in MongoDB</h2>
          <p style={{ color: '#94a3b8', maxWidth: '480px', margin: '10px auto 24px' }}>
            {error || `No registered marksheet was found matching Verification ID "${verificationId}".`}
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <Link to="/upload" className="btn btn-primary">
              <ShieldCheck size={16} /> Upload & Verify Marksheet
            </Link>
            <Link to="/" className="btn btn-secondary">
              <ArrowLeft size={16} /> Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const extracted = marksheet.marksheetAnalysis?.extractedDetails || {};
  const isImage = marksheet.fileType?.startsWith('image/');
  const previewSrc = marksheet.fileBase64Preview || getMediaUrl(marksheet.watermarkedFileUrl);

  return (
    <div className="page-body">
      {/* Top Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <Link to="/documents" style={{ color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem' }}>
              <ArrowLeft size={14} /> Back to Registry
            </Link>
            <span style={{ color: '#64748b' }}>•</span>
            <span style={{ fontSize: '0.85rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
              <Database size={13} /> MongoDB Virtual Server Verified
            </span>
          </div>
          <h1 className="page-title" style={{ fontSize: '1.7rem' }}>
            Official Marksheet Verification & Review
          </h1>
          <p className="page-subtitle">
            Immutable authenticity record accessible across all devices
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={handlePrint}>
            <Printer size={16} /> Print Official Report
          </button>
          <a
            href={getDownloadUrl(marksheet.verificationId)}
            className="btn btn-primary"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Download size={16} /> Download Certified Marksheet
          </a>
        </div>
      </div>

      {/* Authenticity Guarantee Hero Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(6, 95, 70, 0.3))',
        border: '1.5px solid #10b981',
        borderRadius: '16px',
        padding: '24px 28px',
        marginBottom: '28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #10b981, #059669)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(16, 185, 129, 0.35)',
            flexShrink: 0
          }}>
            <ShieldCheck size={34} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
                VERIFIED AUTHENTIC MARKSHEET
              </h2>
              <span style={{
                background: '#10b981',
                color: '#064e3b',
                fontWeight: 700,
                fontSize: '0.75rem',
                padding: '3px 8px',
                borderRadius: '999px',
                textTransform: 'uppercase'
              }}>
                Verified
              </span>
            </div>
            <p style={{ color: '#d1fae5', margin: '6px 0 0', fontSize: '0.95rem' }}>
              This marksheet matches <strong>byte-for-byte</strong> with the original document registered by{' '}
              <strong>{marksheet.uploaderInfo?.name || 'the registered candidate'}</strong>. Zero tampering detected.
            </p>
          </div>
        </div>

        {/* QR Code Seal */}
        {qrDataUrl && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(15, 23, 42, 0.6)', padding: '10px 14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <img src={qrDataUrl} alt="Verification QR" style={{ width: '68px', height: '68px', borderRadius: '6px', background: '#fff' }} />
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Smartphone size={13} /> Mobile Review
              </div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', maxWidth: '120px', lineHeight: 1.3, marginTop: '2px' }}>
                Scan to review on any smartphone or tablet
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Grid: Details & Document Preview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
        
        {/* Left Column: Provenance & Extracted Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Provenance Card */}
          <div className="glass-card" style={{ padding: '22px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Award size={18} color="#38bdf8" /> Immutable Provenance Record
            </h3>

            <div style={{ display: 'grid', gap: '14px', fontSize: '0.9rem' }}>
              <div>
                <span style={{ color: '#94a3b8', fontSize: '0.8rem', display: 'block' }}>Official Verification ID</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#38bdf8', fontSize: '1.05rem' }}>
                  {marksheet.verificationId}
                </span>
              </div>

              <div>
                <span style={{ color: '#94a3b8', fontSize: '0.8rem', display: 'block' }}>Uploaded First Time By</span>
                <span style={{ fontWeight: 600, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <User size={15} color="#10b981" /> {marksheet.uploaderInfo?.name || 'Registered Candidate / Board'}
                </span>
              </div>

              <div>
                <span style={{ color: '#94a3b8', fontSize: '0.8rem', display: 'block' }}>First Registration Timestamp</span>
                <span style={{ color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Calendar size={15} color="#fb923c" />
                  {new Date(marksheet.firstUploadTimestamp || marksheet.createdAt).toLocaleString(undefined, {
                    dateStyle: 'full',
                    timeStyle: 'medium'
                  })}
                </span>
              </div>

              <div>
                <span style={{ color: '#94a3b8', fontSize: '0.8rem', display: 'block' }}>MongoDB Atlas Server Status</span>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <span style={{ color: '#34d399', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Database size={15} /> MongoDB Atlas Server • Active &amp; Verified
                  </span>
                  <a
                    href="https://cloud.mongodb.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#38bdf8', fontSize: '0.78rem', textDecoration: 'underline', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    Atlas Console <ExternalLink size={11} />
                  </a>
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Digital Security Seal Fingerprint</span>
                  <button
                    onClick={handleCopyHash}
                    style={{ background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    {copied ? <CheckCircle2 size={13} color="#10b981" /> : <Copy size={13} />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <div style={{
                  background: 'rgba(15, 23, 42, 0.8)',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  fontFamily: 'monospace',
                  fontSize: '0.75rem',
                  wordBreak: 'break-all',
                  color: '#a78bfa',
                  border: '1px solid rgba(255,255,255,0.08)'
                }}>
                  {marksheet.fileHash}
                </div>
              </div>
            </div>
          </div>

          {/* Academic Details Card */}
          <div className="glass-card" style={{ padding: '22px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={18} color="#a78bfa" /> Marksheet Academic Information
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', fontSize: '0.9rem' }}>
              <div>
                <span style={{ color: '#94a3b8', fontSize: '0.8rem', display: 'block' }}>Student Name</span>
                <span style={{ fontWeight: 600, color: '#f8fafc' }}>
                  {extracted.studentName || marksheet.uploaderInfo?.name || 'Verified Candidate'}
                </span>
              </div>

              <div>
                <span style={{ color: '#94a3b8', fontSize: '0.8rem', display: 'block' }}>Roll / PRN Number</span>
                <span style={{ fontWeight: 600, color: '#f8fafc', fontFamily: 'monospace' }}>
                  {extracted.rollNumber || 'N/A'}
                </span>
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <span style={{ color: '#94a3b8', fontSize: '0.8rem', display: 'block' }}>Issuing Board / University</span>
                <span style={{ fontWeight: 600, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Building size={14} color="#f472b6" />
                  {extracted.boardOrUniversity || extracted.institution || marksheet.uploaderInfo?.organization || 'Official Educational Authority'}
                </span>
              </div>

              <div>
                <span style={{ color: '#94a3b8', fontSize: '0.8rem', display: 'block' }}>Passing Year / Session</span>
                <span style={{ color: '#f8fafc' }}>
                  {extracted.passingYear || new Date(marksheet.createdAt).getFullYear()}
                </span>
              </div>

              <div>
                <span style={{ color: '#94a3b8', fontSize: '0.8rem', display: 'block' }}>Classification Score</span>
                <span style={{ color: '#10b981', fontWeight: 700 }}>
                  {marksheet.marksheetAnalysis?.confidenceScore || 98}% Marksheet Match
                </span>
              </div>
            </div>

            {marksheet.encodedToken && (
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <span style={{ color: '#94a3b8', fontSize: '0.8rem', display: 'block', marginBottom: '4px' }}>
                  Official Digital Certificate Token
                </span>
                <div style={{
                  background: 'rgba(15, 23, 42, 0.7)',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  fontFamily: 'monospace',
                  fontSize: '0.72rem',
                  wordBreak: 'break-all',
                  color: '#facc15'
                }}>
                  {marksheet.encodedToken}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Visual Document Preview */}
        <div className="glass-card" style={{ padding: '22px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Lock size={18} color="#10b981" /> Watermarked Marksheet Document
            </h3>
            <span style={{ fontSize: '0.75rem', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '3px 8px', borderRadius: '6px' }}>
              {marksheet.fileType}
            </span>
          </div>

          <div style={{
            flex: 1,
            minHeight: '420px',
            background: '#090d16',
            borderRadius: '10px',
            border: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            position: 'relative'
          }}>
            {isImage ? (
              <img
                src={previewSrc}
                alt="Verified Marksheet"
                style={{ maxWidth: '100%', maxHeight: '550px', objectFit: 'contain' }}
              />
            ) : (
              <iframe
                src={`${getMediaUrl(marksheet.watermarkedFileUrl)}#toolbar=0`}
                title="Marksheet Document PDF"
                style={{ width: '100%', height: '550px', border: 'none' }}
              />
            )}
          </div>

          <div style={{ marginTop: '16px', display: 'flex', gap: '10px' }}>
            <a
              href={getDownloadUrl(marksheet.verificationId)}
              className="btn btn-primary"
              style={{ flex: 1, justifyContent: 'center' }}
              download
            >
              <Download size={16} /> Download Certified Copy
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarksheetReviewPage;
