import { defineConfig } from 'vite';

// `base` debe coincidir con el nombre del repositorio en GitHub Pages
// (https://<usuario>.github.io/<repo>/). En CI lo fija el workflow a partir
// del nombre real del repositorio; esto es solo el valor para desarrollo.
const base = process.env.BASE_PATH ?? '/mentalist/';

export default defineConfig({
  base,
  build: {
    target: 'es2022',
    // El único chunk grande es Three.js, y se descarga solo al abrir una ficha.
    chunkSizeWarningLimit: 800,
    // Three.js vive en su propio chunk: solo se descarga cuando se abre
    // una ficha de concepto, no en la carga inicial.
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          gsap: ['gsap'],
        },
      },
    },
  },
});
