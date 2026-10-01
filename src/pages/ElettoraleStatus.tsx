// port di src/pages/elettorale/ElettoraleStatus.tsx dell'app presenze.
// Differenze: import rimappati, accesso diretto a Supabase (lib/elettorale.ts)
// e navigazione con useHistory di react-router al posto di AppRoutes.elettorale().
import { useQuery } from "@tanstack/react-query";
import { ComponenteDiSeggio } from "./ComponentiSeggi";
import { Table, ButtonGroup, Button, Badge } from "reactstrap";
import { Frame } from "../components/Frame";
import { getAllSeggi } from "../lib/elettorale";
import { Spinner } from "../tags/Spinner";
import { Alert } from "reactstrap";
import { useState } from "react";
import { useHistory } from "react-router-dom";
import { Icon } from "../tags/Icon";
import { sez_to_pin } from "./pin";

function getRuoloName(ruolo: string): string {
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

export function ElettoraleStatus() {
    const { data: componenti, isLoading, error } = useQuery({
        queryKey: ['componenti', 'all'],
        queryFn: getAllSeggi,
    });

    const history = useHistory();
    const [filter, setFilter] = useState<'tutti' | 'completi' | 'da_completare' | 'sezioni_incomplete'>('tutti');
    const [hoveredGroupKey, setHoveredGroupKey] = useState<string | null>(null);

    if (isLoading) return <Frame><Spinner>Caricamento...</Spinner></Frame>;
    if (error) return <Frame><Alert color="danger">Errore: {error.message}</Alert></Frame>;

    const completi = componenti?.filter(c => c.nome && c.cognome && c.codice_fiscale) || [];
    const daCompletare = componenti?.filter(c => !c.nome || !c.cognome || !c.codice_fiscale) || [];

    const incompleteSezioniKeys = new Set(daCompletare.map(c => `${c.sez}-${c.speciale}`));
    const sezioniIncomplete = componenti?.filter(c => incompleteSezioniKeys.has(`${c.sez}-${c.speciale}`)) || [];

    const filteredComponenti = filter === 'tutti' ? componenti :
                               filter === 'completi' ? completi :
                               filter === 'da_completare' ? daCompletare :
                               sezioniIncomplete;

    const groupedComponenti = filteredComponenti?.reduce((acc, c) => {
        const key = `${c.sez}-${c.speciale}`;
        if (!acc[key]) {
            acc[key] = [];
        }
        acc[key].push(c);
        return acc;
    }, {} as Record<string, ComponenteDiSeggio[]>);

    const handleMouseEnter = (key: string) => {
        setHoveredGroupKey(key);
    };

    const handleMouseLeave = () => {
        setHoveredGroupKey(null);
    };

    const handleClick = (group: ComponenteDiSeggio[]) => {
        const firstComponent = group[0];
        if (firstComponent) {
            const sezione = `${firstComponent.sez}${firstComponent.speciale ? 's' : ''}`;
            const pin = sez_to_pin(sezione);
            history.push(`/elettorale/${pin}`);
        }
    };

    const handleExportCsv = () => {
        if (!filteredComponenti) return;

        const now = new Date();
        const timestamp = `${now.getFullYear()}.${(now.getMonth() + 1).toString().padStart(2, '0')}.${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}.${now.getMinutes().toString().padStart(2, '0')}.${now.getSeconds().toString().padStart(2, '0')}`;
        const filename = `elettorale_status_${timestamp}.csv`;

        const headers = ["Sezione", "Ruolo", "Cognome", "Nome", "Codice Fiscale", "IBAN", "Telefono"];

        const csvRows = [
            headers.join('\t'),
            ...filteredComponenti.map(c => [
                `"${c.sez}${c.speciale ? 'S' : ''}"`,
                `"${getRuoloName(c.ruolo)}"`,
                `"${sanitizeNameForCsv(c.cognome)}"`,
                `"${sanitizeNameForCsv(c.nome)}"`,
                `"${c.codice_fiscale}"`,
                `"${c.IBAN}"`,
                `"${c.telefono}"`
            ].join('\t'))
        ];
        const csvString = "sep=\t\n"+csvRows.join('\n');

        const blob = new Blob(["\uFEFF" + csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    function capitalize(s: string) {
         if (s.length === 0) return s;
         return s.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
    }

    return (
        <div>
            <h2>Stato Componenti di Seggio</h2>

            <div className="d-flex justify-content-center mb-3">
               <ButtonGroup>
                   <Button color={filter === 'tutti' ? 'primary' : 'secondary'} onClick={() => setFilter('tutti')}>
                       Tutti <Badge pill>{componenti?.length || 0}</Badge>
                   </Button>
                   <Button color={filter === 'completi' ? 'primary' : 'secondary'} onClick={() => setFilter('completi')}>
                       Completi <Badge pill>{completi.length}</Badge>
                   </Button>
                   <Button color={filter === 'da_completare' ? 'primary' : 'secondary'} onClick={() => setFilter('da_completare')}>
                       Da Completare <Badge pill>{daCompletare.length}</Badge>
                   </Button>
                   <Button color={filter === 'sezioni_incomplete' ? 'primary' : 'secondary'} onClick={() => setFilter('sezioni_incomplete')}>
                       Sezioni Incomplete <Badge pill>{incompleteSezioniKeys.size}</Badge>
                   </Button>
               </ButtonGroup>
            </div>

            <Table bordered responsive>
                <thead>
                    <tr>
                        <th>Sez.</th>
                        <th>Ruolo</th>
                        <th>Nominativo</th>
                        <th>Codice Fiscale</th>
                        <th>IBAN</th>
                        <th>Telefono</th>
                    </tr>
                </thead>
                {groupedComponenti && Object.keys(groupedComponenti).map((key, index) => {
                    const group = groupedComponenti[key];
                    const isHovered = hoveredGroupKey === key;
                    const style = {
                        backgroundColor: isHovered ? '#ffffcc' : (index % 2 === 0 ? '#cceecc' : 'white'),
                        cursor: 'pointer'
                    };

                    return (
                        <tbody
                            key={key}
                            style={style}
                            onMouseEnter={() => handleMouseEnter(key)}
                            onMouseLeave={handleMouseLeave}
                            onClick={() => handleClick(group)}
                        >
                            {group.map((c, rowIndex) => (
                                <tr key={c.Id}>
                                    {rowIndex === 0 && (
                                        <td rowSpan={group.length} style={{ verticalAlign: 'middle', textAlign: 'center' }}>
                                            <b>#{c.sez}{c.speciale ? 'S' : ''}</b>
                                        </td>
                                    )}
                                    <td className="small">{getRuoloName(c.ruolo)}</td>
                                    <td>{c.cognome} {capitalize(c.nome)}</td>
                                    <td className="font-monospace">{c.codice_fiscale}</td>
                                    <td className="font-monospace">{c.IBAN}</td>
                                    <td className="small">{c.telefono}</td>
                                </tr>
                            ))}
                        </tbody>
                    );
                })}
            </Table>

            <div className="d-flex justify-content-end mt-3">
                <Button color="primary" onClick={handleExportCsv}>
                    <Icon icon="file-csv" /> Esporta in CSV
                </Button>
            </div>
        </div>
    );
}
