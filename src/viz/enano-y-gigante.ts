import * as THREE from 'three';
import { aleatorio, crearAro, crearNube, extension, saturar } from './base';
import type { Paleta, Puntero, VizContexto, VizInstancia } from './tipos';

/**
 * consciente-subconsciente — El enano y el gigante.
 *
 * El punto brillante y pequeño es la consciencia: se puede arrastrar con el
 * cursor y responde de inmediato. La masa grande y tenue es lo automático: va a
 * su aire, y el enano está atado a ella. Cuando el gigante se agita, no hay
 * fuerza en el cursor que lo sujete. Es la metáfora que él mismo emplea.
 */

const PARTICULAS_GIGANTE = 900;
const PERIODO_AGITACION = 8.5;

export const pista =
  'Arrastra el punto dorado. Cuando la masa grande se agita —la franja en la que se enciende— tira de él y el cursor deja de mandar.';

export function init({ scene, camera, paleta, esMovil }: VizContexto): VizInstancia {
  const cantidad = esMovil ? 520 : PARTICULAS_GIGANTE;

  const gigante = crearNube(cantidad, { tamano: 0.075, opacidad: 0.5 });
  scene.add(gigante.puntos);

  const rnd = aleatorio(9090);
  const semillas: Array<{ r: number; a: number; b: number; v: number }> = [];
  for (let i = 0; i < cantidad; i++) {
    semillas.push({
      r: 1.1 + Math.sqrt(rnd()) * 2.5,
      a: rnd() * Math.PI * 2,
      b: rnd() * Math.PI * 2,
      v: 0.25 + rnd() * 0.5,
    });
  }

  const centroGigante = new THREE.Vector2(0.9, -0.35);

  const enano = crearNube(1, { tamano: 0.34, opacidad: 1, colorFijo: paleta.acentoClaro });
  scene.add(enano.puntos);

  const halo = crearAro(0.42, paleta.acentoClaro, 0.5, 0.14);
  scene.add(halo.malla);

  // Correa: el enano nunca se separa del todo del gigante.
  const correa = crearNube(24, { tamano: 0.035, opacidad: 0.35, colorFijo: paleta.tenue });
  scene.add(correa.puntos);

  let base = new THREE.Color(paleta.tenue);
  let agitado = new THREE.Color(paleta.acento);
  const color = new THREE.Color();

  const posEnano = new THREE.Vector2(-3.2, 1.3);
  const deseo = new THREE.Vector2(-3.2, 1.3);
  const velocidad = new THREE.Vector2();

  return {
    update(t, puntero: Puntero) {
      const { alto, ancho } = extension(camera);

      // El gigante se agita por rachas, no de forma continua.
      const ciclo = (t % PERIODO_AGITACION) / PERIODO_AGITACION;
      const panico = saturar(Math.sin(ciclo * Math.PI * 2 - 1.2)) ** 2;

      const atributo = gigante.color;
      for (let i = 0; i < cantidad; i++) {
        const s = semillas[i]!;
        const expansion = 1 + panico * 0.55;
        const giro = t * s.v * (0.35 + panico * 1.5);
        const x = centroGigante.x + Math.cos(s.a + giro) * s.r * expansion;
        const y =
          centroGigante.y + Math.sin(s.a + giro) * s.r * 0.72 * expansion +
          Math.sin(t * 1.4 + s.b) * panico * 0.4;
        gigante.posicion.setXYZ(i, x, y, Math.sin(s.b + giro) * s.r * 0.3);
        if (atributo) {
          color.copy(base).lerp(agitado, panico * 0.85);
          atributo.setXYZ(i, color.r, color.g, color.b);
        }
      }
      gigante.posicion.needsUpdate = true;
      if (atributo) atributo.needsUpdate = true;
      gigante.material.opacity = 0.4 + panico * 0.32;

      // Voluntad del lector.
      if (puntero.activo) deseo.set(puntero.x * ancho, puntero.y * alto);

      // Fuerza consciente frente a arrastre del gigante: el segundo gana al agitarse.
      const fuerzaPropia = 0.12 * (1 - panico * 0.92);
      velocidad.x += (deseo.x - posEnano.x) * fuerzaPropia;
      velocidad.y += (deseo.y - posEnano.y) * fuerzaPropia;

      const haciaGigante = new THREE.Vector2(
        centroGigante.x - posEnano.x,
        centroGigante.y - posEnano.y,
      );
      const distancia = haciaGigante.length() || 1;
      haciaGigante.multiplyScalar(1 / distancia);
      const tiron = panico * 0.5 + saturar((distancia - 3.4) * 0.5) * 0.18;
      velocidad.x += haciaGigante.x * tiron;
      velocidad.y += haciaGigante.y * tiron;
      // Remolino cuando la masa está desbocada.
      velocidad.x += -haciaGigante.y * panico * 0.34;
      velocidad.y += haciaGigante.x * panico * 0.34;

      velocidad.multiplyScalar(0.86);
      posEnano.add(velocidad);

      enano.posicion.setXYZ(0, posEnano.x, posEnano.y, 0.4);
      enano.posicion.needsUpdate = true;
      halo.malla.position.set(posEnano.x, posEnano.y, 0.35);
      halo.malla.scale.setScalar(1 + panico * 0.5 + Math.sin(t * 6) * panico * 0.14);
      halo.material.opacity = 0.35 + panico * 0.4;

      for (let i = 0; i < 24; i++) {
        const k = i / 23;
        correa.posicion.setXYZ(
          i,
          THREE.MathUtils.lerp(posEnano.x, centroGigante.x, k),
          THREE.MathUtils.lerp(posEnano.y, centroGigante.y, k),
          0.1,
        );
      }
      correa.posicion.needsUpdate = true;
      correa.material.opacity = 0.12 + panico * 0.3;
    },
    setPaleta(nueva: Paleta) {
      base = new THREE.Color(nueva.tenue);
      agitado = new THREE.Color(nueva.acento);
      enano.material.color.set(nueva.acentoClaro);
      halo.material.color.set(nueva.acentoClaro);
      correa.material.color.set(nueva.tenue);
    },
    dispose() {
      scene.remove(gigante.puntos, enano.puntos, halo.malla, correa.puntos);
      gigante.dispose();
      enano.dispose();
      halo.dispose();
      correa.dispose();
    },
  };
}
