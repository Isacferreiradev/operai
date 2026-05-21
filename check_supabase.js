import { supabase } from './src/supabase.js';

async function main() {
  console.log('Supabase URL:', supabase.supabaseUrl);
  // Try querying user_app_state
  const { data, error } = await supabase
    .from('user_app_state')
    .select('*')
    .limit(1);
    
  if (error) {
    console.error('user_app_state query error:', error);
  } else {
    console.log('user_app_state query success! Data:', data);
  }

  // Try querying user_state
  const { data: data2, error: error2 } = await supabase
    .from('user_state')
    .select('*')
    .limit(1);
    
  if (error2) {
    console.error('user_state query error:', error2);
  } else {
    console.log('user_state query success! Data:', data2);
  }
}

main().catch(console.error);
