/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./frontend/views/**/*.ejs",
    "./frontend/public/js/**/*.js",
  ],
  theme: {
    extend: {
      colors: {
        'brand-blue': '#0056b3',
        'brand-light': '#f0f8ff',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      spacing: {
        '128': '32rem',
      },
      keyframes: {
        'fade-in-up': {
          '0%': {
            opacity: '0',
            transform: 'translateY(20px)'
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)'
          },
        }
      },
      animation: {
        'fade-in-up': 'fade-in-up 1s ease-out forwards'
      },
      animationDelay: {
        '0s': '0s',
        '1s': '1s',
        '2s': '2s',
        '3s': '3s',
      }
    },
  },
  plugins: [
    require('tailwindcss-animation-delay'),
  ],
}