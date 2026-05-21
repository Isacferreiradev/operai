import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://rvjdokjhrtkrvaveriyx.supabase.co',
  'sb_publishable_7YUh8wwsb8PupFe6ZkvJwg_aLMCAXMU'
);

async function checkState() {
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'aristocrata.black@gmail.com',
    password: 'fiveM1212!!.'
  });

  if (authError) {
    console.error('Auth error:', authError);
    return;
  }

  const { data, error } = await supabase
    .from('user_app_state')
    .select('app_state')
    .eq('user_id', authData.user.id)
    .single();

  if (error) {
    console.error('Fetch error:', error);
    return;
  }

  console.log('App State keys:', Object.keys(data.app_state || {}));
  console.log('Ideas count:', data.app_state?.ideas?.length);
  console.log('Ideas:', JSON.stringify(data.app_state?.ideas, null, 2));
}

checkState();
