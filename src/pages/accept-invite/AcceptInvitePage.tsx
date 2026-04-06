import { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth, RedirectToSignIn } from '@clerk/clerk-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { acceptWorkspaceInvite } from '@/lib/workspaceInvitesApi';

type Status = 'idle' | 'loading' | 'success' | 'error' | 'no-token';

function mapErrorMessage(raw: string): string {
  if (raw.includes('Invitation has expired')) {
    return 'This invite link has expired. Ask the workspace admin to send a new one.';
  }
  if (raw.includes('Invitation already accepted')) {
    return 'This invite has already been used.';
  }
  if (raw.includes('Already a member')) {
    return 'You are already a member of this workspace.';
  }
  if (raw.includes('Email must be verified and match the invitation')) {
    return 'This invite was sent to a different email address. Make sure you are signed in with the right account.';
  }
  return 'Something went wrong. Please try again or contact support.';
}

function isAlreadyMemberError(raw: string): boolean {
  return raw.includes('Already a member');
}

export function AcceptInvitePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isLoaded, isSignedIn, getToken } = useAuth();

  const token = searchParams.get('token');

  const [status, setStatus] = useState<Status>(token ? 'idle' : 'no-token');
  const [errorMessage, setErrorMessage] = useState('');
  const [rawError, setRawError] = useState('');
  const hasRun = useRef(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !token || hasRun.current) return;
    hasRun.current = true;

    setStatus('loading');
    acceptWorkspaceInvite(getToken, token)
      .then(() => setStatus('success'))
      .catch((err: Error) => {
        setRawError(err.message);
        setErrorMessage(mapErrorMessage(err.message));
        setStatus('error');
      });
  }, [isLoaded, isSignedIn, token, getToken]);

  // Clerk not yet loaded
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-muted-foreground border-t-foreground animate-spin" />
          <p className="text-body text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Not signed in — redirect to sign-in then come back
  if (isLoaded && !isSignedIn && token) {
    return (
      <RedirectToSignIn
        redirectUrl={`/accept-invite?token=${token}`}
      />
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        {status === 'no-token' && (
          <>
            <CardHeader>
              <CardTitle>Invalid invite link</CardTitle>
              <CardDescription>
                This link may be incomplete. Please check your email for the original invite.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={() => navigate('/')}>
                Go to home
              </Button>
            </CardContent>
          </>
        )}

        {(status === 'idle' || status === 'loading') && (
          <>
            <CardHeader>
              <CardTitle>Accepting your invitation</CardTitle>
              <CardDescription>Just a moment...</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="h-5 w-5 rounded-full border-2 border-muted-foreground border-t-foreground animate-spin" />
                <span className="text-body text-muted-foreground">Joining workspace...</span>
              </div>
            </CardContent>
          </>
        )}

        {status === 'success' && (
          <>
            <CardHeader>
              <CardTitle>You're in!</CardTitle>
              <CardDescription>
                You've successfully joined the workspace.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate('/app/dashboard')}>
                Go to overview
              </Button>
            </CardContent>
          </>
        )}

        {status === 'error' && (
          <>
            <CardHeader>
              <CardTitle>Unable to accept invite</CardTitle>
              <CardDescription>{errorMessage}</CardDescription>
            </CardHeader>
            <CardContent className="flex gap-2">
              {isAlreadyMemberError(rawError) && (
                <Button onClick={() => navigate('/app/dashboard')}>
                  Go to overview
                </Button>
              )}
              <Button variant="outline" onClick={() => navigate('/')}>
                Go to home
              </Button>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}
