import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { ensamblarCerebro, type Cerebro, type OpcionesCerebro } from './cerebro-geometria';

/**
 * Carga el cerebro desde el modelo real y lo deja listo para el resto del sitio.
 *
 * El archivo lo prepara `scripts/preparar-cerebro.mjs`, que se queda solo con la
 * geometría: aquí no se usan ni las texturas ni los materiales del original,
 * porque el cerebro se pinta con el shader del sitio para heredar su paleta, el
 * resalte de regiones y la reactividad al tema.
 *
 * Modelo: «Human Brain» de AH (@agher), CC BY 4.0.
 * https://sketchfab.com/3d-models/human-brain-c9c9d4d671b94345952d012cc2ea7a24
 */

const RUTA = 'modelos/cerebro-web.glb';

/** Medida del lado mayor tras normalizar, para que encajen las cámaras que ya había. */
const TAMANO_OBJETIVO = 1.75;

/** Índices de región, en el mismo orden que `REGIONES` de `regiones.ts`. */
const FRONTAL = 0;
const PARIETAL = 1;
const TEMPORAL = 2;
const OCCIPITAL = 3;
const CEREBELO = 4;
const TRONCO = 5;

/** Región por nombre de nodo; el cerebro se reparte luego por posición. */
const POR_NOMBRE: Record<string, number> = {
  cerebelo: CEREBELO,
  tronco: TRONCO,
};

interface Pieza {
  geometry: THREE.BufferGeometry;
  nombre: string;
}

/**
 * Reparte el cerebro en lóbulos usando proporciones de su propia caja
 * envolvente, no umbrales absolutos: así el reparto no depende de la escala ni
 * de las proporciones concretas del modelo que se cargue.
 */
function repartirLobulos(geometry: THREE.BufferGeometry): void {
  const posicion = geometry.getAttribute('position') as THREE.BufferAttribute;
  geometry.computeBoundingBox();
  const caja = geometry.boundingBox!;
  const alto = Math.max(1e-6, caja.max.y - caja.min.y);
  const largo = Math.max(1e-6, caja.max.z - caja.min.z);

  const regiones = new Float32Array(posicion.count);
  for (let i = 0; i < posicion.count; i++) {
    // 0 en la parte posterior e inferior, 1 en la anterior y superior.
    const frente = (posicion.getZ(i) - caja.min.z) / largo;
    const altura = (posicion.getY(i) - caja.min.y) / alto;

    if (frente > 0.62) regiones[i] = FRONTAL;
    else if (frente < 0.3) regiones[i] = OCCIPITAL;
    else if (altura < 0.4) regiones[i] = TEMPORAL;
    else regiones[i] = PARIETAL;
  }
  geometry.setAttribute('aRegion', new THREE.BufferAttribute(regiones, 1));
}

function marcarRegionFija(geometry: THREE.BufferGeometry, region: number): void {
  const total = geometry.getAttribute('position').count;
  geometry.setAttribute(
    'aRegion',
    new THREE.BufferAttribute(new Float32Array(total).fill(region), 1),
  );
}

/**
 * Intenta construir el cerebro a partir del modelo. Devuelve `null` si el
 * archivo no está o no se puede leer, para que la escena recurra al procedural.
 */
export async function cargarCerebroModelo(
  opciones: OpcionesCerebro,
): Promise<Cerebro | null> {
  const url = `${import.meta.env.BASE_URL}${RUTA}`;

  let gltf;
  try {
    gltf = await new GLTFLoader().loadAsync(url);
  } catch {
    if (import.meta.env.DEV) {
      console.warn(
        `[cerebro] no se pudo cargar ${url}; se usa la geometría procedural.\n` +
          '          Ver el README: hay que descargar el modelo y ejecutar ' +
          'npm run preparar-cerebro.',
      );
    }
    return null;
  }

  const piezas: Pieza[] = [];
  gltf.scene.updateWorldMatrix(true, true);
  gltf.scene.traverse((objeto) => {
    if (!(objeto instanceof THREE.Mesh)) return;
    const geometry = (objeto.geometry as THREE.BufferGeometry).clone();
    // El nombre útil está en el nodo, que puede ser la malla o su padre.
    const nombre = (objeto.name || objeto.parent?.name || '').toLowerCase();
    // Se hornea la transformación del nodo: a partir de aquí todo vive en
    // coordenadas del mundo y las cajas envolventes son comparables entre sí.
    geometry.applyMatrix4(objeto.matrixWorld);
    piezas.push({ geometry, nombre });
  });

  if (!piezas.length) {
    if (import.meta.env.DEV) console.warn('[cerebro] el modelo no contiene mallas.');
    return null;
  }

  // Encuadre: se centra en el cerebro, no en el conjunto, para que el tronco
  // cuelgue por debajo en vez de desplazar el centro visual hacia arriba.
  const union = new THREE.Box3();
  let cajaCerebro: THREE.Box3 | null = null;
  for (const pieza of piezas) {
    pieza.geometry.computeBoundingBox();
    const caja = pieza.geometry.boundingBox!;
    union.union(caja);
    if (!POR_NOMBRE[pieza.nombre]) {
      cajaCerebro = cajaCerebro ? cajaCerebro.union(caja) : caja.clone();
    }
  }

  const centro = (cajaCerebro ?? union).getCenter(new THREE.Vector3());
  const lado = Math.max(...union.getSize(new THREE.Vector3()).toArray());
  const escala = TAMANO_OBJETIVO / (lado || 1);

  for (const pieza of piezas) {
    pieza.geometry.translate(-centro.x, -centro.y, -centro.z);
    pieza.geometry.scale(escala, escala, escala);

    const fija = POR_NOMBRE[pieza.nombre];
    if (fija !== undefined) marcarRegionFija(pieza.geometry, fija);
    else repartirLobulos(pieza.geometry);

    if (!pieza.geometry.getAttribute('normal')) pieza.geometry.computeVertexNormals();
  }

  return ensamblarCerebro(
    piezas.map((pieza) => pieza.geometry),
    opciones,
  );
}
