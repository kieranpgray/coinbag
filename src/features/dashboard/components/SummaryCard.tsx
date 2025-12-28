import { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatPercentage } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { PrivacyWrapper } from '@/components/shared/PrivacyWrapper';
import { logger, createCorrelationId, setCorrelationId } from '@/lib/logger';
import { useLocation, useNavigate } from 'react-router-dom';

interface SummaryCardProps {
  title: string;
  value: number;
  change1D: number;
  change1W: number;
  isLoading?: boolean;
  isEmpty?: boolean;
  emptyText?: string;
  emptyCtaLabel?: string;
  emptyCtaHref?: string;
}

export const SummaryCard = memo(function SummaryCard({ 
  title, 
  value, 
  change1D, 
  change1W, 
  isLoading, 
  isEmpty,
  emptyText,
  emptyCtaLabel,
  emptyCtaHref
}: SummaryCardProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const handleClick = () => {
    // Create correlation ID for dashboard CTA clicks
    const correlationId = createCorrelationId();
    setCorrelationId(correlationId);
    
    logger.info(
      'NAV:DASHBOARD_CTA_CLICK',
      'Dashboard CTA button clicked',
      {
        currentRoute: location.pathname,
        targetRoute: emptyCtaHref,
        title,
        isEmpty,
        ctaLabel: emptyCtaLabel,
      },
      correlationId
    );
    
    // Navigate using React Router
    if (emptyCtaHref) {
      logger.debug(
        'NAV:DASHBOARD_CTA_NAVIGATE',
        'Navigating to target route',
        {
          targetRoute: emptyCtaHref,
          title,
        },
        correlationId
      );
      navigate(emptyCtaHref);
    }
  };
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-40 mb-2" />
          <Skeleton className="h-4 w-20" />
        </CardContent>
      </Card>
    );
  }

  if (isEmpty && emptyText && emptyCtaLabel && emptyCtaHref) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">{emptyText}</p>
          <Button size="sm" onClick={handleClick}>
            {emptyCtaLabel}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold mb-2">
          <PrivacyWrapper value={value} />
        </div>
        <div className="flex gap-4 text-xs">
          <div className={change1D >= 0 ? 'text-success' : 'text-error'}>
            1D: {formatPercentage(change1D)}
          </div>
          <div className={change1W >= 0 ? 'text-success' : 'text-error'}>
            1W: {formatPercentage(change1W)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

