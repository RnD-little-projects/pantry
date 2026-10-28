import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable inside .env.local");
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections from growing exponentially
 * during API Route usage.
 */
const globalWithMongoose = globalThis as typeof globalThis & {
  mongoose?: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };
};

let cached = globalWithMongoose.mongoose;

if (!cached) {
  cached = globalWithMongoose.mongoose = { conn: null, promise: null };
}

// Ensure cached is not undefined for the rest of the file
const safeCached = cached!;

function resolveMongoOptions() {
  const dbName = process.env.MONGODB_DB?.trim();

  if (!dbName) {
    return { bufferCommands: false } as const;
  }

  return {
    bufferCommands: false,
    dbName,
  } as const;
}

async function connectDB() {
  if (safeCached.conn) {
    return safeCached.conn;
  }

  if (!safeCached.promise) {
    const opts = resolveMongoOptions();

    safeCached.promise = mongoose.connect(MONGODB_URI!, opts).then((mongooseInstance) => {
      return mongooseInstance;
    });
  }

  try {
    safeCached.conn = await safeCached.promise;
  } catch (e) {
    safeCached.promise = null;
    throw e;
  }

  return safeCached.conn;
}

export { connectDB as connectMongo };
export default connectDB;
