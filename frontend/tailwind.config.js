/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Signature color - teal/blue-green
        primary: {
          DEFAULT: '#0D9488', // Teal-600
          hover: '#0F766E',   // Teal-700
          light: '#F0FDFA',   // Teal-50
          muted: '#99F6E4',   // Teal-200
        },
        // Warm neutrals
        surface: {
          DEFAULT: '#FFFFFF',
          subtle: '#FAFAF9',  // Stone-50 (warm)
          muted: '#F5F5F4',   // Stone-100
          hover: '#E7E5E4',   // Stone-200
        },
        text: {
          main: '#1C1917',    // Stone-900 (warm dark)
          secondary: '#78716C', // Stone-500
          light: '#A8A29E',   // Stone-400
          muted: '#D6D3D1',   // Stone-300
        },
        // Status colors (subtle)
        status: {
          positive: '#059669', // Emerald-600
          positiveBg: '#ECFDF5', // Emerald-50
          neutral: '#78716C',
          neutralBg: '#F5F5F4',
        }
      },
      borderRadius: {
        'xl': '0.875rem',
        '2xl': '1rem',
        '3xl': '1.25rem',
      },
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        display: ['Fraunces', 'Georgia', 'serif'],
      },
      boxShadow: {
        'soft': '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.04)',
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 4px 12px -2px rgba(0, 0, 0, 0.03)',
        'elevated': '0 4px 24px -4px rgba(0, 0, 0, 0.08)',
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
      animation: {
        'fadeIn': 'fadeIn 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
