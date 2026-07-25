/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        crimson: {
          DEFAULT: "#C8102E",
          dark: "#8C0F22",
          light: "#E63950",
        },
        navy: {
          DEFAULT: "#0F1F3D",
          light: "#1E3A66",
          mid: "#16264D",
        },
        paper: "#FFFFFF",
        mist: "#EEF1F6",
        ink: "#14213D",
        slate: {
          soft: "#5B6478",
        },
      },
      fontFamily: {
        display: ["'Playfair Display'", "serif"],
        body: ["'Inter'", "sans-serif"],
      },
      letterSpacing: {
        widest2: "0.28em",
      },
      keyframes: {
        pulseLine: {
          "0%": { strokeDashoffset: "1000" },
          "100%": { strokeDashoffset: "0" },
        },
        fadeUp: {
          "0%": { opacity: 0, transform: "translateY(12px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
      },
      animation: {
        pulseLine: "pulseLine 2.4s ease-out forwards",
        fadeUp: "fadeUp 0.6s ease-out forwards",
      },
    },
  },
  plugins: [],
};
