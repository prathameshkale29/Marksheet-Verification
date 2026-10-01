import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/marksheets';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Accept': 'application/json'
  }
});

/**
 * Upload and verify marksheet file
 * @param {File} file 
 * @param {Function} onProgress 
 */
export const uploadMarksheet = async (file, onProgress) => {
  const formData = new FormData();
  formData.append('file', file);

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
