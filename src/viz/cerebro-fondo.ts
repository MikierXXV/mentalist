import { crearCerebro, type Cerebro } from './cerebro-geometria';
import { cargarCerebroModelo } from './cerebro-modelo';
import type { Paleta, VizContexto, VizInstancia } from './tipos';

/**
 * Versión ambiental del cerebro, detrás del hero: mismo modelo que la sección
 * interactiva, muy atenuado, girando solo y sin interacción ni raycasting.
 *
 * El archivo ya está en la caché del navegador cuando esta escena y la
 * interactiva coinciden en la portada: es la misma URL, así que solo se descarga
 * una vez.
 */

export function init({ scene, camera, paleta, esMovil }: VizContexto): VizInstancia {
  camera.position.set(0, 0, 3.1);

  const colores = { base: paleta.cerebro, realce: paleta.acento, opacidad: 0.16 };

  let cerebro: Cerebro | null = null;
  let desmontado = false;

  void cargarCerebroModelo(colores).then((cargado) => {
    if (desmontado) {
      cargado?.dispose();
      return;
    }
    cerebro =
      cargado ??
      crearCerebro({
        // Al 16 % de opacidad el detalle no se aprecia y sí se nota su coste.
        detalle: esMovil ? 5 : 8,
        ...colores,
      });
    scene.add(cerebro.grupo);
  });

  return {
    update(t) {
      if (!cerebro) return;
      cerebro.grupo.rotation.y = t * 0.045;
      cerebro.grupo.rotation.x = Math.sin(t * 0.08) * 0.14;
    },
    setPaleta(nueva: Paleta) {
      colores.base = nueva.cerebro;
      colores.realce = nueva.acento;
      cerebro?.setColores(nueva.cerebro, nueva.acento);
    },
    dispose() {
      desmontado = true;
      if (!cerebro) return;
      scene.remove(cerebro.grupo);
      cerebro.dispose();
    },
  };
}
