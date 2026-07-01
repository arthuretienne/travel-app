/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ember: {
          50: '#fbf2ec',
          100: '#f5ddcb',
          200: '#ebb89a',
          300: '#db8e66',
          400: '#c96e44',
          500: '#b85a3c',
          600: '#a44d30',
          700: '#843a23',
          800: '#642b1a',
          900: '#421c10',
        },
        sand: {
          50: '#faf7f2',
          100: '#f4efe6',
          200: '#e8e0d2',
          300: '#d4c8b3',
          400: '#a89880',
          500: '#7a6c56',
          600: '#574b3a',
          700: '#3a3128',
          800: '#25201a',
          900: '#1a1612',
        },
        clay: {
          100: '#f5dde0',
          500: '#9b4757',
        },
        moss: {
          100: '#e6efd9',
          500: '#6b8b4a',
        },
        gold: {
          100: '#f5ecd4',
          // Audit V3 : #c89b3c = 2.56:1 sur blanc pour 36 usages texte.
          // 5.25:1 blanc · 4.46:1 sur gold-100. Aucun usage bg-gold-500.
          500: '#8a661b',
        },
        // Legacy aliases now point to the Ember signature.
        primary: {
          DEFAULT: '#a44d30',
          hover: '#843a23',
          light: '#fbf2ec',
          muted: '#ebb89a',
        },
        // Warm neutrals
        surface: {
          DEFAULT: '#FFFFFF',
          subtle: '#faf7f2',
          muted: '#f4efe6',
          hover: '#e8e0d2',
        },
        text: {
          main: '#1a1612',
          secondary: '#7a6c56',
          // Audit V3 : #a89880 = 2.81:1 sur blanc (78 usages sous le seuil
          // AA 4.5). La hiérarchie passe par la graisse/taille, pas par un
          // gris illisible.
          light: '#7f6d52',   // 4.99:1 blanc · 4.67:1 sand-50 — AA
          // Réservé au décoratif pur (jamais porteur de sens) : 3.58:1,
          // AA large-text. Était 1.65:1.
          muted: '#96856a',
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
        mono: ['JetBrains Mono', 'ui-monospace', 'SF Mono', 'monospace'],
      },
      boxShadow: {
        '1': '0 1px 2px rgba(26,22,18,.04), 0 1px 1px rgba(26,22,18,.03)',
        '2': '0 2px 4px rgba(26,22,18,.04), 0 6px 16px rgba(26,22,18,.06)',
        '3': '0 4px 8px rgba(26,22,18,.05), 0 16px 40px rgba(26,22,18,.08)',
        'soft': '0 1px 2px rgba(26,22,18,.04), 0 1px 1px rgba(26,22,18,.03)',
        'card': '0 2px 4px rgba(26,22,18,.04), 0 6px 16px rgba(26,22,18,.06)',
        'elevated': '0 4px 8px rgba(26,22,18,.05), 0 16px 40px rgba(26,22,18,.08)',
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
