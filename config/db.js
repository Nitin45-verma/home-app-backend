const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/housewives';
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,  // Fail fast if MongoDB unreachable (5s)
      socketTimeoutMS: 10000,          // Abort slow queries after 10s
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    console.error(`Attempted URI: ${(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/housewives').replace(/:\/\/.*@/, '://<credentials>@')}`);
    process.exit(1);
  }
};

module.exports = connectDB;
