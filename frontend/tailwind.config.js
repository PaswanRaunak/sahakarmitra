/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Government-tech palette: orange = action, blue = authority
        gov: {
          orange: '#FF6B1A',
          blue:   '#0B3D91',
        },
      },
    },
  },
  plugins: [],
};
