const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'MARKSHEET_VERIFICATION_JWT_SECRET_2026';

/**
 * Middleware to authenticate requests via JWT or demo role header
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    // Check custom role override header for rapid demo role switching (if provided in frontend)
    const demoRole = req.headers['x-user-role'];
    const demoEmail = req.headers['x-user-email'];

    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');
        if (user) {
          req.user = user;
          return next();
        }
      } catch (tokenErr) {
        // Token expired or invalid, fall through
      }
    }

    if (demoRole) {
      // Find or attach mock user context
      req.user = {
        _id: demoRole === 'admin' ? 'admin_001' : 'student_001',
        name: demoRole === 'admin' ? 'College Admin (Student Section)' : 'Student User',
        email: demoEmail || (demoRole === 'admin' ? 'admin@college.edu' : 'student@college.edu'),
        role: demoRole === 'admin' ? 'admin' : 'student',
        rollNumber: demoRole === 'admin' ? '' : '23046491612037'
      };
      return next();
    }

    // Default guest user
    req.user = {
      _id: 'guest_user',
      name: 'Student Guest',
      email: 'student@college.edu',
      role: 'student',
      rollNumber: ''
    };
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Middleware requiring authenticated user
 */
const requireAuth = (req, res, next) => {
  if (!req.user || !req.user._id) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Please log in to access this resource.'
    });
  }
  next();
};

/**
 * Middleware requiring College Admin / Student Section role
 */
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Access denied: College Administration authorization required.'
    });
  }
  next();
};

module.exports = {
  authenticateToken,
  requireAuth,
  requireAdmin,
  JWT_SECRET
};
