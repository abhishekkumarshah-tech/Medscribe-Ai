/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        ink: {
          900: '#12211F',
          700: '#33453F',
          500: '#5B6B67',
          300: '#94A29D',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          muted: '#F5F8F7',
        },
        line: '#DCE6E2',
        brand: {
          900: '#0B3D3A',
          700: '#0F4C4A',
          500: '#2F8F87',
          200: '#CFE7E3',
          100: '#EAF4F2',
        },
        status: {
          approved: '#2E7D5B',
          approvedBg: '#E7F4EC',
          pending: '#B7791F',
          pendingBg: '#FBF1DF',
          draft: '#5B6B76',
          draftBg: '#EEF1F3',
        },
      },
      boxShadow: {
        card: '0 1px 2px rgba(18, 33, 31, 0.04)',
      },
    },
  },
  plugins: [],
}
