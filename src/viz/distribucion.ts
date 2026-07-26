import * as THREE from 'three';
import { crearAro, crearNube, extension, saturar } from './base';
import type { Control, Paleta, Puntero, VizContexto, VizInstancia } from './tipos';

/**
 * ilusion-de-eleccion-libre — La elección preparada.
 *
 * Seis opciones idénticas y una instrucción honesta: elige la que quieras. Antes
 * de que elijas, una de ellas ha recibido una preparación mínima —aparece un
 * instante antes y con un punto más de presencia— por debajo del umbral en que
 * uno se da cuenta. Al elegir se revela cuál estaba preparada.
 *
 * El marcador cuenta coincidencias reales del propio lector: no se inventa
 * ninguna estadística de población.
 */

const OPCIONES = 6;

export const controles: Control[] = [
  { id: 'nueva', tipo: 'boton', etiqueta: 'Otra ronda' },
  {
    id: 'visible',
    tipo: 'conmutador',
    etiqueta: 'Preparación',
    opciones: ['Como se emite', 'A cámara lenta'],
    inicial: 0,
  },
];

export const pista =
  'Pulsa sobre el círculo que quieras. La sensación de haber elegido libremente llega igual de intensa acierte o no la preparación.';

interface Opcion {
  pos: THREE.Vector2;
  brillo: number;
}

export function init({ scene, camera, paleta, estado }: VizContexto): VizInstancia {
  const opciones: Opcion[] = Array.from({ length: OPCIONES }, (_, i) => ({
    pos: new THREE.Vector2((i - (OPCIONES - 1) / 2) * 1.85, 0.35),
    brillo: 0,
  }));

  const aros = opciones.map((opcion) => {
    const aro = crearAro(0.62, paleta.tenue, 0.42, 0.24);
    aro.malla.position.set(opcion.pos.x, opcion.pos.y, 0);
    scene.add(aro.malla);
    return aro;
  });

  // Barras del recuento propio, bajo las opciones.
  const barras = opciones.map((opcion) => {
    const geometry = new THREE.PlaneGeometry(0.5, 1);
    const material = new THREE.MeshBasicMaterial({
      color: paleta.acento,
      transparent: true,
      opacity: 0.45,
    });
    const malla = new THREE.Mesh(geometry, material);
    malla.position.set(opcion.pos.x, -2.4, -0.2);
    malla.scale.y = 0.001;
    scene.add(malla);
    return { malla, geometry, material };
  });

  const chispa = crearNube(60, { tamano: 0.06, opacidad: 0.6, colorFijo: paleta.acentoClaro });
  scene.add(chispa.puntos);

  let base = new THREE.Color(paleta.tenue);
  let vivo = new THREE.Color(paleta.acentoClaro);

  const elecciones = new Array<number>(OPCIONES).fill(0);
  let preparada = Math.floor(Math.random() * OPCIONES);
  let elegida = -1;
  let rondas = 0;
  let coincidencias = 0;
  let inicioRonda = 0;
  let camaraLenta = false;
  let revelacion = 0;
  // El reloj de la escena arranca en su montaje, así que los controles no pueden
  // usar performance.now(): se quedan con el último instante conocido.
  let ultimoT = 0;

  const nuevaRonda = () => {
    preparada = Math.floor(Math.random() * OPCIONES);
    elegida = -1;
    revelacion = 0;
    inicioRonda = ultimoT;
  };

  const texto = () =>
    rondas === 0
      ? 'Elige un círculo.'
      : `${coincidencias} de ${rondas} elecciones coincidieron con la opción preparada.`;

  estado(texto());

  return {
    update(t, puntero: Puntero) {
      ultimoT = t;
      const desdeRonda = t - inicioRonda;
      // La preparación ocurre pronto y dura poco: 250 ms, o 2 s a cámara lenta.
      const ventana = camaraLenta ? 2 : 0.25;
      const preparando = elegida < 0 && desdeRonda > 0.4 && desdeRonda < 0.4 + ventana;
      const fuerzaPreparacion = preparando
        ? Math.sin(((desdeRonda - 0.4) / ventana) * Math.PI) * (camaraLenta ? 0.85 : 0.32)
        : 0;

      if (puntero.pulsado && elegida < 0) {
        const { alto, ancho } = extension(camera);
        const px = puntero.x * ancho;
        const py = puntero.y * alto;
        let mejor = -1;
        let distancia = Infinity;
        opciones.forEach((opcion, i) => {
          const d = Math.hypot(opcion.pos.x - px, opcion.pos.y - py);
          if (d < distancia) {
            distancia = d;
            mejor = i;
          }
        });
        if (mejor >= 0 && distancia < 1.5) {
          elegida = mejor;
          elecciones[mejor] = elecciones[mejor]! + 1;
          rondas++;
          if (mejor === preparada) coincidencias++;
          estado(texto());
        }
      }

      if (elegida >= 0) revelacion = Math.min(1, revelacion + 0.04);

      opciones.forEach((_, i) => {
        const aro = aros[i]!;
        const esPreparada = i === preparada;
        const esElegida = i === elegida;

        let intensidad = 0.05 + Math.sin(t * 1.4 + i) * 0.02;
        if (esPreparada) intensidad += fuerzaPreparacion;
        if (esPreparada && revelacion > 0) intensidad += revelacion * 0.9;
        if (esElegida) intensidad += revelacion * 0.5;

        aro.material.opacity = 0.36 + saturar(intensidad) * 0.6;
        aro.material.color.copy(base).lerp(vivo, saturar(intensidad));
        aro.malla.scale.setScalar(1 + saturar(intensidad) * 0.16);
        // El aro elegido se marca con un anillo interior grueso.
        aro.malla.rotation.z = esElegida ? revelacion * 0.4 : 0;
      });

      const maximo = Math.max(1, ...elecciones);
      barras.forEach((barra, i) => {
        const objetivo = (elecciones[i]! / maximo) * 1.5;
        barra.malla.scale.y += (Math.max(0.001, objetivo) - barra.malla.scale.y) * 0.12;
        barra.malla.position.y = -2.55 + barra.malla.scale.y / 2;
        barra.material.opacity = elecciones[i]! ? 0.5 : 0.1;
      });

      // Chispas alrededor de la opción preparada al revelarse.
      const centro = opciones[preparada]!.pos;
      for (let i = 0; i < 60; i++) {
        const a = (i / 60) * Math.PI * 2 + t * 0.6;
        const r = 0.7 + revelacion * 0.5 + Math.sin(t * 3 + i) * 0.05;
        chispa.posicion.setXYZ(i, centro.x + Math.cos(a) * r, centro.y + Math.sin(a) * r, 0.2);
      }
      chispa.posicion.needsUpdate = true;
      chispa.material.opacity = revelacion * 0.55;
    },
    setParametro(id, valor) {
      if (id === 'nueva') nuevaRonda();
      if (id === 'visible') camaraLenta = Boolean(valor);
    },
    setPaleta(nueva: Paleta) {
      base = new THREE.Color(nueva.tenue);
      vivo = new THREE.Color(nueva.acentoClaro);
      barras.forEach((barra) => barra.material.color.set(nueva.acento));
      chispa.material.color.set(nueva.acentoClaro);
    },
    dispose() {
      scene.remove(chispa.puntos);
      aros.forEach((aro) => {
        scene.remove(aro.malla);
        aro.dispose();
      });
      barras.forEach((barra) => {
        scene.remove(barra.malla);
        barra.geometry.dispose();
        barra.material.dispose();
      });
      chispa.dispose();
    },
  };
}
