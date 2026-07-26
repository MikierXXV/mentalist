import * as THREE from 'three';
import { aleatorio, crearNube, crearTrazo, saturar } from './base';
import type { Control, Paleta, VizContexto, VizInstancia } from './tipos';

/**
 * desmontar-videntes — El cono de precisión.
 *
 * Una afirmación es un cono proyectado sobre un campo de personas. Vaga, abarca
 * a casi todo el mundo y parece un acierto asombroso. Al exigir precisión —un
 * nombre, una fecha, una cifra dicha por adelantado— el cono se estrecha, y el
 * número de aciertos se desploma hasta cero. La prueba no es pillar un fallo:
 * es exigir concreción previa.
 */

const PERSONAS = 420;

export const controles: Control[] = [
  {
    id: 'precision',
    tipo: 'rango',
    etiqueta: 'Precisión exigida',
    min: 0,
    max: 100,
    paso: 1,
    inicial: 5,
    formato: (v) => `${v} %`,
  },
];

export const pista =
  '«Veo un cambio importante» acierta con casi todos. «El martes 12, con tu hermana Ana» no acierta con casi nadie.';

export function init({ scene, paleta, esMovil, estado }: VizContexto): VizInstancia {
  const cantidad = esMovil ? 260 : PERSONAS;
  const nube = crearNube(cantidad, { tamano: 0.075, opacidad: 0.85 });
  scene.add(nube.puntos);

  const rnd = aleatorio(777);
  const posiciones: THREE.Vector2[] = [];
  for (let i = 0; i < cantidad; i++) {
    const x = (rnd() - 0.5) * 11;
    const y = (rnd() - 0.5) * 5.4;
    posiciones.push(new THREE.Vector2(x, y));
    nube.posicion.setXYZ(i, x, y, 0);
  }
  nube.posicion.needsUpdate = true;

  // Cono: vértice a la izquierda, abriéndose hacia el campo.
  const VERTICE = new THREE.Vector2(-6.2, 0);
  const cono = crearTrazo(3, paleta.acento, 0.5);
  scene.add(cono.linea);

  let base = new THREE.Color(paleta.tenue);
  let acertado = new THREE.Color(paleta.acentoClaro);
  const color = new THREE.Color();

  let precision = 0.05;
  let aperturaSuave = 1;

  const actualizarTexto = (aciertos: number) => {
    const porcentaje = Math.round((aciertos / cantidad) * 100);
    estado(`Acierta con ${aciertos} de ${cantidad} personas (${porcentaje} %).`);
  };

  return {
    update(t) {
      // Semiángulo del cono: muy abierto con afirmaciones vagas.
      const objetivo = THREE.MathUtils.lerp(1, 0.022, precision ** 0.55);
      aperturaSuave += (objetivo - aperturaSuave) * 0.12;

      const barrido = Math.sin(t * 0.35) * 0.22 * (1 - precision * 0.8);

      const atributo = nube.color;
      let aciertos = 0;

      for (let i = 0; i < cantidad; i++) {
        const p = posiciones[i]!;
        const dx = p.x - VERTICE.x;
        const dy = p.y - VERTICE.y;
        const anguloPunto = Math.atan2(dy, dx) - barrido;
        const dentro = Math.abs(anguloPunto) < aperturaSuave && dx > 0;
        if (dentro) aciertos++;

        if (atributo) {
          const borde = saturar(1 - Math.abs(anguloPunto) / Math.max(aperturaSuave, 0.001));
          color.copy(base).lerp(acertado, dentro ? 0.35 + borde * 0.65 : 0);
          color.multiplyScalar(dentro ? 1 : 0.55);
          atributo.setXYZ(i, color.r, color.g, color.b);
        }
      }
      if (atributo) atributo.needsUpdate = true;

      const largo = 13;
      cono.posicion.setXYZ(0, VERTICE.x + Math.cos(barrido + aperturaSuave) * largo,
        VERTICE.y + Math.sin(barrido + aperturaSuave) * largo, -0.2);
      cono.posicion.setXYZ(1, VERTICE.x, VERTICE.y, -0.2);
      cono.posicion.setXYZ(2, VERTICE.x + Math.cos(barrido - aperturaSuave) * largo,
        VERTICE.y + Math.sin(barrido - aperturaSuave) * largo, -0.2);
      cono.posicion.needsUpdate = true;

      if (Math.floor(t * 4) % 2 === 0) actualizarTexto(aciertos);
    },
    setParametro(id, valor) {
      if (id === 'precision') precision = Number(valor) / 100;
    },
    setPaleta(nueva: Paleta) {
      base = new THREE.Color(nueva.tenue);
      acertado = new THREE.Color(nueva.acentoClaro);
      cono.material.color.set(nueva.acento);
    },
    dispose() {
      scene.remove(nube.puntos, cono.linea);
      nube.dispose();
      cono.dispose();
    },
  };
}
