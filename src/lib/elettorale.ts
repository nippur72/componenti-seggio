// Accesso diretto a Supabase dal browser: sostituisce il vecchio server RPC
// (equivalente di Code/Api/ElettoraleApi.cs nell'app presenze).
// I permessi (lettura pubblica, UPDATE solo delle 5 colonne editabili) sono
// imposti dalle policy RLS di db/setup.sql, non da questo codice.
import { supabase, supabaseConfigurato } from "./supabase";
import type { ComponenteDiSeggio } from "../pages/ComponentiSeggi";

// le colonne del database sono snake_case (id, iban); il frontend usa
// Id / IBAN come le chiavi JSON dell'API originale: la conversione sta tutta qui
function rigaDaDb(r: any): ComponenteDiSeggio {
    return {
        Id: r.id,
        sez: r.sez,
        speciale: r.speciale,
        ruolo: r.ruolo ?? "",
        nome: r.nome ?? "",
        cognome: r.cognome ?? "",
        codice_fiscale: r.codice_fiscale ?? "",
        IBAN: r.iban ?? "",
        telefono: r.telefono ?? ""
    };
}

function client() {
    if (!supabaseConfigurato()) {
        throw new Error("Supabase non configurato: apri src/lib/supabase.ts e inserisci URL e chiave anon del tuo progetto.");
    }
    return supabase;
}

// equivalente di Elettorale.GetSeggio
export async function getSeggio(sez: number, speciale: boolean): Promise<ComponenteDiSeggio[]> {
    const { data, error } = await client().from("componenti_seggi")
        .select("*")
        .eq("sez", sez)
        .eq("speciale", speciale)
        .order("ruolo")
        .order("id");
    if (error) throw new Error(error.message);
    return (data ?? []).map(rigaDaDb);
}

// equivalente di Elettorale.GetAllSeggi
export async function getAllSeggi(): Promise<ComponenteDiSeggio[]> {
    const { data, error } = await client().from("componenti_seggi")
        .select("*")
        .order("sez")
        .order("speciale", { ascending: false })
        .order("ruolo")
        .order("id");
    if (error) throw new Error(error.message);
    return (data ?? []).map(rigaDaDb);
}

// equivalente di Elettorale.PutComponente: aggiorna solo le 5 colonne editabili
// (via RLS non e' possibile modificare sez, speciale, ruolo, id)
export async function putSeggio(componenti: ComponenteDiSeggio[]): Promise<"ok"> {
    for (const c of componenti) {
        if (!c || !c.Id) continue;

        const { error } = await client().from("componenti_seggi")
            .update({
                nome: c.nome ?? "",
                cognome: c.cognome ?? "",
                codice_fiscale: c.codice_fiscale ?? "",
                iban: c.IBAN ?? "",
                telefono: c.telefono ?? ""
            })
            .eq("id", c.Id);
        if (error) throw new Error(error.message);
    }
    return "ok";
}
