import * as THREE from 'three';
import { aleatorio, crearAro, crearNube } from './base';
import type { Control, Paleta, VizContexto, VizInstancia } from './tipos';

/**
 * sugestion — La expectativa.
 *
 * Dos figuras rigurosamente idénticas: mismo número de partículas, mismo radio,
 * misma semilla. Al ponerles etiqueta, la marcada como valiosa se percibe más
 * intensa. La geometría nunca cambia; lo que cambia es lo que se espera de ella.
 */

const PARTICULAS = 460;
const SEPARACION = 2.9;

export const controles: Control[] = [
  {
    id: 'etiqueta',
    tipo: 'conmutador',
    etiqueta: 'Etiquetas',
    opciones: ['Sin etiqueta', 'Con etiqueta'],
    inicial: 0,
  },
];

export const pista =
  'Las dos figuras son exactamente la misma geometría. Solo cambia lo que se te dice de ellas.';

function sembrarFigura(
  nube: ReturnType<typeof crearNube>,
  desde: number,
  cantidad: number,
  centroX: number,
  semilla: number,
): void {
  const rnd = aleatorio(semilla);
  for (let i = 0; i < cantidad; i++) {
    const angulo = rnd() * Math.PI * 2;
    const radio = Math.sqrt(rnd()) * 1.28;
    nube.posicion.setXYZ(
      desde + i,
      centroX + Math.cos(angulo) * radio,
      Math.sin(angulo) * radio,
      (rnd() - 0.5) * 0.7,
    );
  }
}

export function init({ scene, paleta, esMovil }: VizContexto): VizInstancia {
  const porFigura = esMovil ? 300 : PARTICULAS;
  const nube = crearNube(porFigura * 2, { tamano: 0.062, opacidad: 0.9, aditivo: true });
  scene.add(nube.puntos);

  // Misma semilla en las dos: son la misma nube, desplazada.
  sembrarFigura(nube, 0, porFigura, -SEPARACION, 20260726);
  sembrarFigura(nube, porFigura, porFigura, SEPARACION, 20260726);
  nube.posicion.needsUpdate = true;

  const aroIzq = crearAro(1.62, paleta.tenue, 0.3, 0.015);
  const aroDer = crearAro(1.62, paleta.tenue, 0.3, 0.015);
  aroIzq.malla.position.x = -SEPARACION;
  aroDer.malla.position.x = SEPARACION;
  scene.add(aroIzq.malla, aroDer.malla);

  let base = new THREE.Color(paleta.tenue);
  let realce = new THREE.Color(paleta.acentoClaro);
  const color = new THREE.Color();

  let conEtiqueta = false;
  let mezcla = 0;

  return {
    update(t) {
      const objetivo = conEtiqueta ? 1 : 0;
      mezcla += (objetivo - mezcla) * 0.06;

      const atributo = nube.color;
      if (!atributo) return;

      const latido = 0.5 + Math.sin(t * 1.7) * 0.5;

      for (let i = 0; i < porFigura * 2; i++) {
        const esDerecha = i >= porFigura;
        if (esDerecha) {
          // La etiquetada gana brillo y un latido propio, sin mover un vértice.
          color.copy(base).lerp(realce, mezcla * (0.65 + latido * 0.35));
        } else {
          color.copy(base).multiplyScalar(1 - mezcla * 0.3);
        }
        atributo.setXYZ(i, color.r, color.g, color.b);
      }
      atributo.needsUpdate = true;

      aroDer.material.opacity = 0.3 + mezcla * 0.45;
      aroDer.material.color.copy(base).lerp(realce, mezcla);
      aroIzq.material.opacity = 0.3 - mezcla * 0.14;
      nube.puntos.rotation.y = Math.sin(t * 0.25) * 0.12;
    },
    setParametro(id, valor) {
      if (id === 'etiqueta') conEtiqueta = Boolean(valor);
    },
    setPaleta(nueva: Paleta) {
      base = new THREE.Color(nueva.tenue);
      realce = new THREE.Color(nueva.acentoClaro);
      aroIzq.material.color.set(nueva.tenue);
    },
    dispose() {
      scene.remove(nube.puntos, aroIzq.malla, aroDer.malla);
      nube.dispose();
      aroIzq.dispose();
      aroDer.dispose();
    },
  };
}
