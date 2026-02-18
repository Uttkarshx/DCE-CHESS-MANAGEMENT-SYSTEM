/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './lib/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#2563eb',
        primaryHover: '#1d4ed8',
        surface: '#18181b',
        muted: '#27272a',
        'zinc': {
          '950': '#09090b',
          '900': '#18181b',
          '800': '#27272a',
        },
      },
      backgroundColor: {
        'dark': '#09090b',
        'dark-secondary': '#18181b',
      },
      textColor: {
        'dark': '#fafafa',
      },
      borderColor: {
        'dark': '#3f3f46',
      },
    },
  },
  plugins: [],
}
