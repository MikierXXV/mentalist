import type * as THREE from 'three';

export interface Puntero {
  /** Coordenadas normalizadas dentro del lienzo, de -1 a 1. */
  x: number;
  y: number;
  /** True mientras el cursor está sobre el lienzo. */
  activo: boolean;
}

export interface VizInstancia {
  /** @param t segundos transcurridos desde el montaje. */
  update(t: number, puntero: Puntero): void;
  dispose(): void;
}

export interface VizModulo {
  init(scene: THREE.Scene, camera: THREE.PerspectiveCamera): VizInstancia;
}

/** Paleta compartida por las cuatro visualizaciones. */
export const COLORES = {
  senal: 0xc9a227,
  senalClara: 0xe8c85a,
  bruma: 0x8a8f9c,
  papel: 0xf4f1ea,
};
