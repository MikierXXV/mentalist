import * as THREE from 'three';
import { aleatorio, crearNube, crearTrazo, saturar } from './base';
import type { Control, Paleta, VizContexto, VizInstancia } from './tipos';

/**
 * sugestion-hipnotica — El estrechamiento.
 *
 * Al subir la focalización, el campo se estrecha hasta un túnel muy angosto. La
 * periferia se atenúa, pero no se apaga en ningún momento: sigue latiendo. Es la
 * diferencia entre concentración extrema y desconexión, que es justo lo que la
 * imagen popular de la hipnosis confunde.
 */

const PARTICULAS = 900;
const OPACIDAD_MINIMA_PERIFERIA = 0.16;

export const controles: Control[] = [
  {
    id: 'foco',
    tipo: 'rango',
    etiqueta: 'Focalización',
    min: 0,
    max: 100,
    paso: 1,
    inicial: 20,
    formato: (v) => `${v} %`,
  },
];

export const pista =
  'Sube la focalización al máximo: el túnel se cierra, pero las partículas de fuera siguen latiendo. La periferia nunca llega a cero.';

export function init({ scene, paleta, esMovil, estado }: VizContexto): VizInstancia {
  const cantidad = esMovil ? 560 : PARTICULAS;
  const nube = crearNube(cantidad, { tamano: 0.062, opacidad: 0.85 });
  scene.add(nube.puntos);

  const rnd = aleatorio(2718);
  const anillo: number[] = [];
  const angulo: number[] = [];
  const velocidad: number[] = [];
  for (let i = 0; i < cantidad; i++) {
    anillo.push(Math.sqrt(rnd()));
    angulo.push(rnd() * Math.PI * 2);
    velocidad.push(0.2 + rnd() * 0.5);
  }

  const marcoTunel = crearTrazo(65, paleta.acento, 0.4);
  scene.add(marcoTunel.linea);

  let base = new THREE.Color(paleta.tenue);
  let vivo = new THREE.Color(paleta.acentoClaro);
  const color = new THREE.Color();

  let foco = 0.2;
  estado('Periferia atenuada, nunca apagada.');

  return {
    update(t) {
      // Radio del túnel: se estrecha, pero nunca se cierra del todo.
      const radioTunel = THREE.MathUtils.lerp(4.6, 0.95, foco);
      const atributo = nube.color;

      for (let i = 0; i < cantidad; i++) {
        const a = angulo[i]! + t * velocidad[i]! * 0.16;
        // Al focalizar, las partículas del centro se comprimen hacia el eje.
        const compresion = THREE.MathUtils.lerp(1, 0.42, foco * anillo[i]!);
        const r = anillo[i]! * 4.9 * compresion;
        const x = Math.cos(a) * r * 1.5;
        const y = Math.sin(a) * r * 0.86;
        const z = Math.sin(a * 2 + t * 0.3) * 0.6;
        nube.posicion.setXYZ(i, x, y, z);

        if (atributo) {
          const distancia = Math.hypot(x / 1.5, y / 0.86);
          const dentro = 1 - saturar((distancia - radioTunel) / 1.3);
          // Latido propio de la periferia: sigue activa aunque no se atienda.
          const latido = 0.5 + 0.5 * Math.sin(t * 1.8 + i * 0.13);
          const brillo = Math.max(
            OPACIDAD_MINIMA_PERIFERIA * (0.6 + latido * 0.4),
            dentro,
          );
          color.copy(base).lerp(vivo, dentro * 0.85);
          color.multiplyScalar(brillo);
          atributo.setXYZ(i, color.r, color.g, color.b);
        }
      }
      nube.posicion.needsUpdate = true;
      if (atributo) atributo.needsUpdate = true;

      for (let i = 0; i < 65; i++) {
        const a = (i / 64) * Math.PI * 2;
        marcoTunel.posicion.setXYZ(
          i,
          Math.cos(a) * radioTunel * 1.5,
          Math.sin(a) * radioTunel * 0.86,
          -0.4,
        );
      }
      marcoTunel.posicion.needsUpdate = true;
      marcoTunel.material.opacity = 0.15 + foco * 0.4;
    },
    setParametro(id, valor) {
      if (id !== 'foco') return;
      foco = Number(valor) / 100;
      estado(
        foco > 0.85
          ? 'Atención muy estrecha. La periferia sigue latiendo al fondo.'
          : 'Periferia atenuada, nunca apagada.',
      );
    },
    setPaleta(nueva: Paleta) {
      base = new THREE.Color(nueva.tenue);
      vivo = new THREE.Color(nueva.acentoClaro);
      marcoTunel.material.color.set(nueva.acento);
    },
    dispose() {
      scene.remove(nube.puntos, marcoTunel.linea);
      nube.dispose();
      marcoTunel.dispose();
    },
  };
}
