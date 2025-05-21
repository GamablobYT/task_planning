/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // Ensure this covers all files where you use Tailwind classes
  ],
  theme: {
    extend: {
      // You can extend Tailwind's default theme here if needed
    },
  },
  plugins: [],
}
