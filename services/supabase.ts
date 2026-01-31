import { createClient } from '@supabase/supabase-js';

// --- KONFIGURASI SUPABASE ---
// 1. Buat project baru di https://supabase.com/
// 2. Masuk ke Project Settings -> API
// 3. Copy "Project URL" dan "anon public" key

const SUPABASE_URL = 'ISI_DENGAN_SUPABASE_URL_ANDA'; // cth: https://xyz.supabase.co
const SUPABASE_ANON_KEY = 'ISI_DENGAN_ANON_KEY_ANDA';

let supabase: any = null;
let isSupabaseConfigured = false;

if (SUPABASE_URL && !SUPABASE_URL.includes('ISI_DENGAN') && SUPABASE_ANON_KEY) {
    try {
        supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        isSupabaseConfigured = true;
        console.log("Supabase initialized");
    } catch (e) {
        console.error("Supabase init failed", e);
    }
} else {
    console.warn("Supabase belum dikonfigurasi di services/supabase.ts");
}

export { supabase, isSupabaseConfigured };