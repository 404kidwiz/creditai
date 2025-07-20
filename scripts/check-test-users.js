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

async function checkAndFixUsers() {
  console.log('Checking test users...\n');

  // Check if users exist
  const { data: users, error: listError } = await supabase.auth.admin.listUsers();
  
  if (listError) {
    console.error('Error listing users:', listError);
    return;
  }

  console.log(`Found ${users.users.length} users:`);
  users.users.forEach(user => {
    console.log(`- ${user.email} (ID: ${user.id})`);
  });

  // Check profiles table structure
  const { data: columns, error: schemaError } = await supabase
    .from('profiles')
    .select('*')
    .limit(0);

  if (!schemaError) {
    console.log('\nProfiles table exists and is accessible');
  }

  // Try to create/update profiles for test users
  console.log('\nCreating/updating profiles...');
  
  for (const user of users.users) {
    if (user.email === 'test@example.com' || user.email === 'demo@example.com') {
      try {
        // Use insert with on_conflict to upsert
        const { data, error } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            full_name: user.email === 'test@example.com' ? 'Test User' : 'Demo User',
            updated_at: new Date().toISOString()
          })
          .select();

        if (error) {
          // Try update if insert fails
          const { data: updateData, error: updateError } = await supabase
            .from('profiles')
            .update({
              full_name: user.email === 'test@example.com' ? 'Test User' : 'Demo User',
              updated_at: new Date().toISOString()
            })
            .eq('id', user.id)
            .select();

          if (updateError) {
            console.error(`❌ Failed to create/update profile for ${user.email}:`, updateError.message);
          } else {
            console.log(`✅ Updated profile for ${user.email}`);
          }
        } else {
          console.log(`✅ Created profile for ${user.email}`);
        }
      } catch (error) {
        console.error(`Error with profile for ${user.email}:`, error);
      }
    }
  }

  console.log('\n✅ Setup complete!');
  console.log('\nYou can now login with:');
  console.log('1. Email: test@example.com, Password: testpass123');
  console.log('2. Email: demo@example.com, Password: demopass123');
}

checkAndFixUsers().catch(console.error);