/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Cyan and black color scheme
        primary: '#06B6D4', // Cyan - primary accent
        'primary-dark': '#0891B2', // Darker cyan for hover states
        secondary: '#404040', // Dark grey - secondary accent
        background: '#000000', // Pure black - main background
        surface: '#121212', // Dark grey - elevated surfaces
        'surface-light': '#27272a', // Lighter dark grey for highlights

        // Text colors
        text: '#FFFFFF',
        'text-muted': '#a1a1aa', // Neutral grey for muted text

        // Status colors
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        info: '#3b82f6',

        // Transparent variations for overlays
        'primary-light': 'rgba(6, 182, 212, 0.1)',
        'secondary-light': 'rgba(255, 255, 255, 0.1)',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      keyframes: {
        twinkle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.3' },
        }
      },
      animation: {
        twinkle: 'twinkle 3s ease-in-out infinite',
      }
    },
  },
  plugins: [],
}
