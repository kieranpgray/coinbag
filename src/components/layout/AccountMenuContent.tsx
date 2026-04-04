import { useNavigate } from 'react-router-dom';
import { useUser, useClerk } from '@clerk/clerk-react';
import { useTheme } from '@/contexts/ThemeContext';
import {
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import {
  Building2,
  ChevronRight,
  Eye,
  EyeOff,
  Home,
  LogOut,
  Moon,
  Settings,
  Sun,
  User,
} from 'lucide-react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useWorkspaceCollaborationEnabled } from '@/hooks/useWorkspaceCollaborationEnabled';
import { ROUTES } from '@/lib/constants/routes';
import { cn } from '@/lib/utils';

interface AccountMenuContentProps {
  onClose: () => void;
}

export function AccountMenuContent({ onClose }: AccountMenuContentProps) {
  const { user } = useUser();
  const { signOut } = useClerk();
  const navigate = useNavigate();
  const { darkMode, toggleDarkMode, privacyMode, togglePrivacyMode } = useTheme();
  const workspaceCollaborationEnabled = useWorkspaceCollaborationEnabled();
  const { activeWorkspace, memberships, setActiveWorkspaceId, isLoading, error } = useWorkspace();

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

  const navigate_ = (path: string) => {
    navigate(path);
    onClose();
  };

  const handleSignOut = () => {
    onClose();
    signOut({ redirectUrl: ROUTES.root });
  };

  return (
    <>
      {/* User identity label */}
      <DropdownMenuLabel className="font-normal">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium leading-none">{accountLabel}</span>
          {user?.primaryEmailAddress?.emailAddress && (
            <span className="text-xs text-muted-foreground leading-none mt-1">
              {user.primaryEmailAddress.emailAddress}
            </span>
          )}
        </div>
      </DropdownMenuLabel>
      <DropdownMenuSeparator />

      {/* Navigation */}
      <DropdownMenuGroup>
        <DropdownMenuItem onClick={() => navigate_(ROUTES.app.dashboard)} className="cursor-pointer">
          <Home className="h-4 w-4 shrink-0" />
          Home
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate_(`${ROUTES.app.settings}?tab=profile`)} className="cursor-pointer">
          <User className="h-4 w-4 shrink-0" />
          Profile
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate_(ROUTES.app.settings)} className="cursor-pointer">
          <Settings className="h-4 w-4 shrink-0" />
          Settings
        </DropdownMenuItem>
      </DropdownMenuGroup>

      {/* Workspace switcher */}
      {showWorkspaceSubmenu && (
        <>
          <DropdownMenuSeparator />
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="cursor-pointer gap-2">
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
                    onClose();
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

      <DropdownMenuSeparator />

      {/* Utilities */}
      <DropdownMenuGroup>
        <DropdownMenuItem onClick={() => { togglePrivacyMode(); onClose(); }} className="cursor-pointer">
          {privacyMode ? (
            <EyeOff className="h-4 w-4 shrink-0" />
          ) : (
            <Eye className="h-4 w-4 shrink-0" />
          )}
          {privacyMode ? 'Disable privacy mode' : 'Enable privacy mode'}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => { toggleDarkMode(); onClose(); }} className="cursor-pointer">
          {darkMode ? (
            <Sun className="h-4 w-4 shrink-0" />
          ) : (
            <Moon className="h-4 w-4 shrink-0" />
          )}
          {darkMode ? 'Light mode' : 'Dark mode'}
        </DropdownMenuItem>
      </DropdownMenuGroup>

      <DropdownMenuSeparator />

      {/* Sign out */}
      <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive focus:text-destructive">
        <LogOut className="h-4 w-4 shrink-0" />
        Sign out
      </DropdownMenuItem>
    </>
  );
}
