/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2563EB', // Vibrant Blue
          hover: '#1D4ED8',
          light: '#EFF6FF', // Blue-50
        },
        surface: {
          DEFAULT: '#FFFFFF',
          subtle: '#F9FAFB', // Gray-50
          hover: '#F3F4F6', // Gray-100
        },
        text: {
          main: '#111827', // Gray-900
          secondary: '#6B7280', // Gray-500
          light: '#9CA3AF', // Gray-400
        }
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
        'card': '0 0 0 1px rgba(0, 0, 0, 0.03), 0 2px 8px rgba(0, 0, 0, 0.04)',
      }
    },
  },
  plugins: [],
}

