const { PDFDocument, rgb, degrees, StandardFonts } = require('pdf-lib');
const sharp = require('sharp');

/**
 * Formats a Date object to readable format e.g. "01-Oct-2026 14:30"
 */
const formatDate = (dateObj = new Date()) => {
  const options = { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' };
  return new Date(dateObj).toLocaleDateString('en-GB', options);
};

/**
 * Apply watermark to PDF files
 */
const watermarkPDF = async (buffer, verificationId, verifiedDateStr, fileHash) => {
  let pdfDoc;
  try {
    pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  } catch (pdfErr) {
    throw new Error('Invalid or corrupted PDF document structure. Please upload a valid PDF file.');
  }

  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pages = pdfDoc.getPages();

  const hashSnippet = fileHash ? fileHash.substring(0, 12).toUpperCase() : 'HASH-VERIFIED';

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const { width, height } = page.getSize();

    // 1. Primary diagonal watermark text across center
    const titleText = "VERIFIED DOCUMENT";
    const subText1 = `VERIFICATION ID: ${verificationId}`;
    const subText2 = `VERIFIED ON: ${verifiedDateStr}`;
    const subText3 = `HASH: ${hashSnippet}...`;

    const fontSizeTitle = Math.min(width, height) * 0.055;
    const fontSizeSub = fontSizeTitle * 0.55;

    // Draw main diagonal text watermark
    const centerX = width / 2;
    const centerY = height / 2;

    page.drawText(titleText, {
      x: centerX - 160,
      y: centerY + 30,
      size: fontSizeTitle,
      font: font,
      color: rgb(0.12, 0.45, 0.85),
      opacity: 0.22,
      rotate: degrees(35)
    });

    page.drawText(subText1, {
      x: centerX - 140,
      y: centerY,
      size: fontSizeSub,
      font: font,
      color: rgb(0.12, 0.45, 0.85),
      opacity: 0.25,
      rotate: degrees(35)
    });

    page.drawText(subText2, {
      x: centerX - 140,
      y: centerY - 20,
      size: fontSizeSub,
      font: regularFont,
      color: rgb(0.12, 0.45, 0.85),
      opacity: 0.25,
      rotate: degrees(35)
    });

    // 2. Security Stamp Box at Bottom-Right Corner
    const boxWidth = 220;
    const boxHeight = 65;
    const boxX = width - boxWidth - 20;
    const boxY = 20;

    // Stamp Background rectangle
    page.drawRectangle({
      x: boxX,
      y: boxY,
      width: boxWidth,
      height: boxHeight,
      color: rgb(0.95, 0.97, 1.0),
      borderColor: rgb(0.1, 0.4, 0.8),
      borderWidth: 1.5,
      opacity: 0.92
    });

    // Inner Stamp Header
    page.drawText("[VERIFIED] OFFICIAL DIGITAL STAMP", {
      x: boxX + 10,
      y: boxY + boxHeight - 18,
      size: 8.5,
      font: font,
      color: rgb(0.05, 0.5, 0.3)
    });

    // Stamp Details
    page.drawText(`ID: ${verificationId}`, {
      x: boxX + 10,
      y: boxY + boxHeight - 33,
      size: 8.5,
      font: font,
      color: rgb(0.1, 0.2, 0.4)
    });

    page.drawText(`DATE: ${verifiedDateStr}`, {
      x: boxX + 10,
      y: boxY + boxHeight - 46,
      size: 7.5,
      font: regularFont,
      color: rgb(0.3, 0.3, 0.3)
    });

    page.drawText(`FINGERPRINT: SHA256-${hashSnippet}`, {
      x: boxX + 10,
      y: boxY + boxHeight - 58,
      size: 6.5,
      font: regularFont,
      color: rgb(0.4, 0.4, 0.5)
    });

    // 3. Top Security Header Bar
    page.drawRectangle({
      x: 0,
      y: height - 14,
      width: width,
      height: 14,
      color: rgb(0.08, 0.12, 0.2)
    });

    page.drawText(`AUTHENTICATED MARKSHEET | SYSTEM VERIFICATION ID: ${verificationId} | DIGITAL HASH VERIFIED`, {
      x: 15,
      y: height - 10,
      size: 6.5,
      font: font,
      color: rgb(0.85, 0.95, 1.0)
    });
  }

  const watermarkedPdfBytes = await pdfDoc.save();
  return {
    buffer: Buffer.from(watermarkedPdfBytes),
    pageCount: pages.length
  };
};

/**
 * Apply watermark to Image files (JPG, PNG, WEBP)
 */
const watermarkImage = async (buffer, verificationId, verifiedDateStr, fileHash) => {
  const image = sharp(buffer);
  const metadata = await image.metadata();
  const width = metadata.width || 800;
  const height = metadata.height || 1000;

  const hashSnippet = fileHash ? fileHash.substring(0, 12).toUpperCase() : 'HASH-VERIFIED';

  // Create SVG watermark overlay with crisp vector elements
  const svgOverlay = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <style>
        .watermark-title { font-family: Arial, sans-serif; font-weight: bold; font-size: ${Math.round(width * 0.045)}px; fill: rgba(16, 85, 180, 0.28); }
        .watermark-sub { font-family: Arial, sans-serif; font-weight: bold; font-size: ${Math.round(width * 0.024)}px; fill: rgba(16, 85, 180, 0.32); }
        .stamp-title { font-family: Arial, sans-serif; font-weight: bold; font-size: 13px; fill: #059669; }
        .stamp-text { font-family: Arial, sans-serif; font-weight: bold; font-size: 11px; fill: #1e293b; }
        .stamp-sub { font-family: Arial, sans-serif; font-size: 9.5px; fill: #64748b; }
        .header-text { font-family: Arial, sans-serif; font-weight: bold; font-size: 10px; fill: #f8fafc; }
      </style>

      <!-- Center diagonal watermark -->
      <g transform="translate(${width / 2}, ${height / 2}) rotate(-30)">
        <text x="0" y="-10" text-anchor="middle" class="watermark-title">VERIFIED DOCUMENT</text>
        <text x="0" y="${Math.round(width * 0.035)}" text-anchor="middle" class="watermark-sub">ID: ${verificationId}</text>
        <text x="0" y="${Math.round(width * 0.065)}" text-anchor="middle" class="watermark-sub">VERIFIED ON: ${verifiedDateStr}</text>
      </g>

      <!-- Security Header Top Banner -->
      <rect x="0" y="0" width="${width}" height="24" fill="#0f172a" opacity="0.9" />
      <text x="15" y="16" class="header-text">✓ OFFICIAL DIGITAL MARKSHEET VERIFICATION • ID: ${verificationId} • SHA-256 HASH VERIFIED</text>

      <!-- Official Security Stamp Badge (Bottom Right) -->
      <g transform="translate(${width - 245}, ${height - 85})">
        <rect width="230" height="70" rx="6" ry="6" fill="#ffffff" stroke="#2563eb" stroke-width="2" opacity="0.95" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.1))" />
        <text x="12" y="20" class="stamp-title">✓ DIGITAL VERIFICATION STAMP</text>
        <text x="12" y="37" class="stamp-text">ID: ${verificationId}</text>
        <text x="12" y="52" class="stamp-sub">DATE: ${verifiedDateStr}</text>
        <text x="12" y="64" class="stamp-sub">HASH: SHA256-${hashSnippet}</text>
      </g>
    </svg>
  `;

  const watermarkedImageBuffer = await image
    .composite([{ input: Buffer.from(svgOverlay), top: 0, left: 0 }])
    .toBuffer();

  return {
    buffer: watermarkedImageBuffer,
    pageCount: 1,
    dimensions: `${width}x${height}`
  };
};

/**
 * Main watermark dispatcher
 */
const applyWatermark = async (buffer, fileType, verificationId, verifiedDate = new Date(), fileHash = '') => {
  const verifiedDateStr = formatDate(verifiedDate);

  if (fileType === 'application/pdf') {
    return await watermarkPDF(buffer, verificationId, verifiedDateStr, fileHash);
  } else if (fileType.startsWith('image/')) {
    return await watermarkImage(buffer, verificationId, verifiedDateStr, fileHash);
  } else {
    throw new Error(`Unsupported file type for watermarking: ${fileType}`);
  }
};

module.exports = {
  applyWatermark,
  formatDate
};
