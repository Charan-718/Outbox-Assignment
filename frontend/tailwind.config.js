/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        canvas: '#090A0F',
        surface: {
          DEFAULT: '#111319',
          elevated: '#171A23',
          card: '#13151D',
          hover: '#1B1F2A',
          border: '#222634',
          subtle: '#181C26',
        },
        primary: {
          DEFAULT: '#3B82F6',
          hover: '#2563EB',
          subtle: '#1E293B',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      }
    },
  },
  plugins: [],
}
