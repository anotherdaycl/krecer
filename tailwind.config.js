/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--font-poppins)', 'system-ui', 'sans-serif'],
        body: ['var(--font-poppins)', 'system-ui', 'sans-serif'],
        sans: ['var(--font-poppins)', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50:  '#f0fafa',
          100: '#cceeee',
          200: '#99dddd',
          300: '#66cccc',
          400: '#3dbfbf',
          500: '#2AABAB',
          600: '#208888',
          700: '#176666',
          800: '#0d4444',
          900: '#062222',
        },
        surface: {
          50:  '#f7fafa',
          100: '#f0f4f4',
          200: '#e0e8e8',
          800: '#1a2626',
          900: '#0d1414',
          950: '#060c0c',
        }
      },
      borderRadius: {
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.6s ease-out',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
