import * as THREE from 'three';
import { aleatorio, atenuar, crearAro, crearNube, saturar } from './base';
import type { Paleta, VizContexto, VizInstancia } from './tipos';

/**
 * siembra-de-ideas — La marca de origen que se borra.
 *
 * Una partícula entra desde fuera claramente marcada como ajena. Se integra en
 * el grupo interior y, mientras el contenido permanece, la marca de procedencia
 * se disuelve: al cabo de unos segundos ya no se distingue de las propias. El
 * dato no se pierde; lo que se pierde es de quién era.
 */

const PROPIAS = 260;
const PERIODO_ENTRADA = 3.4;
const VIDA_MARCA = 9;

export const pista =
  'La partícula que entra por la izquierda llega marcada como ajena. Mira cuánto tarda en ser indistinguible de las de dentro.';

interface Sembrada {
  nacida: number;
  angulo: number;
  radio: number;
  velocidad: number;
  entrada: THREE.Vector2;
}

export function init({ scene, paleta, esMovil, estado }: VizContexto): VizInstancia {
  const propias = esMovil ? 170 : PROPIAS;
  const maxSembradas = 10;
  const total = propias + maxSembradas;

  const nube = crearNube(total, { tamano: 0.085, opacidad: 0.92 });
  scene.add(nube.puntos);

  const frontera = crearAro(2.55, paleta.tenue, 0.24, 0.012);
  scene.add(frontera.malla);

  const rnd = aleatorio(1357);
  const propiasDatos = Array.from({ length: propias }, () => ({
    angulo: rnd() * Math.PI * 2,
    radio: Math.sqrt(rnd()) * 2.3,
    velocidad: 0.1 + rnd() * 0.3,
  }));

  const sembradas: Sembrada[] = [];
  let proximaSiembra = 1.2;

  let base = new THREE.Color(paleta.tenue);
  let ajena = new THREE.Color(paleta.acentoClaro);
  let fondo = new THREE.Color(paleta.fondo);
  const color = new THREE.Color();

  estado('Ninguna idea sembrada todavía.');

  return {
    update(t) {
      if (t > proximaSiembra && sembradas.length < maxSembradas) {
        sembradas.push({
          nacida: t,
          angulo: rnd() * Math.PI * 2,
          radio: Math.sqrt(rnd()) * 2.1,
          velocidad: 0.1 + rnd() * 0.3,
          entrada: new THREE.Vector2(-6.5, (rnd() - 0.5) * 3),
        });
        proximaSiembra = t + PERIODO_ENTRADA;
      }

      const atributo = nube.color;

      for (let i = 0; i < propias; i++) {
        const p = propiasDatos[i]!;
        const a = p.angulo + t * p.velocidad * 0.2;
        nube.posicion.setXYZ(
          i,
          Math.cos(a) * p.radio * 1.42,
          Math.sin(a) * p.radio * 0.92,
          Math.sin(a * 2) * 0.35,
        );
        if (atributo) {
          atenuar(color.copy(base), fondo, 0.75 + Math.sin(t * 1.5 + i) * 0.12);
          atributo.setXYZ(i, color.r, color.g, color.b);
        }
      }

      let integradas = 0;

      for (let s = 0; s < maxSembradas; s++) {
        const indice = propias + s;
        const dato = sembradas[s];
        if (!dato) {
          nube.posicion.setXYZ(indice, 0, 0, -50);
          // Del color del fondo, no negro: sin mezcla aditiva se vería.
          if (atributo) atributo.setXYZ(indice, fondo.r, fondo.g, fondo.b);
          continue;
        }

        const edad = t - dato.nacida;
        // Entrada: viene de fuera y se incorpora a la órbita del grupo.
        const llegada = saturar(edad / 1.6);
        const suave = llegada * llegada * (3 - 2 * llegada);
        const a = dato.angulo + t * dato.velocidad * 0.2;
        const destinoX = Math.cos(a) * dato.radio * 1.42;
        const destinoY = Math.sin(a) * dato.radio * 0.92;

        nube.posicion.setXYZ(
          indice,
          THREE.MathUtils.lerp(dato.entrada.x, destinoX, suave),
          THREE.MathUtils.lerp(dato.entrada.y, destinoY, suave),
          0.2,
        );

        // La marca de origen se apaga mucho más despacio que la entrada.
        const marca = saturar(1 - (edad - 1.6) / VIDA_MARCA);
        if (marca < 0.05) integradas++;
        if (atributo) {
          color.copy(base).lerp(ajena, marca);
          atributo.setXYZ(indice, color.r, color.g, color.b);
        }
      }

      nube.posicion.needsUpdate = true;
      if (atributo) atributo.needsUpdate = true;

      frontera.malla.scale.setScalar(1 + Math.sin(t * 0.7) * 0.015);

      const texto =
        sembradas.length === 0
          ? 'Ninguna idea sembrada todavía.'
          : `${integradas} de ${sembradas.length} ideas sembradas ya son indistinguibles de las propias.`;
      estado(texto);
    },
    setPaleta(nueva: Paleta) {
      base = new THREE.Color(nueva.tenue);
      ajena = new THREE.Color(nueva.acentoClaro);
      fondo = new THREE.Color(nueva.fondo);
      frontera.material.color.set(nueva.tenue);
    },
    dispose() {
      scene.remove(nube.puntos, frontera.malla);
      nube.dispose();
      frontera.dispose();
    },
  };
}
