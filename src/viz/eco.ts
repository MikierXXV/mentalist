import * as THREE from 'three';
import { aleatorio, crearAro, crearNube, crearTrazo, saturar } from './base';
import type { Paleta, Puntero, VizContexto, VizInstancia } from './tipos';

/**
 * repeticion-y-creencia — El eco.
 *
 * Decenas de nodos repitiendo el mismo mensaje: parece un consenso enorme. Al
 * señalar cualquiera de ellos se ilumina su cadena de procedencia, y todas
 * terminan en el mismo origen. Muchas voces, una sola fuente.
 */

const NIVELES = 4;
const ORIGEN_X = -4.6;

export const pista =
  'Señala cualquier nodo: su cadena se ilumina hacia atrás y siempre acaba en el mismo punto. No son testimonios independientes.';

interface Nodo {
  pos: THREE.Vector2;
  padre: number;
  nivel: number;
}

export function init({ scene, camera, paleta, esMovil }: VizContexto): VizInstancia {
  const rnd = aleatorio(5150);
  const nodos: Nodo[] = [{ pos: new THREE.Vector2(ORIGEN_X, 0), padre: -1, nivel: 0 }];

  const ramificacion = esMovil ? 2 : 3;
  let inicioNivel = 0;
  for (let nivel = 1; nivel <= NIVELES; nivel++) {
    const desde = inicioNivel;
    const hasta = nodos.length;
    inicioNivel = nodos.length;
    for (let p = desde; p < hasta; p++) {
      const padre = nodos[p]!;
      for (let k = 0; k < ramificacion; k++) {
        const x = ORIGEN_X + nivel * 2.35;
        const separacion = 5.6 / (nivel * ramificacion + 1);
        const y = padre.pos.y + (k - (ramificacion - 1) / 2) * separacion + (rnd() - 0.5) * 0.3;
        nodos.push({ pos: new THREE.Vector2(x, THREE.MathUtils.clamp(y, -3, 3)), padre: p, nivel });
      }
    }
  }

  // Aristas: una polilínea de dos vértices por nodo con padre.
  const aristas = nodos
    .map((nodo, indice) => ({ nodo, indice }))
    .filter(({ nodo }) => nodo.padre >= 0);

  const trazos = aristas.map(({ nodo }) => {
    const trazo = crearTrazo(2, paleta.tenue, 0.16);
    const padre = nodos[nodo.padre]!;
    trazo.posicion.setXYZ(0, padre.pos.x, padre.pos.y, 0);
    trazo.posicion.setXYZ(1, nodo.pos.x, nodo.pos.y, 0);
    trazo.posicion.needsUpdate = true;
    scene.add(trazo.linea);
    return trazo;
  });

  const nube = crearNube(nodos.length, { tamano: 0.16, opacidad: 0.95, aditivo: true });
  nodos.forEach((nodo, i) => nube.posicion.setXYZ(i, nodo.pos.x, nodo.pos.y, 0));
  nube.posicion.needsUpdate = true;
  scene.add(nube.puntos);

  const marcaOrigen = crearAro(0.5, paleta.acento, 0.7, 0.12);
  marcaOrigen.malla.position.set(ORIGEN_X, 0, -0.1);
  scene.add(marcaOrigen.malla);

  let base = new THREE.Color(paleta.tenue);
  let vivo = new THREE.Color(paleta.acentoClaro);
  const color = new THREE.Color();

  const resalte = new Float32Array(nodos.length);
  const mundo = new THREE.Vector2();

  return {
    update(t, puntero: Puntero) {
      const alto = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * camera.position.z;
      const ancho = alto * camera.aspect;

      // Sin cursor, el recorrido se hace solo: va señalando nodos por turnos.
      if (puntero.activo) mundo.set(puntero.x * ancho, puntero.y * alto);
      else {
        const auto = nodos[Math.floor(t / 1.6) % nodos.length]!;
        mundo.copy(auto.pos);
      }

      let elegido = 0;
      let mejor = Infinity;
      nodos.forEach((nodo, i) => {
        const d = nodo.pos.distanceTo(mundo);
        if (d < mejor) {
          mejor = d;
          elegido = i;
        }
      });

      resalte.fill(0);
      if (mejor < 2.2) {
        // Se ilumina la cadena entera hasta el origen.
        let cursor = elegido;
        let intensidad = 1;
        while (cursor >= 0) {
          resalte[cursor] = Math.max(resalte[cursor]!, intensidad);
          cursor = nodos[cursor]!.padre;
          intensidad *= 0.94;
        }
      }

      const atributo = nube.color;
      if (atributo) {
        for (let i = 0; i < nodos.length; i++) {
          const pulso = 0.35 + 0.2 * Math.sin(t * 2 - nodos[i]!.nivel * 0.9);
          color.copy(base).lerp(vivo, saturar(resalte[i]! * 0.95 + pulso * 0.25));
          atributo.setXYZ(i, color.r, color.g, color.b);
        }
        atributo.needsUpdate = true;
      }

      aristas.forEach(({ nodo, indice }, i) => {
        const trazo = trazos[i]!;
        const encendida = Math.min(resalte[indice]!, resalte[nodo.padre]!);
        trazo.material.opacity = 0.12 + encendida * 0.7;
        trazo.material.color.copy(base).lerp(vivo, encendida);
      });

      marcaOrigen.malla.scale.setScalar(1 + Math.sin(t * 2.2) * 0.07);
      marcaOrigen.material.opacity = 0.45 + saturar(resalte[0]!) * 0.45;
    },
    setPaleta(nueva: Paleta) {
      base = new THREE.Color(nueva.tenue);
      vivo = new THREE.Color(nueva.acentoClaro);
      marcaOrigen.material.color.set(nueva.acento);
    },
    dispose() {
      scene.remove(nube.puntos, marcaOrigen.malla);
      trazos.forEach((trazo) => {
        scene.remove(trazo.linea);
        trazo.dispose();
      });
      nube.dispose();
      marcaOrigen.dispose();
    },
  };
}
