/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CLERK_PUBLISHABLE_KEY: string;
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_DATA_SOURCE: 'mock' | 'supabase';
  /** PostHog project API key (optional; omit to disable client analytics). */
  readonly VITE_PUBLIC_POSTHOG_TOKEN?: string;
  /** PostHog API host, e.g. https://us.i.posthog.com or https://eu.i.posthog.com */
  readonly VITE_PUBLIC_POSTHOG_HOST?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}