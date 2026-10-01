/* ============================================================
   VETERANS BACKBONE CORE
   SHARED SUPABASE CLIENT

   Creates the browser Supabase client only.

   No redirects.
   No login-page behaviour.
   No application behaviour.

   Other VB Core modules import this shared client.
   ============================================================ */

import { createClient } from
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";


const SUPABASE_URL =
  "https://jygyirqtiuxjllcltpks.supabase.co";


const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_36yMEHR4-bWypaun6X2oNw_fTaoOt9p";


const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);


export { supabase };
