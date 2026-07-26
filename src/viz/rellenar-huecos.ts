import * as THREE from 'three';
import { aleatorio, crearNube, crearTrazo, saturar } from './base';
import type { Paleta, Puntero, VizContexto, VizInstancia } from './tipos';

/**
 * lectura-fria — Quién rellena los huecos.
 *
 * Arriba, un contorno vago y discontinuo: la afirmación de doble filo. Abajo, el
 * material del espectador. Al acercarse, las partículas suben desde el lado de
 * quien escucha y completan el contorno hasta convertirlo en un retrato nítido.
 * La precisión aparece, pero la aporta él.
 */

const VERTICES_CONTORNO = 150;

export const pista =
  'Mueve el cursor hacia el contorno: la figura se vuelve nítida con partículas que salen de abajo, es decir, de tu lado.';

/** Perfil cerrado, deliberadamente ambiguo: podría ser mucha gente. */
function puntoContorno(u: number): THREE.Vector2 {
  const a = u * Math.PI * 2;
  const r =
    2.1 +
    Math.sin(a * 2) * 0.42 +
    Math.sin(a * 3 + 1.1) * 0.24 +
    Math.cos(a * 5 + 0.4) * 0.12;
  return new THREE.Vector2(Math.cos(a) * r * 1.35, Math.sin(a) * r * 0.82 + 0.5);
}

export function init({ scene, paleta, esMovil }: VizContexto): VizInstancia {
  const cantidad = esMovil ? 260 : 440;

  const trazo = crearTrazo(VERTICES_CONTORNO + 1, paleta.tenue, 0.3);
  for (let i = 0; i <= VERTICES_CONTORNO; i++) {
    const p = puntoContorno(i / VERTICES_CONTORNO);
    trazo.posicion.setXYZ(i, p.x, p.y, -0.3);
  }
  trazo.posicion.needsUpdate = true;
  scene.add(trazo.linea);

  const nube = crearNube(cantidad, { tamano: 0.07, opacidad: 0.9, aditivo: true });
  scene.add(nube.puntos);

  const rnd = aleatorio(881);
  // Cada partícula sale de la zona del espectador y tiene su destino en el contorno.
  const origen: THREE.Vector2[] = [];
  const destino: THREE.Vector2[] = [];
  const retardo: number[] = [];
  for (let i = 0; i < cantidad; i++) {
    origen.push(new THREE.Vector2((rnd() - 0.5) * 10.5, -3.6 - rnd() * 1.6));
    destino.push(puntoContorno(rnd()));
    retardo.push(rnd() * 0.45);
  }

  let base = new THREE.Color(paleta.tenue);
  let vivo = new THREE.Color(paleta.acentoClaro);
  const color = new THREE.Color();
  const actual = new THREE.Vector2();

  let completado = 0;

  return {
    update(t, puntero: Puntero) {
      // Sin cursor la escena se completa y se deshace sola, en bucle.
      const objetivo = puntero.activo
        ? saturar((puntero.y + 1) * 0.62 + 0.12)
        : 0.5 + Math.sin(t * 0.42) * 0.5;
      completado += (objetivo - completado) * 0.06;

      const atributo = nube.color;

      for (let i = 0; i < cantidad; i++) {
        const avance = saturar((completado - retardo[i]!) / (1 - retardo[i]!));
        const suave = avance * avance * (3 - 2 * avance);
        const o = origen[i]!;
        const d = destino[i]!;
        actual.copy(o).lerp(d, suave);
        // Deriva lateral mientras viaja; al llegar, se posa exacta.
        const flotar = (1 - suave) * 0.35;
        nube.posicion.setXYZ(
          i,
          actual.x + Math.sin(t * 1.3 + i) * flotar,
          actual.y + Math.cos(t * 1.1 + i * 0.7) * flotar,
          0,
        );
        if (atributo) {
          color.copy(base).lerp(vivo, suave);
          atributo.setXYZ(i, color.r, color.g, color.b);
        }
      }
      nube.posicion.needsUpdate = true;
      if (atributo) atributo.needsUpdate = true;

      // El contorno original se apaga a medida que el relleno ocupa su sitio.
      trazo.material.opacity = 0.32 - completado * 0.22;
    },
    setPaleta(nueva: Paleta) {
      base = new THREE.Color(nueva.tenue);
      vivo = new THREE.Color(nueva.acentoClaro);
      trazo.material.color.set(nueva.tenue);
    },
    dispose() {
      scene.remove(nube.puntos, trazo.linea);
      nube.dispose();
      trazo.dispose();
    },
  };
}
