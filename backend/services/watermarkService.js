const { PDFDocument, rgb, degrees, StandardFonts } = require('pdf-lib');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

/**
 * Formats a Date object to readable format e.g. "26-Oct-2026 15:30"
 */
const formatDate = (dateObj = new Date()) => {
  const options = { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' };
  return new Date(dateObj).toLocaleDateString('en-GB', options);
};

/**
 * Escapes XML special characters for safe SVG string injection
 */
const escapeXml = (unsafe = '') => {
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

/**
 * Resolves local file path for college logo
 */
const getLogoPath = (logoUrl) => {
  if (!logoUrl) {
    return path.join(__dirname, '..', 'uploads', 'assets', 'college-logo.png');
  }
  if (logoUrl.startsWith('/uploads/')) {
    const rel = logoUrl.replace('/uploads/', '');
    const full = path.join(__dirname, '..', 'uploads', rel);
    if (fs.existsSync(full)) return full;
  }
  const defaultPath = path.join(__dirname, '..', 'uploads', 'assets', 'college-logo.png');
  return fs.existsSync(defaultPath) ? defaultPath : null;
};

// ==========================================
// 1. PENDING PREVIEW WATERMARK PIPELINE
// ==========================================

const applyPendingWatermarkPDF = async (buffer, verificationId) => {
  let pdfDoc;
  try {
    pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  } catch (err) {
    throw new Error('Invalid PDF structure.');
  }

  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pages = pdfDoc.getPages();

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const { width, height } = page.getSize();
    const centerX = width / 2;
    const centerY = height / 2;

    const titleSize = Math.min(width, height) * 0.05;

    // Diagonal "PENDING VERIFICATION" in amber/gray
    page.drawText('PENDING VERIFICATION', {
      x: centerX - 180,
      y: centerY + 20,
      size: titleSize,
      font: font,
      color: rgb(0.85, 0.45, 0.1),
      opacity: 0.22,
      rotate: degrees(35)
    });

    page.drawText(`SUBMISSION ID: ${verificationId} | AWAITING REVIEW`, {
      x: centerX - 160,
      y: centerY - 15,
      size: titleSize * 0.45,
      font: regularFont,
      color: rgb(0.85, 0.45, 0.1),
      opacity: 0.25,
      rotate: degrees(35)
    });

    // Top Amber Warning Banner
    page.drawRectangle({
      x: 0,
      y: height - 16,
      width: width,
      height: 16,
      color: rgb(0.78, 0.45, 0.1)
    });

    page.drawText(`PREVIEW DOCUMENT - PENDING COLLEGE SECTION VERIFICATION - NOT OFFICIALLY APPROVED`, {
      x: 15,
      y: height - 12,
      size: 6.5,
      font: font,
      color: rgb(1, 1, 1)
    });
  }

  const pdfBytes = await pdfDoc.save();
  return {
    buffer: Buffer.from(pdfBytes),
    pageCount: pages.length
  };
};

const applyPendingWatermarkImage = async (buffer, verificationId) => {
  const image = sharp(buffer);
  const metadata = await image.metadata();
  const width = metadata.width || 800;
  const height = metadata.height || 1000;

  const svgOverlay = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <style>
        .pending-title { font-family: Arial, sans-serif; font-weight: bold; font-size: ${Math.round(width * 0.045)}px; fill: rgba(217, 119, 6, 0.28); }
        .pending-sub { font-family: Arial, sans-serif; font-weight: bold; font-size: ${Math.round(width * 0.022)}px; fill: rgba(217, 119, 6, 0.32); }
        .banner-text { font-family: Arial, sans-serif; font-weight: bold; font-size: 10px; fill: #ffffff; }
      </style>
      <g transform="translate(${width / 2}, ${height / 2}) rotate(-30)">
        <text x="0" y="-10" text-anchor="middle" class="pending-title">PENDING VERIFICATION</text>
        <text x="0" y="${Math.round(width * 0.035)}" text-anchor="middle" class="pending-sub">REF: ${verificationId} • AWAITING APPROVAL</text>
      </g>
      <rect x="0" y="0" width="${width}" height="24" fill="#b45309" opacity="0.95" />
      <text x="15" y="16" class="banner-text">⚠ PREVIEW COPY • PENDING VERIFICATION BY COLLEGE ADMINISTRATION • NOT OFFICIALLY VALIDATED</text>
    </svg>
  `;

  const watermarkedImage = await image
    .composite([{ input: Buffer.from(svgOverlay), top: 0, left: 0 }])
    .toBuffer();

  return {
    buffer: watermarkedImage,
    pageCount: 1,
    dimensions: `${width}x${height}`
  };
};

// ==========================================
// 2. VERIFIED FINAL WATERMARK PIPELINE
// ==========================================

const applyVerifiedWatermarkPDF = async (
  buffer,
  verificationId,
  verifiedDateStr,
  fileHash,
  collegeSettings = {},
  qrBuffer = null
) => {
  let pdfDoc;
  try {
    pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  } catch (err) {
    throw new Error('Invalid PDF structure.');
  }

  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pages = pdfDoc.getPages();

  const collegeName = collegeSettings.institutionName || 'Government Institute of Technology';
  const collegeCode = collegeSettings.institutionCode || 'GITE-401';
  const watermarkText = collegeSettings.watermarkText || 'OFFICIALLY VERIFIED';
  const hashSnippet = fileHash ? fileHash.substring(0, 14).toUpperCase() : 'HASH-VERIFIED';

  // Embed college logo if exists
  let embeddedLogo = null;
  const logoPath = getLogoPath(collegeSettings.logoUrl);
  if (logoPath && fs.existsSync(logoPath)) {
    try {
      const logoBytes = fs.readFileSync(logoPath);
      embeddedLogo = await pdfDoc.embedPng(logoBytes);
    } catch (e) {
      console.warn('PDF Logo embed skipped:', e.message);
    }
  }

  // Embed QR code image if provided
  let embeddedQR = null;
  if (qrBuffer) {
    try {
      embeddedQR = await pdfDoc.embedPng(qrBuffer);
    } catch (e) {
      console.warn('PDF QR embed skipped:', e.message);
    }
  }

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const { width, height } = page.getSize();
    const centerX = width / 2;
    const centerY = height / 2;

    const titleSize = Math.min(width, height) * 0.05;

    // 1. Center Diagonal Watermark
    page.drawText(watermarkText, {
      x: centerX - 180,
      y: centerY + 25,
      size: titleSize,
      font: font,
      color: rgb(0.08, 0.42, 0.78),
      opacity: 0.18,
      rotate: degrees(35)
    });

    page.drawText(`${collegeName.toUpperCase()}`, {
      x: centerX - 160,
      y: centerY,
      size: titleSize * 0.42,
      font: font,
      color: rgb(0.08, 0.42, 0.78),
      opacity: 0.22,
      rotate: degrees(35)
    });

    page.drawText(`VERIFICATION REF: ${verificationId} | DATE: ${verifiedDateStr}`, {
      x: centerX - 160,
      y: centerY - 18,
      size: titleSize * 0.38,
      font: regularFont,
      color: rgb(0.08, 0.42, 0.78),
      opacity: 0.22,
      rotate: degrees(35)
    });

    // 2. Certified Bottom Security Stamp Box with QR & Logo
    const boxWidth = 260;
    const boxHeight = 72;
    const boxX = width - boxWidth - 18;
    const boxY = 18;

    page.drawRectangle({
      x: boxX,
      y: boxY,
      width: boxWidth,
      height: boxHeight,
      color: rgb(0.97, 0.98, 1.0),
      borderColor: rgb(0.1, 0.4, 0.8),
      borderWidth: 1.5,
      opacity: 0.94
    });

    // Draw College Logo inside Stamp Box
    if (embeddedLogo) {
      page.drawImage(embeddedLogo, {
        x: boxX + 8,
        y: boxY + 12,
        width: 48,
        height: 48
      });
    }

    // Draw QR Code inside Stamp Box
    const textStartX = embeddedLogo ? boxX + 62 : boxX + 12;
    const textAvailableWidth = boxWidth - (embeddedLogo ? 120 : 70);

    // Text in stamp box
    page.drawText(`✓ ${collegeCode} CERTIFIED`, {
      x: textStartX,
      y: boxY + boxHeight - 16,
      size: 8,
      font: font,
      color: rgb(0.04, 0.52, 0.32)
    });

    page.drawText(`REF: ${verificationId}`, {
      x: textStartX,
      y: boxY + boxHeight - 28,
      size: 7.5,
      font: font,
      color: rgb(0.08, 0.16, 0.35)
    });

    page.drawText(`DATE: ${verifiedDateStr}`, {
      x: textStartX,
      y: boxY + boxHeight - 40,
      size: 7,
      font: regularFont,
      color: rgb(0.25, 0.25, 0.3)
    });

    page.drawText(`SHA256: ${hashSnippet}...`, {
      x: textStartX,
      y: boxY + boxHeight - 52,
      size: 6.5,
      font: regularFont,
      color: rgb(0.4, 0.4, 0.5)
    });

    page.drawText(`SCAN QR TO CONFIRM`, {
      x: textStartX,
      y: boxY + boxHeight - 64,
      size: 6,
      font: font,
      color: rgb(0.15, 0.4, 0.75)
    });

    if (embeddedQR) {
      page.drawImage(embeddedQR, {
        x: boxX + boxWidth - 56,
        y: boxY + 10,
        width: 50,
        height: 50
      });
    }

    // 3. Top Security Banner
    page.drawRectangle({
      x: 0,
      y: height - 16,
      width: width,
      height: 16,
      color: rgb(0.06, 0.12, 0.24)
    });

    page.drawText(
      `✓ OFFICIAL VERIFIED MARKSHEET | ${collegeName.toUpperCase()} | REF: ${verificationId} | SHA-256 DIGITAL HASH CERTIFIED`,
      {
        x: 14,
        y: height - 11,
        size: 6.5,
        font: font,
        color: rgb(0.85, 0.95, 1.0)
      }
    );
  }

  const verifiedPdfBytes = await pdfDoc.save();
  return {
    buffer: Buffer.from(verifiedPdfBytes),
    pageCount: pages.length
  };
};

const applyVerifiedWatermarkImage = async (
  buffer,
  verificationId,
  verifiedDateStr,
  fileHash,
  collegeSettings = {},
  qrBuffer = null
) => {
  const image = sharp(buffer);
  const metadata = await image.metadata();
  const width = metadata.width || 800;
  const height = metadata.height || 1000;

  const safeCollegeName = escapeXml((collegeSettings.institutionName || 'Government Institute of Technology').toUpperCase());
  const safeCollegeCode = escapeXml(collegeSettings.institutionCode || 'GITE-401');
  const safeWatermarkText = escapeXml(collegeSettings.watermarkText || 'OFFICIALLY VERIFIED');
  const safeVerificationId = escapeXml(verificationId);
  const safeVerifiedDateStr = escapeXml(verifiedDateStr);
  const safeHashSnippet = escapeXml(fileHash ? fileHash.substring(0, 14).toUpperCase() : 'HASH-VERIFIED');

  // Base64 QR Code for SVG injection
  const qrBase64 = qrBuffer ? `data:image/png;base64,${qrBuffer.toString('base64')}` : '';

  // College logo base64 if available
  let logoBase64 = '';
  const logoPath = getLogoPath(collegeSettings.logoUrl);
  if (logoPath && fs.existsSync(logoPath)) {
    try {
      const logoBuffer = fs.readFileSync(logoPath);
      logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`;
    } catch (e) {
      console.warn('Image Logo embed skipped:', e.message);
    }
  }

  const svgOverlay = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <style>
        .watermark-title { font-family: Arial, sans-serif; font-weight: bold; font-size: ${Math.round(width * 0.045)}px; fill: rgba(16, 85, 180, 0.24); }
        .watermark-sub { font-family: Arial, sans-serif; font-weight: bold; font-size: ${Math.round(width * 0.022)}px; fill: rgba(16, 85, 180, 0.28); }
        .stamp-title { font-family: Arial, sans-serif; font-weight: bold; font-size: 11px; fill: #059669; }
        .stamp-text { font-family: Arial, sans-serif; font-weight: bold; font-size: 10px; fill: #0f172a; }
        .stamp-sub { font-family: Arial, sans-serif; font-size: 8.5px; fill: #475569; }
        .header-text { font-family: Arial, sans-serif; font-weight: bold; font-size: 10px; fill: #f8fafc; }
      </style>

      <!-- Center diagonal watermark -->
      <g transform="translate(${width / 2}, ${height / 2}) rotate(-30)">
        <text x="0" y="-12" text-anchor="middle" class="watermark-title">${safeWatermarkText}</text>
        <text x="0" y="${Math.round(width * 0.032)}" text-anchor="middle" class="watermark-sub">${safeCollegeName}</text>
        <text x="0" y="${Math.round(width * 0.060)}" text-anchor="middle" class="watermark-sub">REF: ${safeVerificationId} • ${safeVerifiedDateStr}</text>
      </g>

      <!-- Top Security Banner -->
      <rect x="0" y="0" width="${width}" height="26" fill="#0f172a" opacity="0.94" />
      <text x="15" y="17" class="header-text">✓ OFFICIAL VERIFIED MARKSHEET • ${safeCollegeCode} • REF: ${safeVerificationId} • SHA-256 DIGITAL HASH CERTIFIED</text>

      <!-- Security Stamp Box (Bottom Right) -->
      <g transform="translate(${width - 310}, ${height - 95})">
        <rect width="295" height="85" rx="6" ry="6" fill="#ffffff" stroke="#2563eb" stroke-width="2" opacity="0.96" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.15))" />
        ${logoBase64 ? `<image href="${logoBase64}" x="10" y="12" width="60" height="60" />` : ''}
        <g transform="translate(${logoBase64 ? 76 : 14}, 0)">
          <text x="0" y="20" class="stamp-title">✓ ${safeCollegeCode} CERTIFIED</text>
          <text x="0" y="36" class="stamp-text">REF: ${safeVerificationId}</text>
          <text x="0" y="50" class="stamp-sub">DATE: ${safeVerifiedDateStr}</text>
          <text x="0" y="62" class="stamp-sub">HASH: ${safeHashSnippet}...</text>
          <text x="0" y="74" class="stamp-sub" fill="#2563eb" font-weight="bold">SCAN QR TO VERIFY</text>
        </g>
        ${qrBase64 ? `<image href="${qrBase64}" x="225" y="12" width="60" height="60" />` : ''}
      </g>
    </svg>
  `;

  const watermarkedImage = await image
    .composite([{ input: Buffer.from(svgOverlay), top: 0, left: 0 }])
    .toBuffer();

  return {
    buffer: watermarkedImage,
    pageCount: 1,
    dimensions: `${width}x${height}`
  };
};

/**
 * Dispatcher for pending watermark preview
 */
const applyPendingWatermark = async (buffer, fileType, verificationId) => {
  if (fileType === 'application/pdf') {
    return await applyPendingWatermarkPDF(buffer, verificationId);
  } else if (fileType.startsWith('image/')) {
    return await applyPendingWatermarkImage(buffer, verificationId);
  } else {
    throw new Error(`Unsupported file type: ${fileType}`);
  }
};

/**
 * Dispatcher for final verified watermark
 */
const applyVerifiedWatermark = async (
  buffer,
  fileType,
  verificationId,
  verifiedDate = new Date(),
  fileHash = '',
  collegeSettings = {},
  qrBuffer = null
) => {
  const verifiedDateStr = formatDate(verifiedDate);
  if (fileType === 'application/pdf') {
    return await applyVerifiedWatermarkPDF(
      buffer,
      verificationId,
      verifiedDateStr,
      fileHash,
      collegeSettings,
      qrBuffer
    );
  } else if (fileType.startsWith('image/')) {
    return await applyVerifiedWatermarkImage(
      buffer,
      verificationId,
      verifiedDateStr,
      fileHash,
      collegeSettings,
      qrBuffer
    );
  } else {
    throw new Error(`Unsupported file type: ${fileType}`);
  }
};

module.exports = {
  applyPendingWatermark,
  applyVerifiedWatermark,
  applyWatermark: applyVerifiedWatermark, // backward compat
  formatDate
};
