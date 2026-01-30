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
        /* Body text - baseline matches nav (text-sm = 14px) */
        'body': ['var(--font-size-body)', { lineHeight: 'var(--line-height-body)', fontWeight: 'var(--font-weight-normal)' }],
        'body-lg': ['var(--font-size-body-lg)', { lineHeight: 'var(--line-height-body-lg)', fontWeight: 'var(--font-weight-medium)' }],
        'body-sm': ['var(--font-size-body-sm)', { lineHeight: 'var(--line-height-body-sm)', fontWeight: 'var(--font-weight-normal)' }],
        /* Headings */
        'h1': ['var(--font-size-h1)', { lineHeight: 'var(--line-height-h1)', fontWeight: 'var(--font-weight-semibold)' }],
        'h1-sm': ['var(--font-size-h1-sm)', { lineHeight: 'var(--line-height-h1-sm)', fontWeight: 'var(--font-weight-semibold)' }],
        'h1-md': ['var(--font-size-h1-md)', { lineHeight: 'var(--line-height-h1-md)', fontWeight: 'var(--font-weight-semibold)' }],
        'h1-lg': ['var(--font-size-h1-lg)', { lineHeight: 'var(--line-height-h1-lg)', fontWeight: 'var(--font-weight-semibold)' }],
        'h2': ['var(--font-size-h2)', { lineHeight: 'var(--line-height-h2)', fontWeight: 'var(--font-weight-semibold)' }],
        'h2-sm': ['var(--font-size-h2-sm)', { lineHeight: 'var(--line-height-h2-sm)', fontWeight: 'var(--font-weight-semibold)' }],
        'h2-md': ['var(--font-size-h2-md)', { lineHeight: 'var(--line-height-h2-md)', fontWeight: 'var(--font-weight-semibold)' }],
        'h2-lg': ['var(--font-size-h2-lg)', { lineHeight: 'var(--line-height-h2-lg)', fontWeight: 'var(--font-weight-semibold)' }],
        'h3': ['var(--font-size-h3)', { lineHeight: 'var(--line-height-h3)', fontWeight: 'var(--font-weight-semibold)' }],
        /* Balance values - reduced from oversized 37.44px to 24px */
        'balance': ['var(--font-size-balance)', { lineHeight: 'var(--line-height-balance)', fontWeight: 'var(--font-weight-bold)' }],
        'balance-sm': ['var(--font-size-balance-sm)', { lineHeight: 'var(--line-height-balance-sm)', fontWeight: 'var(--font-weight-bold)' }],
        'balance-md': ['var(--font-size-balance-md)', { lineHeight: 'var(--line-height-balance-md)', fontWeight: 'var(--font-weight-bold)' }],
        'balance-lg': ['var(--font-size-balance-lg)', { lineHeight: 'var(--line-height-balance-lg)', fontWeight: 'var(--font-weight-bold)' }],
        /* Data-lg alias for balance (backward compatibility) - reduced from 37.44px */
        'data-lg': ['var(--font-size-data-lg)', { lineHeight: 'var(--line-height-data-lg)', fontWeight: 'var(--font-weight-bold)' }],
        'data-lg-sm': ['var(--font-size-data-lg-sm)', { lineHeight: 'var(--line-height-data-lg-sm)', fontWeight: 'var(--font-weight-bold)' }],
        'data-lg-md': ['var(--font-size-data-lg-md)', { lineHeight: 'var(--line-height-data-lg-md)', fontWeight: 'var(--font-weight-bold)' }],
        'data-lg-lg': ['var(--font-size-data-lg-lg)', { lineHeight: 'var(--line-height-data-lg-lg)', fontWeight: 'var(--font-weight-bold)' }],
        /* Caption */
        'caption': ['var(--font-size-caption)', { lineHeight: 'var(--line-height-caption)', fontWeight: 'var(--font-weight-normal)' }],
        /* Base - matches body (14px) */
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

