
import { User } from '../src/models/User';
import { connectMongo } from '../src/lib/db/mongodb';

async function checkUsers() {
  await connectMongo();
  const count = await User.countDocuments();
  console.log(`Total users in DB: ${count}`);
  
  if (count > 0) {
    const users = await User.find({}, { username: 1, email: 1, role: 1, isActive: 1, passwordHash: 1 }).lean();
    console.log('Users list:');
    users.forEach(u => {
      console.log(`- ${u.username} (${u.email || 'no email'}) [Role: ${u.role}, Active: ${u.isActive}, HasPassword: ${!!u.passwordHash}]`);
    });
  } else {
    console.log('No users found in the database.');
  }
  process.exit(0);
}

checkUsers();
