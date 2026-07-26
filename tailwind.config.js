/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,js}'],
  theme: {
    extend: {
      colors: {
        tinta: '#0b0d12',
        papel: '#f4f1ea',
        bruma: '#8a8f9c',
        senal: '#c9a227',
        senalClara: '#e8c85a',
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
