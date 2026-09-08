import * as THREE from 'three';
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

/** Aire alrededor del modelo, para que no llegue a tocar los bordes. */
const MARGEN = 1.18;

export function init({ scene, camera, paleta, esMovil, emitir }: VizContexto): VizInstancia {
  camera.position.set(0, 0, 3.1);

  const colores = { base: paleta.cerebro, realce: paleta.acento, opacidad: 0.16 };

  let cerebro: Cerebro | null = null;
  let radio = 0;
  let desmontado = false;
  let aspectoAplicado = 0;

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

    // El radio de la esfera envolvente no cambia al girar el modelo, así que
    // sirve para encuadrar sea cual sea la rotación del momento.
    const esfera = new THREE.Box3()
      .setFromObject(cerebro.grupo)
      .getBoundingSphere(new THREE.Sphere());
    radio = esfera.radius;
    aspectoAplicado = 0;
  });

  /**
   * Distancia a la que el modelo entra entero.
   *
   * El campo de visión de la cámara es vertical, así que en un contenedor más
   * alto que ancho —el hero en un móvil— el ancho visible se reduce con la
   * proporción y el modelo se sale por los lados. Antes la distancia era fija y
   * en vertical solo se veía un fragmento muy ampliado.
   */
  const encuadrar = () => {
    if (!radio || camera.aspect === aspectoAplicado) return;
    const mitadFov = THREE.MathUtils.degToRad(camera.fov) / 2;
    const porAlto = radio / Math.tan(mitadFov);
    const porAncho = radio / (Math.tan(mitadFov) * camera.aspect);
    camera.position.z = Math.max(porAlto, porAncho) * MARGEN;
    camera.updateProjectionMatrix();
    aspectoAplicado = camera.aspect;
    publicarEncuadre();
  };

  /**
   * Proyecta las ocho esquinas de la caja del modelo y publica hasta dónde
   * llegan en coordenadas de pantalla: por encima de 1 hay recorte. Sirve para
   * comprobar el encuadre con una medida en vez de a ojo, que no distingue
   * "recortado" de "el modelo es así".
   */
  const publicarEncuadre = () => {
    if (!cerebro) return;
    camera.updateMatrixWorld();
    const caja = new THREE.Box3().setFromObject(cerebro.grupo);
    const v = new THREE.Vector3();
    let maxX = 0;
    let maxY = 0;
    for (let i = 0; i < 8; i++) {
      v.set(
        i & 1 ? caja.max.x : caja.min.x,
        i & 2 ? caja.max.y : caja.min.y,
        i & 4 ? caja.max.z : caja.min.z,
      ).project(camera);
      maxX = Math.max(maxX, Math.abs(v.x));
      maxY = Math.max(maxY, Math.abs(v.y));
    }
    emitir('encuadre', `${maxX.toFixed(2)}x${maxY.toFixed(2)}`);
  };

  return {
    update(t) {
      if (!cerebro) return;
      encuadrar();
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
