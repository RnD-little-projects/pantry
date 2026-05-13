
import { verifyMongoConnection } from '../src/lib/db/mongodb';

async function run() {
  console.log('Testing MongoDB connection...');
  try {
    await verifyMongoConnection();
    console.log('SUCCESS: Connection established.');
    process.exit(0);
  } catch (error) {
    console.error('FAILURE: Could not connect to MongoDB.');
    console.error(error);
    process.exit(1);
  }
}

run();
