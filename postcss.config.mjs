/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    "@tailwindcss/postcss": {}, // Use the correct Tailwind PostCSS plugin
    autoprefixer: {}, // Add autoprefixer for better browser compatibility
  },
};

export default config;
