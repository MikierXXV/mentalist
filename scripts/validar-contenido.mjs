#!/usr/bin/env node
/**
 * Comprueba las reglas editoriales del proyecto sobre los archivos de `content/`.
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
const VISUALIZACIONES = ['focus-field', 'resonance', 'mirror-signal', 'reconstruction'];
const FAMILIAS = ['percepcion', 'influencia', 'lectura', 'memoria'];

const leerJson = (ruta) => JSON.parse(readFileSync(ruta, 'utf8'));

const fuentes = leerJson(join(RAIZ, 'content', 'fuentes.json'));
const archivos = readdirSync(DIR_CONCEPTOS).filter((f) => f.endsWith('.json'));
const conceptos = archivos.map((archivo) => ({
  archivo,
  datos: leerJson(join(DIR_CONCEPTOS, archivo)),
}));

const errores = [];
const ordenes = new Map();

for (const { archivo, datos } of conceptos) {
  const marca = `${archivo}`;
  const fallo = (mensaje) => errores.push(`${marca}: ${mensaje}`);

  if (datos.id !== archivo.replace(/\.json$/, '')) {
    fallo(`el id "${datos.id}" no coincide con el nombre del archivo`);
  }
  if (!FAMILIAS.includes(datos.familia)) {
    fallo(`familia desconocida: "${datos.familia}"`);
  }
  if (!VISUALIZACIONES.includes(datos.visualizacion)) {
    fallo(`visualización desconocida: "${datos.visualizacion}"`);
  }
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
    `${Object.keys(fuentes).length} fuentes · ` +
    `${conCita} con cita textual · ` +
    `${episodios} enmarcados como tema de episodio`,
);
