const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const marksheetRoutes = require('./routes/marksheetRoutes');
const authRoutes = require('./routes/authRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const errorHandler = require('./middleware/errorHandler');
const { initializeDefaultData } = require('./services/initDataService');

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(
  cors({
    origin: '*', // Allow connections from frontend
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-user-role', 'x-user-email']
  })
);

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Serve uploads static directory for document viewing
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/marksheets', marksheetRoutes);

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    system: 'Marksheet Verification & Watermark System API',
    timestamp: new Date().toISOString()
  });
});

// Global Error Handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Connect to Database and start server
const startServer = async () => {
  await connectDB();
  await initializeDefaultData();

  app.listen(PORT, () => {
    console.log(`
=====================================================
🛡️  MARKSHEET VERIFICATION & WATERMARK SYSTEM API
🚀  Server running on http://localhost:${PORT}
📁  Uploads directory: ${path.join(__dirname, 'uploads')}
=====================================================
    `);
  });
};

startServer();
