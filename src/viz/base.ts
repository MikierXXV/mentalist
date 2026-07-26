import * as THREE from 'three';

/**
 * Utilidades compartidas por las visualizaciones. Todo generado en código: sin
 * dependencias añadidas ni assets externos.
 */

/* ------------------------------------------------------------------ ruido -- */

/**
 * Hash entero en [0, 1). Se usa mezcla de bits en vez del clásico
 * `sin(...) * 43758.5` porque el cerebro pide decenas de miles de vértices y
 * varias muestras por vértice: con senos, generar la malla bloquearía el hilo
 * principal durante cientos de milisegundos.
 */
function hash(x: number, y: number, z: number): number {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263);
  h = (h + Math.imul(z | 0, 1274126177)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const suavizar = (t: number) => t * t * (3 - 2 * t);
const mezclar = (a: number, b: number, t: number) => a + (b - a) * t;

/** Ruido de valor 3D en [0, 1). Suficiente para circunvoluciones y deriva. */
export function ruido3D(x: number, y: number, z: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const zi = Math.floor(z);
  const xf = suavizar(x - xi);
  const yf = suavizar(y - yi);
  const zf = suavizar(z - zi);

  const c = (dx: number, dy: number, dz: number) => hash(xi + dx, yi + dy, zi + dz);

  const x00 = mezclar(c(0, 0, 0), c(1, 0, 0), xf);
  const x10 = mezclar(c(0, 1, 0), c(1, 1, 0), xf);
  const x01 = mezclar(c(0, 0, 1), c(1, 0, 1), xf);
  const x11 = mezclar(c(0, 1, 1), c(1, 1, 1), xf);

  return mezclar(mezclar(x00, x10, yf), mezclar(x01, x11, yf), zf);
}

/**
 * Ruido de gradiente 3D en [-1, 1], estilo Perlin.
 *
 * El ruido de valor de arriba deja un enrejado visible alineado a los ejes, que
 * en una superficie orgánica canta muchísimo. Este interpola gradientes y no
 * tiene esa estructura.
 */
function gradiente(ix: number, iy: number, iz: number, dx: number, dy: number, dz: number) {
  const theta = hash(ix, iy, iz) * Math.PI * 2;
  const z = hash(iy + 31.4, iz - 7.7, ix + 12.9) * 2 - 1;
  const r = Math.sqrt(Math.max(0, 1 - z * z));
  return Math.cos(theta) * r * dx + Math.sin(theta) * r * dy + z * dz;
}

export function ruidoGradiente3D(x: number, y: number, z: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const zi = Math.floor(z);
  const xf = x - xi;
  const yf = y - yi;
  const zf = z - zi;
  const u = suavizar(xf);
  const v = suavizar(yf);
  const w = suavizar(zf);

  const g = (dx: number, dy: number, dz: number) =>
    gradiente(xi + dx, yi + dy, zi + dz, xf - dx, yf - dy, zf - dz);

  const x00 = mezclar(g(0, 0, 0), g(1, 0, 0), u);
  const x10 = mezclar(g(0, 1, 0), g(1, 1, 0), u);
  const x01 = mezclar(g(0, 0, 1), g(1, 0, 1), u);
  const x11 = mezclar(g(0, 1, 1), g(1, 1, 1), u);

  return mezclar(mezclar(x00, x10, v), mezclar(x01, x11, v), w);
}

/**
 * Ruido en cresta con deformación de dominio: produce surcos alargados y
 * sinuosos en lugar de manchas. Es lo que da a la superficie aspecto de
 * circunvolución. Devuelve [0, 1].
 */
export function crestas(x: number, y: number, z: number, octavas = 3): number {
  // La deformación previa curva los surcos y rompe cualquier regularidad.
  const wx = x + ruidoGradiente3D(x * 0.5 + 19, y * 0.5, z * 0.5) * 1.6;
  const wy = y + ruidoGradiente3D(x * 0.5, y * 0.5 + 7, z * 0.5) * 1.6;
  const wz = z + ruidoGradiente3D(x * 0.5, y * 0.5, z * 0.5 - 3) * 1.6;

  let valor = 0;
  let amplitud = 0.6;
  let frecuencia = 1;
  let total = 0;
  for (let i = 0; i < octavas; i++) {
    const n = ruidoGradiente3D(wx * frecuencia, wy * frecuencia, wz * frecuencia);
    valor += (1 - Math.abs(n)) * amplitud;
    total += amplitud;
    amplitud *= 0.55;
    frecuencia *= 2.1;
  }
  return valor / total;
}

/** Ruido fractal: varias octavas de `ruido3D`, en [0, 1). */
export function fbm(x: number, y: number, z: number, octavas = 4): number {
  let valor = 0;
  let amplitud = 0.5;
  let frecuencia = 1;
  let total = 0;
  for (let i = 0; i < octavas; i++) {
    valor += ruido3D(x * frecuencia, y * frecuencia, z * frecuencia) * amplitud;
    total += amplitud;
    amplitud *= 0.5;
    frecuencia *= 2;
  }
  return valor / total;
}

/* --------------------------------------------------------------- geometría -- */

export interface NubeOpciones {
  tamano?: number;
  opacidad?: number;
  aditivo?: boolean;
  colorFijo?: number;
}

export interface Nube {
  puntos: THREE.Points;
  geometry: THREE.BufferGeometry;
  material: THREE.PointsMaterial;
  posicion: THREE.BufferAttribute;
  color?: THREE.BufferAttribute;
  dispose(): void;
}

/**
 * Nube de puntos con atributos de posición y —salvo que se fije un color— de
 * color por vértice, que es como casi todas las escenas expresan intensidad.
 */
export function crearNube(cantidad: number, opciones: NubeOpciones = {}): Nube {
  const geometry = new THREE.BufferGeometry();
  const posiciones = new Float32Array(cantidad * 3);
  geometry.setAttribute('position', new THREE.BufferAttribute(posiciones, 3));

  let colorAttr: THREE.BufferAttribute | undefined;
  if (opciones.colorFijo === undefined) {
    colorAttr = new THREE.BufferAttribute(new Float32Array(cantidad * 3), 3);
    geometry.setAttribute('color', colorAttr);
  }

  const material = new THREE.PointsMaterial({
    size: opciones.tamano ?? 0.06,
    transparent: true,
    opacity: opciones.opacidad ?? 0.9,
    depthWrite: false,
    vertexColors: colorAttr !== undefined,
    ...(opciones.colorFijo !== undefined ? { color: opciones.colorFijo } : {}),
    ...(opciones.aditivo ? { blending: THREE.AdditiveBlending } : {}),
  });

  const puntos = new THREE.Points(geometry, material);

  return {
    puntos,
    geometry,
    material,
    posicion: geometry.getAttribute('position') as THREE.BufferAttribute,
    ...(colorAttr ? { color: colorAttr } : {}),
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}

export interface Aro {
  malla: THREE.Mesh;
  material: THREE.MeshBasicMaterial;
  dispose(): void;
}

/** Anillo plano: se usa como "nodo" o "persona" en varias escenas. */
export function crearAro(
  radio: number,
  color: number,
  opacidad = 0.7,
  grosor = 0.26,
): Aro {
  const geometry = new THREE.RingGeometry(radio * (1 - grosor), radio, 56);
  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: opacidad,
    side: THREE.DoubleSide,
  });
  const malla = new THREE.Mesh(geometry, material);
  return {
    malla,
    material,
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}

export interface Trazo {
  linea: THREE.Line;
  geometry: THREE.BufferGeometry;
  material: THREE.LineBasicMaterial;
  posicion: THREE.BufferAttribute;
  dispose(): void;
}

/** Polilínea de `puntos` vértices, para contornos y trayectorias. */
export function crearTrazo(cantidad: number, color: number, opacidad = 0.8): Trazo {
  const geometry = new THREE.BufferGeometry();
  const posiciones = new Float32Array(cantidad * 3);
  geometry.setAttribute('position', new THREE.BufferAttribute(posiciones, 3));
  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity: opacidad,
  });
  const linea = new THREE.Line(geometry, material);
  return {
    linea,
    geometry,
    material,
    posicion: geometry.getAttribute('position') as THREE.BufferAttribute,
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}

/* ------------------------------------------------------------------- varios -- */

/** Mitad del alto y del ancho visibles en el plano z = 0. */
export function extension(camera: THREE.PerspectiveCamera): {
  alto: number;
  ancho: number;
} {
  const alto = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * camera.position.z;
  return { alto, ancho: alto * camera.aspect };
}

/** Generador reproducible: la misma escena se ve igual en cada visita. */
export function aleatorio(semilla: number): () => number {
  let estado = semilla >>> 0 || 1;
  return () => {
    estado ^= estado << 13;
    estado ^= estado >>> 17;
    estado ^= estado << 5;
    estado >>>= 0;
    return estado / 4294967296;
  };
}

export const saturar = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** Curva de campana centrada en 0; `ancho` controla lo estrecha que es. */
export const campana = (d: number, ancho: number) => Math.exp(-(d * d) / (ancho * ancho));
