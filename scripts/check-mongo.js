const mongoose = require("mongoose");

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB?.trim();

if (!MONGODB_URI) {
  console.error("Missing MONGODB_URI environment variable. Please set it before starting the app.");
  process.exit(1);
}

const opts = { bufferCommands: false };
if (MONGODB_DB) {
  opts.dbName = MONGODB_DB;
}

async function testMongoConnection() {
  console.log("Testing MongoDB connection...");
  try {
    await mongoose.connect(MONGODB_URI, opts);
    console.log("MongoDB connection successful.");
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("MongoDB connection failed:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

testMongoConnection();
