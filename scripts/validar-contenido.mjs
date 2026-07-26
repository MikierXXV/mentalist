#!/usr/bin/env node
/**
 * Comprueba las reglas editoriales del proyecto sobre los archivos de `content/`
 * y la coherencia entre contenido y código.
 *
 * Es la misma batería que `validarContenido()` corre en el navegador durante el
 * desarrollo, pero ejecutable sin navegador para poder usarla en CI antes del
 * build. Sale con código 1 si algo incumple.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR_CONCEPTOS = join(RAIZ, 'content', 'conceptos');
const MAX_PALABRAS_CITA = 15;
const TIPOS_ATRIBUCION = ['formulacion_propia', 'tema_de_episodio'];
const FAMILIAS = ['percepcion', 'influencia', 'lectura', 'memoria'];

const leerJson = (ruta) => JSON.parse(readFileSync(ruta, 'utf8'));
const leerTexto = (ruta) => readFileSync(ruta, 'utf8');

const fuentes = leerJson(join(RAIZ, 'content', 'fuentes.json'));
const archivos = readdirSync(DIR_CONCEPTOS).filter((f) => f.endsWith('.json'));
const conceptos = archivos.map((archivo) => ({
  archivo,
  datos: leerJson(join(DIR_CONCEPTOS, archivo)),
}));

const idsConcepto = new Set(conceptos.map((c) => c.datos.id));

/**
 * Ids de visualización que el runtime sabe cargar. Se leen del propio archivo
 * en vez de duplicar la lista: si allí se añade una y aquí no, el desajuste
 * saldría como falso error.
 */
const runtime = leerTexto(join(RAIZ, 'src', 'viz', 'runtime.ts'));
const VISUALIZACIONES = new Set(
  [...runtime.matchAll(/^\s*'?([a-z-]+)'?:\s*\(\)\s*=>\s*import\('\.\//gm)].map(
    (m) => m[1],
  ),
);

const errores = [];
const ordenes = new Map();
const visualizaciones = new Map();

for (const { archivo, datos } of conceptos) {
  const fallo = (mensaje) => errores.push(`${archivo}: ${mensaje}`);

  if (datos.id !== archivo.replace(/\.json$/, '')) {
    fallo(`el id "${datos.id}" no coincide con el nombre del archivo`);
  }
  if (!FAMILIAS.includes(datos.familia)) {
    fallo(`familia desconocida: "${datos.familia}"`);
  }
  if (!VISUALIZACIONES.has(datos.visualizacion)) {
    fallo(`visualización no registrada en el runtime: "${datos.visualizacion}"`);
  }
  if (!datos.visualizacion_alt?.trim()) {
    fallo('la visualización no tiene texto alternativo');
  }
  // La regresión que motivó rehacer las escenas: fichas compartiendo la misma.
  if (visualizaciones.has(datos.visualizacion)) {
    fallo(
      `repite la visualización "${datos.visualizacion}", ya usada por ${visualizaciones.get(datos.visualizacion)}`,
    );
  }
  visualizaciones.set(datos.visualizacion, archivo);

  if (!Array.isArray(datos.explicacion_didactica) || !datos.explicacion_didactica.length) {
    fallo('sin explicación didáctica');
  }
  if (ordenes.has(datos.orden)) {
    fallo(`orden ${datos.orden} duplicado con ${ordenes.get(datos.orden)}`);
  }
  ordenes.set(datos.orden, archivo);

  const oficial = datos.explicacion_oficial;
  if (!oficial) {
    fallo('sin capa oficial');
    continue;
  }

  if (!TIPOS_ATRIBUCION.includes(oficial.tipo_atribucion)) {
    fallo(`tipo_atribucion desconocido: "${oficial.tipo_atribucion}"`);
  }
  if (!oficial.resumen?.trim()) {
    fallo('la capa oficial no tiene resumen');
  }

  const fuente = fuentes[oficial.fuente_id];
  if (!fuente) {
    fallo(`fuente desconocida: "${oficial.fuente_id}"`);
  } else if (!fuente.url) {
    fallo(`la fuente "${oficial.fuente_id}" no tiene URL pública`);
  }

  for (const extra of oficial.fuentes_extra ?? []) {
    if (!fuentes[extra]) fallo(`fuente extra desconocida: "${extra}"`);
  }

  if (oficial.cita_breve) {
    const palabras = oficial.cita_breve.trim().split(/\s+/).length;
    if (palabras > MAX_PALABRAS_CITA) {
      fallo(`cita de ${palabras} palabras, el máximo es ${MAX_PALABRAS_CITA}`);
    }
    // La descripción de un podcast la escribe el anfitrión: no puede sostener
    // una cita atribuida a Javier Botía.
    if (oficial.tipo_atribucion === 'tema_de_episodio') {
      fallo('un "tema_de_episodio" no puede llevar cita atribuida');
    }
  }
}

for (const [id, fuente] of Object.entries(fuentes)) {
  if (!fuente.url?.startsWith('http')) {
    errores.push(`fuentes.json: "${id}" no tiene una URL pública válida`);
  }
}

// Las zonas del cerebro enlazan a fichas: comprobamos que existan todas.
const regiones = leerTexto(join(RAIZ, 'src', 'viz', 'regiones.ts'));
const bloqueConceptos = [...regiones.matchAll(/conceptos:\s*\[([^\]]*)\]/g)];
for (const [, lista] of bloqueConceptos) {
  for (const [, id] of lista.matchAll(/'([^']+)'/g)) {
    if (!idsConcepto.has(id)) {
      errores.push(`regiones.ts: la zona enlaza a un concepto inexistente: "${id}"`);
    }
  }
}

if (errores.length) {
  console.error(`\n✗ ${errores.length} problema(s) de contenido:\n`);
  for (const error of errores) console.error(`  · ${error}`);
  console.error('');
  process.exit(1);
}

const conCita = conceptos.filter((c) => c.datos.explicacion_oficial.cita_breve).length;
const episodios = conceptos.filter(
  (c) => c.datos.explicacion_oficial.tipo_atribucion === 'tema_de_episodio',
).length;

console.log(
  `✓ ${conceptos.length} conceptos válidos · ` +
    `${visualizaciones.size} visualizaciones distintas · ` +
    `${Object.keys(fuentes).length} fuentes · ` +
    `${conCita} con cita textual · ` +
    `${episodios} enmarcados como tema de episodio`,
);
