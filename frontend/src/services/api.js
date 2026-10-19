import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/marksheets';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Accept': 'application/json'
  }
});

/**
 * Upload and encode marksheet file with optional candidate details
 * @param {File} file 
 * @param {Object} metadata - { studentName, rollNumber, institution, uploaderName, forceRegister }
 * @param {Function} onProgress 
 */
export const uploadMarksheet = async (file, metadata = {}, onProgress) => {
  const formData = new FormData();
  formData.append('file', file);

  if (typeof metadata === 'function') {
    onProgress = metadata;
    metadata = {};
  }

  // Append candidate and uploader fields if provided
  if (metadata.studentName) formData.append('studentName', metadata.studentName);
  if (metadata.rollNumber) formData.append('rollNumber', metadata.rollNumber);
  if (metadata.prn) formData.append('prn', metadata.prn);
  if (metadata.institution) formData.append('institution', metadata.institution);
  if (metadata.boardOrUniversity) formData.append('boardOrUniversity', metadata.boardOrUniversity);
  if (metadata.passingYear) formData.append('passingYear', metadata.passingYear);
  if (metadata.courseOrDegree) formData.append('courseOrDegree', metadata.courseOrDegree);
  if (metadata.totalMarksOrGrade) formData.append('totalMarksOrGrade', metadata.totalMarksOrGrade);
  if (metadata.uploaderName) formData.append('uploaderName', metadata.uploaderName);
  if (metadata.uploaderEmail) formData.append('uploaderEmail', metadata.uploaderEmail);
  if (metadata.ocrText) formData.append('ocrText', metadata.ocrText);
  if (metadata.extractedText) formData.append('extractedText', metadata.extractedText);
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
 * Decode & Verify document or token
 * Answers:
 * 1. Is it an authentic marksheet?
 * 2. Is it 100% original as first uploaded by the user, or tampered?
 * @param {Object} param0 - { file, token, verificationId, hash, ocrText }
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
 * Review marksheet details on any mobile / desktop device
 * @param {string} verificationId 
 */
export const getMarksheetForReview = async (verificationId) => {
  const response = await api.get(`/review/${verificationId}`);
  return response.data;
};

/**
 * Fetch overview statistics for admin dashboard
 */
export const getStats = async () => {
  const response = await api.get('/stats');
  return response.data;
};

/**
 * Fetch all verified marksheets with search & pagination
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
  return `${API_BASE_URL}/${verificationId}/download`;
};

/**
 * Helper to construct full media URL for static files served by Express server
 */
export const getMediaUrl = (relativeUrl) => {
  if (!relativeUrl) return '';
  if (relativeUrl.startsWith('http://') || relativeUrl.startsWith('https://')) {
    return relativeUrl;
  }
  const baseUrl = API_BASE_URL.replace('/api/marksheets', '');
  return `${baseUrl}${relativeUrl}`;
};

export default api;
