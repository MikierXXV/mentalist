#!/usr/bin/env node
/**
 * Banco de comprobaciones en navegador real.
 *
 * Cubre lo que no puede ver ni el validador de contenido ni el compilador: que
 * las escenas monten, que el cerebro sea el modelo y no el respaldo, que el tema
 * claro no disuelva las visualizaciones y que no haya desbordes a ningún ancho.
 *
 *   npm run dev                       # en otra terminal
 *   node scripts/verificar-navegador.mjs [url]
 *
 * Necesita un Edge o Chrome instalado y las dos dependencias de desarrollo
 * playwright-core y pngjs.
 */
import { chromium } from 'playwright-core';
import { readdirSync } from 'node:fs';
import { PNG } from 'pngjs';

const BASE = process.argv[2] ?? 'http://localhost:5199/mentalist/';

const FONDOS = { dark: [11, 13, 18], light: [247, 244, 237] };
/** Proporción mínima de píxeles que deben separarse del fondo de la página. */
const VISIBILIDAD_MINIMA = 0.012;
const UMBRAL_COLOR = 26;

const ANCHOS_GRANDES = [1440, 1920, 2560];
const ANCHOS_PEQUENOS = [360, 390, 768, 1280];

const ids = readdirSync(new URL('../content/conceptos', import.meta.url)).map((f) =>
  f.replace('.json', ''),
);

const errores = [];
const fallo = (m) => errores.push(m);

const nav = await chromium.launch({
  channel: 'msedge',
  args: ['--no-sandbox', '--enable-unsafe-swiftshader'],
});

const paso = async (nombre, fn) => {
  try {
    const r = await fn();
    console.log(`  ok   ${nombre}${r !== undefined ? `: ${r}` : ''}`);
  } catch (e) {
    const msg = e.message.split('\n')[0];
    console.log(`  FALLO ${nombre}: ${msg}`);
    fallo(`${nombre}: ${msg}`);
  }
};

/** Desplaza sin esperar a que el elemento se estabilice. */
const irA = (p, selector) =>
  p.evaluate((s) => document.querySelector(s)?.scrollIntoView({ block: 'center' }), selector);

const nuevaPagina = async (opciones = {}) => {
  const ctx = await nav.newContext({ viewport: { width: 1440, height: 950 }, ...opciones });
  const p = await ctx.newPage();
  // Un tope corto evita que un solo tropiezo bloquee toda la tanda.
  p.setDefaultTimeout(15000);
  p.on('console', (m) => {
    if (m.type() === 'error') fallo(`console: ${m.text()}`);
  });
  p.on('pageerror', (e) => fallo(`pageerror: ${e.message}`));
  p.on('response', (r) => {
    if (r.status() >= 400) fallo(`HTTP ${r.status()} ${r.url()}`);
  });
  return { ctx, p };
};

/** Fracción de píxeles que se separan del color de fondo del tema. */
function visibilidad(buffer, fondo) {
  const png = PNG.sync.read(buffer);
  let visibles = 0;
  for (let i = 0; i < png.data.length; i += 4) {
    const d =
      Math.abs(png.data[i] - fondo[0]) +
      Math.abs(png.data[i + 1] - fondo[1]) +
      Math.abs(png.data[i + 2] - fondo[2]);
    if (d > UMBRAL_COLOR) visibles++;
  }
  return visibles / (png.width * png.height);
}

/* ------------------------------------------------------- arranque y tema -- */

console.log('\n== arranque ==');
{
  const { ctx, p } = await nuevaPagina();

  await paso('el enlace de salto nunca se pinta visible', async () => {
    await p.goto(BASE, { waitUntil: 'commit' });
    const caja = await p
      .locator('a.salto')
      .boundingBox()
      .catch(() => null);
    if (caja && caja.width > 5 && caja.height > 5) throw new Error('visible');
    return 'oculto desde el primer fotograma';
  });

  await paso('el cargador aparece y se retira', async () => {
    const pagina = await ctx.newPage();
    await pagina.goto(BASE, { waitUntil: 'commit' });
    const existia = (await pagina.locator('#cargador').count()) > 0;
    await pagina.waitForSelector('#cargador', { state: 'detached', timeout: 10000 });
    await pagina.close();
    if (!existia) throw new Error('nunca se pintó');
    return 'sí';
  });

  await p.goto(BASE, { waitUntil: 'load' });
  await paso('16 tarjetas en 4 familias', async () => {
    const t = await p.locator('[data-tarjeta]').count();
    const f = await p.locator('section[aria-labelledby^="familia-"]').count();
    if (t !== 16 || f !== 4) throw new Error(`${t} tarjetas / ${f} familias`);
    return `${t} y ${f}`;
  });

  await paso('conmutador de tema alterna y persiste', async () => {
    const inicial = await p.evaluate(() => document.documentElement.dataset.theme);
    await p.locator('#conmutador-tema').click();
    await p.waitForTimeout(500);
    const cambiado = await p.evaluate(() => document.documentElement.dataset.theme);
    if (cambiado === inicial) throw new Error('no cambió');
    await p.reload({ waitUntil: 'load' });
    await p.waitForTimeout(600);
    const tras = await p.evaluate(() => document.documentElement.dataset.theme);
    if (tras !== cambiado) throw new Error('no persistió');
    return `${inicial} a ${cambiado}`;
  });

  await paso('filtro y búsqueda de fuentes', async () => {
    await irA(p, '#fuentes');
    const total = await p.locator('[data-fuente]:visible').count();
    await p.locator('[data-filtro="podcast"]').click();
    await p.waitForTimeout(400);
    const podcasts = await p.locator('[data-fuente]:visible').count();
    if (podcasts >= total || !podcasts) throw new Error(`${podcasts} de ${total}`);
    await p.locator('[data-filtro="todas"]').click();
    await p.locator('[data-buscar-fuentes]').fill('cope');
    await p.waitForTimeout(400);
    const n = await p.locator('[data-fuente]:visible').count();
    if (n !== 1) throw new Error(`la búsqueda devuelve ${n}`);
    return `${total} fuentes, ${podcasts} podcasts, 1 resultado para "cope"`;
  });

  await ctx.close();
}

/* ---------------------------------------------------------------- cerebro -- */

for (const esquema of ['dark', 'light']) {
  console.log(`\n== cerebro (${esquema}) ==`);
  const { ctx, p } = await nuevaPagina({ colorScheme: esquema });
  await p.goto(BASE, { waitUntil: 'load' });
  await irA(p, '#cerebro');
  await p.waitForSelector('[data-viz-cerebro] canvas', { timeout: 30000 });
  await p.waitForTimeout(3500);

  await paso('se pinta el modelo, no el respaldo', async () => {
    const origen = await p.locator('[data-viz-cerebro]').getAttribute('data-origen');
    if (origen !== 'modelo') throw new Error(`origen="${origen}"`);
    return 'modelo importado';
  });

  await paso('el GLB se descarga una sola vez', async () => {
    const peticiones = await p.evaluate(() =>
      performance
        .getEntriesByType('resource')
        .filter((r) => r.name.includes('cerebro-web.glb'))
        .map((r) => Math.round(r.transferSize / 1024)),
    );
    if (!peticiones.length) throw new Error('no consta la descarga');
    return `${peticiones.length} petición, ${peticiones[0]} kB`;
  });

  await paso('el raycasting resalta una región', async () => {
    const caja = await p.locator('[data-viz-cerebro]').boundingBox();
    await p.mouse.move(caja.x + caja.width / 2, caja.y + caja.height / 2);
    await p.waitForTimeout(1200);
    const panel = await p.locator('[data-panel-region]').innerText();
    if (!/Zona|Cerebelo|Tronco/.test(panel)) throw new Error(panel.slice(0, 50));
    return panel.split('\n')[0];
  });

  await paso('las seis zonas responden desde el teclado', async () => {
    const vistas = [];
    for (let i = 0; i < 6; i++) {
      const boton = p.locator(`button[data-region="${i}"]`);
      await boton.focus();
      await p.keyboard.press('Enter');
      await p.waitForTimeout(700);
      if ((await boton.getAttribute('aria-pressed')) !== 'true') {
        throw new Error(`la zona ${i} no queda marcada`);
      }
      if (!(await p.locator('[data-panel-region] a').count())) {
        throw new Error(`la zona ${i} no lista conceptos`);
      }
      vistas.push((await p.locator('[data-panel-region] h3').innerText()).trim());
      await p.keyboard.press('Enter');
      await p.waitForTimeout(300);
    }
    return vistas.join(', ');
  });

  await ctx.close();
}

/* ----------------------------------------------------------------- fichas -- */

for (const esquema of ['dark', 'light']) {
  console.log(`\n== las 16 fichas (${esquema}) ==`);
  const { ctx, p } = await nuevaPagina({ viewport: { width: 1280, height: 950 }, colorScheme: esquema });
  const vistas = new Set();
  let flojas = 0;

  for (const id of ids) {
    await p.goto(`${BASE}#/concepto/${id}`, { waitUntil: 'load' });
    try {
      const viz = await p.locator('[data-viz]').getAttribute('data-viz');
      if (vistas.has(viz)) throw new Error(`visualización repetida: ${viz}`);
      vistas.add(viz);

      // Orden del DOM: visualización, prosa, escena, capa oficial.
      const orden = await p.evaluate(() => {
        const n = [
          document.querySelector('[data-bloque-viz]'),
          document.querySelector('.prosa'),
          document.querySelector('#escena'),
          document.querySelector('#fuente'),
        ];
        if (n.some((x) => !x)) return 'falta alguno de los bloques';
        for (let i = 0; i < n.length - 1; i++) {
          if (!(n[i].compareDocumentPosition(n[i + 1]) & Node.DOCUMENT_POSITION_FOLLOWING)) {
            return `el bloque ${i + 1} no precede al ${i + 2}`;
          }
        }
        return 'ok';
      });
      if (orden !== 'ok') throw new Error(orden);

      if (!(await p.locator('#pruebalo').count())) {
        throw new Error('falta el Pruébalo');
      }

      await irA(p, '[data-bloque-viz]');
      await p.waitForSelector('[data-viz] canvas', { timeout: 15000 });
      await p.waitForTimeout(1100);

      const prop = visibilidad(await p.locator('[data-viz]').screenshot(), FONDOS[esquema]);
      if (prop < VISIBILIDAD_MINIMA) {
        flojas++;
        throw new Error(`solo el ${(prop * 100).toFixed(2)} % se separa del fondo`);
      }
    } catch (e) {
      fallo(`${esquema}/${id}: ${e.message.split('\n')[0]}`);
      console.log(`  FALLO ${id}: ${e.message.split('\n')[0]}`);
    }
  }
  console.log(`  ok   ${vistas.size} visualizaciones distintas, ${flojas} flojas de contraste`);
  await ctx.close();
}

/* ------------------------------------------------------------------ anchos -- */

console.log('\n== anchos ==');
{
  const { ctx, p } = await nuevaPagina();

  for (const ancho of [...ANCHOS_PEQUENOS, ...ANCHOS_GRANDES]) {
    await paso(`${ancho} px sin desbordamiento`, async () => {
      await p.setViewportSize({ width: ancho, height: 900 });
      await p.goto(BASE, { waitUntil: 'load' });
      await p.waitForTimeout(1200);
      const portada = await p.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      await p.goto(`${BASE}#/concepto/sesgos-y-atencion-robada`, { waitUntil: 'load' });
      await p.waitForTimeout(1200);
      const ficha = await p.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      if (portada > 1 || ficha > 1) throw new Error(`portada ${portada}px, ficha ${ficha}px`);

      if (ancho < 1440) return 'ok';
      // En pantallas grandes, además, la línea no debe alargarse.
      const chars = await p.evaluate(() => {
        const parrafo = document.querySelector('.prosa p');
        const sonda = document.createElement('span');
        sonda.textContent = '0'.repeat(100);
        sonda.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap';
        sonda.style.font = getComputedStyle(parrafo).font;
        parrafo.parentElement.appendChild(sonda);
        const ancho = sonda.getBoundingClientRect().width / 100;
        sonda.remove();
        return Math.round(parrafo.getBoundingClientRect().width / ancho);
      });
      if (chars < 55 || chars > 85) throw new Error(`línea de ${chars} caracteres`);
      return `ok, línea de ${chars} caracteres`;
    });
  }
  await ctx.close();
}

console.log('\n== móvil ==');
{
  const ctx = await nav.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const p = await ctx.newPage();
  p.setDefaultTimeout(15000);
  p.on('pageerror', (e) => fallo(`pageerror (móvil): ${e.message}`));

  await p.goto(BASE, { waitUntil: 'load' });
  await p.waitForTimeout(5000);

  await paso('el cerebro de fondo entra entero en el encuadre', async () => {
    // La escena proyecta las esquinas de la caja del modelo a coordenadas de
    // pantalla y publica hasta dónde llegan. Mirarlo a ojo no distingue
    // "recortado" de "el modelo es así".
    const dato = await p.locator('[data-viz-fondo]').getAttribute('data-encuadre');
    if (!dato) throw new Error('la escena no publicó su encuadre');
    const [x, y] = dato.split('x').map(Number);
    if (x > 1 || y > 1) throw new Error(`se sale: ${x} de ancho, ${y} de alto`);
    return `ocupa ${Math.round(x * 100)} % del ancho y ${Math.round(y * 100)} % del alto`;
  });

  await paso('el fondo no invade el texto del hero', async () => {
    const r = await p.evaluate(() => {
      const fondo = document.querySelector('[data-viz-fondo]').getBoundingClientRect();
      const nota = document.querySelector('main header p:last-of-type').getBoundingClientRect();
      return { finFondo: Math.round(fondo.bottom), inicioNota: Math.round(nota.top) };
    });
    if (r.finFondo > r.inicioNota) {
      throw new Error(`el fondo llega a ${r.finFondo}px y el aviso empieza en ${r.inicioNota}px`);
    }
    return `fondo hasta ${r.finFondo}px, aviso desde ${r.inicioNota}px`;
  });

  await paso('el filtro por familia acorta el índice', async () => {
    const alto = () =>
      p.evaluate(() =>
        Math.round(document.querySelector('#conceptos').getBoundingClientRect().height),
      );
    const ventana = await p.evaluate(() => window.innerHeight);
    const antes = await alto();
    await p.locator('[data-familia="lectura"]').tap();
    await p.waitForTimeout(700);
    const despues = await alto();
    const visibles = await p.locator('[data-grupo]:not([hidden])').count();
    if (visibles !== 1) throw new Error(`quedan ${visibles} familias visibles`);
    if (despues >= antes) throw new Error('el índice no se acorta');
    return `de ${(antes / ventana).toFixed(1)} a ${(despues / ventana).toFixed(1)} pantallas`;
  });

  await paso('la tarjeta pierde la fila del distintivo', async () => {
    await p.locator('[data-familia="todas"]').tap();
    await p.waitForTimeout(700);
    const alto = await p.evaluate(() =>
      Math.round(document.querySelector('[data-tarjeta]').getBoundingClientRect().height),
    );
    // Con el distintivo en fila propia medía 211 px; la línea del reel suma 1 px de margen.
    if (alto > 200) throw new Error(`la primera tarjeta mide ${alto}px`);
    return `${alto}px de alto`;
  });

  await ctx.close();
}

/* ------------------------------------------------------ movimiento reducido -- */

console.log('\n== movimiento reducido ==');
{
  const { ctx, p } = await nuevaPagina({ reducedMotion: 'reduce' });

  await paso('la visualización queda en un fotograma estático', async () => {
    await p.goto(`${BASE}#/concepto/memoria-reconstructiva`, { waitUntil: 'load' });
    await irA(p, '[data-bloque-viz]');
    await p.waitForSelector('[data-viz] canvas', { timeout: 15000 });
    await p.waitForTimeout(1500);
    const a = await p.locator('[data-viz]').screenshot();
    await p.waitForTimeout(1300);
    const b = await p.locator('[data-viz]').screenshot();
    if (!a.equals(b)) throw new Error('el canvas sigue animándose');
    return 'idéntico tras 1,3 s';
  });

  await paso('el cerebro también se congela', async () => {
    await p.goto(BASE, { waitUntil: 'load' });
    await irA(p, '#cerebro');
    await p.waitForSelector('[data-viz-cerebro] canvas', { timeout: 30000 });
    await p.waitForTimeout(2500);
    const a = await p.locator('[data-viz-cerebro]').screenshot();
    await p.waitForTimeout(1300);
    const b = await p.locator('[data-viz-cerebro]').screenshot();
    if (!a.equals(b)) throw new Error('el cerebro sigue girando');
    return 'idéntico tras 1,3 s';
  });

  await ctx.close();
}

await nav.close();

console.log('\n--- resultado ---');
console.log(errores.length ? errores.map((e) => `  ! ${e}`).join('\n') : 'sin problemas');
process.exit(errores.length ? 1 : 0);
