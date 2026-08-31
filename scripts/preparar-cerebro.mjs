#!/usr/bin/env node
/**
 * Reduce el modelo de cerebro descargado de Sketchfab a lo único que el sitio
 * necesita: geometría.
 *
 * El archivo original pesa unos 8 MB, de los que dos tercios son nueve texturas
 * embebidas que aquí no se usan —el cerebro se pinta con el shader del sitio,
 * con su paleta y su resalte de regiones—. Además sobran los atributos de
 * tangente y de coordenadas de textura, y los índices vienen en 32 bits cuando
 * ninguna malla llega a 65.536 vértices.
 *
 * Se hace a mano y sin dependencias porque la operación es muy acotada: quedarse
 * con POSITION, NORMAL e índices de tres mallas y tirar todo lo demás.
 *
 *   node scripts/preparar-cerebro.mjs
 *
 * Entrada:  modelos-fuente/cerebro.glb    (el descargado; no se versiona)
 * Salida:   public/modelos/cerebro-web.glb  (el que carga el sitio)
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const ENTRADA = 'modelos-fuente/cerebro.glb';
const SALIDA = 'public/modelos/cerebro-web.glb';

/** Nombre de la parte según el material que trae el original de Sketchfab. */
const PARTES = {
  BRAIN_STEM_1002: 'tronco',
  cerebellum_1003: 'cerebelo',
  BRAIN_LOW_1001: 'cerebro',
};

const FLOAT = 5126;
const UINT32 = 5125;
const UINT16 = 5123;
const COMPONENTES = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };
const BYTES = { [FLOAT]: 4, [UINT32]: 4, [UINT16]: 2, 5121: 1 };

if (!existsSync(ENTRADA)) {
  console.error(`\n[x] No encuentro ${ENTRADA}.`);
  console.error('    Descarga el modelo en GLB y dejalo ahi. Ver README.\n');
  process.exit(1);
}

/* --------------------------------------------------------------- lectura -- */

function leerGlb(ruta) {
  const buf = readFileSync(ruta);
  if (buf.toString('ascii', 0, 4) !== 'glTF') throw new Error('no es un GLB');
  const total = buf.readUInt32LE(8);
  let off = 12;
  let json = null;
  let bin = null;
  while (off < total) {
    const len = buf.readUInt32LE(off);
    const tipo = buf.toString('ascii', off + 4, off + 8);
    const datos = buf.subarray(off + 8, off + 8 + len);
    if (tipo === 'JSON') json = JSON.parse(datos.toString('utf8'));
    if (tipo.startsWith('BIN')) bin = datos;
    off += 8 + len;
  }
  return { json, bin };
}

/** Lee un accessor a un array plano, respetando byteStride si lo hubiera. */
function leerAccessor(json, bin, indice) {
  const acc = json.accessors[indice];
  const vista = json.bufferViews[acc.bufferView];
  const comps = COMPONENTES[acc.type];
  const tam = BYTES[acc.componentType];
  const base = (vista.byteOffset ?? 0) + (acc.byteOffset ?? 0);
  const paso = vista.byteStride ?? comps * tam;

  const salida =
    acc.componentType === FLOAT
      ? new Float32Array(acc.count * comps)
      : new Uint32Array(acc.count * comps);

  for (let i = 0; i < acc.count; i++) {
    for (let c = 0; c < comps; c++) {
      const p = base + i * paso + c * tam;
      let v;
      if (acc.componentType === FLOAT) v = bin.readFloatLE(p);
      else if (acc.componentType === UINT32) v = bin.readUInt32LE(p);
      else if (acc.componentType === UINT16) v = bin.readUInt16LE(p);
      else v = bin.readUInt8(p);
      salida[i * comps + c] = v;
    }
  }
  return salida;
}

/* ------------------------------------------------------------- escritura -- */

const { json, bin } = leerGlb(ENTRADA);

const piezas = [];
for (const [i, malla] of json.meshes.entries()) {
  for (const prim of malla.primitives) {
    const material = prim.material !== undefined ? json.materials[prim.material].name : '';
    const nombre = PARTES[material];
    if (!nombre) {
      console.warn(`  · aviso: material "${material}" sin identificar, malla ${i} descartada`);
      continue;
    }
    piezas.push({
      nombre,
      posicion: leerAccessor(json, bin, prim.attributes.POSITION),
      normal: leerAccessor(json, bin, prim.attributes.NORMAL),
      indices: leerAccessor(json, bin, prim.indices),
    });
  }
}

if (piezas.length !== 3) {
  console.error(`\n[x] Esperaba 3 partes y he encontrado ${piezas.length}.`);
  console.error('    Puede que no sea el modelo indicado en el README.\n');
  process.exit(1);
}

// Orden estable: primero el cerebro, que es el que domina la silueta.
const ORDEN = ['cerebro', 'cerebelo', 'tronco'];
piezas.sort((a, b) => ORDEN.indexOf(a.nombre) - ORDEN.indexOf(b.nombre));

const trozos = [];
let cursor = 0;
const bufferViews = [];
const accessors = [];
const meshes = [];
const nodes = [];

/** Anade un bloque al binario, alineado a 4 bytes, y devuelve su bufferView. */
function anadirVista(buffer) {
  const relleno = (4 - (cursor % 4)) % 4;
  if (relleno) {
    trozos.push(Buffer.alloc(relleno));
    cursor += relleno;
  }
  const indice = bufferViews.length;
  bufferViews.push({ buffer: 0, byteOffset: cursor, byteLength: buffer.length });
  trozos.push(buffer);
  cursor += buffer.length;
  return indice;
}

for (const pieza of piezas) {
  const nVerts = pieza.posicion.length / 3;
  if (nVerts > 65535) {
    console.error(`[x] "${pieza.nombre}" tiene ${nVerts} vertices: no caben en 16 bits.`);
    process.exit(1);
  }

  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < nVerts; i++) {
    for (let c = 0; c < 3; c++) {
      const v = pieza.posicion[i * 3 + c];
      if (v < min[c]) min[c] = v;
      if (v > max[c]) max[c] = v;
    }
  }

  const vistaPos = anadirVista(Buffer.from(pieza.posicion.buffer, 0, pieza.posicion.byteLength));
  const accPos = accessors.length;
  accessors.push({
    bufferView: vistaPos,
    componentType: FLOAT,
    count: nVerts,
    type: 'VEC3',
    min,
    max,
  });

  const vistaNor = anadirVista(Buffer.from(pieza.normal.buffer, 0, pieza.normal.byteLength));
  const accNor = accessors.length;
  accessors.push({ bufferView: vistaNor, componentType: FLOAT, count: nVerts, type: 'VEC3' });

  // De 32 a 16 bits: ninguna malla se acerca al limite y se ahorra la mitad.
  const indices16 = new Uint16Array(pieza.indices.length);
  indices16.set(pieza.indices);
  const vistaIdx = anadirVista(Buffer.from(indices16.buffer, 0, indices16.byteLength));
  const accIdx = accessors.length;
  accessors.push({
    bufferView: vistaIdx,
    componentType: UINT16,
    count: indices16.length,
    type: 'SCALAR',
  });

  const indiceMalla = meshes.length;
  meshes.push({
    name: pieza.nombre,
    primitives: [{ attributes: { POSITION: accPos, NORMAL: accNor }, indices: accIdx }],
  });
  // El nombre del nodo es lo que el sitio usa para saber que region es cada parte.
  nodes.push({ name: pieza.nombre, mesh: indiceMalla });
}

const binario = Buffer.concat(trozos);
const salidaJson = {
  asset: {
    version: '2.0',
    generator: 'preparar-cerebro.mjs (solo geometria)',
    copyright:
      'Human Brain por AH (@agher), CC BY 4.0. Modificado: texturas y materiales eliminados, indices a 16 bits.',
  },
  scene: 0,
  scenes: [{ nodes: nodes.map((_, i) => i) }],
  nodes,
  meshes,
  accessors,
  bufferViews,
  buffers: [{ byteLength: binario.length }],
};

const jsonBuf = Buffer.from(JSON.stringify(salidaJson), 'utf8');
const jsonPad = Buffer.concat([jsonBuf, Buffer.alloc((4 - (jsonBuf.length % 4)) % 4, 0x20)]);
const binPad = Buffer.concat([binario, Buffer.alloc((4 - (binario.length % 4)) % 4, 0)]);

const cabecera = Buffer.alloc(12);
cabecera.write('glTF', 0, 'ascii');
cabecera.writeUInt32LE(2, 4);
cabecera.writeUInt32LE(12 + 8 + jsonPad.length + 8 + binPad.length, 8);

const cabJson = Buffer.alloc(8);
cabJson.writeUInt32LE(jsonPad.length, 0);
cabJson.write('JSON', 4, 'ascii');

// El tipo de chunk binario es 'BIN' seguido de un byte nulo: Buffer.alloc
// rellena de ceros, asi que basta con escribir las tres letras.
const cabBin = Buffer.alloc(8);
cabBin.writeUInt32LE(binPad.length, 0);
cabBin.write('BIN', 4, 'ascii');

writeFileSync(SALIDA, Buffer.concat([cabecera, cabJson, jsonPad, cabBin, binPad]));

const antes = readFileSync(ENTRADA).length;
const despues = readFileSync(SALIDA).length;
console.log(
  `[ok] ${SALIDA}\n` +
    `     ${piezas.map((p) => `${p.nombre} ${Math.round(p.indices.length / 3)} tri`).join(' | ')}\n` +
    `     ${(antes / 1048576).toFixed(2)} MB -> ${(despues / 1048576).toFixed(2)} MB ` +
    `(${Math.round((1 - despues / antes) * 100)} % menos)`,
);
