/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
    "./data/**/*.{js,jsx}"
  ],
  theme: {
    extend: {
      colors: {
        midnight: "#08070a",
        ink: "#111018",
        gold: "#d6aa54",
        champagne: "#f8e4b0",
        ember: "#b5452f",
        velvet: "#551f2f",
        absinthe: "#2d5c4f"
      },
      boxShadow: {
        glow: "0 0 60px rgba(214, 170, 84, 0.24)",
        card: "0 24px 80px rgba(0, 0, 0, 0.45)"
      },
      fontFamily: {
        sans: [
          "Inter",
          "PingFang SC",
          "Hiragino Sans GB",
          "Microsoft YaHei",
          "sans-serif"
        ],
        display: [
          "Georgia",
          "Times New Roman",
          "PingFang SC",
          "serif"
        ]
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-14px)" }
        },
        pulseGold: {
          "0%, 100%": { opacity: "0.36", transform: "scale(1)" },
          "50%": { opacity: "0.78", transform: "scale(1.05)" }
        }
      },
      animation: {
        float: "float 7s ease-in-out infinite",
        pulseGold: "pulseGold 5s ease-in-out infinite"
      }
    }
  },
  plugins: []
};
