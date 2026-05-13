/* eslint-disable @typescript-eslint/no-require-imports */
const { createServer } = require("http");
const next = require("next");
const mongoose = require("mongoose");

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB?.trim();

if (!MONGODB_URI) {
  console.error("Missing MONGODB_URI environment variable. Please set it before starting the app.");
  process.exit(1);
}

const mongoOptions = { bufferCommands: false };
if (MONGODB_DB) {
  mongoOptions.dbName = MONGODB_DB;
}

mongoose.connection.on("connected", () => {
  console.log(`MongoDB event: connected (db=${mongoose.connection.name || MONGODB_DB || "default"})`);
});

mongoose.connection.on("error", (err) => {
  console.error("MongoDB event: connection error:", err instanceof Error ? err.message : err);
});

mongoose.connection.on("disconnected", () => {
  console.warn("MongoDB event: disconnected");
});

async function verifyMongoConnection() {
  console.log("Verifying MongoDB connection before starting the app...");
  try {
    await mongoose.connect(MONGODB_URI, mongoOptions);
    const dbName = mongoose.connection.name || MONGODB_DB || "default";
    console.log(`MongoDB connection verified: db=${dbName}`);
    await mongoose.disconnect();
  } catch (error) {
    console.error("Failed to verify MongoDB connection:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

verifyMongoConnection()
  .then(() => app.prepare())
  .then(() => {
    createServer((req, res) => {
      handle(req, res);
    }).listen(PORT, (err) => {
      if (err) {
        console.error("Failed to start server:", err);
        process.exit(1);
      }
      console.log(`> Ready on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Startup failure:", error instanceof Error ? error.message : error);
    process.exit(1);
  });
