// Accesso diretto a Supabase dal browser: sostituisce il vecchio server RPC
// (equivalente di Code/Api/ElettoraleApi.cs nell'app presenze).
// I permessi (lettura pubblica, UPDATE solo delle 5 colonne editabili) sono
// imposti dalle policy RLS di db/setup.sql, non da questo codice.
import { supabase } from "./supabase";
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

// equivalente di Elettorale.GetSeggio
export async function getSeggio(sez: number, speciale: boolean): Promise<ComponenteDiSeggio[]> {
    const { data, error } = await supabase.from("componenti_seggi")
        .select("*")
        .eq("sez", sez)
        .eq("speciale", speciale)
        .order("ruolo")
        .order("id");
    if (error) throw new Error(error.message);
    return (data ?? []).map(rigaDaDb);
}

// equivalente di Elettorale.GetAllSeggi
// L'API REST di Supabase tronca ogni risposta a 1000 righe (Max Rows): si pagina
// con .range() finche' non arriva una pagina incompleta.
const PAGINA = 1000;

export async function getAllSeggi(): Promise<ComponenteDiSeggio[]> {
    const out: ComponenteDiSeggio[] = [];
    for (let from = 0; ; from += PAGINA) {
        const { data, error } = await supabase.from("componenti_seggi")
            .select("*")
            .order("sez")
            .order("speciale", { ascending: false })
            .order("ruolo")
            .order("id")
            .range(from, from + PAGINA - 1);
        if (error) throw new Error(error.message);
        const pagina = data ?? [];
        out.push(...pagina.map(rigaDaDb));
        if (pagina.length < PAGINA) break;
    }
    return out;
}

// equivalente di Elettorale.PutComponente: aggiorna solo le 5 colonne editabili
// (via RLS non e' possibile modificare sez, speciale, ruolo, id)
export async function putSeggio(componenti: ComponenteDiSeggio[]): Promise<"ok"> {
    for (const c of componenti) {
        if (!c || !c.Id) continue;

        const { error } = await supabase.from("componenti_seggi")
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
