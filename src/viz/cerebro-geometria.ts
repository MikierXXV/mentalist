import * as THREE from 'three';
import { crestas } from './base';

/**
 * Geometría del cerebro, generada por código: sin modelos externos, sin licencias
 * de terceros que verificar y sin varios megas de descarga.
 *
 * La forma sale de un icosaedro subdividido, llevado a elipsoide y desplazado con
 * ruido fractal en cresta para labrar las circunvoluciones. Cada vértice lleva un
 * identificador de región, de modo que resaltar una zona es cambiar un uniforme y
 * no reconstruir nada.
 */

/** Región de un punto en coordenadas del elipsoide, antes de deformar. */
function regionDe(y: number, z: number): number {
  if (z > 0.34) return 0; // frontal
  if (z < -0.42) return 3; // occipital
  if (y < -0.18) return 2; // temporal
  return 1; // parietal
}

export interface MallaCerebro {
  malla: THREE.Mesh;
  geometry: THREE.BufferGeometry;
  material: THREE.ShaderMaterial;
}

const vertexShader = /* glsl */ `
  attribute float aRegion;
  varying float vRegion;
  varying vec3 vNormal;
  varying float vProfundidad;

  void main() {
    vRegion = aRegion;
    vNormal = normalize(normalMatrix * normal);
    vProfundidad = position.y;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uColorBase;
  uniform vec3 uColorRealce;
  uniform float uRegionActiva;
  uniform float uIntensidad;
  varying float vRegion;
  varying vec3 vNormal;
  varying float vProfundidad;

  void main() {
    // Dos luces fijas: la principal marca el relieve de los surcos y la de
    // relleno evita que la mitad en sombra se vaya a negro.
    vec3 principal = normalize(vec3(0.4, 0.75, 0.72));
    vec3 relleno = normalize(vec3(-0.6, -0.25, 0.4));
    float difusa = max(dot(vNormal, principal), 0.0);
    float suave = max(dot(vNormal, relleno), 0.0);
    float sombreado = 0.46 + difusa * 0.72 + suave * 0.22;

    float activa = step(abs(vRegion - uRegionActiva), 0.5);
    vec3 color = mix(uColorBase, uColorRealce, activa * 0.72);
    color *= sombreado;
    // Borde luminoso: da volumen sin necesidad de más luces.
    float borde = pow(1.0 - max(dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0), 2.5);
    color += uColorRealce * borde * (0.18 + activa * 0.32);

    gl_FragColor = vec4(color, uIntensidad);
  }
`;

function crearMaterial(base: number, realce: number, opacidad: number): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    transparent: true,
    uniforms: {
      uColorBase: { value: new THREE.Color(base) },
      uColorRealce: { value: new THREE.Color(realce) },
      uRegionActiva: { value: -1 },
      uIntensidad: { value: opacidad },
    },
  });
}

/**
 * Un hemisferio con circunvoluciones y su atributo de región.
 *
 * Hace falta bastante subdivisión: por debajo de unos miles de triángulos los
 * surcos no llegan a leerse y el resultado parece una esfera facetada.
 */
function crearHemisferio(detalle: number, signo: number): THREE.BufferGeometry {
  const geometry = new THREE.IcosahedronGeometry(1, detalle);
  const posicion = geometry.getAttribute('position') as THREE.BufferAttribute;
  const total = posicion.count;
  const regiones = new Float32Array(total);

  const v = new THREE.Vector3();
  for (let i = 0; i < total; i++) {
    v.fromBufferAttribute(posicion, i);

    // Elipsoide de partida: alargado de delante a atrás y estrecho de lado.
    let ex = v.x * 0.6;
    let ey = v.y * 0.72;
    let ez = v.z * 0.98;

    regiones[i] = regionDe(ey, ez);

    // Los polos frontal y occipital se estrechan; el perfil deja de ser un huevo.
    const estrechamiento = 1 - 0.3 * Math.max(0, ez) - 0.24 * Math.max(0, -ez);
    ex *= estrechamiento;
    ey *= 1 - 0.16 * Math.abs(ez);

    // Base aplanada: por debajo el cerebro se apoya, no es redondo.
    if (ey < -0.18) ey = -0.18 + (ey + 0.18) * 0.55;

    // Cisura de Silvio: el surco profundo y oblicuo que separa el lóbulo
    // temporal del resto. Es el rasgo que más ayuda a leer la forma.
    const silvio = ey + 0.08 + 0.3 * ez;
    const surcoSilvio = Math.exp(-(silvio * silvio) / 0.0045) * 0.075;
    // Debajo de esa línea, el temporal sobresale hacia fuera.
    if (silvio < 0) ex *= 1 + 0.16 * Math.min(1, -silvio * 3.2);

    // Circunvoluciones. La escala anisótropa —menor en z— alarga los surcos de
    // delante a atrás, que es como corren en un cerebro real.
    const gruesa = crestas(ex * 5.2 + 11, ey * 5.2, ez * 3.6, 2);
    const fina = crestas(ex * 10.5, ey * 10.5 + 7, ez * 7.4, 2);
    const relieve = (gruesa - 0.5) * 0.085 + (fina - 0.5) * 0.05;

    const escala = 1 + relieve - surcoSilvio;
    let x = ex * escala;
    const y = ey * escala;
    const z = ez * escala;

    // Cara interna casi plana y despegada del eje: la fisura longitudinal.
    x = Math.max(Math.abs(x) * 0.92, 0.045) * signo;

    posicion.setXYZ(i, x, y, z);
  }

  geometry.setAttribute('aRegion', new THREE.BufferAttribute(regiones, 1));
  geometry.computeVertexNormals();
  return geometry;
}

/** Cerebelo: elipsoide pequeño y con estrías finas, detrás y debajo. */
function crearCerebelo(detalle: number): THREE.BufferGeometry {
  const geometry = new THREE.IcosahedronGeometry(1, Math.max(1, detalle - 1));
  const posicion = geometry.getAttribute('position') as THREE.BufferAttribute;
  const regiones = new Float32Array(posicion.count).fill(4);

  const v = new THREE.Vector3();
  for (let i = 0; i < posicion.count; i++) {
    v.fromBufferAttribute(posicion, i);
    const x = v.x * 0.44;
    const y = v.y * 0.22;
    const z = v.z * 0.32;
    // Estrías horizontales finas, la firma visual del cerebelo.
    const estria = Math.sin(y * 90) * 0.02;
    posicion.setXYZ(i, x * (1 + estria), y, z * (1 + estria));
  }

  geometry.setAttribute('aRegion', new THREE.BufferAttribute(regiones, 1));
  // Recogido bajo el polo occipital, no colgando por debajo.
  geometry.translate(0, -0.4, -0.56);
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * Cuerpo medial que une los dos hemisferios.
 *
 * Sin él, la fisura longitudinal deja pasar el rayo justo por el centro del
 * modelo —la zona a la que más apunta la gente— y la selección no responde.
 * Además de resolver eso, los hemisferios están unidos de verdad.
 */
function crearPuente(detalle: number): THREE.BufferGeometry {
  const geometry = new THREE.IcosahedronGeometry(1, Math.max(1, detalle - 1));
  const posicion = geometry.getAttribute('position') as THREE.BufferAttribute;
  const regiones = new Float32Array(posicion.count);

  const v = new THREE.Vector3();
  for (let i = 0; i < posicion.count; i++) {
    v.fromBufferAttribute(posicion, i);
    const x = v.x * 0.1;
    const y = v.y * 0.5;
    const z = v.z * 1.02;
    posicion.setXYZ(i, x, y, z);
    regiones[i] = regionDe(y, z);
  }

  geometry.setAttribute('aRegion', new THREE.BufferAttribute(regiones, 1));
  geometry.computeVertexNormals();
  return geometry;
}

/** Tronco encefálico: cono truncado que baja desde el centro. */
function crearTronco(): THREE.BufferGeometry {
  const geometry = new THREE.CylinderGeometry(0.15, 0.1, 0.42, 20, 4, true);
  const posicion = geometry.getAttribute('position') as THREE.BufferAttribute;
  const regiones = new Float32Array(posicion.count).fill(5);
  geometry.setAttribute('aRegion', new THREE.BufferAttribute(regiones, 1));
  geometry.translate(0, -0.5, -0.24);
  geometry.rotateX(0.3);
  geometry.computeVertexNormals();
  return geometry;
}

export interface Cerebro {
  grupo: THREE.Group;
  partes: MallaCerebro[];
  /** Malla usada para el raycasting; incluye todas las partes. */
  objetivos: THREE.Object3D[];
  setColores(base: number, realce: number): void;
  setRegionActiva(indice: number): void;
  dispose(): void;
}

export function crearCerebro(opciones: {
  detalle: number;
  base: number;
  realce: number;
  opacidad: number;
}): Cerebro {
  const { detalle, base, realce, opacidad } = opciones;
  const grupo = new THREE.Group();
  const partes: MallaCerebro[] = [];

  const geometrias: THREE.BufferGeometry[] = [
    crearHemisferio(detalle, 1),
    crearHemisferio(detalle, -1),
    crearPuente(detalle),
    crearCerebelo(detalle),
    crearTronco(),
  ];

  for (const geometry of geometrias) {
    const material = crearMaterial(base, realce, opacidad);
    const malla = new THREE.Mesh(geometry, material);
    grupo.add(malla);
    partes.push({ malla, geometry, material });
  }

  return {
    grupo,
    partes,
    objetivos: partes.map((parte) => parte.malla),
    setColores(nuevaBase, nuevoRealce) {
      for (const parte of partes) {
        (parte.material.uniforms.uColorBase!.value as THREE.Color).set(nuevaBase);
        (parte.material.uniforms.uColorRealce!.value as THREE.Color).set(nuevoRealce);
      }
    },
    setRegionActiva(indice) {
      for (const parte of partes) {
        parte.material.uniforms.uRegionActiva!.value = indice;
      }
    },
    dispose() {
      for (const parte of partes) {
        grupo.remove(parte.malla);
        parte.geometry.dispose();
        parte.material.dispose();
      }
    },
  };
}
