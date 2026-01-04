/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      spacing: {
        '1': 'var(--spacing-1)',
        '2': 'var(--spacing-2)',
        '3': 'var(--spacing-3)',
        '4': 'var(--spacing-4)',
        '5': 'var(--spacing-5)',
        '6': 'var(--spacing-6)',
      },
      colors: {
        // Design system tokens
        primary: {
          DEFAULT: 'var(--color-primary)',
          foreground: '#FFFFFF',
        },
        bg: {
          DEFAULT: 'var(--color-bg-default)',
          alt: 'var(--color-bg-alt)',
          surface: 'var(--color-surface)',
        },
        text: {
          DEFAULT: 'var(--color-text-primary)',
          muted: 'var(--color-text-muted)',
        },
        border: {
          DEFAULT: 'var(--color-border-default)',
        },
        success: 'var(--color-success)',
        error: 'var(--color-error)',
        link: 'var(--color-link)',
        neutral: {
          light: 'var(--color-neutral-light)',
          mid: 'var(--color-neutral-mid)',
          dark: 'var(--color-neutral-dark)',
        },
        // Legacy mappings for backward compatibility
        'primary-blue': 'var(--color-primary-blue)',
        // Legacy HSL mappings for compatibility
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
      },
      boxShadow: {
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
      },
      fontFamily: {
        sans: ['"Inter"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', '"Helvetica Neue"', 'Arial', 'sans-serif'],
      },
      fontSize: {
        'h1': ['var(--font-size-h1)', { lineHeight: 'var(--line-height-h1)', fontWeight: 'var(--font-weight-semibold)' }],
        'h2': ['var(--font-size-h2)', { lineHeight: 'var(--line-height-h2)', fontWeight: 'var(--font-weight-semibold)' }],
        'body-lg': ['var(--font-size-body-lg)', { lineHeight: 'var(--line-height-body-lg)', fontWeight: 'var(--font-weight-medium)' }],
        'body-sm': ['var(--font-size-body-sm)', { lineHeight: 'var(--line-height-body-sm)', fontWeight: 'var(--font-weight-normal)' }],
        'data-lg': ['var(--font-size-data-lg)', { lineHeight: 'var(--line-height-data-lg)', fontWeight: 'var(--font-weight-bold)' }],
        'caption': ['var(--font-size-caption)', { lineHeight: 'var(--line-height-caption)', fontWeight: 'var(--font-weight-normal)' }],
        base: 'var(--font-size-base)',
      },
      letterSpacing: {
        heading: 'var(--letter-spacing-heading)',
      },
      container: {
        center: true,
        padding: {
          DEFAULT: '0.9rem',
          sm: '1.35rem',
          lg: '1.8rem',
        },
        screens: {
          '2xl': '80rem', // 1280px - matches max-w-7xl
        },
      },
    },
  },
  plugins: [],
};

