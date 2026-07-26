import * as THREE from 'three';
import { aleatorio, crearAro, crearNube, crearTrazo } from './base';
import type { Paleta, VizContexto, VizInstancia } from './tipos';

/**
 * no-verbal — Los dos canales.
 *
 * Entre dos personas viajan a la vez el canal verbal —arriba, lento, en paquetes
 * discretos y espaciados— y el corporal —abajo, continuo, denso y más rápido—.
 * El segundo llega antes y sin que nadie lo esté gestionando a propósito.
 */

const IZQUIERDA = -4.1;
const DERECHA = 4.1;
const CARRIL_VERBAL = 1.35;
const CARRIL_CORPORAL = -1.35;

export const pista =
  'El canal de abajo no se decide: sale igual y llega antes. La conclusión ya está formada cuando terminan las palabras.';

interface Particula {
  fase: number;
  velocidad: number;
  grosor: number;
}

export function init({ scene, paleta, esMovil }: VizContexto): VizInstancia {
  const nVerbal = esMovil ? 14 : 20;
  const nCorporal = esMovil ? 200 : 340;

  const verbal = crearNube(nVerbal, { tamano: 0.15, opacidad: 0.9, aditivo: true });
  const corporal = crearNube(nCorporal, { tamano: 0.055, opacidad: 0.65, aditivo: true });
  scene.add(verbal.puntos, corporal.puntos);

  const carriles = [CARRIL_VERBAL, CARRIL_CORPORAL].map((y) => {
    const trazo = crearTrazo(2, paleta.tenue, 0.12);
    trazo.posicion.setXYZ(0, IZQUIERDA, y, -0.2);
    trazo.posicion.setXYZ(1, DERECHA, y, -0.2);
    trazo.posicion.needsUpdate = true;
    scene.add(trazo.linea);
    return trazo;
  });

  const emisor = crearAro(0.75, paleta.tenue, 0.55);
  const receptor = crearAro(0.75, paleta.tenue, 0.55);
  emisor.malla.position.x = IZQUIERDA;
  receptor.malla.position.x = DERECHA;
  scene.add(emisor.malla, receptor.malla);

  const rnd = aleatorio(3113);
  // El verbal sale en paquetes espaciados: palabras, no un chorro.
  const palabras: Particula[] = Array.from({ length: nVerbal }, (_, i) => ({
    fase: i / nVerbal,
    velocidad: 0.16,
    grosor: 0,
  }));
  const gestos: Particula[] = Array.from({ length: nCorporal }, () => ({
    fase: rnd(),
    velocidad: 0.34 + rnd() * 0.18,
    grosor: (rnd() - 0.5) * 0.85,
  }));

  let base = new THREE.Color(paleta.tenue);
  let vivo = new THREE.Color(paleta.acentoClaro);
  const color = new THREE.Color();
  let anterior = 0;
  let llegadaCorporal = 0;
  let llegadaVerbal = 0;

  return {
    update(t) {
      const delta = Math.min(0.05, t - anterior);
      anterior = t;

      const atributoVerbal = verbal.color;
      for (let i = 0; i < palabras.length; i++) {
        const p = palabras[i]!;
        const previa = p.fase;
        p.fase = (p.fase + p.velocidad * delta) % 1;
        if (p.fase < previa) llegadaVerbal = t;
        verbal.posicion.setXYZ(
          i,
          IZQUIERDA + (DERECHA - IZQUIERDA) * p.fase,
          CARRIL_VERBAL,
          0,
        );
        if (atributoVerbal) {
          color.copy(base).lerp(vivo, 0.25);
          atributoVerbal.setXYZ(i, color.r, color.g, color.b);
        }
      }
      verbal.posicion.needsUpdate = true;
      if (atributoVerbal) atributoVerbal.needsUpdate = true;

      const atributoCorporal = corporal.color;
      for (let i = 0; i < gestos.length; i++) {
        const g = gestos[i]!;
        const previa = g.fase;
        g.fase = (g.fase + g.velocidad * delta) % 1;
        if (g.fase < previa) llegadaCorporal = t;
        const apertura = Math.sin(g.fase * Math.PI);
        corporal.posicion.setXYZ(
          i,
          IZQUIERDA + (DERECHA - IZQUIERDA) * g.fase,
          CARRIL_CORPORAL + g.grosor * apertura,
          g.grosor * apertura * 0.6,
        );
        if (atributoCorporal) {
          color.copy(base).lerp(vivo, 0.45 + apertura * 0.3);
          atributoCorporal.setXYZ(i, color.r, color.g, color.b);
        }
      }
      corporal.posicion.needsUpdate = true;
      if (atributoCorporal) atributoCorporal.needsUpdate = true;

      // El receptor acusa el impacto: el corporal lo alcanza mucho antes.
      const ecoCorporal = Math.exp(-(t - llegadaCorporal) * 3.5);
      const ecoVerbal = Math.exp(-(t - llegadaVerbal) * 3.5);
      receptor.malla.scale.setScalar(1 + ecoCorporal * 0.22 + ecoVerbal * 0.08);
      receptor.material.opacity = 0.5 + ecoCorporal * 0.4;
      receptor.material.color.copy(base).lerp(vivo, ecoCorporal);
      emisor.malla.scale.setScalar(1 + Math.sin(t * 2.4) * 0.03);
    },
    setPaleta(nueva: Paleta) {
      base = new THREE.Color(nueva.tenue);
      vivo = new THREE.Color(nueva.acentoClaro);
      emisor.material.color.set(nueva.tenue);
      carriles.forEach((trazo) => trazo.material.color.set(nueva.tenue));
    },
    dispose() {
      scene.remove(verbal.puntos, corporal.puntos, emisor.malla, receptor.malla);
      carriles.forEach((trazo) => {
        scene.remove(trazo.linea);
        trazo.dispose();
      });
      verbal.dispose();
      corporal.dispose();
      emisor.dispose();
      receptor.dispose();
    },
  };
}
