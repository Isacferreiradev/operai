import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://rvjdokjhrtkrvaveriyx.supabase.co',
  'sb_publishable_7YUh8wwsb8PupFe6ZkvJwg_aLMCAXMU'
);

async function checkRLS() {
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'aristocrata.black@gmail.com',
    password: 'fiveM1212!!.'
  });

  if (authError) { console.error('Auth error:', authError); return; }
  console.log('Signed in OK');

  // 1. Read current state
  const { data: before, error: e1 } = await supabase
    .from('user_app_state')
    .select('app_state')
    .eq('user_id', authData.user.id)
    .single();

  console.log('Current ideas count:', before?.app_state?.ideas?.length ?? 'null');
  
  // 2. Add an idea and upsert
  const newState = {
    ...(before?.app_state || {}),
    ideas: [
      ...(before?.app_state?.ideas || []),
      { id: 'rls-test-' + Date.now(), name: 'RLS Test Idea', description: 'Test', potential: 3, effort: 2, createdAt: new Date().toISOString() }
    ]
  };

  const { error: e2, status: s2, statusText: st2 } = await supabase
    .from('user_app_state')
    .upsert({
      user_id: authData.user.id,
      app_state: newState,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' });

  console.log('Upsert status:', s2, st2);
  if (e2) { console.error('UPSERT ERROR:', e2); return; }
  
  // 3. Read again to confirm
  const { data: after, error: e3 } = await supabase
    .from('user_app_state')
    .select('app_state')
    .eq('user_id', authData.user.id)
    .single();

  if (e3) { console.error('Read error:', e3); return; }
  console.log('After upsert, ideas count:', after?.app_state?.ideas?.length);
  console.log('Last idea:', JSON.stringify(after?.app_state?.ideas?.slice(-1)));

  await supabase.auth.signOut();
}

checkRLS();
