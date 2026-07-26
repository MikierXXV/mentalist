import { crearCerebro } from './cerebro-geometria';
import type { Paleta, VizContexto, VizInstancia } from './tipos';

/**
 * Versión ambiental del cerebro, detrás del hero: misma geometría, muy atenuada,
 * girando sola y sin interacción ni raycasting. Solo aporta fondo.
 */

export function init({ scene, camera, paleta, esMovil }: VizContexto): VizInstancia {
  camera.position.set(0, 0, 3.1);

  const cerebro = crearCerebro({
    // Menos subdivisiones: al 16 % de opacidad el detalle no se aprecia y sí se
    // nota el coste de generarlo.
    detalle: esMovil ? 5 : 8,
    base: paleta.cerebro,
    realce: paleta.acento,
    opacidad: 0.16,
  });
  scene.add(cerebro.grupo);

  return {
    update(t) {
      cerebro.grupo.rotation.y = t * 0.045;
      cerebro.grupo.rotation.x = Math.sin(t * 0.08) * 0.14;
    },
    setPaleta(nueva: Paleta) {
      cerebro.setColores(nueva.cerebro, nueva.acento);
    },
    dispose() {
      scene.remove(cerebro.grupo);
      cerebro.dispose();
    },
  };
}
