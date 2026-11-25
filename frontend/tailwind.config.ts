import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#F5F3EC",
        mint: {
          DEFAULT: "#A9D8B8",
          light: "#C9E8D3",
          dark: "#85C49A"
        },
        mustard: {
          DEFAULT: "#F8CE46",
          light: "#FBE07D"
        },
        lilac: {
          DEFAULT: "#F0B7F3",
          light: "#F7D5F9"
        },
        ink: "#111827",
        brand: {
          50: "#EEF8F1",
          100: "#C9E8D3",
          500: "#111827",
          600: "#111827",
          700: "#000000",
          900: "#111827"
        }
      },
      boxShadow: {
        brutal: "4px 4px 0px #111827",
        "brutal-sm": "3px 3px 0px #111827",
        "brutal-lg": "6px 6px 0px #111827"
      }
    }
  },
  plugins: []
};

export default config;
