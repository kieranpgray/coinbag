/**
 * Debug Page
 * 
 * Admin-only page accessible via /debug route.
 * Renders the DebugPanel component.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { DebugPanel } from '@/components/shared/DebugPanel';
import { isAdmin } from '@/lib/adminCheck';

export function DebugPage() {
  const { user, isLoaded } = useUser();
  const navigate = useNavigate();
  const [showPanel, setShowPanel] = useState(false);

  useEffect(() => {
    if (isLoaded) {
      if (!user || !isAdmin(user)) {
        // Redirect non-admin users
        navigate('/', { replace: true });
      } else {
        // Show panel for admin users
        setShowPanel(true);
      }
    }
  }, [user, isLoaded, navigate]);

  const handleClose = () => {
    setShowPanel(false);
    navigate('/', { replace: true });
  };

  if (!isLoaded || !user || !isAdmin(user)) {
    return null;
  }

  return <DebugPanel open={showPanel} onOpenChange={handleClose} />;
}





