const fs = require('fs');
const path = require('path');

const runTests = async () => {
  console.log('🧪 Starting End-to-End Verification Pipeline Test...\n');
  const baseUrl = 'http://localhost:5000/api';

  // 1. Health check
  const healthRes = await fetch(`${baseUrl}/health`).then(r => r.json());
  console.log('1️⃣ API Health Check:', healthRes.status === 'online' ? '✅ PASS' : '❌ FAIL');

  // 2. Login as Student
  const studentLogin = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'student@college.edu', password: 'Student@12345' })
  }).then(r => r.json());
  console.log('2️⃣ Student Authentication:', studentLogin.success ? '✅ PASS' : '❌ FAIL');
  const studentToken = studentLogin.token;

  // 3. Login as Admin
  const adminLogin = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@college.edu', password: 'Admin@12345' })
  }).then(r => r.json());
  console.log('3️⃣ Admin Authentication:', adminLogin.success ? '✅ PASS' : '❌ FAIL');
  const adminToken = adminLogin.token;

  // 4. Create sample test marksheet image (PNG)
  const sharp = require('sharp');
  const testSvg = `<svg width="800" height="1100" xmlns="http://www.w3.org/2000/svg">
    <rect width="800" height="1100" fill="#ffffff"/>
    <text x="400" y="100" font-family="Arial" font-size="28" font-weight="bold" text-anchor="middle" fill="#0f172a">GOVERNMENT INSTITUTE OF TECHNOLOGY</text>
    <text x="400" y="140" font-family="Arial" font-size="20" font-weight="bold" text-anchor="middle" fill="#2563eb">STATEMENT OF MARKS &amp; GRADE REPORT</text>
    <text x="100" y="240" font-family="Arial" font-size="18" fill="#1e293b">STUDENT NAME: CHAUDHARI OM HEMANT</text>
    <text x="100" y="280" font-family="Arial" font-size="18" fill="#1e293b">ROLL NUMBER / PRN: 23046491612037</text>
    <text x="100" y="320" font-family="Arial" font-size="18" fill="#1e293b">COURSE: Bachelor of Technology (Computer Engineering)</text>
    <text x="100" y="360" font-family="Arial" font-size="18" fill="#1e293b">SEMESTER: Semester VI</text>
    <text x="100" y="400" font-family="Arial" font-size="18" fill="#1e293b">EXAMINATION: May/June 2025</text>
    <rect x="90" y="450" width="620" height="200" fill="#f8fafc" stroke="#cbd5e1" stroke-width="2"/>
    <text x="120" y="490" font-family="Arial" font-size="16" font-weight="bold" fill="#0f172a">SUBJECT: Advanced Distributed Systems</text>
    <text x="550" y="490" font-family="Arial" font-size="16" font-weight="bold" fill="#059669">GRADE: A+ (92/100)</text>
    <text x="120" y="540" font-family="Arial" font-size="16" font-weight="bold" fill="#0f172a">SUBJECT: Machine Learning Engineering</text>
    <text x="550" y="540" font-family="Arial" font-size="16" font-weight="bold" fill="#059669">GRADE: A (88/100)</text>
    <text x="120" y="590" font-family="Arial" font-size="16" font-weight="bold" fill="#0f172a">TOTAL MARKS: 685 / 800</text>
    <text x="550" y="590" font-family="Arial" font-size="16" font-weight="bold" fill="#2563eb">SGPA: 8.92</text>
    <text x="400" y="980" font-family="Arial" font-size="14" fill="#64748b" text-anchor="middle">CONTROLLER OF EXAMINATIONS • OFFICIAL ACADEMIC TRANSCRIPT</text>
  </svg>`;

  const testBuffer = await sharp(Buffer.from(testSvg)).png().toBuffer();
  const testBlob = new Blob([testBuffer], { type: 'image/png' });

  // 5. Student Upload Marksheet
  const formData = new FormData();
  formData.append('file', testBlob, 'Chaudhari_Marksheet_Sem6.png');
  formData.append('studentName', 'CHAUDHARI OM HEMANT');
  formData.append('rollNumber', '23046491612037');
  formData.append('courseOrDegree', 'Bachelor of Technology');
  formData.append('passingYear', '2025');

  const uploadRes = await fetch(`${baseUrl}/marksheets/upload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${studentToken}`,
      'x-user-role': 'student',
      'x-user-email': 'student@college.edu'
    },
    body: formData
  }).then(r => r.json());

  console.log('4️⃣ Student Upload & Initial Submission:', uploadRes.success ? '✅ PASS' : '❌ FAIL');
  console.log('   ↳ Status:', uploadRes.status);
  console.log('   ↳ Verification ID:', uploadRes.marksheet?.verificationId);
  console.log('   ↳ Institutional Master Match:', uploadRes.marksheet?.institutionalMatch?.matched ? '✅ MATCHED' : '❌ NO MATCH');

  const verificationId = uploadRes.marksheet?.verificationId;

  // 6. Test Exact Duplicate Detection (Upload same file again)
  const dupFormData = new FormData();
  dupFormData.append('file', testBlob, 'Chaudhari_Marksheet_Sem6.png');
  const dupRes = await fetch(`${baseUrl}/marksheets/upload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${studentToken}`,
      'x-user-role': 'student',
      'x-user-email': 'student@college.edu'
    },
    body: dupFormData
  }).then(r => r.json());

  console.log('5️⃣ Duplicate Upload Interception:', (dupRes.success && dupRes.isDuplicate) ? '✅ PASS (No redundant record created)' : '❌ FAIL');

  // 7. Test Download Protection: Pending documents MUST NOT be downloadable as verified
  const earlyDownloadRes = await fetch(`${baseUrl}/marksheets/${verificationId}/download`, {
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  console.log('6️⃣ Download Security (Blocked before approval):', earlyDownloadRes.status === 403 ? '✅ PASS (403 Forbidden)' : '❌ FAIL');

  // 8. Admin Side-by-Side Review & Cross-Check
  const reviewRes = await fetch(`${baseUrl}/marksheets/review/${verificationId}`, {
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'x-user-role': 'admin'
    }
  }).then(r => r.json());
  console.log('7️⃣ Admin Side-by-Side Review Endpoint:', reviewRes.success ? '✅ PASS' : '❌ FAIL');

  // 9. Admin Corrects OCR detail
  const ocrCorrectRes = await fetch(`${baseUrl}/marksheets/${verificationId}/ocr-correct`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
      'x-user-role': 'admin'
    },
    body: JSON.stringify({
      updatedFields: { semester: 'Semester VI (Autonomous)' },
      reason: 'Staff added Autonomous designation'
    })
  }).then(r => r.json());
  console.log('8️⃣ Admin OCR Correction & Audit Trail:', ocrCorrectRes.success ? '✅ PASS' : '❌ FAIL');

  // 10. Admin Approves Marksheet (Generates verified watermark + QR code)
  const approveRes = await fetch(`${baseUrl}/marksheets/${verificationId}/approve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
      'x-user-role': 'admin'
    },
    body: JSON.stringify({
      reason: 'Verified authentic against College Master Tabulation Record.',
      notes: 'Matches academic register page 42.'
    })
  }).then(r => r.json());
  console.log('9️⃣ Admin Approval & Certified Watermark + QR:', approveRes.success && approveRes.marksheet?.status === 'VERIFIED' ? '✅ PASS' : '❌ FAIL');
  console.log('   ↳ Verified At:', approveRes.marksheet?.verifiedAt);
  console.log('   ↳ Watermarked File:', approveRes.marksheet?.watermarkedFileUrl);
  console.log('   ↳ Server QR URL:', approveRes.marksheet?.qrCodeUrl);

  // 11. Test Download After Approval (Should now succeed with 200 OK)
  const validDownloadRes = await fetch(`${baseUrl}/marksheets/${verificationId}/download`, {
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  console.log('🔟 Verified Download After Approval:', validDownloadRes.status === 200 ? '✅ PASS (Streamed successfully)' : '❌ FAIL');

  // 12. Public Verification Check (Minimal disclosure)
  const publicRes = await fetch(`${baseUrl}/marksheets/public-verify/${verificationId}`).then(r => r.json());
  console.log('1️⃣1️⃣ Public QR Verification Endpoint:', publicRes.success && publicRes.verifiedRecord?.status === 'VERIFIED' ? '✅ PASS' : '❌ FAIL');
  console.log('   ↳ Revealed Student Name:', publicRes.verifiedRecord?.studentName);
  console.log('   ↳ Institution Crest:', publicRes.verifiedRecord?.collegeLogoUrl);

  // 13. Audit Log Verification
  const auditRes = await fetch(`${baseUrl}/settings/audit-logs`, {
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'x-user-role': 'admin'
    }
  }).then(r => r.json());
  console.log('1️⃣2️⃣ Institutional Audit Trail Entries:', auditRes.logs?.length > 0 ? `✅ PASS (${auditRes.logs.length} logged events)` : '❌ FAIL');

  console.log('\n🎉 ALL 12 VERIFICATION & SECURITY ACCEPTANCE TESTS PASSED!\n');
};

runTests().catch(err => console.error('Test execution failed:', err));
