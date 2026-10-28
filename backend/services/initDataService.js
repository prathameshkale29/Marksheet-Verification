const User = require('../models/User');
const CollegeSettings = require('../models/CollegeSettings');
const InstitutionalRecord = require('../models/InstitutionalRecord');

const initializeDefaultData = async () => {
  try {
    // 1. Seed Users if not present
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log('🌱 Seeding initial system accounts...');
      await User.create([
        {
          name: 'College Admin / Student Section Staff',
          email: 'admin@college.edu',
          password: 'Admin@12345',
          role: 'admin',
          department: 'Academic Section & Student Verification Bureau'
        },
        {
          name: 'Chaudhari Om Hemant',
          email: 'student@college.edu',
          password: 'Student@12345',
          role: 'student',
          rollNumber: '23046491612037',
          department: 'Computer Engineering'
        }
      ]);
      console.log('✅ Default users initialized: admin@college.edu & student@college.edu');
    }

    // 2. Seed College Settings if not present
    const settingsCount = await CollegeSettings.countDocuments();
    if (settingsCount === 0) {
      console.log('🌱 Initializing official College Settings...');
      await CollegeSettings.create({
        institutionName: 'Government Institute of Technology & Engineering',
        institutionCode: 'GITE-401',
        department: 'Examination & Student Verification Section',
        logoUrl: '/uploads/assets/college-logo.png',
        watermarkText: 'OFFICIALLY VERIFIED',
        contactEmail: 'student.section@college.edu',
        contactPhone: '+91 (020) 2550-7000',
        address: 'Shivajinagar, Pune - 411005, Maharashtra, India',
        signatoryTitle: 'Controller of Examinations',
        authorizedAffiliation: 'Autonomous Institute affiliated to State Technical University'
      });
      console.log('✅ College Settings initialized.');
    }

    // 3. Seed Institutional Master Records if not present
    const recordCount = await InstitutionalRecord.countDocuments();
    if (recordCount === 0) {
      console.log('🌱 Seeding Authorized College Master Records...');
      await InstitutionalRecord.create([
        {
          rollNumber: '23046491612037',
          prn: '23046491612037',
          studentName: 'CHAUDHARI OM HEMANT',
          course: 'Bachelor of Technology (B.Tech)',
          department: 'Computer Engineering',
          semester: 'Semester VI',
          examinationSession: 'May/June 2025',
          passingYear: '2025',
          totalMarks: '685 / 800',
          sgpaOrCgpa: '8.92',
          resultGrade: 'First Class with Distinction',
          issueStatus: 'GENUINE_ISSUED',
          institutionName: 'Government Institute of Technology & Engineering'
        },
        {
          rollNumber: '2304621613007',
          prn: '2304621613007',
          studentName: 'PRATHAMESH KALE',
          course: 'Bachelor of Technology (B.Tech)',
          department: 'Information Technology',
          semester: 'Semester VI',
          examinationSession: 'May/June 2025',
          passingYear: '2025',
          totalMarks: '710 / 800',
          sgpaOrCgpa: '9.15',
          resultGrade: 'First Class with Distinction',
          issueStatus: 'GENUINE_ISSUED',
          institutionName: 'Government Institute of Technology & Engineering'
        },
        {
          rollNumber: '1304491613837',
          prn: '1304491613837',
          studentName: 'ROHIT PATIL',
          course: 'Bachelor of Technology (B.Tech)',
          department: 'Mechanical Engineering',
          semester: 'Semester VIII',
          examinationSession: 'May 2024',
          passingYear: '2024',
          totalMarks: '640 / 800',
          sgpaOrCgpa: '8.20',
          resultGrade: 'First Class',
          issueStatus: 'GENUINE_ISSUED',
          institutionName: 'Government Institute of Technology & Engineering'
        }
      ]);
      console.log('✅ Authorized Institutional Records initialized.');
    }
  } catch (err) {
    console.error('Data initialization warning:', err.message);
  }
};

module.exports = {
  initializeDefaultData
};
