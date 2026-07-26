import type * as THREE from 'three';
import type { Paleta } from '../tema';

export type { Paleta };

export interface Puntero {
  /** Coordenadas normalizadas dentro del lienzo, de -1 a 1. */
  x: number;
  y: number;
  /** True mientras el cursor está sobre el lienzo o hay un dedo apoyado. */
  activo: boolean;
  /** True en el fotograma siguiente a una pulsación. */
  pulsado: boolean;
}

export interface VizContexto {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  paleta: Paleta;
  /** Permite bajar el número de partículas en pantallas pequeñas. */
  esMovil: boolean;
  /**
   * Escribe un marcador de texto bajo el lienzo, en una región `aria-live`.
   * Es la vía por la que las escenas con resultado —aciertos, milisegundos,
   * grado de precisión— comunican ese resultado también a quien no ve el canvas.
   */
  estado(texto: string): void;
  /**
   * Canal para escenas cuya interacción alimenta a la interfaz de alrededor
   * —el cerebro avisa de qué región se está señalando para que el panel HTML
   * muestre su nombre y sus conceptos—.
   */
  emitir(nombre: string, dato: unknown): void;
}

export interface VizInstancia {
  /** @param t segundos transcurridos desde el montaje. */
  update(t: number, puntero: Puntero): void;
  /** Se llama al cambiar de tema; repinta materiales sin desmontar la escena. */
  setPaleta?(paleta: Paleta): void;
  /** Recibe los cambios de los controles declarados por el módulo. */
  setParametro?(id: string, valor: number | boolean): void;
  dispose(): void;
}

/**
 * Controles que el módulo declara y que se pintan bajo el lienzo como elementos
 * nativos. Existen para que la visualización se pueda manejar con teclado y en
 * táctil, donde no hay `hover` y `pointermove` no basta.
 */
export type Control =
  | {
      id: string;
      tipo: 'conmutador';
      etiqueta: string;
      opciones: [string, string];
      inicial?: 0 | 1;
    }
  | {
      id: string;
      tipo: 'rango';
      etiqueta: string;
      min: number;
      max: number;
      paso: number;
      inicial: number;
      formato?: (valor: number) => string;
    }
  | { id: string; tipo: 'boton'; etiqueta: string };

export interface VizModulo {
  init(ctx: VizContexto): VizInstancia;
  controles?: Control[];
  /** Pista breve bajo los controles sobre qué mirar. */
  pista?: string;
}
