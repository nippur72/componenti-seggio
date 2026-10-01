// versione semplice dell'header originale (MainTag/SiteHeader), senza dipendenze extra
export function SiteHeader({ titolo }: { titolo: string }) {
    return (
        <nav className="navbar navbar-dark bg-dark justify-content-center">
            <span className="navbar-brand me-0 text-white site-header-title">{titolo}</span>
        </nav>
    );
}
