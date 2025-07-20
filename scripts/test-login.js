const { createClient } = require('@supabase/supabase-js');

// Use local Supabase instance (anon key for client-side auth)
const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testLogin() {
  console.log('Testing login functionality...\n');

  const testCredentials = [
    { email: 'test@example.com', password: 'testpass123' },
    { email: 'demo@example.com', password: 'demopass123' }
  ];

  for (const creds of testCredentials) {
    console.log(`Testing login for: ${creds.email}`);
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: creds.email,
      password: creds.password
    });

    if (error) {
      console.error(`❌ Login failed: ${error.message}`);
    } else {
      console.log(`✅ Login successful! User ID: ${data.user.id}`);
      
      // Sign out for next test
      await supabase.auth.signOut();
    }
    console.log('');
  }

  console.log('Login tests complete!');
}

testLogin().catch(console.error);