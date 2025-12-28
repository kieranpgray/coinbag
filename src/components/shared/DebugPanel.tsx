/**
 * Debug Panel
 * 
 * Admin-only debug panel showing environment details, API URLs, DB info,
 * migration version, and current user ID.
 * Accessible via Konami code or /debug route.
 */

import { useEffect, useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { isAdmin } from '@/lib/adminCheck';
import {
  getLatestMigrationVersion,
  formatMigrationVersion,
  extractSupabaseProjectId,
} from '@/lib/migrationVersion';
import { useAuth } from '@clerk/clerk-react';

interface DebugPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DebugPanel({ open, onOpenChange }: DebugPanelProps) {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is admin
  const userIsAdmin = isAdmin(user);

  // Load user ID from Clerk user object
  useEffect(() => {
    if (open && userIsAdmin) {
      setIsLoading(true);
      // Get user ID from Clerk user object
      if (user?.id) {
        setUserId(user.id);
        setIsLoading(false);
      } else {
        setUserId(null);
        setIsLoading(false);
      }
    }
  }, [open, userIsAdmin, user]);

  // Close if user is not admin
  useEffect(() => {
    if (open && !userIsAdmin) {
      onOpenChange(false);
    }
  }, [open, userIsAdmin, onOpenChange]);

  // Don't render if not admin
  if (!userIsAdmin) {
    return null;
  }

  const environment = import.meta.env.MODE || 'unknown';
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const projectId = extractSupabaseProjectId(supabaseUrl);
  const migrationVersion = getLatestMigrationVersion();
  const formattedMigration = formatMigrationVersion(migrationVersion);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Debug Information</DialogTitle>
          <DialogDescription>
            Environment and system information for debugging
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-muted-foreground">Environment</label>
              <p className="text-sm font-mono mt-1">{environment}</p>
            </div>

            <div>
              <label className="text-sm font-semibold text-muted-foreground">Data Source</label>
              <p className="text-sm font-mono mt-1">
                {import.meta.env.VITE_DATA_SOURCE || 'mock'}
              </p>
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-muted-foreground">API Base URL</label>
            <p className="text-sm font-mono mt-1 break-all">
              {supabaseUrl || 'Not configured'}
            </p>
          </div>

          <div>
            <label className="text-sm font-semibold text-muted-foreground">DB Project ID</label>
            <p className="text-sm font-mono mt-1">{projectId}</p>
          </div>

          <div>
            <label className="text-sm font-semibold text-muted-foreground">Schema/Migration Version</label>
            <p className="text-sm font-mono mt-1">{formattedMigration}</p>
          </div>

          <div>
            <label className="text-sm font-semibold text-muted-foreground">Current User ID</label>
            {isLoading ? (
              <p className="text-sm text-muted-foreground mt-1">Loading...</p>
            ) : (
              <p className="text-sm font-mono mt-1 break-all">{userId || 'Not available'}</p>
            )}
          </div>

          <div className="pt-4 border-t">
            <label className="text-sm font-semibold text-muted-foreground">Clerk User Info</label>
            <div className="mt-2 space-y-1 text-sm">
              <p>
                <span className="text-muted-foreground">ID:</span>{' '}
                <span className="font-mono">{user?.id || 'N/A'}</span>
              </p>
              <p>
                <span className="text-muted-foreground">Email:</span>{' '}
                {user?.primaryEmailAddress?.emailAddress || 'N/A'}
              </p>
              <p>
                <span className="text-muted-foreground">Admin:</span>{' '}
                {userIsAdmin ? 'Yes' : 'No'}
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

