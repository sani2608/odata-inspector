import type { Config } from 'tailwindcss';
import tailwindcssAnimate from 'tailwindcss-animate';

/**
 * OData Inspector - Modern Tailwind Configuration
 *
 * Uses CSS variables for theming (dark/light mode).
 * Color system inspired by shadcn/ui.
 */
export default {
    darkMode: ['class', '[data-theme="dark"]'],
    content: ['./entrypoints/**/*.{js,ts,jsx,tsx,html}', './src/**/*.{js,ts,jsx,tsx}'],
    theme: {
        extend: {
            colors: {
                // shadcn/ui semantic colors
                border: 'hsl(var(--border))',
                input: 'hsl(var(--input))',
                ring: 'hsl(var(--ring))',
                background: 'hsl(var(--background))',
                foreground: 'hsl(var(--foreground))',
                primary: {
                    DEFAULT: 'hsl(var(--primary))',
                    foreground: 'hsl(var(--primary-foreground))'
                },
                secondary: {
                    DEFAULT: 'hsl(var(--secondary))',
                    foreground: 'hsl(var(--secondary-foreground))'
                },
                destructive: {
                    DEFAULT: 'hsl(var(--destructive))',
                    foreground: 'hsl(var(--destructive-foreground))'
                },
                muted: {
                    DEFAULT: 'hsl(var(--muted))',
                    foreground: 'hsl(var(--muted-foreground))'
                },
                accent: {
                    DEFAULT: 'hsl(var(--accent))',
                    foreground: 'hsl(var(--accent-foreground))',
                    blue: 'var(--accent-blue)',
                    green: 'var(--accent-green)',
                    yellow: 'var(--accent-yellow)',
                    orange: 'var(--accent-orange)',
                    red: 'var(--accent-red)',
                    purple: 'var(--accent-purple)',
                    pink: 'var(--accent-pink)',
                    cyan: 'var(--accent-cyan)'
                },
                popover: {
                    DEFAULT: 'hsl(var(--popover))',
                    foreground: 'hsl(var(--popover-foreground))'
                },
                card: {
                    DEFAULT: 'hsl(var(--card))',
                    foreground: 'hsl(var(--card-foreground))'
                },
                // Custom backgrounds
                'background-primary': 'var(--bg-primary)',
                'background-secondary': 'var(--bg-secondary)',
                'background-tertiary': 'var(--bg-tertiary)',
                'background-hover': 'var(--bg-hover)',
                'background-active': 'var(--bg-active)',
                'background-elevated': 'var(--bg-elevated)',
                // Custom borders
                'border-default': 'var(--border-default)',
                'border-muted': 'var(--border-muted)',
                'border-subtle': 'var(--border-subtle)',
                'border-focus': 'var(--border-focus)',
                // Custom text
                'foreground-primary': 'var(--text-primary)',
                'foreground-secondary': 'var(--text-secondary)',
                'foreground-muted': 'var(--text-muted)',
                'foreground-link': 'var(--text-link)',
                // JSON syntax
                json: {
                    string: 'var(--json-string)',
                    number: 'var(--json-number)',
                    boolean: 'var(--json-boolean)',
                    null: 'var(--json-null)',
                    key: 'var(--json-key)'
                },
                // HTTP method colors
                method: {
                    get: 'hsl(217 91% 60%)',
                    post: 'hsl(142 71% 45%)',
                    put: 'hsl(35 92% 50%)',
                    patch: 'hsl(190 95% 50%)',
                    delete: 'hsl(0 84% 60%)',
                    head: 'hsl(270 95% 75%)'
                },
                // Status colors
                status: {
                    success: 'hsl(142 71% 45%)',
                    redirect: 'hsl(48 96% 53%)',
                    'client-error': 'hsl(0 84% 60%)',
                    'server-error': 'hsl(0 84% 60%)'
                }
            },
            fontFamily: {
                sans: [
                    '-apple-system',
                    'BlinkMacSystemFont',
                    'Segoe UI',
                    'Roboto',
                    'Helvetica Neue',
                    'Arial',
                    'sans-serif'
                ],
                mono: ['ui-monospace', 'SFMono-Regular', 'SF Mono', 'Menlo', 'Consolas', 'Liberation Mono', 'monospace']
            },
            borderRadius: {
                lg: 'var(--radius)',
                md: 'calc(var(--radius) - 2px)',
                sm: 'calc(var(--radius) - 4px)'
            },
            boxShadow: {
                xs: 'var(--shadow-xs)',
                sm: 'var(--shadow-sm)',
                DEFAULT: 'var(--shadow-md)',
                md: 'var(--shadow-md)',
                lg: 'var(--shadow-lg)',
                xl: 'var(--shadow-xl)',
                glow: 'var(--shadow-glow)',
                inner: 'var(--shadow-inner)'
            },
            keyframes: {
                'accordion-down': {
                    from: { height: '0' },
                    to: { height: 'var(--radix-accordion-content-height)' }
                },
                'accordion-up': {
                    from: { height: 'var(--radix-accordion-content-height)' },
                    to: { height: '0' }
                },
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' }
                },
                slideUp: {
                    '0%': { transform: 'translateY(4px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' }
                },
                scaleIn: {
                    '0%': { transform: 'scale(0.96)', opacity: '0' },
                    '100%': { transform: 'scale(1)', opacity: '1' }
                }
            },
            animation: {
                'accordion-down': 'accordion-down 0.2s ease-out',
                'accordion-up': 'accordion-up 0.2s ease-out',
                'fade-in': 'fadeIn 0.2s ease-out',
                'slide-up': 'slideUp 0.2s ease-out',
                'scale-in': 'scaleIn 0.15s ease-out',
                'spin-slow': 'spin 2s linear infinite'
            }
        }
    },
    plugins: [tailwindcssAnimate]
} satisfies Config;
