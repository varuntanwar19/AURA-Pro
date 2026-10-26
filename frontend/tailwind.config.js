/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        aura: {
          bg:        '#080d1a',
          surface:   '#0d1528',
          card:      '#111d35',
          border:    '#1e3058',
          navy:      '#0a1628',
          blue:      '#1a56db',
          cyan:      '#06b6d4',
          purple:    '#7c3aed',
          violet:    '#8b5cf6',
          magenta:   '#d946ef',
          teal:      '#0d9488',
          success:   '#10b981',
          warning:   '#f59e0b',
          danger:    '#ef4444',
          muted:     '#64748b',
          text:      '#e2e8f0',
          subtext:   '#94a3b8',
        },
      },
      backgroundImage: {
        'gradient-aura': 'linear-gradient(135deg, #080d1a 0%, #0d1528 50%, #0a0e1f 100%)',
        'gradient-card': 'linear-gradient(135deg, rgba(17,29,53,0.8) 0%, rgba(13,21,40,0.9) 100%)',
        'gradient-cyan': 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
        'gradient-purple': 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
        'gradient-blue': 'linear-gradient(135deg, #1a56db 0%, #1e40af 100%)',
      },
      boxShadow: {
        'glass': '0 4px 24px 0 rgba(6, 182, 212, 0.08), 0 1px 4px 0 rgba(0,0,0,0.4)',
        'glass-lg': '0 8px 40px 0 rgba(6, 182, 212, 0.12), 0 2px 8px 0 rgba(0,0,0,0.5)',
        'cyan-glow': '0 0 20px rgba(6, 182, 212, 0.3)',
        'purple-glow': '0 0 20px rgba(124, 58, 237, 0.3)',
        'card-hover': '0 8px 40px 0 rgba(6, 182, 212, 0.15)',
      },
      backdropBlur: {
        'glass': '12px',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'slide-in': 'slideIn 0.3s ease-out',
        'fade-in': 'fadeIn 0.4s ease-out',
        'spin-slow': 'spin 3s linear infinite',
        'bounce-slow': 'bounce 2s infinite',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 10px rgba(6, 182, 212, 0.3)' },
          '100%': { boxShadow: '0 0 25px rgba(6, 182, 212, 0.6)' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-20px)', opacity: 0 },
          '100%': { transform: 'translateX(0)', opacity: 1 },
        },
        fadeIn: {
          '0%': { opacity: 0, transform: 'translateY(10px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
