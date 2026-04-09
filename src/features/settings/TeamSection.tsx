import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useUser as useClerkUser } from '@clerk/clerk-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import * as SelectPrimitive from '@radix-ui/react-select';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { UserAvatar } from '@/components/user/UserAvatar';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useTeamInvitations } from '@/hooks/useTeamInvitations';
import { useWorkspaceMemberProfiles } from '@/hooks/useWorkspaceMemberProfiles';
import { canAdmin } from '@/lib/permissionHelpers';
import type { WorkspaceMemberProfile, WorkspaceMembership, WorkspaceRole } from '@/contracts/workspaces';

const ROLE_OPTIONS: { value: WorkspaceRole; label: string; description: string }[] = [
  {
    value: 'admin',
    label: 'Admin',
    description: 'Full access. Can view, edit, and manage workspace members.',
  },
  {
    value: 'edit',
    label: 'Can edit',
    description: 'Can view and edit everything. Cannot manage members.',
  },
  {
    value: 'read',
    label: 'Can view',
    description: 'Can view everything. Cannot make any changes.',
  },
];

function roleAccessLabel(role: WorkspaceRole): string {
  return ROLE_OPTIONS.find((o) => o.value === role)?.label ?? role;
}

function AccessLevelSelectItem({
  value,
  label,
  description,
  disabled,
}: {
  value: WorkspaceRole;
  label: string;
  description: string;
  disabled?: boolean;
}) {
  return (
    <SelectPrimitive.Item
      value={value}
      disabled={disabled}
      textValue={label}
      className={cn(
        'relative flex w-full cursor-default select-none items-start rounded-sm py-2 pl-8 pr-2 text-body text-foreground outline-none',
        'hover:bg-muted focus:bg-primary/10 focus:text-foreground',
        'data-[highlighted]:bg-primary/10',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[disabled]:text-muted-foreground',
      )}
    >
      <span className="absolute left-2 top-2 flex h-3.5 w-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <Check className="h-4 w-4 text-primary" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <div className="flex min-w-0 flex-col gap-0.5 text-left">
        <SelectPrimitive.ItemText asChild>
          <span>{label}</span>
        </SelectPrimitive.ItemText>
        <span className="text-caption text-muted-foreground font-normal leading-snug">{description}</span>
      </div>
    </SelectPrimitive.Item>
  );
}

function InviteStatusBadge({
  acceptedAt,
  expiresAt,
}: {
  acceptedAt: string | null;
  expiresAt: string;
}) {
  if (acceptedAt) {
    return <Badge variant="secondary">Accepted</Badge>;
  }
  const isExpired = new Date(expiresAt) < new Date();
  if (isExpired) {
    return <Badge variant="destructive">Expired</Badge>;
  }
  return <Badge variant="outline">Invite sent · Pending</Badge>;
}

function displayNameForMember(
  member: WorkspaceMembership,
  currentUserId: string,
  profile: WorkspaceMemberProfile | undefined
): string {
  if (member.userId === currentUserId) return 'You';
  const fromClerk = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ').trim();
  if (fromClerk) return fromClerk;
  return member.userId;
}

function avatarLabelForMember(
  member: WorkspaceMembership,
  currentUserId: string,
  profile: WorkspaceMemberProfile | undefined,
  selfLabel: string
): string {
  if (member.userId === currentUserId) return selfLabel;
  const fromClerk = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ').trim();
  if (fromClerk) return fromClerk;
  return member.userId;
}

export function TeamSection() {
  const { user: clerkUser } = useClerkUser();
  const { activeWorkspace, currentRole, isLoading: workspaceLoading } = useWorkspace();
  const {
    members,
    isLoading: membersLoading,
    error: membersError,
    updateRole,
    removeMember,
  } = useTeamMembers();
  const { data: profilesResult, isLoading: profilesLoading } = useWorkspaceMemberProfiles();
  const {
    invitations,
    isLoading: invitationsLoading,
    error: invitationsError,
    createInvitation,
    revokeInvitation,
  } = useTeamInvitations();

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<WorkspaceRole>('edit');
  const [inviteError, setInviteError] = useState<string | null>(null);

  const isAdmin = currentRole ? canAdmin(currentRole) : false;
  const currentUserId = clerkUser?.id ?? '';

  const selfAvatarLabel =
    [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(' ') ||
    clerkUser?.primaryEmailAddress?.emailAddress ||
    'You';

  const profileByUserId = useMemo(() => {
    const m = new Map<string, WorkspaceMemberProfile>();
    for (const p of profilesResult?.profiles ?? []) {
      m.set(p.userId, p);
    }
    return m;
  }, [profilesResult?.profiles]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError(null);
    const email = inviteEmail.trim().toLowerCase();
    if (!email) {
      setInviteError('Please enter an email address');
      return;
    }
    try {
      await createInvitation.mutateAsync({ email, role: inviteRole });
      toast.success(`Invite sent to ${email}.`);
      setInviteEmail('');
      setInviteRole('edit');
    } catch (err) {
      toast.error("Couldn't send invite. Try again.");
      setInviteError(err instanceof Error ? err.message : 'Failed to send invite');
    }
  };

  const adminCount = members.filter((m) => m.role === 'admin').length;
  const isLastAdmin = (userId: string) =>
    members.find((m) => m.userId === userId)?.role === 'admin' && adminCount <= 1;

  if (workspaceLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!activeWorkspace) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-body text-muted-foreground">
            No workspace selected. Use the account menu (profile icon) in the top bar to choose a workspace.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            Manage who can see and edit your financial picture.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isAdmin && (
            <div className="rounded-lg border border-[var(--warning)] bg-[var(--warning-light)] p-4">
              <p className="text-body text-[var(--warning)]">
                You need admin permissions to manage team members. Contact an admin to change roles or invite new members.
              </p>
            </div>
          )}

          {membersError && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
              <p className="text-body text-destructive">{membersError.message}</p>
            </div>
          )}

          {membersLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : members.length === 0 ? (
            <div className="space-y-4 py-4 text-center">
              <p className="text-body-lg font-semibold text-foreground">One picture. Two people.</p>
              <p className="text-body text-muted-foreground max-w-lg mx-auto">
                Invite your partner or financial advisor to see the same Holdings, Allocate plan, and net worth — with
                the right level of access for each person.
              </p>
              {isAdmin && (
                <Button variant="default" asChild>
                  <a href="#workspace-invite" className="no-underline">
                    Invite a partner or advisor →
                  </a>
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {profilesLoading && (
                <p className="text-caption text-muted-foreground">Loading profile photos…</p>
              )}
              {members.map((member) => {
                const profile = profileByUserId.get(member.userId);
                const title = displayNameForMember(member, currentUserId, profile);
                const avatarLabel = avatarLabelForMember(
                  member,
                  currentUserId,
                  profile,
                  selfAvatarLabel
                );
                const imageUrl =
                  member.userId === currentUserId ? clerkUser?.imageUrl : profile?.imageUrl;

                return (
                  <div
                    key={member.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 rounded-lg border border-border bg-muted/30"
                  >
                    <div className="flex items-center gap-2">
                      <UserAvatar
                        imageUrl={imageUrl}
                        label={avatarLabel}
                        alt=""
                      />
                      <div>
                        <p className="text-body font-medium">{title}</p>
                        <Badge variant="secondary" className="text-caption">
                          {roleAccessLabel(member.role)}
                        </Badge>
                      </div>
                    </div>
                    {isAdmin && (
                      <div className="flex items-center gap-2">
                        <Select
                          value={member.role}
                          onValueChange={(v) =>
                            updateRole.mutate({
                              membershipId: member.id,
                              role: v as WorkspaceRole,
                            })
                          }
                          disabled={
                            member.userId === currentUserId ||
                            isLastAdmin(member.userId)
                          }
                        >
                          <SelectTrigger className="min-w-[7.5rem] w-auto h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLE_OPTIONS.map((opt) => (
                              <AccessLevelSelectItem
                                key={opt.value}
                                value={opt.value}
                                label={opt.label}
                                description={opt.description}
                                disabled={
                                  isLastAdmin(member.userId) && opt.value !== 'admin'
                                }
                              />
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeMember.mutate(member.id)}
                          disabled={
                            member.userId === currentUserId ||
                            isLastAdmin(member.userId)
                          }
                          aria-label="Remove access"
                        >
                          Remove access
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {isAdmin && (
        <Card id="workspace-invite">
          <CardHeader>
            <CardTitle>Pending Invitations</CardTitle>
            <CardDescription>
              Invite people to join this workspace by email
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1 space-y-2">
                <Label htmlFor="invite-email">Email address</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="their@email.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  disabled={createInvitation.isPending}
                />
              </div>
              <div className="w-full sm:w-28 space-y-2">
                <Label htmlFor="invite-role">Access level</Label>
                <Select
                  value={inviteRole}
                  onValueChange={(v) => setInviteRole(v as WorkspaceRole)}
                >
                  <SelectTrigger id="invite-role" className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((opt) => (
                      <AccessLevelSelectItem
                        key={opt.value}
                        value={opt.value}
                        label={opt.label}
                        description={opt.description}
                      />
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button
                  type="submit"
                  disabled={createInvitation.isPending || !inviteEmail.trim()}
                  aria-label="Invite a partner or advisor"
                >
                  {createInvitation.isPending ? 'Sending...' : 'Invite a partner or advisor →'}
                </Button>
              </div>
            </form>

            {inviteError && (
              <p className="text-body text-destructive">{inviteError}</p>
            )}

            {invitationsError && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                <p className="text-body text-destructive">
                  {invitationsError.message}
                </p>
              </div>
            )}

            {invitationsLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : invitations.length === 0 ? (
              <p className="text-body text-muted-foreground">
                No pending invitations.
              </p>
            ) : (
              <div className="space-y-2">
                {invitations
                  .filter((i) => !i.acceptedAt)
                  .map((inv) => (
                    <div
                      key={inv.id}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 rounded-lg border border-border"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-body">{inv.email}</span>
                        <InviteStatusBadge
                          acceptedAt={inv.acceptedAt}
                          expiresAt={inv.expiresAt}
                        />
                        <Badge variant="outline" className="text-caption">
                          {roleAccessLabel(inv.role)}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => revokeInvitation.mutate(inv.id)}
                        disabled={revokeInvitation.isPending}
                      >
                        Revoke
                      </Button>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
