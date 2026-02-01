// tailwind.config.js
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}", "./hooks/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Legacy keys (kept for backwards compatibility)
        primaryy: "#5E17EB",
        gray: "#6D6D6D",
        graysecondd: "#181818",

        // Semantic tokens (Design System v1)
        bg: "#000000",
        surface1: "#0B0B0F",
        surface2: "#12121A",
        surface3: "#18181F",
        border: "rgba(255,255,255,0.08)",
        textPrimary: "#FFFFFF",
        textSecondary: "rgba(255,255,255,0.70)",
        accent: "#5E17EB",
        accent2: "#EC4899",
        success: "#22C55E",
        danger: "#EF4444",
      },
    },
  },
  // ESTA LÍNEA ES LA CLAVE PARA QUE EL MODO CLARO/OSCURO FUNCIONE
  darkMode: "class",
  plugins: [],
};
