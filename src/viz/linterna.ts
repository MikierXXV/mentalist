import * as THREE from 'three';
import { extension } from './base';
import type { Paleta, Puntero, VizContexto, VizInstancia } from './tipos';

/**
 * atencion-selectiva — La linterna.
 *
 * Solo lo enfocado se resuelve en nitidez; el resto queda en una penumbra de
 * baja resolución que sigue ahí pero no llega a percibirse. El foco no se puede
 * ensanchar: lo que se le da a un punto se le quita a todo lo demás.
 */

const vertexShader = /* glsl */ `
  uniform vec2 uFoco;
  uniform float uRadio;
  uniform float uTiempo;
  attribute float aSemilla;
  varying float vFoco;

  void main() {
    vec3 pos = position;
    pos.x += sin(uTiempo * 0.35 + aSemilla * 6.283) * 0.05;
    pos.y += cos(uTiempo * 0.28 + aSemilla * 6.283) * 0.05;

    float d = distance(pos.xy, uFoco);
    vFoco = 1.0 - smoothstep(0.0, uRadio, d);

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = mix(1.7, 7.5, vFoco * vFoco) * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uColorBase;
  uniform vec3 uColorFoco;
  varying float vFoco;

  void main() {
    vec2 c = gl_PointCoord - vec2(0.5);
    float d = length(c);
    // Fuera de foco el punto se difumina: no desaparece, se vuelve ilegible.
    float borde = mix(0.5, 0.1, vFoco);
    float alfa = smoothstep(0.5, borde, d);
    if (alfa <= 0.01) discard;
    vec3 color = mix(uColorBase, uColorFoco, vFoco);
    gl_FragColor = vec4(color, alfa * mix(0.14, 1.0, vFoco));
  }
`;

export const pista =
  'Mueve el cursor: la zona nítida es diminuta y no se puede ensanchar. Todo lo demás sigue ahí, pero no llegas a verlo.';

export function init({ scene, camera, paleta, esMovil }: VizContexto): VizInstancia {
  const columnas = esMovil ? 44 : 66;
  const filas = esMovil ? 24 : 36;
  const total = columnas * filas;

  const posiciones = new Float32Array(total * 3);
  const semillas = new Float32Array(total);

  let i = 0;
  for (let f = 0; f < filas; f++) {
    for (let c = 0; c < columnas; c++) {
      posiciones[i * 3] = (c / (columnas - 1) - 0.5) * 11.4;
      posiciones[i * 3 + 1] = (f / (filas - 1) - 0.5) * 6.2;
      posiciones[i * 3 + 2] = (Math.random() - 0.5) * 0.5;
      semillas[i] = Math.random();
      i++;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(posiciones, 3));
  geometry.setAttribute('aSemilla', new THREE.BufferAttribute(semillas, 1));

  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    uniforms: {
      uFoco: { value: new THREE.Vector2(0, 0) },
      uRadio: { value: 1.75 },
      uTiempo: { value: 0 },
      uColorBase: { value: new THREE.Color(paleta.tenue) },
      uColorFoco: { value: new THREE.Color(paleta.acentoClaro) },
    },
  });

  const puntos = new THREE.Points(geometry, material);
  scene.add(puntos);

  const foco = material.uniforms.uFoco!.value as THREE.Vector2;
  const objetivo = new THREE.Vector2(0, 0);

  return {
    update(t, puntero: Puntero) {
      material.uniforms.uTiempo!.value = t;
      const { alto, ancho } = extension(camera);
      if (puntero.activo) {
        objetivo.set(puntero.x * ancho, puntero.y * alto);
      } else {
        // Sin cursor el foco pasea solo: la atención nunca se queda quieta.
        objetivo.set(Math.sin(t * 0.42) * ancho * 0.6, Math.cos(t * 0.31) * alto * 0.5);
      }
      foco.lerp(objetivo, 0.09);
    },
    setPaleta(nueva: Paleta) {
      (material.uniforms.uColorBase!.value as THREE.Color).set(nueva.tenue);
      (material.uniforms.uColorFoco!.value as THREE.Color).set(nueva.acentoClaro);
    },
    dispose() {
      scene.remove(puntos);
      geometry.dispose();
      material.dispose();
    },
  };
}
