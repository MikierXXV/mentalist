import * as THREE from 'three';
import { aleatorio, atenuar, crearNube, saturar } from './base';
import type { Control, Paleta, VizContexto, VizInstancia } from './tipos';

/**
 * microexpresiones-y-mentira — El destello de un cuarto de segundo.
 *
 * Dos rostros esquemáticos: uno sincero y otro mintiendo. En ambos aparece el
 * mismo destello brevísimo, porque lo que delata es activación emocional, no
 * engaño. A cámara lenta se ve perfectamente; a velocidad real, casi nunca. Y
 * saber cuál es cuál sigue siendo imposible, que es justo lo que se cuenta mal.
 */

const PUNTOS_ROSTRO = 190;
const DURACION_REAL = 0.22;

export const controles: Control[] = [
  {
    id: 'velocidad',
    tipo: 'conmutador',
    etiqueta: 'Velocidad',
    opciones: ['Real', 'Cámara lenta'],
    inicial: 0,
  },
  { id: 'revelar', tipo: 'boton', etiqueta: '¿Cuál mentía?' },
];

export const pista =
  'El mismo destello aparece en los dos rostros. Señala activación emocional, y estar siendo observado ya la produce.';

/** Nube con forma de óvalo facial y dos zonas marcadas donde nace el destello. */
function sembrarRostro(
  nube: ReturnType<typeof crearNube>,
  desde: number,
  cantidad: number,
  centroX: number,
  semilla: number,
): Float32Array {
  const rnd = aleatorio(semilla);
  const pesos = new Float32Array(cantidad);
  for (let i = 0; i < cantidad; i++) {
    const a = rnd() * Math.PI * 2;
    const r = Math.sqrt(rnd());
    const x = centroX + Math.cos(a) * r * 1.45;
    const y = Math.sin(a) * r * 1.95 + 0.1;
    nube.posicion.setXYZ(desde + i, x, y, (rnd() - 0.5) * 0.4);
    // Zona de cejas y entrecejo: donde se concentra la microexpresión.
    const dz = Math.hypot((x - centroX) / 1.3, (y - 0.85) / 0.55);
    pesos[i] = Math.exp(-dz * dz * 1.4);
  }
  return pesos;
}

export function init({ scene, paleta, estado }: VizContexto): VizInstancia {
  const nube = crearNube(PUNTOS_ROSTRO * 2, { tamano: 0.075, opacidad: 0.9 });
  scene.add(nube.puntos);

  const pesosIzq = sembrarRostro(nube, 0, PUNTOS_ROSTRO, -2.7, 111);
  const pesosDer = sembrarRostro(nube, PUNTOS_ROSTRO, PUNTOS_ROSTRO, 2.7, 222);
  nube.posicion.needsUpdate = true;

  let base = new THREE.Color(paleta.tenue);
  let destello = new THREE.Color(paleta.acentoClaro);
  let fondo = new THREE.Color(paleta.fondo);
  const color = new THREE.Color();

  let lenta = false;
  const mentiroso = Math.random() < 0.5 ? 0 : 1;
  let revelado = false;
  let proximoIzq = 1.5;
  let proximoDer = 2.6;
  let brilloIzq = 0;
  let brilloDer = 0;

  estado('Los dos parpadean igual.');

  return {
    update(t) {
      const duracion = lenta ? DURACION_REAL * 9 : DURACION_REAL;
      const caida = 1 / duracion;

      if (t > proximoIzq) {
        brilloIzq = 1;
        proximoIzq = t + 2.2 + Math.random() * 2.4;
      }
      if (t > proximoDer) {
        brilloDer = 1;
        proximoDer = t + 2.2 + Math.random() * 2.4;
      }
      brilloIzq = Math.max(0, brilloIzq - caida * 0.016);
      brilloDer = Math.max(0, brilloDer - caida * 0.016);

      const atributo = nube.color;
      if (atributo) {
        for (let i = 0; i < PUNTOS_ROSTRO; i++) {
          const respiro = 0.62 + Math.sin(t * 1.1 + i * 0.2) * 0.06;

          atenuar(color.copy(base), fondo, respiro);
          color.lerp(destello, saturar(pesosIzq[i]! * brilloIzq));
          if (revelado && mentiroso === 0) color.lerp(destello, 0.12);
          atributo.setXYZ(i, color.r, color.g, color.b);

          atenuar(color.copy(base), fondo, respiro);
          color.lerp(destello, saturar(pesosDer[i]! * brilloDer));
          if (revelado && mentiroso === 1) color.lerp(destello, 0.12);
          atributo.setXYZ(PUNTOS_ROSTRO + i, color.r, color.g, color.b);
        }
        atributo.needsUpdate = true;
      }

      nube.puntos.rotation.y = Math.sin(t * 0.22) * 0.06;
    },
    setParametro(id, valor) {
      if (id === 'velocidad') {
        lenta = Boolean(valor);
        estado(
          lenta
            ? 'A cámara lenta se ve sin esfuerzo. A velocidad real, casi nadie lo capta.'
            : 'Los dos parpadean igual.',
        );
      }
      if (id === 'revelar') {
        revelado = true;
        estado(
          `Mentía el rostro de la ${mentiroso === 0 ? 'izquierda' : 'derecha'}. ` +
            'El destello había aparecido en los dos: no era la señal que lo distinguía.',
        );
      }
    },
    setPaleta(nueva: Paleta) {
      base = new THREE.Color(nueva.tenue);
      destello = new THREE.Color(nueva.acentoClaro);
      fondo = new THREE.Color(nueva.fondo);
    },
    dispose() {
      scene.remove(nube.puntos);
      nube.dispose();
    },
  };
}
