const { createClient } = require('@supabase/supabase-js');

// Use local Supabase instance
const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createTestUsers() {
  console.log('Creating test users...');

  const users = [
    {
      email: 'test@example.com',
      password: 'testpass123',
      fullName: 'Test User'
    },
    {
      email: 'demo@example.com',
      password: 'demopass123',
      fullName: 'Demo User'
    }
  ];

  for (const user of users) {
    try {
      // Create user
      const { data, error } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: {
          full_name: user.fullName
        }
      });

      if (error) {
        console.error(`Error creating user ${user.email}:`, error.message);
        continue;
      }

      console.log(`✅ Created user: ${user.email} (ID: ${data.user.id})`);

      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: data.user.id,
          email: user.email,
          full_name: user.fullName,
          updated_at: new Date().toISOString()
        });

      if (profileError) {
        console.error(`Error creating profile for ${user.email}:`, profileError.message);
      } else {
        console.log(`✅ Created profile for: ${user.email}`);
      }

    } catch (error) {
      console.error(`Failed to create user ${user.email}:`, error);
    }
  }

  console.log('\nTest users created successfully!');
  console.log('\nLogin credentials:');
  console.log('1. Email: test@example.com, Password: testpass123');
  console.log('2. Email: demo@example.com, Password: demopass123');
}

createTestUsers().catch(console.error);