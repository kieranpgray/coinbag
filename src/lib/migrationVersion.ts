/**
 * Migration Version Detection
 * 
 * Extracts the latest migration version from migration files.
 * Falls back to "unknown" if migrations cannot be determined.
 */

/**
 * Get the latest migration version from migration filenames
 * Migration files are named: YYYYMMDDHHMMSS_description.sql
 * 
 * @returns Latest migration timestamp as string (YYYYMMDDHHMMSS) or "unknown"
 */
export function getLatestMigrationVersion(): string {
  try {
    // In a real implementation, we would read from the filesystem or import a manifest
    // For now, we'll use a static list based on known migrations
    // In production, this could query Supabase's schema_migrations table
    
    const migrations = [
      '20251227120112',
      '20251227120113',
      '20251227120114',
      '20251227130000',
      '20251228110046',
      '20251228120000',
      '20251228130000',
      '20251228140000',
      '20251228150000',
      '20251228160000',
      '20251228170000',
      '20251228180000',
    ];

    if (migrations.length === 0) {
      return 'unknown';
    }

    // Sort and get latest
    const sorted = migrations.sort((a, b) => b.localeCompare(a));
    const latest = sorted[0];
    return latest || 'unknown';
  } catch (error) {
    console.warn('Failed to determine migration version:', error);
    return 'unknown';
  }
}

/**
 * Format migration version for display
 * @param version - Migration version string (YYYYMMDDHHMMSS)
 * @returns Formatted string (YYYY-MM-DD HH:MM:SS) or original if invalid
 */
export function formatMigrationVersion(version: string): string {
  if (version === 'unknown' || version.length !== 14) {
    return version;
  }

  try {
    const year = version.substring(0, 4);
    const month = version.substring(4, 6);
    const day = version.substring(6, 8);
    const hour = version.substring(8, 10);
    const minute = version.substring(10, 12);
    const second = version.substring(12, 14);
    
    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
  } catch {
    return version;
  }
}

/**
 * Extract Supabase project ID from URL
 * @param url - Supabase URL (e.g., https://abc123.supabase.co)
 * @returns Project ID or "unknown"
 */
export function extractSupabaseProjectId(url: string | undefined): string {
  if (!url) {
    return 'unknown';
  }

  try {
    // Format: https://<project-id>.supabase.co
    const match = url.match(/https:\/\/([^.]+)\.supabase\.co/);
    if (match && match[1]) {
      return match[1];
    }
    return 'unknown';
  } catch {
    return 'unknown';
  }
}

