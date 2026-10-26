#!/usr/bin/env node
/**
 * Comprueba que un rediseño de la ficha no cambia el contenido: extrae el texto
 * visible de las 16 fichas y lo compara palabra por palabra con una captura anterior.
 *
 *   node scripts/comprobar-texto-fichas.mjs capturar antes.json
 *   node scripts/comprobar-texto-fichas.mjs capturar despues.json
 *   node scripts/comprobar-texto-fichas.mjs comparar antes.json despues.json
 *
 * `capturar` levanta su propio servidor de Vite y un Edge; los cierra al acabar.
 * Solo se admiten palabras NUEVAS (etiquetas de interfaz); cualquier palabra
 * que desaparezca o cambie de número es un fallo.
 */
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';

const [modo, a, b] = process.argv.slice(2);
const palabras = (t) => (t.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []);
const cuenta = (ws) => ws.reduce((m, w) => m.set(w, (m.get(w) ?? 0) + 1), new Map());

if (modo === 'capturar') {
  if (existsSync('C:/Users/migue/videos-cortos/reel/trabajo/render.lock')) {
    console.log('render.lock presente: no abro el navegador');
    process.exit(1);
  }
  const ids = readdirSync(new URL('../content/conceptos', import.meta.url)).map((f) => f.replace('.json', ''));
  const puerto = 5198;
  const vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--port', String(puerto), '--strictPort'], { stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 3500));
  const nav = await chromium.launch({ channel: 'msedge', args: ['--no-sandbox'] });
  const salida = {};
  try {
    const p = await nav.newPage({ viewport: { width: 1440, height: 900 } });
    for (const id of ids) {
      await p.goto(`http://localhost:${puerto}/mentalist/#/concepto/${id}`);
      await p.waitForSelector('article[data-ficha]');
      salida[id] = await p.evaluate(() => {
        const copia = document.querySelector('article[data-ficha]').cloneNode(true);
        // Lo que dibuja la escena no es contenido; su texto alternativo sí (queda en <figure>).
        copia.querySelectorAll('[data-esqueleto],[data-controles-viz],[data-viz],[data-solo-interfaz]').forEach((n) => n.remove());
        // Elementos de interfaz duplicados a propósito (p. ej. el índice móvil).
        copia.querySelectorAll('*').forEach((n) => n.append(' '));
        return copia.textContent.replace(/\s+/g, ' ').trim();
      });
    }
  } finally {
    await nav.close();
    vite.kill();
  }
  writeFileSync(a, JSON.stringify(salida, null, 1));
  console.log(`capturadas ${Object.keys(salida).length} fichas en ${a}`);
} else if (modo === 'comparar') {
  const antes = JSON.parse(readFileSync(a, 'utf8'));
  const despues = JSON.parse(readFileSync(b, 'utf8'));
  // Rótulos de interfaz de la ficha anterior que el rediseño sustituye (no son contenido).
  const INTERFAZ_ANTIGUA = 'Volver al índice Familia Un ejemplo de la vida real';
  let fallos = 0;
  for (const id of Object.keys(antes)) {
    const ca = cuenta(palabras(antes[id]));
    // El número de orden salía dos veces (lateral y cabecera móvil); ahora una.
    const orden = JSON.parse(readFileSync(new URL(`../content/conceptos/${id}.json`, import.meta.url), 'utf8')).orden;
    for (const w of [...palabras(INTERFAZ_ANTIGUA), String(orden).padStart(2, '0')]) if (ca.has(w)) ca.set(w, ca.get(w) - 1);
    const cd = cuenta(palabras(despues[id] ?? ''));
    const perdidas = [...ca].filter(([w, n]) => (cd.get(w) ?? 0) < n).map(([w, n]) => `${w}(-${n - (cd.get(w) ?? 0)})`);
    const nuevas = [...cd].filter(([w, n]) => (ca.get(w) ?? 0) < n).map(([w]) => w);
    const nPal = palabras(antes[id]).length;
    console.log(`${perdidas.length ? 'FALLO' : 'ok   '} ${id}: ${nPal} palabras antes, ${palabras(despues[id] ?? '').length} después; perdidas: ${perdidas.length ? perdidas.join(' ') : 'ninguna'}; nuevas (interfaz): ${nuevas.length}`);
    if (perdidas.length) fallos++;
  }
  const etiquetas = new Set();
  for (const id of Object.keys(antes)) {
    const ca = cuenta(palabras(antes[id]));
    for (const [w, n] of cuenta(palabras(despues[id] ?? ''))) if ((ca.get(w) ?? 0) < n) etiquetas.add(w);
  }
  console.log(`Palabras nuevas en total: ${[...etiquetas].sort().join(' ')}`);
  process.exit(fallos ? 1 : 0);
} else {
  console.log('uso: capturar <salida.json> | comparar <antes.json> <despues.json>');
}
