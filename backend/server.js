const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const marksheetRoutes = require('./routes/marksheetRoutes');
const errorHandler = require('./middleware/errorHandler');

// Load environment variables
dotenv.config();

// Connect to Database (MongoDB Atlas with MongoMemoryServer fallback)
connectDB();

const app = express();

// Middleware
app.use(cors({
  origin: '*', // Allow connections from frontend
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploads static directory for document viewing
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
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

app.listen(PORT, () => {
  console.log(`
=====================================================
🛡️  MARKSHEET VERIFICATION & WATERMARK SYSTEM API
🚀  Server running on http://localhost:${PORT}
📁  Uploads directory: ${path.join(__dirname, 'uploads')}
=====================================================
  `);
});
