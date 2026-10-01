// copia di src/pages/elettorale/iban.ts dell'app presenze
export async function validaIbanConApi(iban: string): Promise<boolean> {
    try {
        const response = await fetch(`https://openiban.com/validate/${iban}?getBIC=true&validateBankCode=true`);
        if (!response.ok) {
            console.error("Errore di rete nella validazione IBAN:", response.statusText);
            return false;
        }
        const result = await response.json();
        return result.valid === true;
    } catch (e) {
        console.error("Errore validazione IBAN:", e);
        return false;
    }
}
