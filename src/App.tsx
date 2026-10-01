import { HashRouter, Route, Switch, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SiteHeader } from "./components/SiteHeader";
import { ComponentiSeggi } from "./pages/ComponentiSeggi";
import { ElettoraleStatus } from "./pages/ElettoraleStatus";

// stesso comportamento dell'originale (MainTag.tsx): cache permanente per sessione
const queryClient = new QueryClient({
    defaultOptions: { queries: { staleTime: Infinity } }
});

function SiteLayout() {
    const { pathname } = useLocation();
    // sfondo diverso solo nella scheda di una sezione (non in /elettorale_status)
    const seggio = pathname.startsWith("/elettorale/");

    return (
        <div className="site-container">
            <div className="site-header-wrap">
                <SiteHeader titolo="Comune di Reggio Calabria - Ufficio Elettorale" />
            </div>
            <div className={"site-body" + (seggio ? " site-body-seggio" : "")}>
                <Switch>
                    <Route path="/elettorale/:pin" component={ComponentiSeggi} />
                    <Route path="/elettorale_status" component={ElettoraleStatus} />
                    <Route render={() => <div className="container mt-4">Pagina non trovata.</div>} />
                </Switch>
            </div>
        </div>
    );
}

export function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <HashRouter>
                <SiteLayout />
            </HashRouter>
        </QueryClientProvider>
    );
}
