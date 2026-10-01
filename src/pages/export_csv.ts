import { ComponenteDiSeggio } from "./ComponentiSeggi";

export function getRuoloName(ruolo: string): string {
    if (ruolo === 'P') return 'Presidente';
    if (ruolo === 'S') return 'Scrutatore';
    return 'Segretario';
}

function sanitizeNameForCsv(name: string | undefined | null): string {
    if (!name) return "";
    let upper = name.toUpperCase();

    // Standardize quotes, backticks, and other accents to apostrophe
    upper = upper.replace(/[`'’‘´]/g, "'");

    const accentMap: Record<string, string> = {
        'À': "A'", 'È': "E'", 'É': "E'", 'Ì': "I'", 'Ò': "O'", 'Ù': "U'"
    };
    let replaced = upper.replace(/[ÀÈÉÌÒÙ]/g, m => accentMap[m] || m);

    // Keep only A-Z, spaces, and standard apostrophe
    return replaced.replace(/[^A-Z\s']/g, '');
}

function csvTimestamp(date: Date): string {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}_${pad(date.getHours())}.${pad(date.getMinutes())}.${pad(date.getSeconds())}`;
}

function csvFilename(date: Date): string {
    return `elettorale_status_${csvTimestamp(date)}.csv`;
}

function csvCell(value: string | number | undefined | null): string {
    return `"${value ?? ""}"`;
}

export function buildCsvContent(componenti: ComponenteDiSeggio[]): string {
    const headers = ["Sezione", "Ruolo", "Cognome", "Nome", "Codice Fiscale", "IBAN", "Telefono"];

    const rows = componenti.map(c => [
        csvCell(`${c.sez}${c.speciale ? 'S' : ''}`),
        csvCell(getRuoloName(c.ruolo)),
        csvCell(sanitizeNameForCsv(c.cognome)),
        csvCell(sanitizeNameForCsv(c.nome)),
        csvCell(c.codice_fiscale),
        csvCell(c.IBAN),
        csvCell(c.telefono)
    ].join('\t'));

    return [headers.join('\t'), ...rows].join('\n');
}

function downloadCsv(filename: string, content: string): void {
    const blob = new Blob(["\uFEFF" + "sep=\t\n" + content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

export function exportComponentiToCsv(componenti: ComponenteDiSeggio[]): void {
    const now = new Date();
    downloadCsv(csvFilename(now), buildCsvContent(componenti));
}
