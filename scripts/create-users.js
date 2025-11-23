// Script to create auth users in Supabase
// Run this with: node scripts/create-users.js

require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const users = [
  { email: 'officer@hoabinh.vn', password: 'password123' },
  { email: 'supervisor@hoabinh.vn', password: 'password123' },
  { email: 'central@admin.vn', password: 'password123' },
  { email: 'system@admin.vn', password: 'password123' }
];

async function createUser(email, password) {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
    },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: {}
    })
  });

  const data = await response.json();

  if (!response.ok) {
    // Check if user already exists
    if (data.msg?.includes('already registered')) {
      return { email, status: 'already_exists' };
    }
    throw new Error(`Failed to create ${email}: ${data.msg || JSON.stringify(data)}`);
  }

  return { email, status: 'created', id: data.id };
}

async function main() {
  console.log('🚀 Creating Supabase Auth users...\n');

  for (const user of users) {
    try {
      const result = await createUser(user.email, user.password);

      if (result.status === 'created') {
        console.log(`✅ Created: ${result.email} (ID: ${result.id})`);
      } else if (result.status === 'already_exists') {
        console.log(`ℹ️  Already exists: ${result.email}`);
      }
    } catch (error) {
      console.error(`❌ Error creating ${user.email}:`, error.message);
    }
  }

  console.log('\n✨ Done! Now run the seed.sql file in Supabase SQL Editor.');
  console.log('\nTest credentials:');
  console.log('  officer@hoabinh.vn / password123');
  console.log('  supervisor@hoabinh.vn / password123');
  console.log('  central@admin.vn / password123');
  console.log('  system@admin.vn / password123');
}

main().catch(console.error);
