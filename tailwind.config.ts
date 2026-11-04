import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        healthysis: {
          deepOcean: "#076584",
          teal: "#04939D",
          turquoise: "#0EA6B7",
          aqua: "#2CAC7F",
          freshGreen: "#53BA70",
          leafGreen: "#77C86F",
        },
      },
    },
  },
  plugins: [],
};

export default config;

