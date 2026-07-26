import * as THREE from 'three';
import { COLORES, type Puntero, type VizInstancia } from './tipos';

/**
 * Campo de atención: una nube de puntos difusos en la que solo lo que queda
 * cerca del cursor se resuelve en nitidez. Ilustra que la percepción nítida
 * ocupa una porción diminuta del campo y que el resto se rellena a ciegas.
 */

const COLUMNAS = 62;
const FILAS = 34;
const RADIO_FOCO = 1.9;

const vertexShader = /* glsl */ `
  uniform vec2 uFoco;
  uniform float uRadio;
  uniform float uTiempo;
  attribute float aSemilla;
  varying float vFoco;

  void main() {
    vec3 pos = position;
    // Deriva lenta: el campo nunca está del todo quieto.
    pos.x += sin(uTiempo * 0.35 + aSemilla * 6.283) * 0.045;
    pos.y += cos(uTiempo * 0.28 + aSemilla * 6.283) * 0.045;

    float d = distance(pos.xy, uFoco);
    vFoco = 1.0 - smoothstep(0.0, uRadio, d);

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = mix(1.6, 7.0, vFoco * vFoco) * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uColorBase;
  uniform vec3 uColorFoco;
  varying float vFoco;

  void main() {
    // Punto circular; los que están fuera de foco quedan con borde suave.
    vec2 c = gl_PointCoord - vec2(0.5);
    float d = length(c);
    float borde = mix(0.5, 0.12, vFoco);
    float alfa = smoothstep(0.5, borde, d);
    if (alfa <= 0.01) discard;

    vec3 color = mix(uColorBase, uColorFoco, vFoco);
    gl_FragColor = vec4(color, alfa * mix(0.16, 1.0, vFoco));
  }
`;

export function init(
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
): VizInstancia {
  const total = COLUMNAS * FILAS;
  const posiciones = new Float32Array(total * 3);
  const semillas = new Float32Array(total);

  let i = 0;
  for (let f = 0; f < FILAS; f++) {
    for (let c = 0; c < COLUMNAS; c++) {
      posiciones[i * 3] = (c / (COLUMNAS - 1) - 0.5) * 11.4;
      posiciones[i * 3 + 1] = (f / (FILAS - 1) - 0.5) * 6.2;
      posiciones[i * 3 + 2] = (Math.random() - 0.5) * 0.6;
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
      uRadio: { value: RADIO_FOCO },
      uTiempo: { value: 0 },
      uColorBase: { value: new THREE.Color(COLORES.bruma) },
      uColorFoco: { value: new THREE.Color(COLORES.senalClara) },
    },
  });

  const puntos = new THREE.Points(geometry, material);
  scene.add(puntos);

  const foco = material.uniforms.uFoco!.value as THREE.Vector2;
  const objetivo = new THREE.Vector2(0, 0);

  return {
    update(t, puntero: Puntero) {
      material.uniforms.uTiempo!.value = t;

      const mitadAlto =
        Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * camera.position.z;
      const mitadAncho = mitadAlto * camera.aspect;

      if (puntero.activo) {
        objetivo.set(puntero.x * mitadAncho, puntero.y * mitadAlto);
      } else {
        // Sin cursor, el foco pasea solo: la atención nunca se queda quieta.
        objetivo.set(
          Math.sin(t * 0.42) * mitadAncho * 0.55,
          Math.cos(t * 0.31) * mitadAlto * 0.5,
        );
      }
      foco.lerp(objetivo, 0.08);
    },
    dispose() {
      scene.remove(puntos);
      geometry.dispose();
      material.dispose();
    },
  };
}
