import * as THREE from 'three';
import { COLORES, type Puntero, type VizInstancia } from './tipos';

/**
 * Reconstrucción: una figura se disgrega en fragmentos y se vuelve a ensamblar
 * en cada ciclo, pero nunca exactamente igual: cada montaje arrastra la deriva
 * del anterior. Ilustra que recordar no es abrir un archivo, sino rearmar.
 */

const PUNTOS = 1400;
const PERIODO = 6.5;
const DERIVA = 0.055;

export function init(scene: THREE.Scene, _camera: THREE.PerspectiveCamera): VizInstancia {
  // Forma de referencia: puntos repartidos sobre una esfera.
  const original = new Float32Array(PUNTOS * 3);
  const objetivo = new Float32Array(PUNTOS * 3);
  const disperso = new Float32Array(PUNTOS * 3);
  const posiciones = new Float32Array(PUNTOS * 3);

  const radio = 2.35;
  for (let i = 0; i < PUNTOS; i++) {
    // Distribución de Fibonacci: reparto uniforme sobre la esfera.
    const y = 1 - (i / (PUNTOS - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = i * 2.399963;
    const x = Math.cos(theta) * r;
    const z = Math.sin(theta) * r;

    original[i * 3] = x * radio;
    original[i * 3 + 1] = y * radio;
    original[i * 3 + 2] = z * radio;

    objetivo[i * 3] = original[i * 3]!;
    objetivo[i * 3 + 1] = original[i * 3 + 1]!;
    objetivo[i * 3 + 2] = original[i * 3 + 2]!;

    const dispersion = 2.2 + Math.random() * 2.6;
    disperso[i * 3] = x * radio * dispersion + (Math.random() - 0.5) * 2;
    disperso[i * 3 + 1] = y * radio * dispersion + (Math.random() - 0.5) * 2;
    disperso[i * 3 + 2] = z * radio * dispersion + (Math.random() - 0.5) * 2;
  }
  posiciones.set(original);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(posiciones, 3));
  const colores = new Float32Array(PUNTOS * 3);
  geometry.setAttribute('color', new THREE.BufferAttribute(colores, 3));

  const material = new THREE.PointsMaterial({
    size: 0.05,
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
  });

  const puntos = new THREE.Points(geometry, material);
  scene.add(puntos);

  const atributoPos = geometry.getAttribute('position') as THREE.BufferAttribute;
  const atributoColor = geometry.getAttribute('color') as THREE.BufferAttribute;

  const base = new THREE.Color(COLORES.bruma);
  const acento = new THREE.Color(COLORES.senalClara);
  const color = new THREE.Color();

  let ultimoCiclo = -1;

  return {
    update(t, _puntero: Puntero) {
      const ciclo = Math.floor(t / PERIODO);
      const fase = (t % PERIODO) / PERIODO;

      if (ciclo !== ultimoCiclo) {
        ultimoCiclo = ciclo;
        // Cada reensamblaje se aleja un poco más del original: la copia de la copia.
        for (let i = 0; i < PUNTOS * 3; i++) {
          objetivo[i] = objetivo[i]! + (Math.random() - 0.5) * DERIVA;
        }
      }

      // 0 → figura íntegra, 1 → completamente disgregada.
      const disgregacion = Math.sin(fase * Math.PI) ** 1.6;

      for (let i = 0; i < PUNTOS; i++) {
        const j = i * 3;
        atributoPos.setXYZ(
          i,
          THREE.MathUtils.lerp(objetivo[j]!, disperso[j]!, disgregacion),
          THREE.MathUtils.lerp(objetivo[j + 1]!, disperso[j + 1]!, disgregacion),
          THREE.MathUtils.lerp(objetivo[j + 2]!, disperso[j + 2]!, disgregacion),
        );

        // Se ilumina lo que más se ha desviado del original: la parte reescrita.
        const dx = objetivo[j]! - original[j]!;
        const dy = objetivo[j + 1]! - original[j + 1]!;
        const dz = objetivo[j + 2]! - original[j + 2]!;
        const desviacion = Math.min(1, Math.sqrt(dx * dx + dy * dy + dz * dz) * 1.8);
        color.copy(base).lerp(acento, desviacion * (1 - disgregacion * 0.6));
        atributoColor.setXYZ(i, color.r, color.g, color.b);
      }

      atributoPos.needsUpdate = true;
      atributoColor.needsUpdate = true;

      puntos.rotation.y = t * 0.16;
      puntos.rotation.x = Math.sin(t * 0.22) * 0.2;
    },
    dispose() {
      scene.remove(puntos);
      geometry.dispose();
      material.dispose();
    },
  };
}
