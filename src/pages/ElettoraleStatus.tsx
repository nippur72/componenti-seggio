// port di src/pages/elettorale/ElettoraleStatus.tsx dell'app presenze.
// Differenze: import rimappati, accesso diretto a Supabase (lib/elettorale.ts)
// e navigazione con useHistory di react-router al posto di AppRoutes.elettorale().
import { useQuery } from "@tanstack/react-query";
import { css } from "@emotion/css";
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
import { exportComponentiToCsv, getRuoloName } from "./export_csv";
import { capitalizeAll } from "../lib/utils";

// Sotto il breakpoint lg la tabella diventa un elenco impilato: ogni campo su
// una riga con la sua etichetta (presa da data-label), senza scroll orizzontale.
const statusTableStyle = css({
    '@media (max-width: 991.98px)': {
        '&': {
            display: 'block'
        },
        '& > thead': {
            display: 'none'
        },
        '& > tbody': {
            display: 'block',
            marginBottom: '0.75rem',
            border: '1px solid rgba(0, 0, 0, 0.175)'
        },
        '& > tbody > tr': {
            display: 'block'
        },
        '& > tbody > tr + tr': {
            borderTop: '1px solid rgba(0, 0, 0, 0.1)'
        },
        '& > tbody > tr > th': {
            display: 'block',
            border: 'none',
            borderBottom: '1px solid rgba(0, 0, 0, 0.175)',
            padding: '0.5rem 0.75rem'
        },
        '& > tbody > tr > td': {
            display: 'flex',
            alignItems: 'baseline',
            gap: '0.5rem',
            border: 'none',
            padding: '0.2rem 0.75rem',
            overflowWrap: 'anywhere',
            wordBreak: 'break-word'
        },
        '& > tbody > tr > td::before': {
            content: 'attr(data-label)',
            flex: '0 0 6rem',
            fontFamily: 'var(--bs-body-font-family)',
            fontSize: '0.75rem',
            fontWeight: 600,
            letterSpacing: '0.02em',
            textTransform: 'uppercase',
            color: '#666'
        }
    }
});

// con cognome "---" il componente e' considerato completato (seggio non nominato / da escludere)
function isCompleto(c: ComponenteDiSeggio): boolean {
    return c.cognome.trim() === "---" || (!!c.nome && !!c.cognome && !!c.codice_fiscale);
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

    const completi = componenti?.filter(isCompleto) || [];
    const daCompletare = componenti?.filter(c => !isCompleto(c)) || [];

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
        exportComponentiToCsv(filteredComponenti);
    };

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

            <Table bordered responsive className={statusTableStyle}>
                <thead>
                    <tr>
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
                            <tr>
                                <th colSpan={5} scope="rowgroup" className="text-start">
                                    <b>Sezione #{group[0].sez}{group[0].speciale ? ' Speciale' : ''}</b>
                                </th>
                            </tr>
                            {group.map(c => (
                                <tr key={c.Id}>
                                    <td data-label="Ruolo" className="small">{getRuoloName(c.ruolo)}</td>
                                    <td data-label="Nominativo">{c.cognome} {capitalizeAll(c.nome)}</td>
                                    <td data-label="Cod. Fisc." className="font-monospace">{c.codice_fiscale}</td>
                                    <td data-label="IBAN" className="font-monospace">{c.IBAN}</td>
                                    <td data-label="Telefono" className="small">{c.telefono}</td>
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
