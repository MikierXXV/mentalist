#!/usr/bin/env node
/**
 * Importa los reels de `videos-cortos` al sitio: los transcodifica a una
 * versión ligera para web, genera sus pósters y escribe `content/reels.json`.
 *
 * Se puede reejecutar cuando lleguen reels nuevos o retocados: los que no han
 * cambiado desde la última importación se saltan, y los que aún no existen en
 * el origen se ignoran sin error. Necesita `ffmpeg` y `ffprobe` en el PATH.
 *
 *   npm run importar-reels                 # importa lo nuevo o cambiado
 *   npm run importar-reels -- --forzar     # vuelve a transcodificar todo
 *   REELS_ORIGEN=D:/otra/carpeta npm run importar-reels
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const ORIGEN = process.env.REELS_ORIGEN ?? 'C:/Users/migue/videos-cortos/reel/reels';
const DESTINO = join(RAIZ, 'public', 'reels');
const MANIFIESTO = join(RAIZ, 'content', 'reels.json');
const FORZAR = process.argv.includes('--forzar');

/** Tope por vídeo. El bitrate se calcula a partir de la duración para no pasarlo. */
const PRESUPUESTO_BYTES = 6.5 * 1024 * 1024;
const AUDIO_KBPS = 96;
const VIDEO_KBPS_MAX = 1800;

/**
 * Carpeta de origen → concepto. Los cuatro primeros reels se hicieron con el
 * nombre de su familia; los demás llevan ya el id del concepto.
 */
const REELS = {
  percepcion: 'percepcion-activa',
  influencia: 'sugestion',
  lectura: 'elicitacion',
  memoria: 'memoria-reconstructiva',
  'atencion-selectiva': 'atencion-selectiva',
  'sesgos-y-atencion-robada': 'sesgos-y-atencion-robada',
  'repeticion-y-creencia': 'repeticion-y-creencia',
  'consciente-subconsciente': 'consciente-subconsciente',
  'ilusion-de-eleccion-libre': 'ilusion-de-eleccion-libre',
  'tecnica-no-poder': 'tecnica-no-poder',
  'lectura-fria': 'lectura-fria',
  'no-verbal': 'no-verbal',
  'microexpresiones-y-mentira': 'microexpresiones-y-mentira',
  'desmontar-videntes': 'desmontar-videntes',
  'sugestion-hipnotica': 'sugestion-hipnotica',
  'siembra-de-ideas': 'siembra-de-ideas',
};

const ffmpeg = (args) => execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: 'inherit' });

function duracion(ruta) {
  const salida = execFileSync('ffprobe', [
    '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', ruta,
  ]).toString();
  return Number.parseFloat(salida);
}

/** Quita emojis, marcas de markdown y espacios sobrantes. */
function limpiar(texto) {
  return texto
    .replace(/[\p{Extended_Pictographic}\u{FE0F}\u{20E3}]/gu, '')
    .replace(/\*\*?|`/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Primer párrafo que sigue a un rótulo en negrita de post.md. */
function apartado(post, rotulo) {
  const lineas = post.split(/\r?\n/);
  const inicio = lineas.findIndex((l) => l.startsWith('**') && l.toLowerCase().includes(rotulo));
  if (inicio < 0) return '';
  const parrafo = [];
  for (const linea of lineas.slice(inicio + 1)) {
    if (!linea.trim()) {
      if (parrafo.length) break;
      continue;
    }
    if (linea.startsWith('**')) break;
    parrafo.push(linea);
  }
  return limpiar(parrafo.join(' '));
}

function leerPost(carpeta) {
  const post = readFileSync(join(carpeta, 'post.md'), 'utf8');
  const fuentes = post.split(/\r?\n/).find((l) => l.startsWith('Fuentes:'));
  return {
    titulo: apartado(post, 'título'),
    descripcion: apartado(post, 'alt text'),
    fuentes: fuentes ? limpiar(fuentes.replace(/^Fuentes:\s*/, '')) : '',
  };
}

/** Lo que dice la voz, frase a frase; sirve de transcripción. */
function leerTranscripcion(carpeta) {
  const ruta = join(carpeta, 'guion.json');
  if (!existsSync(ruta)) return [];
  const guion = JSON.parse(readFileSync(ruta, 'utf8'));
  return (guion.frases ?? []).map((f) => limpiar(f.texto ?? '')).filter(Boolean);
}

function transcodificar(mp4, destino, segundos) {
  const totalKbps = (PRESUPUESTO_BYTES * 8) / 1000 / segundos;
  // 5 % de margen para el contenedor y las variaciones del codificador.
  const videoKbps = Math.min(VIDEO_KBPS_MAX, Math.floor(totalKbps * 0.95 - AUDIO_KBPS));
  ffmpeg([
    '-i', mp4,
    '-vf', 'scale=720:1280:flags=lanczos,format=yuv420p',
    '-c:v', 'libx264', '-preset', 'slow', '-profile:v', 'high',
    '-crf', '23', '-maxrate', `${videoKbps}k`, '-bufsize', `${videoKbps * 2}k`,
    '-c:a', 'aac', '-b:a', `${AUDIO_KBPS}k`, '-ac', '2',
    // El índice al principio: el navegador puede empezar a reproducir sin
    // descargar el archivo entero.
    '-movflags', '+faststart',
    destino,
  ]);
}

function posteres(png, base) {
  ffmpeg(['-i', png, '-vf', 'scale=720:1280:flags=lanczos', '-c:v', 'libwebp', '-quality', '80', `${base}.webp`]);
  ffmpeg(['-i', png, '-vf', 'scale=360:640:flags=lanczos', '-c:v', 'libwebp', '-quality', '75', `${base}-mini.webp`]);
}

const anterior = existsSync(MANIFIESTO) ? JSON.parse(readFileSync(MANIFIESTO, 'utf8')) : { reels: [] };
const previos = new Map(anterior.reels.map((r) => [r.concepto, r]));
mkdirSync(DESTINO, { recursive: true });

const reels = [];
const resumen = { nuevos: [], actualizados: [], iguales: [], pendientes: [] };

for (const [carpeta, concepto] of Object.entries(REELS)) {
  const dir = join(ORIGEN, carpeta);
  const mp4 = join(dir, 'salida', `${carpeta}.mp4`);
  const png = join(dir, 'salida', `${carpeta}-portada.png`);

  if (!existsSync(mp4) || !existsSync(png) || !existsSync(join(dir, 'post.md'))) {
    resumen.pendientes.push(carpeta);
    continue;
  }

  // Huella del origen: tamaño y fecha del mp4 y de la portada. Si coinciden
  // con la importación anterior y los archivos siguen en public/, se salta.
  const huella = [mp4, png].map((r) => {
    const s = statSync(r);
    return `${s.size}-${Math.round(s.mtimeMs)}`;
  }).join('|');

  const base = join(DESTINO, concepto);
  const previo = previos.get(concepto);
  const intactos = [`${base}.mp4`, `${base}.webp`, `${base}-mini.webp`].every(existsSync);
  const cambiado = FORZAR || !previo || previo.huella !== huella || !intactos;

  const segundos = duracion(mp4);
  if (cambiado) {
    process.stdout.write(`· ${carpeta} → ${concepto} (${segundos.toFixed(1)} s)… `);
    const temporal = `${base}.tmp.mp4`;
    transcodificar(mp4, temporal, segundos);
    renameSync(temporal, `${base}.mp4`);
    posteres(png, base);
    console.log(`${(statSync(`${base}.mp4`).size / 1024 / 1024).toFixed(1)} MB`);
    (previo ? resumen.actualizados : resumen.nuevos).push(carpeta);
  } else {
    resumen.iguales.push(carpeta);
  }

  reels.push({
    concepto,
    ...leerPost(dir),
    transcripcion: leerTranscripcion(dir),
    duracion: Math.round(segundos),
    video: `reels/${concepto}.mp4`,
    poster: `reels/${concepto}.webp`,
    miniatura: `reels/${concepto}-mini.webp`,
    bytes: statSync(`${base}.mp4`).size,
    huella,
  });
}

writeFileSync(
  MANIFIESTO,
  `${JSON.stringify({ nota: 'Generado por scripts/importar-reels.mjs; no se edita a mano.', reels }, null, 2)}\n`,
);

console.log(
  `\n✓ ${reels.length} reels en content/reels.json` +
    ` · nuevos: ${resumen.nuevos.length}` +
    ` · actualizados: ${resumen.actualizados.length}` +
    ` · sin cambios: ${resumen.iguales.length}` +
    (resumen.pendientes.length ? `\n  Aún no disponibles (${resumen.pendientes.length}): ${resumen.pendientes.join(', ')}` : ''),
);
