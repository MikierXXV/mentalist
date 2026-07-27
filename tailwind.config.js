/** @type {import('tailwindcss').Config} */

// Los colores salen de variables CSS declaradas en src/styles.css, en canales RGB
// sueltos, para que las utilidades con opacidad (bg-superficie/40, border-acento/30)
// sigan funcionando y para poder cambiar de tema sin recompilar nada.
const conAlfa = (variable) => `rgb(var(${variable}) / <alpha-value>)`;

export default {
  darkMode: ['selector', ':root[data-theme="dark"] &'],
  content: ['./index.html', './src/**/*.{ts,js}'],
  theme: {
    extend: {
      // Tailwind se detiene en 2xl (1536 px). Estos dos tramos cubren los
      // monitores de 1080 y 1440 en vertical real y los ultrapanorámicos.
      screens: {
        '3xl': '1920px',
        '4xl': '2560px',
      },
      colors: {
        fondo: conAlfa('--color-fondo'),
        superficie: conAlfa('--color-superficie'),
        texto: conAlfa('--color-texto'),
        tenue: conAlfa('--color-tenue'),
        acento: conAlfa('--color-acento'),
        acentoClaro: conAlfa('--color-acento-claro'),
        borde: conAlfa('--color-borde'),
      },
      fontFamily: {
        display: ['Georgia', 'Cambria', 'Times New Roman', 'serif'],
        cuerpo: [
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      maxWidth: {
        lectura: '68ch',
      },
    },
  },
  plugins: [],
};
