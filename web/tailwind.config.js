/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0B1220', muted: '#475569', faint: '#64748B', line: '#E2E8F0', page: '#F3F6FB',
        brand: { DEFAULT: '#0E7490', blue: '#2563EB', violet: '#6D28D9', tint: '#ECFEFF', edge: '#A5F3FC' },
        alert: { DEFAULT: '#DC2626', tint: '#FEF2F2', edge: '#FECACA' },
        ver: { O: '#64748B', A: '#0E7490', B: '#7C3AED', C: '#F59E0B' },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'Inter', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
    },
    borderRadius: { none: '0', DEFAULT: '0' },
  },
  plugins: [],
}
