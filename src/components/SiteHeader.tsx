import { Link } from "react-router-dom";

// versione semplice dell'header originale (MainTag/SiteHeader), senza dipendenze extra
export function SiteHeader({ titolo }: { titolo: string }) {
    return (
        <nav className="navbar navbar-dark bg-dark mb-3">
            <span className="navbar-brand ms-3">
                <Link to="/" className="text-white text-decoration-none">{titolo}</Link>
            </span>
        </nav>
    );
}
