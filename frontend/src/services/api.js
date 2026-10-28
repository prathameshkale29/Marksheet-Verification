import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: `${API_BASE_URL}/marksheets`,
  headers: {
    Accept: 'application/json'
  }
});

// Request interceptor to attach JWT token and active user role headers
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  const userRole = localStorage.getItem('user_role') || 'student';
  const userEmail = localStorage.getItem('user_email') || (userRole === 'admin' ? 'admin@college.edu' : 'student@college.edu');

  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  config.headers['x-user-role'] = userRole;
  config.headers['x-user-email'] = userEmail;
  return config;
});

/**
 * Authentication Services
 */
export const login = async (email, password) => {
  const response = await axios.post(`${API_BASE_URL}/auth/login`, { email, password });
  if (response.data?.token) {
    localStorage.setItem('auth_token', response.data.token);
    localStorage.setItem('user_role', response.data.user?.role || 'student');
    localStorage.setItem('user_email', response.data.user?.email || '');
    localStorage.setItem('user_name', response.data.user?.name || '');
  }
  return response.data;
};

export const getCurrentUser = async () => {
  const response = await axios.get(`${API_BASE_URL}/auth/me`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
      'x-user-role': localStorage.getItem('user_role') || 'student'
    }
  });
  return response.data;
};

export const logout = () => {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('user_role');
  localStorage.removeItem('user_email');
  localStorage.removeItem('user_name');
};

/**
 * Upload marksheet for verification
 */
export const uploadMarksheet = async (file, metadata = {}, onProgress) => {
  const formData = new FormData();
  formData.append('file', file);

  if (typeof metadata === 'function') {
    onProgress = metadata;
    metadata = {};
  }

  if (metadata.studentName) formData.append('studentName', metadata.studentName);
  if (metadata.rollNumber) formData.append('rollNumber', metadata.rollNumber);
  if (metadata.prn) formData.append('prn', metadata.prn);
  if (metadata.institution) formData.append('institution', metadata.institution);
  if (metadata.boardOrUniversity) formData.append('boardOrUniversity', metadata.boardOrUniversity);
  if (metadata.passingYear) formData.append('passingYear', metadata.passingYear);
  if (metadata.courseOrDegree) formData.append('courseOrDegree', metadata.courseOrDegree);
  if (metadata.semester) formData.append('semester', metadata.semester);
  if (metadata.totalMarksOrGrade) formData.append('totalMarksOrGrade', metadata.totalMarksOrGrade);
  if (metadata.ocrText) formData.append('ocrText', metadata.ocrText);
  if (metadata.forceRegister) formData.append('forceRegister', 'true');

  const response = await api.post('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(percentCompleted);
      }
    }
  });

  return response.data;
};

/**
 * Admin Action: Approve Marksheet
 */
export const approveMarksheet = async (verificationId, data = {}) => {
  const response = await api.post(`/${verificationId}/approve`, data);
  return response.data;
};

/**
 * Admin Action: Reject Marksheet
 */
export const rejectMarksheet = async (verificationId, data = {}) => {
  const response = await api.post(`/${verificationId}/reject`, data);
  return response.data;
};

/**
 * Admin Action: Correct OCR Extracted Details
 */
export const correctMarksheetOCR = async (verificationId, updatedFields, reason = '') => {
  const response = await api.put(`/${verificationId}/ocr-correct`, { updatedFields, reason });
  return response.data;
};

/**
 * Public Verification Endpoint (via QR Code or Direct ID lookup)
 */
export const getPublicVerification = async (verificationId) => {
  const response = await api.get(`/public-verify/${verificationId}`);
  return response.data;
};

/**
 * Decode & Verify document or token
 */
export const decodeAndVerifyDocument = async ({ file, token, verificationId, hash, ocrText }) => {
  if (file) {
    const formData = new FormData();
    formData.append('file', file);
    if (token) formData.append('token', token);
    if (verificationId) formData.append('verificationId', verificationId);
    if (hash) formData.append('hash', hash);
    if (ocrText) formData.append('ocrText', ocrText);

    const response = await api.post('/decode-verify', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  } else {
    const response = await api.post('/decode-verify', { token, verificationId, hash });
    return response.data;
  }
};

/**
 * Review marksheet details (side-by-side comparison)
 */
export const getMarksheetForReview = async (verificationId) => {
  const response = await api.get(`/review/${verificationId}`);
  return response.data;
};

/**
 * Fetch overview statistics for dashboards
 */
export const getStats = async () => {
  const response = await api.get('/stats');
  return response.data;
};

/**
 * Fetch all marksheets with search & pagination
 */
export const getMarksheets = async (params = {}) => {
  const response = await api.get('/', { params });
  return response.data;
};

/**
 * Fetch single marksheet details by verification ID
 */
export const getMarksheetById = async (verificationId) => {
  const response = await api.get(`/${verificationId}`);
  return response.data;
};

/**
 * Fetch verification history attempts
 */
export const getVerificationHistory = async (params = {}) => {
  const response = await api.get('/history', { params });
  return response.data;
};

/**
 * Check if a document SHA-256 hash already exists in DB
 */
export const checkHashExists = async (hash) => {
  try {
    const response = await api.get(`/hash/${hash}`);
    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      return { exists: false };
    }
    throw error;
  }
};

/**
 * Helper to construct download URL for watermarked document
 */
export const getDownloadUrl = (verificationId) => {
  return `${API_BASE_URL}/marksheets/${verificationId}/download`;
};

/**
 * Helper to construct full media URL for static files served by Express server
 */
export const getMediaUrl = (relativeUrl) => {
  if (!relativeUrl) return '';
  if (relativeUrl.startsWith('http://') || relativeUrl.startsWith('https://')) {
    return relativeUrl;
  }
  const baseUrl = API_BASE_URL.replace('/api', '');
  return `${baseUrl}${relativeUrl}`;
};

/**
 * Settings and Institutional Records APIs
 */
export const getCollegeSettings = async () => {
  const response = await axios.get(`${API_BASE_URL}/settings`);
  return response.data;
};

export const updateCollegeSettings = async (settingsData) => {
  const response = await axios.put(`${API_BASE_URL}/settings`, settingsData, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
      'x-user-role': localStorage.getItem('user_role') || 'admin'
    }
  });
  return response.data;
};

export const uploadCollegeLogo = async (file) => {
  const formData = new FormData();
  formData.append('logo', file);
  const response = await axios.post(`${API_BASE_URL}/settings/logo`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
      Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
      'x-user-role': localStorage.getItem('user_role') || 'admin'
    }
  });
  return response.data;
};

export const getInstitutionalRecords = async (params = {}) => {
  const response = await axios.get(`${API_BASE_URL}/settings/institutional-records`, {
    params,
    headers: {
      Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
      'x-user-role': localStorage.getItem('user_role') || 'admin'
    }
  });
  return response.data;
};

export const getAuditLogs = async (params = {}) => {
  const response = await axios.get(`${API_BASE_URL}/settings/audit-logs`, {
    params,
    headers: {
      Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
      'x-user-role': localStorage.getItem('user_role') || 'admin'
    }
  });
  return response.data;
};

export default api;
