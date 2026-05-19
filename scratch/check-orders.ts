import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

async function checkOrders() {
  const { Order } = await import('../src/models/Order');
  const { User } = await import('../src/models/User');
  const { connectMongo } = await import('../src/lib/db/mongodb');

  await connectMongo();
  const orders = await Order.find({}, { publicId: 1, title: 1, status: 1, authorId: 1, createdAt: 1 }).lean();
  console.log(`Total orders in DB: ${orders.length}`);
  
  for (const o of orders) {
    const user = await User.findById(o.authorId, { username: 1 }).lean();
    console.log(`- Order ${o.publicId} ("${o.title}") | Status: ${o.status} | Author: ${user?.username} (${o.authorId}) | Created: ${o.createdAt}`);
  }
  process.exit(0);
}

checkOrders();
