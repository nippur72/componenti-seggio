// copia di src/pages/elettorale/pin.ts dell'app presenze
// (senza le assegnazioni a window, non necessarie nell'app standalone)
const mask = 1<<18 | 1<<16 | 1 << 14 | 1 << 12 | 1 << 10 | 1 << 8 | 1 << 6 | 1 << 4 | 1<< 2;

export function sez_to_pin(s: string): number {

    const numsez = parseInt(s || '0');
    const speciale = s === undefined ? false : s.toLowerCase().endsWith('s');

    const pin = (((numsez * 2) + (speciale ? 1:0)) * 2543) ^ (mask);

    return pin;
}

export function pin_to_sez(pin: string): {sez: number, speciale: boolean} {
    const unmasked = parseInt(pin||'0') ^ mask;

    if(unmasked % 2543 !== 0) return { sez: 0, speciale: false };

    const a = unmasked / 2543;

    const speciale = (a % 2) == 1 ? true : false;
    const sez = Math.floor(a / 2);

    if(sez < 1 || sez > 196) return { sez: 0, speciale: false };

    return { sez, speciale };
}
