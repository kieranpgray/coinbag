/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CLERK_PUBLISHABLE_KEY: string;
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_DATA_SOURCE: 'mock' | 'supabase';
  /** When `"true"`, enables design system v2 tokens via `data-ds="v2"` on `<html>`. */
  readonly VITE_DS_V2?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}