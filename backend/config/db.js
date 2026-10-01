const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoMemoryServer = null;

const connectDB = async () => {
  try {
    let mongoUri = process.env.MONGODB_URI;

    if (!mongoUri || mongoUri.trim() === '' || mongoUri.includes('YOUR_MONGODB')) {
      console.log('⚠️  No MongoDB Atlas URI specified in environment. Starting in-memory MongoDB server for instant setup...');
      mongoMemoryServer = await MongoMemoryServer.create();
      mongoUri = mongoMemoryServer.getUri();
      console.log(`🚀 In-Memory MongoDB running at: ${mongoUri}`);
    }

    const conn = await mongoose.connect(mongoUri, {
      // Mongoose 6+ uses modern defaults automatically
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ Primary MongoDB connection failed: ${error.message}`);
    
    // Attempt fallback to memory server if Atlas connection failed
    if (!mongoMemoryServer) {
      try {
        console.log('🔄 Attempting fallback to in-memory MongoDB server...');
        mongoMemoryServer = await MongoMemoryServer.create();
        const fallbackUri = mongoMemoryServer.getUri();
        const conn = await mongoose.connect(fallbackUri);
        console.log(`✅ In-Memory MongoDB Connected (Fallback): ${conn.connection.host}`);
      } catch (fallbackErr) {
        console.error(`❌ Fallback MongoDB connection also failed: ${fallbackErr.message}`);
        process.exit(1);
      }
    } else {
      process.exit(1);
    }
  }
};

module.exports = connectDB;
