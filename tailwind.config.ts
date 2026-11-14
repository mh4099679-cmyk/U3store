import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Strict U3 STORE Monochromatic Logo Palette (Zero Burgundy)
        jet: "#111214",
        charcoal: "#292B2E",
        darkgray: "#44474C",
        neutralgray: "#73777D",
        silver: "#BFC2C6",
        lightsilver: "#E1E3E5",
        softgray: "#E9EAEC",
        offwhite: "#F7F7F5",
        darkbg: "#111214",
        darksurface: "#1A1C1F",
        darkcard: "#22252A",
        darkborder: "#30343A",
        // Legacy alias mapped strictly to U3 Monochrome Charcoal/Black so no burgundy ever renders
        burgundy: {
          DEFAULT: "#111214",
          light: "#292B2E",
          dark: "#0B0C0E",
        },
      },
      fontFamily: {
        heading: ["var(--font-outfit)", "var(--font-tajawal)", "sans-serif"],
        sans: ["var(--font-inter)", "var(--font-tajawal)", "sans-serif"],
        arabic: ["var(--font-tajawal)", "var(--font-ibm-arabic)", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
