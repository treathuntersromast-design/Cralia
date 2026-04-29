import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      colors: {
        // CSS var–driven so both light and dark themes update automatically.
        // Uses the RGB-channel format so opacity modifiers (bg-brand/10 etc.) work.
        brand: {
          DEFAULT: 'rgb(var(--brand-rgb) / <alpha-value>)',
          ink:     'rgb(var(--brand-ink-rgb) / <alpha-value>)',
          soft:    'var(--brand-soft)',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'var(--font-noto-jp)', 'sans-serif'],
      },
      borderRadius: {
        card:  '10px',
        input: '6px',
        modal: '16px',
      },
      boxShadow: {
        'sm-soft': '0 1px 2px rgba(11,21,48,0.06)',
        'md-soft': '0 4px 14px rgba(11,21,48,0.08)',
      },
      transitionDuration: {
        DEFAULT: '150ms',
      },
    },
  },
  plugins: [],
}
export default config
