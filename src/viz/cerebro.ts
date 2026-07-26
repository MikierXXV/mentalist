import * as THREE from 'three';
import { crearCerebro } from './cerebro-geometria';
import { ETIQUETAS, REGIONES } from './regiones';
import type { Paleta, Puntero, VizContexto, VizInstancia } from './tipos';

/**
 * Cerebro interactivo de la portada.
 *
 * Gira despacio; al señalar una zona con el cursor —o al elegirla desde los
 * botones del panel, que llegan por `setParametro`— la región se resalta y se
 * emite su identificador para que la interfaz muestre nombre y conceptos.
 */

export const pista =
  'Gíralo con el cursor y señala una zona. La localización es orientativa: estos procesos están distribuidos, no encerrados en una región.';

/**
 * Orientación a la que gira el modelo al elegir cada zona, para que la región
 * resaltada quede de cara. Sin esto, seleccionar la occipital o el cerebelo
 * ilumina la parte de atrás y el usuario no ve nada.
 */
const ORIENTACIONES: Record<number, { giro: number; inclinacion: number }> = {
  0: { giro: 0, inclinacion: 0 }, // frontal
  1: { giro: 0.5, inclinacion: -0.62 }, // parietal, desde arriba
  2: { giro: -1.5, inclinacion: 0.1 }, // temporal, de perfil
  3: { giro: Math.PI, inclinacion: 0 }, // occipital, por detrás
  4: { giro: Math.PI, inclinacion: 0.55 }, // cerebelo, detrás y desde abajo
  5: { giro: 2.6, inclinacion: 0.95 }, // tronco, desde abajo
};

export function init({
  scene,
  camera,
  paleta,
  esMovil,
  emitir,
}: VizContexto): VizInstancia {
  camera.position.set(0, 0.05, 2.75);

  const cerebro = crearCerebro({
    // Por debajo de este nivel el ruido se alía contra la densidad de vértices
    // y los surcos se ven como facetas en vez de como relieve.
    detalle: esMovil ? 14 : 26,
    base: paleta.cerebro,
    realce: paleta.acentoClaro,
    opacidad: 1,
  });
  scene.add(cerebro.grupo);

  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();

  let regionActiva = -1;
  let regionFijada = -1;
  let giro = 0;
  let inclinacion = 0;

  const anunciar = (indice: number) => {
    if (indice === regionActiva) return;
    regionActiva = indice;
    cerebro.setRegionActiva(indice);
    emitir('region', indice >= 0 ? REGIONES[indice] : null);
  };

  return {
    update(t, puntero: Puntero) {
      // Con una zona fijada manda su orientación; si no, el cursor la modula
      // sobre una deriva lenta que evita que el modelo parezca congelado.
      const fijado = regionFijada >= 0 ? ORIENTACIONES[regionFijada] : undefined;
      const objetivoGiro = fijado
        ? fijado.giro
        : puntero.activo
          ? -0.35 + puntero.x * 0.85
          : -0.35 + Math.sin(t * 0.16) * 0.5;
      const objetivoInclinacion = fijado
        ? fijado.inclinacion
        : puntero.activo
          ? -puntero.y * 0.35
          : Math.sin(t * 0.11) * 0.12;

      // Camino corto: sin esto, ir a la occipital puede dar una vuelta entera.
      let delta = objetivoGiro - giro;
      while (delta > Math.PI) delta -= Math.PI * 2;
      while (delta < -Math.PI) delta += Math.PI * 2;

      giro += delta * (fijado ? 0.07 : 0.05);
      inclinacion += (objetivoInclinacion - inclinacion) * (fijado ? 0.07 : 0.05);
      cerebro.grupo.rotation.y = giro;
      cerebro.grupo.rotation.x = inclinacion;

      if (regionFijada >= 0) {
        anunciar(regionFijada);
        return;
      }

      if (!puntero.activo) {
        anunciar(-1);
        return;
      }

      ndc.set(puntero.x, puntero.y);
      raycaster.setFromCamera(ndc, camera);
      const impactos = raycaster.intersectObjects(cerebro.objetivos, false);
      const impacto = impactos[0];

      if (!impacto?.face) {
        anunciar(-1);
        return;
      }

      const atributo = (impacto.object as THREE.Mesh).geometry.getAttribute('aRegion');
      if (!atributo) {
        anunciar(-1);
        return;
      }
      anunciar(Math.round(atributo.getX(impacto.face.a)));
    },
    setParametro(id, valor) {
      if (id !== 'region') return;
      const indice = Number(valor);
      // -1 libera la selección y devuelve el control al cursor.
      regionFijada = Number.isFinite(indice) && indice >= 0 && indice < ETIQUETAS.length
        ? indice
        : -1;
      if (regionFijada < 0) anunciar(-1);
    },
    setPaleta(nueva: Paleta) {
      cerebro.setColores(nueva.cerebro, nueva.acentoClaro);
    },
    dispose() {
      scene.remove(cerebro.grupo);
      cerebro.dispose();
    },
  };
}
