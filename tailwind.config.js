// tailwind.config.js
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primaryy: "#5E17EB",
        gray: "#6D6D6D",
        graysecondd: "#181818",
      },
    },
  },
  // ESTA LÍNEA ES LA CLAVE PARA QUE EL MODO CLARO/OSCURO FUNCIONE
  darkMode: "class",
  plugins: [],
};
