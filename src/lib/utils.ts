// subset di src/lib/utils.ts dell'app presenze (solo le funzioni usate dalle pagine elettorali)

export function capitalize(str: string) {
   return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function capitalizeAll(str: string) {
   return str.split(" ").map(capitalize).join(" ");
}
