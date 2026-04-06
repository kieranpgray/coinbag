import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';

interface PrivacyModeToggleProps {
  className?: string;
}

export function PrivacyModeToggle({ className }: PrivacyModeToggleProps) {
  const { privacyMode, togglePrivacyMode } = useTheme();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={togglePrivacyMode}
            aria-label={privacyMode ? 'Disable privacy mode' : 'Enable privacy mode'}
            aria-pressed={privacyMode}
            className={cn(
              'gap-1.5 text-sm font-medium transition-colors',
              privacyMode
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground',
              className
            )}
          >
            {privacyMode ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
            <span>{privacyMode ? 'Privacy on' : 'Privacy mode'}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Hides all dollar values. Tap to reveal.</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
