import { dark } from '@clerk/themes';

const shellVariables = {
  colorPrimary: 'hsl(var(--primary))',
  colorBackground: 'hsl(var(--background))',
  colorInputBackground: 'hsl(var(--background))',
  colorInputText: 'hsl(var(--foreground))',
  colorText: 'hsl(var(--foreground))',
  borderRadius: '1.25rem',
} as const;

const authCardElements = {
  formButtonPrimary: 'bg-primary hover:bg-primary/90 text-primary-foreground',
  card: 'shadow-[0_32px_80px_rgba(0,0,0,0.18)] border border-[var(--paper-3)] rounded-[20px] !p-10 bg-card w-full',
  headerTitle: 'hidden',
  headerSubtitle: 'hidden',
  socialButtonsBlockButton:
    'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
  dividerLine: 'bg-border',
  dividerText: 'text-muted-foreground',
  formFieldLabel: 'text-body font-medium text-foreground',
  formFieldInput: 'border-input bg-background',
  footerActionLink: 'text-primary hover:text-primary/90',
} as const;

const userProfileElements = {
  card: 'shadow-[0_32px_80px_rgba(0,0,0,0.18)] border border-[var(--paper-3)] rounded-[20px] bg-card',
  headerTitle: 'hidden',
  headerSubtitle: 'hidden',
  formButtonPrimary: 'bg-primary hover:bg-primary/90 text-primary-foreground',
  formFieldLabel: 'text-sm font-medium text-foreground',
  formFieldInput: 'border-input bg-background',
  footerActionLink: 'text-primary hover:text-primary/90',
} as const;

/**
 * Clerk `appearance` for Sign-in / Sign-up shells: prebuilt light (`clerk`) or `dark` theme
 * plus app CSS variables and Tailwind element classes. Keeps Clerk surfaces aligned with
 * `ThemeContext` (`html.dark` + tokens in index.css).
 */
export function getClerkShellAppearance(
  darkMode: boolean,
  variant: 'authCard' | 'userProfile' = 'authCard',
) {
  return {
    theme: darkMode ? dark : ('clerk' as const),
    variables: { ...shellVariables },
    elements: variant === 'authCard' ? { ...authCardElements } : { ...userProfileElements },
  };
}
