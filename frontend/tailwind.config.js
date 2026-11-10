/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17243a",
        muted: "#6d7b90",
        line: "#e7ebf1",
        canvas: "#f6f8fb",
        brand: {
          50: "#eef5ff",
          100: "#dceaff",
          500: "#3978e5",
          600: "#2866d2",
          700: "#2154b0",
        },
      },
      boxShadow: {
        panel: "0 1px 3px rgba(20, 34, 57, 0.045)",
      },
    },
  },
  plugins: [],
};
