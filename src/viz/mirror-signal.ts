import * as THREE from 'three';
import { COLORES, type Puntero, type VizInstancia } from './tipos';

/**
 * Señal y espejo: el nodo de la izquierda emite un hilo tenue de partículas; el
 * de la derecha devuelve un haz mucho más denso del que ha recibido. Ilustra
 * que en la lectura de personas casi toda la información la aporta quien
 * responde, no quien pregunta.
 */

const EMITIDAS = 60;
const DEVUELTAS = 320;
const IZQUIERDA = -4.2;
const DERECHA = 4.2;

interface Particula {
  fase: number;
  velocidad: number;
  desvio: number;
  curva: number;
}

function crearParticulas(cantidad: number, dispersion: number): Particula[] {
  return Array.from({ length: cantidad }, () => ({
    fase: Math.random(),
    velocidad: 0.16 + Math.random() * 0.12,
    desvio: (Math.random() - 0.5) * dispersion,
    curva: (Math.random() - 0.5) * dispersion * 0.9,
  }));
}

function crearNube(
  cantidad: number,
  color: number,
  tamano: number,
  opacidad: number,
) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    new THREE.BufferAttribute(new Float32Array(cantidad * 3), 3),
  );
  const material = new THREE.PointsMaterial({
    color,
    size: tamano,
    transparent: true,
    opacity: opacidad,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  return { geometry, material, puntos: new THREE.Points(geometry, material) };
}

function crearNodo(x: number, radio: number, color: number, opacidad: number) {
  const geometry = new THREE.RingGeometry(radio * 0.72, radio, 48);
  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: opacidad,
    side: THREE.DoubleSide,
  });
  const malla = new THREE.Mesh(geometry, material);
  malla.position.x = x;
  return { geometry, material, malla };
}

export function init(scene: THREE.Scene, _camera: THREE.PerspectiveCamera): VizInstancia {
  const emision = crearNube(EMITIDAS, COLORES.bruma, 0.07, 0.75);
  const retorno = crearNube(DEVUELTAS, COLORES.senalClara, 0.06, 0.55);
  const nodoEmisor = crearNodo(IZQUIERDA, 0.55, COLORES.bruma, 0.55);
  const nodoReceptor = crearNodo(DERECHA, 0.8, COLORES.senal, 0.75);

  scene.add(emision.puntos, retorno.puntos, nodoEmisor.malla, nodoReceptor.malla);

  const particulasEmision = crearParticulas(EMITIDAS, 0.55);
  const particulasRetorno = crearParticulas(DEVUELTAS, 3.1);

  const posEmision = emision.geometry.getAttribute('position') as THREE.BufferAttribute;
  const posRetorno = retorno.geometry.getAttribute('position') as THREE.BufferAttribute;

  const recorrer = (
    particulas: Particula[],
    atributo: THREE.BufferAttribute,
    desde: number,
    hasta: number,
    delta: number,
  ) => {
    for (let i = 0; i < particulas.length; i++) {
      const p = particulas[i]!;
      p.fase = (p.fase + p.velocidad * delta) % 1;
      const x = desde + (hasta - desde) * p.fase;
      // Se abre en abanico hacia la mitad del trayecto y se recoge al llegar.
      const apertura = Math.sin(p.fase * Math.PI);
      atributo.setXYZ(
        i,
        x,
        p.desvio * apertura,
        p.curva * apertura,
      );
    }
    atributo.needsUpdate = true;
  };

  let anterior = 0;

  return {
    update(t, _puntero: Puntero) {
      const delta = Math.min(0.05, t - anterior);
      anterior = t;

      recorrer(particulasEmision, posEmision, IZQUIERDA, DERECHA, delta);
      recorrer(particulasRetorno, posRetorno, DERECHA, IZQUIERDA, delta);

      const pulso = 1 + Math.sin(t * 1.6) * 0.06;
      nodoReceptor.malla.scale.setScalar(pulso);
      nodoEmisor.malla.scale.setScalar(2 - pulso);
      scene.rotation.y = Math.sin(t * 0.2) * 0.14;
    },
    dispose() {
      scene.rotation.y = 0;
      scene.remove(emision.puntos, retorno.puntos, nodoEmisor.malla, nodoReceptor.malla);
      emision.geometry.dispose();
      emision.material.dispose();
      retorno.geometry.dispose();
      retorno.material.dispose();
      nodoEmisor.geometry.dispose();
      nodoEmisor.material.dispose();
      nodoReceptor.geometry.dispose();
      nodoReceptor.material.dispose();
    },
  };
}
