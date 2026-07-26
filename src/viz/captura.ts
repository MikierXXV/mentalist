import * as THREE from 'three';
import { aleatorio, crearAro, crearNube, saturar } from './base';
import type { Control, Paleta, VizContexto, VizInstancia } from './tipos';

/**
 * sesgos-y-atencion-robada — La captura.
 *
 * El punto dorado es la atención. Alrededor, captadores que se encienden a
 * intervalos impredecibles —el mismo principio de recompensa variable de una
 * tragaperras— y tiran de ella. Con el foco protegido, la atención se queda
 * donde su dueño la puso; sin protección, va donde la llamen.
 */

const CAPTADORES = 7;

export const controles: Control[] = [
  {
    id: 'proteger',
    tipo: 'conmutador',
    etiqueta: 'Foco',
    opciones: ['A la intemperie', 'Protegido'],
    inicial: 0,
  },
];

export const pista =
  'Los destellos no siguen un ritmo fijo: por eso funcionan. Con el foco protegido la atención vuelve al centro y se queda.';

interface Captador {
  pos: THREE.Vector2;
  proximo: number;
  brillo: number;
  intervalo: number;
}

export function init({ scene, paleta }: VizContexto): VizInstancia {
  const rnd = aleatorio(60606);

  const captadores: Captador[] = Array.from({ length: CAPTADORES }, (_, i) => {
    const angulo = (i / CAPTADORES) * Math.PI * 2 + rnd() * 0.4;
    return {
      pos: new THREE.Vector2(Math.cos(angulo) * 4.1, Math.sin(angulo) * 2.35),
      proximo: rnd() * 2.5,
      brillo: 0,
      intervalo: 0.7 + rnd() * 2.6,
    };
  });

  const aros = captadores.map((captador) => {
    const aro = crearAro(0.46, paleta.tenue, 0.3, 0.3);
    aro.malla.position.set(captador.pos.x, captador.pos.y, -0.1);
    scene.add(aro.malla);
    return aro;
  });

  const estela = crearNube(90, { tamano: 0.07, opacidad: 0.45, colorFijo: paleta.acento });
  scene.add(estela.puntos);

  const atencion = crearNube(1, {
    tamano: 0.36,
    opacidad: 1,
    colorFijo: paleta.acentoClaro,
  });
  scene.add(atencion.puntos);

  const recinto = crearAro(1.5, paleta.acento, 0, 0.02);
  scene.add(recinto.malla);

  let base = new THREE.Color(paleta.tenue);
  let vivo = new THREE.Color(paleta.acentoClaro);

  const pos = new THREE.Vector2(0, 0);
  const vel = new THREE.Vector2();
  const historial: THREE.Vector2[] = Array.from({ length: 90 }, () => new THREE.Vector2());
  let protegido = false;
  let anterior = 0;
  let cursorHistorial = 0;

  return {
    update(t) {
      const delta = Math.min(0.05, t - anterior);
      anterior = t;

      for (let i = 0; i < captadores.length; i++) {
        const c = captadores[i]!;
        if (t > c.proximo) {
          c.brillo = 1;
          // Intervalo impredecible: nunca se aprende cuándo toca.
          c.proximo = t + 0.35 + rnd() * c.intervalo * 1.8;
        }
        c.brillo *= 0.94;

        const aro = aros[i]!;
        aro.material.opacity = 0.22 + c.brillo * 0.65;
        aro.material.color.copy(base).lerp(vivo, c.brillo);
        aro.malla.scale.setScalar(1 + c.brillo * 0.28);

        if (!protegido) {
          const dx = c.pos.x - pos.x;
          const dy = c.pos.y - pos.y;
          const d = Math.hypot(dx, dy) || 1;
          const fuerza = (c.brillo * 0.55) / d;
          vel.x += dx * fuerza * delta * 8;
          vel.y += dy * fuerza * delta * 8;
        }
      }

      if (protegido) {
        // Barrera: el foco vuelve a su sitio y las llamadas rebotan.
        vel.x += (0 - pos.x) * 0.09;
        vel.y += (0 - pos.y) * 0.09;
        const d = pos.length();
        if (d > 1.35) {
          pos.multiplyScalar(1.35 / d);
          vel.multiplyScalar(-0.3);
        }
      }

      vel.multiplyScalar(protegido ? 0.82 : 0.93);
      pos.add(vel);
      pos.x = THREE.MathUtils.clamp(pos.x, -5.2, 5.2);
      pos.y = THREE.MathUtils.clamp(pos.y, -3, 3);

      atencion.posicion.setXYZ(0, pos.x, pos.y, 0.3);
      atencion.posicion.needsUpdate = true;

      historial[cursorHistorial]!.copy(pos);
      cursorHistorial = (cursorHistorial + 1) % historial.length;
      for (let i = 0; i < historial.length; i++) {
        const indice = (cursorHistorial + i) % historial.length;
        const p = historial[indice]!;
        estela.posicion.setXYZ(i, p.x, p.y, 0.1);
      }
      estela.posicion.needsUpdate = true;

      recinto.material.opacity = protegido ? 0.35 : 0;
      recinto.malla.scale.setScalar(protegido ? 1 + Math.sin(t * 1.6) * 0.02 : 1);
      atencion.material.opacity = saturar(0.7 + (protegido ? 0.3 : vel.length() * 2));
    },
    setParametro(id, valor) {
      if (id === 'proteger') protegido = Boolean(valor);
    },
    setPaleta(nueva: Paleta) {
      base = new THREE.Color(nueva.tenue);
      vivo = new THREE.Color(nueva.acentoClaro);
      atencion.material.color.set(nueva.acentoClaro);
      estela.material.color.set(nueva.acento);
      recinto.material.color.set(nueva.acento);
    },
    dispose() {
      scene.remove(atencion.puntos, estela.puntos, recinto.malla);
      aros.forEach((aro) => {
        scene.remove(aro.malla);
        aro.dispose();
      });
      atencion.dispose();
      estela.dispose();
      recinto.dispose();
    },
  };
}
