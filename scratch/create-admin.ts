
import { User } from '../src/models/User';
import { connectMongo } from '../src/lib/db/mongodb';
import bcrypt from 'bcryptjs';

async function createAdmin() {
  await connectMongo();
  
  const username = 'admin';
  const password = 'password123';
  const passwordHash = await bcrypt.hash(password, 12);
  
  const existing = await User.findOne({ username });
  if (existing) {
    console.log('User admin already exists.');
    process.exit(0);
  }
  
  await User.create({
    username,
    passwordHash,
    role: 'admin',
    isActive: true,
    provider: 'local'
  });
  
  console.log('Admin user created successfully!');
  console.log('Username: admin');
  console.log('Password: password123');
  process.exit(0);
}

createAdmin();
