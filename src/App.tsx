import { HashRouter, Route, Switch } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SiteHeader } from "./components/SiteHeader";
import { HomePage } from "./pages/HomePage";
import { ComponentiSeggi } from "./pages/ComponentiSeggi";
import { ElettoraleStatus } from "./pages/ElettoraleStatus";

// stesso comportamento dell'originale (MainTag.tsx): cache permanente per sessione
const queryClient = new QueryClient({
    defaultOptions: { queries: { staleTime: Infinity } }
});

export function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <HashRouter>
                <SiteHeader titolo="Comune di Reggio Calabria - Ufficio Elettorale" />
                <Switch>
                    <Route exact path="/" component={HomePage} />
                    <Route path="/elettorale/:pin" component={ComponentiSeggi} />
                    <Route path="/elettorale_status" component={ElettoraleStatus} />
                    <Route render={() => <div className="container mt-4">Pagina non trovata.</div>} />
                </Switch>
            </HashRouter>
        </QueryClientProvider>
    );
}
