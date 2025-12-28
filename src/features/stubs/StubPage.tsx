import { useLocation } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function StubPage() {
  const location = useLocation();
  const pageName = location.pathname
    .split('/')
    .pop()
    ?.split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ') || 'Page';

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{pageName}</h1>
      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
          <CardDescription>This page is under development.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            The {pageName.toLowerCase()} page will be available in a future update.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

