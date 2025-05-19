/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#E31937",
          dark: "#C01730",
          light: "#F04D65",
        },
        secondary: {
          DEFAULT: "#1A1A1A",
          dark: "#000000",
          light: "#333333",
        },
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
}
