import * as THREE from 'three';
import { campana, crearAro, crearNube, extension, saturar } from './base';
import type { Paleta, Puntero, VizContexto, VizInstancia } from './tipos';

/**
 * percepcion-activa — El punto ciego.
 *
 * En el patrón hay un agujero real. Por defecto no se ve: los puntos que lo
 * ocupan son relleno, y son indistinguibles del resto. Al acercar el cursor,
 * ese relleno se delata en dorado. Lo que se percibe como continuo no lo era.
 */

const COLUMNAS_BASE = 46;
const FILAS_BASE = 26;
const RADIO_HUECO = 1.5;

export const pista =
  'Acerca el cursor al centro derecho del patrón: los puntos que se encienden en dorado no existen en el dato, los pone el relleno.';

export function init({ scene, camera, paleta, esMovil }: VizContexto): VizInstancia {
  const columnas = esMovil ? 32 : COLUMNAS_BASE;
  const filas = esMovil ? 18 : FILAS_BASE;
  const total = columnas * filas;

  const nube = crearNube(total, { tamano: 0.075, opacidad: 0.95 });
  scene.add(nube.puntos);

  const centroHueco = new THREE.Vector2(2.1, -0.35);
  const inventado = new Uint8Array(total);

  let i = 0;
  for (let f = 0; f < filas; f++) {
    for (let c = 0; c < columnas; c++) {
      const x = (c / (columnas - 1) - 0.5) * 11.2;
      const y = (f / (filas - 1) - 0.5) * 6;
      nube.posicion.setXYZ(i, x, y, 0);
      const d = Math.hypot(x - centroHueco.x, y - centroHueco.y);
      inventado[i] = d < RADIO_HUECO ? 1 : 0;
      i++;
    }
  }
  nube.posicion.needsUpdate = true;

  const contorno = crearAro(RADIO_HUECO + 0.12, paleta.acento, 0, 0.02);
  contorno.malla.position.set(centroHueco.x, centroHueco.y, -0.05);
  scene.add(contorno.malla);

  let base = new THREE.Color(paleta.tenue);
  let revelado = new THREE.Color(paleta.acentoClaro);
  const color = new THREE.Color();
  let revelacion = 0;

  return {
    update(t, puntero: Puntero) {
      const { alto, ancho } = extension(camera);
      const cx = puntero.activo ? puntero.x * ancho : Math.sin(t * 0.5) * ancho * 0.75;
      const cy = puntero.activo ? puntero.y * alto : Math.cos(t * 0.37) * alto * 0.5;

      const d = Math.hypot(cx - centroHueco.x, cy - centroHueco.y);
      const objetivo = saturar(1 - (d - RADIO_HUECO) / 2.4);
      revelacion += (objetivo - revelacion) * 0.09;

      const atributo = nube.color;
      if (!atributo) return;

      for (let n = 0; n < total; n++) {
        if (inventado[n]) {
          color.copy(base).lerp(revelado, revelacion);
          // Los puntos inventados también tiemblan un poco al delatarse.
          const pos = nube.posicion;
          const bx = pos.getX(n);
          const by = pos.getY(n);
          pos.setZ(n, Math.sin(t * 3 + bx * 2 + by) * 0.16 * revelacion);
        } else {
          color.copy(base);
        }
        atributo.setXYZ(n, color.r, color.g, color.b);
      }
      atributo.needsUpdate = true;
      nube.posicion.needsUpdate = true;

      contorno.material.opacity = revelacion * 0.55;
      // Halo del foco del lector, para que se vea dónde está mirando.
      nube.material.size = 0.075 + campana(d, 3) * 0.012;
    },
    setPaleta(nueva: Paleta) {
      base = new THREE.Color(nueva.tenue);
      revelado = new THREE.Color(nueva.acentoClaro);
      contorno.material.color.set(nueva.acento);
    },
    dispose() {
      scene.remove(nube.puntos, contorno.malla);
      nube.dispose();
      contorno.dispose();
    },
  };
}
