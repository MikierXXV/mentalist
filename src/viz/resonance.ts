import * as THREE from 'three';
import { COLORES, type Puntero, type VizInstancia } from './tipos';

/**
 * Resonancia: un pulso sale siempre del mismo punto y recorre una malla en
 * reposo. Cada pasada deja algo de deformación permanente, de modo que al cabo
 * de unos ciclos la malla ha adoptado la forma del pulso. Ilustra cómo una idea
 * repetida acaba fijada como creencia.
 */

const COLUMNAS = 76;
const FILAS = 42;
const PERIODO = 3.2;
const HUELLA_MAX = 0.85;

interface Nodo {
  x: number;
  y: number;
  distancia: number;
  huella: number;
}

export function init(scene: THREE.Scene, _camera: THREE.PerspectiveCamera): VizInstancia {
  const total = COLUMNAS * FILAS;
  const posiciones = new Float32Array(total * 3);
  const colores = new Float32Array(total * 3);
  const nodos: Nodo[] = [];

  const origen = new THREE.Vector2(-4.4, 0);
  const base = new THREE.Color(COLORES.bruma);
  const activa = new THREE.Color(COLORES.senalClara);
  const color = new THREE.Color();

  let i = 0;
  for (let f = 0; f < FILAS; f++) {
    for (let c = 0; c < COLUMNAS; c++) {
      const x = (c / (COLUMNAS - 1) - 0.5) * 11.6;
      const y = (f / (FILAS - 1) - 0.5) * 6.4;
      posiciones[i * 3] = x;
      posiciones[i * 3 + 1] = y;
      posiciones[i * 3 + 2] = 0;
      nodos.push({ x, y, distancia: origen.distanceTo(new THREE.Vector2(x, y)), huella: 0 });
      i++;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(posiciones, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colores, 3));

  const material = new THREE.PointsMaterial({
    size: 0.055,
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    sizeAttenuation: true,
  });

  const puntos = new THREE.Points(geometry, material);
  puntos.rotation.x = -0.42;
  scene.add(puntos);

  const atributoPos = geometry.getAttribute('position') as THREE.BufferAttribute;
  const atributoColor = geometry.getAttribute('color') as THREE.BufferAttribute;

  let ultimoCiclo = -1;

  return {
    update(t, _puntero: Puntero) {
      const fase = (t % PERIODO) / PERIODO;
      const ciclo = Math.floor(t / PERIODO);
      const frenteOnda = fase * 13.5;

      // Al completarse un ciclo, la deformación acumulada da un paso más.
      const nuevoCiclo = ciclo !== ultimoCiclo;
      ultimoCiclo = ciclo;

      for (let n = 0; n < nodos.length; n++) {
        const nodo = nodos[n]!;
        const delta = nodo.distancia - frenteOnda;
        // Cresta estrecha viajando hacia fuera.
        const pulso = Math.exp(-(delta * delta) * 2.6) * (1 - fase * 0.35);

        if (nuevoCiclo) {
          const alcanzado = Math.exp(-(nodo.distancia * nodo.distancia) * 0.045);
          nodo.huella = Math.min(HUELLA_MAX, nodo.huella + alcanzado * 0.11);
        }

        const altura = pulso * 1.15 + nodo.huella;
        atributoPos.setZ(n, altura);

        const intensidad = Math.min(1, pulso * 0.9 + nodo.huella * 1.05);
        color.copy(base).lerp(activa, intensidad);
        atributoColor.setXYZ(n, color.r, color.g, color.b);
      }

      atributoPos.needsUpdate = true;
      atributoColor.needsUpdate = true;
      puntos.rotation.z = Math.sin(t * 0.14) * 0.05;
    },
    dispose() {
      scene.remove(puntos);
      geometry.dispose();
      material.dispose();
    },
  };
}
