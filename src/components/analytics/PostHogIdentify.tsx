import { useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { usePostHog } from '@posthog/react';

/**
 * Associates PostHog events with the signed-in Clerk user. Only mount when
 * `PostHogProvider` is active (see `main.tsx`).
 */
export function PostHogIdentify() {
  const { isLoaded, isSignedIn, user } = useUser();
  const posthog = usePostHog();

  useEffect(() => {
    if (!posthog || !isLoaded) return;

    if (!isSignedIn || !user?.id) {
      posthog.reset();
      return;
    }

    posthog.identify(user.id, {
      email: user.primaryEmailAddress?.emailAddress,
    });
  }, [
    posthog,
    isLoaded,
    isSignedIn,
    user?.id,
    user?.primaryEmailAddress?.emailAddress,
  ]);

  return null;
}
