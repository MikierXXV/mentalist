import * as THREE from 'three';
import { aleatorio, crearAro, crearNube, saturar } from './base';
import type { Control, Paleta, VizContexto, VizInstancia } from './tipos';

/**
 * tecnica-no-poder — Dónde vive el efecto.
 *
 * A la izquierda, quien ejecuta; a la derecha, quien presencia. En la vista de
 * público, el resplandor de «imposible» parece emanar del ejecutante. Al cambiar
 * a la vista de mecanismo se ve lo que ocurre: de él solo salen señales
 * ordinarias, y el resplandor se enciende dentro del espectador, que es quien lo
 * fabrica al completar la información que ha recibido.
 */

const EJECUTANTE = -3.6;
const ESPECTADOR = 3.6;

export const controles: Control[] = [
  {
    id: 'vista',
    tipo: 'conmutador',
    etiqueta: 'Vista',
    opciones: ['Como público', 'Mecanismo'],
    inicial: 0,
  },
];

export const pista =
  'En la vista de mecanismo, el resplandor no cambia de intensidad: cambia de sitio. Nace donde siempre estuvo.';

export function init({ scene, paleta, esMovil, estado }: VizContexto): VizInstancia {
  const cantidad = esMovil ? 240 : 420;

  const senales = crearNube(cantidad, { tamano: 0.055, opacidad: 0.7, aditivo: true });
  scene.add(senales.puntos);

  const resplandor = crearNube(esMovil ? 180 : 320, {
    tamano: 0.09,
    opacidad: 0.55,
    colorFijo: paleta.acentoClaro,
    aditivo: true,
  });
  scene.add(resplandor.puntos);

  const aroEjecutante = crearAro(0.8, paleta.tenue, 0.55);
  const aroEspectador = crearAro(0.8, paleta.tenue, 0.55);
  aroEjecutante.malla.position.x = EJECUTANTE;
  aroEspectador.malla.position.x = ESPECTADOR;
  scene.add(aroEjecutante.malla, aroEspectador.malla);

  const rnd = aleatorio(31415);
  const fases: number[] = [];
  const desvios: number[] = [];
  const velocidades: number[] = [];
  for (let i = 0; i < cantidad; i++) {
    fases.push(rnd());
    desvios.push((rnd() - 0.5) * 1.5);
    velocidades.push(0.18 + rnd() * 0.14);
  }

  const halo: Array<{ a: number; r: number; v: number }> = [];
  for (let i = 0; i < resplandor.posicion.count; i++) {
    halo.push({ a: rnd() * Math.PI * 2, r: 0.5 + rnd() * 1.5, v: 0.2 + rnd() * 0.6 });
  }

  let base = new THREE.Color(paleta.tenue);
  let vivo = new THREE.Color(paleta.acentoClaro);
  const color = new THREE.Color();

  let mecanismo = false;
  let mezcla = 0;
  let anterior = 0;

  estado('El efecto parece salir del ejecutante.');

  return {
    update(t) {
      const delta = Math.min(0.05, t - anterior);
      anterior = t;

      const objetivo = mecanismo ? 1 : 0;
      mezcla += (objetivo - mezcla) * 0.06;

      const atributo = senales.color;
      for (let i = 0; i < cantidad; i++) {
        fases[i] = (fases[i]! + velocidades[i]! * delta) % 1;
        const f = fases[i]!;
        const apertura = Math.sin(f * Math.PI);
        senales.posicion.setXYZ(
          i,
          EJECUTANTE + (ESPECTADOR - EJECUTANTE) * f,
          desvios[i]! * apertura,
          desvios[i]! * apertura * 0.5,
        );
        if (atributo) {
          // Como público, las señales parecen ya cargadas de lo extraordinario.
          // En la vista de mecanismo se ven por lo que son: información corriente.
          color.copy(base).lerp(vivo, (1 - mezcla) * 0.55 + 0.05);
          atributo.setXYZ(i, color.r, color.g, color.b);
        }
      }
      senales.posicion.needsUpdate = true;
      if (atributo) atributo.needsUpdate = true;

      // El resplandor migra del ejecutante al espectador, sin perder intensidad.
      const centroX = THREE.MathUtils.lerp(EJECUTANTE, ESPECTADOR, mezcla);
      for (let i = 0; i < halo.length; i++) {
        const h = halo[i]!;
        const a = h.a + t * h.v * 0.4;
        const r = h.r * (1 + Math.sin(t * 1.5 + i) * 0.08);
        resplandor.posicion.setXYZ(i, centroX + Math.cos(a) * r, Math.sin(a) * r, 0.3);
      }
      resplandor.posicion.needsUpdate = true;
      resplandor.material.opacity = 0.45 + Math.sin(t * 1.3) * 0.06;

      const brilloEjecutante = saturar(1 - mezcla);
      aroEjecutante.material.color.copy(base).lerp(vivo, brilloEjecutante * 0.9);
      aroEjecutante.material.opacity = 0.45 + brilloEjecutante * 0.35;
      aroEjecutante.malla.scale.setScalar(1 + brilloEjecutante * 0.12);

      aroEspectador.material.color.copy(base).lerp(vivo, mezcla * 0.9);
      aroEspectador.material.opacity = 0.45 + mezcla * 0.35;
      aroEspectador.malla.scale.setScalar(1 + mezcla * 0.12);
    },
    setParametro(id, valor) {
      if (id !== 'vista') return;
      mecanismo = Boolean(valor);
      estado(
        mecanismo
          ? 'Del ejecutante solo salen señales ordinarias. El «imposible» se enciende en el espectador.'
          : 'El efecto parece salir del ejecutante.',
      );
    },
    setPaleta(nueva: Paleta) {
      base = new THREE.Color(nueva.tenue);
      vivo = new THREE.Color(nueva.acentoClaro);
      resplandor.material.color.set(nueva.acentoClaro);
    },
    dispose() {
      scene.remove(
        senales.puntos,
        resplandor.puntos,
        aroEjecutante.malla,
        aroEspectador.malla,
      );
      senales.dispose();
      resplandor.dispose();
      aroEjecutante.dispose();
      aroEspectador.dispose();
    },
  };
}
