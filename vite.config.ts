import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base './': il build funziona sia in locale sia su GitHub Pages
// (https://utente.github.io/nome-repo/), grazie all'uso dell'HashRouter.
export default defineConfig({
    base: "./",
    plugins: [react()],
    build: {
        outDir: "dist"
    }
});
