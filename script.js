// 1. Paste your Supabase URL and Anon Key here
const SUPABASE_URL = 'https://sipjmopbtotdqakmqotf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpcGptb3BidG90ZHFha21xb3RmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyMzgzODUsImV4cCI6MjA3NjgxNDM4NX0.iZJcFc5y9WGqLwLMfQt7Ae8ZN_xQviq7YWylfuVDRAQ';

// 2. Create the Supabase client
// (The 'supabase' variable comes from the CDN script in your index.html)
const { createClient } = supabase;
const _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('Supabase client initialized:', _supabase);

// 3. Example: Fetch data from a table
// (This will fail until you create a table named 'your-table-name')
async function getData() {
  console.log('Fetching data...');
  const { data, error } = await _supabase.from('your-table-name').select('*');

  if (error) {
    console.error('Error fetching data:', error.message);
  } else {
    console.log('Successfully fetched data:', data);
  }
}

// Run the function
getData();