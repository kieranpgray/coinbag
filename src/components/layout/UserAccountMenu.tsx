import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, ChevronRight, User } from 'lucide-react';
import { UserAvatar } from '@/components/user/UserAvatar';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useWorkspaceCollaborationEnabled } from '@/hooks/useWorkspaceCollaborationEnabled';
import { ROUTES } from '@/lib/constants/routes';
import { cn } from '@/lib/utils';

export function UserAccountMenu() {
  const { user, isLoaded } = useUser();
  const navigate = useNavigate();
  const workspaceCollaborationEnabled = useWorkspaceCollaborationEnabled();
  const { activeWorkspace, memberships, setActiveWorkspaceId, isLoading, error } = useWorkspace();
  const [open, setOpen] = useState(false);

  const accountLabel =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
    user?.primaryEmailAddress?.emailAddress ||
    'Account';

  const showWorkspaceSubmenu =
    workspaceCollaborationEnabled &&
    !isLoading &&
    !error &&
    activeWorkspace &&
    memberships.length > 0;

  const handleProfile = () => {
    setOpen(false);
    navigate(`${ROUTES.app.settings}?tab=profile`);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className="h-auto w-auto rounded-full p-0 ml-1 hover:bg-transparent focus-visible:ring-2 focus-visible:ring-primary/30"
          aria-label="Account menu"
          disabled={!isLoaded}
        >
          <UserAvatar
            imageUrl={user?.imageUrl}
            label={accountLabel}
            alt=""
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={handleProfile} className="cursor-pointer">
          <User className="h-4 w-4 shrink-0" />
          Profile
        </DropdownMenuItem>
        {showWorkspaceSubmenu && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="cursor-pointer">
                <Building2 className="h-4 w-4 shrink-0" />
                <span className="truncate">My workspace</span>
                <ChevronRight className="ml-auto h-4 w-4 shrink-0" />
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-56">
                {memberships.map((ws) => (
                  <DropdownMenuItem
                    key={ws.id}
                    className={cn(
                      'flex cursor-pointer items-center justify-between gap-2',
                      ws.id === activeWorkspace.id && 'bg-accent'
                    )}
                    onClick={() => {
                      setActiveWorkspaceId(ws.id);
                      setOpen(false);
                    }}
                  >
                    <span className="truncate">{ws.name}</span>
                    <Badge variant="outline" className="shrink-0 text-caption">
                      {ws.role}
                    </Badge>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
