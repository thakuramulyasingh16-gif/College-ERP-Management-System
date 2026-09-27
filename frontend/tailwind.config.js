/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'deep-blue': '#1E3A8A',
        'accent-orange': '#F97316',
        clay: {
          bg:        '#F4F1FB',
          surface:   '#FFFFFF',
          primary:   '#6C63FF',
          secondary: '#8B5CF6',
          accent:    '#A78BFA',
          success:   '#22C55E',
          warning:   '#F59E0B',
          danger:    '#EF4444',
          text:      '#1F2937',
          muted:     '#6B7280',
          border:    '#EDE9FE',
          sidebar:   '#6C63FF',
        },
      },
      borderRadius: {
        'clay':    '24px',
        'clay-lg': '32px',
        'clay-xl': '40px',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'purple-gradient': 'linear-gradient(to right, #6366F1, #8B5CF6)',
        'clay-gradient':   'linear-gradient(135deg, #6C63FF 0%, #8B5CF6 100%)',
        'clay-soft':       'linear-gradient(135deg, #F4F1FB 0%, #EDE9FE 100%)',
      },
    },
  },
  plugins: [],
}
