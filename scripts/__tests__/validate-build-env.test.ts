import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const scriptPath = resolve(process.cwd(), 'scripts/validate-build-env.js');

type RunResult = {
  status: number | null;
  output: string;
};

function runValidator(extraEnv: Record<string, string | undefined>, args: string[] = []): RunResult {
  const result = spawnSync('node', [scriptPath, ...args], {
    env: {
      ...process.env,
      ...extraEnv,
    },
    encoding: 'utf8',
  });

  return {
    status: result.status,
    output: `${result.stdout ?? ''}\n${result.stderr ?? ''}`,
  };
}

describe('validate-build-env', () => {
  it('fails for Vercel production when VITE_DATA_SOURCE is missing', () => {
    const result = runValidator({
      VERCEL: '1',
      VERCEL_ENV: 'production',
      VITE_DATA_SOURCE: undefined,
      VITE_SUPABASE_URL: 'https://test.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'sb_publishable_test',
      VITE_CLERK_PUBLISHABLE_KEY: 'pk_live_test',
    });

    expect(result.status).toBe(1);
    expect(result.output).toContain('VITE_DATA_SOURCE must be "supabase" in production');
    expect(result.output).toContain('VITE_DATA_SOURCE');
  });

  it('fails for Vercel production when Clerk key is test key', () => {
    const result = runValidator({
      VERCEL: '1',
      VERCEL_ENV: 'production',
      VITE_DATA_SOURCE: 'supabase',
      VITE_SUPABASE_URL: 'https://test.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'sb_publishable_test',
      VITE_CLERK_PUBLISHABLE_KEY: 'pk_test_example',
    });

    expect(result.status).toBe(1);
    expect(result.output).toContain('Test Clerk key detected in Vercel Production');
  });

  it('passes for Vercel production when required vars are valid', () => {
    const result = runValidator({
      VERCEL: '1',
      VERCEL_ENV: 'production',
      VITE_DATA_SOURCE: 'supabase',
      VITE_SUPABASE_URL: 'https://test.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'sb_publishable_test',
      VITE_CLERK_PUBLISHABLE_KEY: 'pk_live_example',
    });

    expect(result.status).toBe(0);
    expect(result.output).toContain('Production environment contract validated');
  });

  it('does not enforce production Clerk key in Vercel preview', () => {
    const result = runValidator({
      VERCEL: '1',
      VERCEL_ENV: 'preview',
      VITE_DATA_SOURCE: 'supabase',
      VITE_SUPABASE_URL: 'https://test.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'sb_publishable_test',
      VITE_CLERK_PUBLISHABLE_KEY: 'pk_test_preview',
    });

    expect(result.status).toBe(0);
    expect(result.output).toContain('strictProductionGate=false');
  });

  it('report-only mode does not block on failures', () => {
    const result = runValidator(
      {
        VERCEL: '1',
        VERCEL_ENV: 'production',
        VITE_DATA_SOURCE: undefined,
        VITE_SUPABASE_URL: undefined,
        VITE_SUPABASE_ANON_KEY: undefined,
        VITE_CLERK_PUBLISHABLE_KEY: undefined,
      },
      ['--report-only']
    );

    expect(result.status).toBe(0);
    expect(result.output).toContain('Report-only mode enabled');
    expect(result.output).toContain('Missing required Vercel Production environment variables');
  });
});
