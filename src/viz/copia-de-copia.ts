import * as THREE from 'three';
import { aleatorio, crearNube, saturar } from './base';
import type { Paleta, VizContexto, VizInstancia } from './tipos';

/**
 * memoria-reconstructiva — Copias de copias.
 *
 * En cada ciclo la figura se disgrega y se rearma, pero no desde el original:
 * desde la última reconstrucción. El fantasma tenue del suceso original se queda
 * fijo de referencia, y la distancia entre ambos crece evocación tras evocación.
 */

const PERIODO = 5.6;
const DERIVA = 0.075;

export const pista =
  'La nube tenue es el suceso original y no se mueve. La dorada es lo que recuerdas: cada reensamblaje parte del anterior, no del hecho.';

export function init({ scene, paleta, esMovil }: VizContexto): VizInstancia {
  const cantidad = esMovil ? 700 : 1250;
  const radio = 2.3;

  const original = new Float32Array(cantidad * 3);
  const objetivo = new Float32Array(cantidad * 3);
  const disperso = new Float32Array(cantidad * 3);

  const rnd = aleatorio(1979);
  for (let i = 0; i < cantidad; i++) {
    // Reparto de Fibonacci sobre la esfera: uniforme y reproducible.
    const y = 1 - (i / (cantidad - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = i * 2.399963;
    const x = Math.cos(theta) * r;
    const z = Math.sin(theta) * r;

    original[i * 3] = x * radio;
    original[i * 3 + 1] = y * radio;
    original[i * 3 + 2] = z * radio;
    objetivo[i * 3] = x * radio;
    objetivo[i * 3 + 1] = y * radio;
    objetivo[i * 3 + 2] = z * radio;

    const d = 2 + rnd() * 2.4;
    disperso[i * 3] = x * radio * d + (rnd() - 0.5) * 2;
    disperso[i * 3 + 1] = y * radio * d + (rnd() - 0.5) * 2;
    disperso[i * 3 + 2] = z * radio * d + (rnd() - 0.5) * 2;
  }

  const fantasma = crearNube(cantidad, {
    tamano: 0.032,
    opacidad: 0.28,
    colorFijo: paleta.tenue,
  });
  for (let i = 0; i < cantidad; i++) {
    fantasma.posicion.setXYZ(i, original[i * 3]!, original[i * 3 + 1]!, original[i * 3 + 2]!);
  }
  fantasma.posicion.needsUpdate = true;

  const recuerdo = crearNube(cantidad, { tamano: 0.055, opacidad: 0.92 });
  scene.add(fantasma.puntos, recuerdo.puntos);

  let base = new THREE.Color(paleta.tenue);
  let acento = new THREE.Color(paleta.acentoClaro);
  const color = new THREE.Color();

  let ultimoCiclo = -1;

  return {
    update(t) {
      const ciclo = Math.floor(t / PERIODO);
      const fase = (t % PERIODO) / PERIODO;

      if (ciclo !== ultimoCiclo) {
        ultimoCiclo = ciclo;
        // Se reescribe sobre el objetivo, nunca sobre el original: copia de copia.
        for (let i = 0; i < cantidad * 3; i++) {
          objetivo[i] = objetivo[i]! + (rnd() - 0.5) * DERIVA;
        }
      }

      const disgregacion = Math.sin(fase * Math.PI) ** 1.7;
      const atributo = recuerdo.color;

      for (let i = 0; i < cantidad; i++) {
        const j = i * 3;
        recuerdo.posicion.setXYZ(
          i,
          THREE.MathUtils.lerp(objetivo[j]!, disperso[j]!, disgregacion),
          THREE.MathUtils.lerp(objetivo[j + 1]!, disperso[j + 1]!, disgregacion),
          THREE.MathUtils.lerp(objetivo[j + 2]!, disperso[j + 2]!, disgregacion),
        );

        if (atributo) {
          // Se ilumina lo que más se ha alejado del original: la parte reescrita.
          const dx = objetivo[j]! - original[j]!;
          const dy = objetivo[j + 1]! - original[j + 1]!;
          const dz = objetivo[j + 2]! - original[j + 2]!;
          const desvio = saturar(Math.hypot(dx, dy, dz) * 1.6);
          color.copy(base).lerp(acento, desvio * (1 - disgregacion * 0.5));
          atributo.setXYZ(i, color.r, color.g, color.b);
        }
      }
      recuerdo.posicion.needsUpdate = true;
      if (atributo) atributo.needsUpdate = true;

      const giro = t * 0.15;
      recuerdo.puntos.rotation.y = giro;
      fantasma.puntos.rotation.y = giro;
      recuerdo.puntos.rotation.x = Math.sin(t * 0.2) * 0.18;
      fantasma.puntos.rotation.x = recuerdo.puntos.rotation.x;
    },
    setPaleta(nueva: Paleta) {
      base = new THREE.Color(nueva.tenue);
      acento = new THREE.Color(nueva.acentoClaro);
      fantasma.material.color.set(nueva.tenue);
    },
    dispose() {
      scene.remove(recuerdo.puntos, fantasma.puntos);
      recuerdo.dispose();
      fantasma.dispose();
    },
  };
}
