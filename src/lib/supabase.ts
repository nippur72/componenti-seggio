import { createClient } from "@supabase/supabase-js";

// Configurazione Supabase: crea il progetto su https://supabase.com, esegui
// db/setup.sql nell'SQL Editor, poi incolla qui i valori di
// Project Settings → API (URL e chiave "anon public").
// La chiave anon è pubblica per progetto: la sicurezza dei dati è affidata
// alle policy RLS di db/setup.sql. In alternativa si può configurare via
// variabili d'ambiente VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY a build time.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? "https://lqedevvrmfxoetqdhpgb.supabase.co";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "sb_publishable_vcYdKHNcE2dMBJS5eIyx0A_ubsHAPgl";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export function supabaseConfigurato(): boolean {
    return !SUPABASE_URL.includes("RIMPIAZZA") && !SUPABASE_ANON_KEY.includes("RIMPIAZZA");
}
