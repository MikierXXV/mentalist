import * as THREE from 'three';
import { aleatorio, crearAro, crearNube } from './base';
import type { Control, Paleta, VizContexto, VizInstancia } from './tipos';

/**
 * elicitacion — Preguntar frente a afirmar mal.
 *
 * Preguntando, el nodo receptor se cierra y apenas devuelve un hilo: sabe que
 * está siendo interrogado. Afirmando algo incorrecto, se abre y emite una ráfaga
 * para corregirlo. Misma conversación, mucha más información.
 */

const IZQUIERDA = -4;
const DERECHA = 4;

export const controles: Control[] = [
  {
    id: 'modo',
    tipo: 'conmutador',
    etiqueta: 'Cómo abordas',
    opciones: ['Preguntas', 'Afirmas mal'],
    inicial: 0,
  },
];

export const pista =
  'Fíjate en el grosor del retorno: la pregunta cierra al interlocutor; el error dicho con aplomo le hace corregirte y contarte de más.';

interface Particula {
  fase: number;
  velocidad: number;
  desvio: number;
  profundidad: number;
  activa: boolean;
}

export function init({ scene, paleta, esMovil }: VizContexto): VizInstancia {
  const maxRetorno = esMovil ? 220 : 380;
  const salida = crearNube(70, { tamano: 0.06, opacidad: 0.7, aditivo: true });
  const retorno = crearNube(maxRetorno, { tamano: 0.06, opacidad: 0.75, aditivo: true });
  scene.add(salida.puntos, retorno.puntos);

  const emisor = crearAro(0.62, paleta.tenue, 0.6);
  const receptor = crearAro(0.86, paleta.acento, 0.75);
  emisor.malla.position.x = IZQUIERDA;
  receptor.malla.position.x = DERECHA;
  scene.add(emisor.malla, receptor.malla);

  const rnd = aleatorio(4242);
  const crear = (n: number, dispersion: number): Particula[] =>
    Array.from({ length: n }, () => ({
      fase: rnd(),
      velocidad: 0.2 + rnd() * 0.14,
      desvio: (rnd() - 0.5) * dispersion,
      profundidad: (rnd() - 0.5) * dispersion * 0.8,
      activa: true,
    }));

  const idas = crear(70, 0.5);
  const vueltas = crear(maxRetorno, 3.2);

  let base = new THREE.Color(paleta.tenue);
  let vivo = new THREE.Color(paleta.acentoClaro);
  const color = new THREE.Color();

  let afirmando = false;
  // Proporción del retorno realmente en juego: se interpola al cambiar de modo.
  let apertura = 0.12;
  let anterior = 0;

  const recorrer = (
    particulas: Particula[],
    nube: ReturnType<typeof crearNube>,
    desde: number,
    hasta: number,
    delta: number,
    visibles: number,
    intensidad: number,
  ) => {
    const atributo = nube.color;
    for (let i = 0; i < particulas.length; i++) {
      const p = particulas[i]!;
      p.fase = (p.fase + p.velocidad * delta) % 1;
      const apert = Math.sin(p.fase * Math.PI);
      const x = desde + (hasta - desde) * p.fase;
      const dentro = i < visibles;
      nube.posicion.setXYZ(
        i,
        x,
        dentro ? p.desvio * apert : 0,
        dentro ? p.profundidad * apert : 0,
      );
      if (atributo) {
        if (dentro) color.copy(base).lerp(vivo, intensidad);
        else color.setScalar(0);
        atributo.setXYZ(i, color.r, color.g, color.b);
      }
    }
    nube.posicion.needsUpdate = true;
    if (atributo) atributo.needsUpdate = true;
  };

  return {
    update(t) {
      const delta = Math.min(0.05, t - anterior);
      anterior = t;

      const objetivo = afirmando ? 1 : 0.12;
      apertura += (objetivo - apertura) * 0.05;

      recorrer(idas, salida, IZQUIERDA, DERECHA, delta, idas.length, 0.1);
      recorrer(
        vueltas,
        retorno,
        DERECHA,
        IZQUIERDA,
        delta,
        Math.round(vueltas.length * apertura),
        apertura,
      );

      // El receptor se abre al corregir y se encoge al ser interrogado.
      receptor.malla.scale.setScalar(0.82 + apertura * 0.3 + Math.sin(t * 1.9) * 0.03);
      receptor.material.opacity = 0.5 + apertura * 0.4;
      receptor.material.color.copy(base).lerp(vivo, apertura);
    },
    setParametro(id, valor) {
      if (id === 'modo') afirmando = Boolean(valor);
    },
    setPaleta(nueva: Paleta) {
      base = new THREE.Color(nueva.tenue);
      vivo = new THREE.Color(nueva.acentoClaro);
      emisor.material.color.set(nueva.tenue);
    },
    dispose() {
      scene.remove(salida.puntos, retorno.puntos, emisor.malla, receptor.malla);
      salida.dispose();
      retorno.dispose();
      emisor.dispose();
      receptor.dispose();
    },
  };
}
