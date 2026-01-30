import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface ViewModeToggleProps {
  viewMode: 'list' | 'cards';
  onViewModeChange: (mode: 'list' | 'cards') => void;
  className?: string;
  id?: string;
}

/**
 * Shared component for toggling between list and card views
 * Provides consistent UI across all portfolio pages
 */
export function ViewModeToggle({
  viewMode,
  onViewModeChange,
  className = '',
  id = 'view-mode'
}: ViewModeToggleProps) {
  const handleChange = (checked: boolean) => {
    const newMode = checked ? 'cards' : 'list';
    onViewModeChange(newMode);
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <Label htmlFor={id} className="text-sm text-muted-foreground">
        List view
      </Label>
      <Switch
        id={id}
        checked={viewMode === 'cards'}
        onCheckedChange={handleChange}
        aria-label={`Currently showing ${viewMode} view. Toggle to switch between list and card view.`}
      />
      <Label htmlFor={id} className="text-sm text-muted-foreground">
        Card view
      </Label>
    </div>
  );
}
