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
      },
      backgroundImage: {
        'purple-gradient': 'linear-gradient(to right, #6366F1, #8B5CF6)',
      },
    },
  },
  plugins: [],
}
