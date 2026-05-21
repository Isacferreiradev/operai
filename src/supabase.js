import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = 'https://rvjdokjhrtkrvaveriyx.supabase.co';
export const supabaseKey = 'sb_publishable_7YUh8wwsb8PupFe6ZkvJwg_aLMCAXMU';

export const supabase = createClient(supabaseUrl, supabaseKey);
