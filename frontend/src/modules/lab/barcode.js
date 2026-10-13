/*
 * Code 128 barcodes as SVG (lab specimen labels, module 14). All-digit text of even length (the accession
 * numbers) uses code set C (two digits a symbol: short barcode); anything else uses code set B (printable ASCII).
 */

// Bar / space widths of the 107 symbols (values 0-105, then STOP), each starting with a bar.
const PATTERNS = [
    "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213",
    "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132",
    "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211",
    "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313",
    "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331",
    "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111",
    "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214",
    "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111",
    "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141",
    "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141",
    "114131", "311141", "411131", "211412", "211214", "211232", "2331112",
];
const START_B = 104;
const START_C = 105;
const STOP = 106;

/** Symbol values (start, data, checksum, stop) for a text. */
export function code128Values(text) {
    const s = String(text);
    let vals;
    if (/^\d+$/.test(s) && s.length % 2 === 0 && s.length >= 2) {
        vals = [START_C];
        for (let i = 0; i < s.length; i += 2) vals.push(Number(s.slice(i, i + 2)));
    } else {
        vals = [START_B];
        for (const ch of s) {
            const c = ch.charCodeAt(0);
            if (c < 32 || c > 126) throw new Error("Code 128 B: printable ASCII only");
            vals.push(c - 32);
        }
    }
    let sum = vals[0];
    for (let i = 1; i < vals.length; i++) sum += vals[i] * i;
    vals.push(sum % 103, STOP);
    return vals;
}

/** The barcode as an SVG string, `module` px a narrowest bar, `height` px tall, with the quiet zones (10 modules). */
export function code128Svg(text, { module = 1.4, height = 34, label = "" } = {}) {
    const vals = code128Values(text);
    let x = 10 * module;
    let bars = "";
    for (const v of vals) {
        const p = PATTERNS[v];
        for (let i = 0; i < p.length; i++) {
            const w = Number(p[i]) * module;
            if (i % 2 === 0) bars += `<rect x="${x.toFixed(2)}" y="0" width="${w.toFixed(2)}" height="${height}"/>`;
            x += w;
        }
    }
    const width = x + 10 * module;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width.toFixed(2)} ${height}" width="${width.toFixed(2)}" height="${height}" role="img" aria-label="${label || `Barcode ${text}`}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/><g fill="#000">${bars}</g></svg>`;
}

/** Self-check of the table: 11 modules a symbol (13 for STOP), bars add up to an even number, all different. */
export function checkTable() {
    const seen = new Set();
    return PATTERNS.every((p, i) => {
        const d = [...p].map(Number);
        const total = d.reduce((a, b) => a + b, 0);
        const bars = d.filter((_, k) => k % 2 === 0).reduce((a, b) => a + b, 0);
        const ok = total === (i === STOP ? 13 : 11) && bars % 2 === 0 && !seen.has(p);
        seen.add(p);
        return ok;
    }) && PATTERNS.length === 107;
}
