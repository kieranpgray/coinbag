import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CheckCircle2,
  Circle,
  Wallet,
  Home,
  CreditCard,
  Receipt,
  TrendingUp,
  History,
  PieChart,
  ChevronDown,
  X,
  ArrowRight
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { ROUTES } from '@/lib/constants/routes';
import { Link } from 'react-router-dom';
import type { SetupChecklistItem } from '@/types/domain';
import { cn } from '@/lib/utils';
import { useUserPreferences, useUpdateUserPreferences } from '@/hooks/useUserPreferences';

interface SetupProgressProps {
  progress: number;
  checklist: SetupChecklistItem[];
  isLoading?: boolean;
}

const CHECKLIST_METADATA: Record<string, { icon: LucideIcon; benefit: string; link: string }> = {
  accounts: {
    icon: Wallet,
    benefit: 'Connect your bank accounts to see all your balances and cash flow in one place.',
    link: ROUTES.app.accounts,
  },
  assets: {
    icon: Home,
    benefit: 'Add your property, vehicles, and other valuable items to get an accurate net worth.',
    link: ROUTES.app.wealth,
  },
  liabilities: {
    icon: CreditCard,
    benefit: 'Track your loans and credit cards to understand your debt and plan for repayments.',
    link: ROUTES.wealth.createLiability,
  },
  expenses: {
    icon: Receipt,
    benefit: 'List your recurring bills and subscriptions to see where your money goes each month.',
    link: ROUTES.app.budget,
  },
  income: {
    icon: TrendingUp,
    benefit: 'Add your salary and other income sources to see your true monthly surplus.',
    link: ROUTES.app.budget,
  },
  transactions: {
    icon: History,
    benefit: 'Import your recent activity to categorize spending and find savings opportunities.',
    link: ROUTES.app.accounts,
  },
  investments: {
    icon: PieChart,
    benefit: 'Track your stock portfolio and crypto holdings to monitor your long-term growth.',
    link: ROUTES.wealth.createAsset('Other asset'),
  },
};

export function SetupProgress({ progress, checklist, isLoading }: SetupProgressProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const { data: preferences, isPreferencesReady } = useUserPreferences();
  const updatePreferences = useUpdateUserPreferences();

  if (isLoading || !isPreferencesReady) {
    return <Skeleton className="h-12 w-full rounded-lg" />;
  }

  if (preferences?.hideSetupChecklist) {
    return null;
  }

  const completedCount = checklist.filter(i => i.completed).length;

  const handleDismiss = async () => {
    if (!preferences) return;
    await updatePreferences.mutateAsync({
      ...preferences,
      hideSetupChecklist: true,
    });
  };

  const toggleOpen = () => {
    const nextIsOpen = !isOpen;
    setIsOpen(nextIsOpen);

    if (nextIsOpen && !expandedItem) {
      const firstIncomplete = checklist.find(item => !item.completed);
      if (firstIncomplete) {
        setExpandedItem(firstIncomplete.id);
      } else if (checklist.length > 0) {
        setExpandedItem(checklist[0]!.id);
      }
    }
  };

  const toggleItem = (id: string) => {
    setExpandedItem(expandedItem === id ? null : id);
  };

  return (
    <div className="rounded-lg border border-[var(--paper-3)] bg-[var(--paper-2)] overflow-hidden">
      {/* Summary strip */}
      <div className="flex items-center gap-3 px-3 py-2.5">
        <CheckCircle2
          className={cn(
            'h-4 w-4 flex-shrink-0',
            progress === 100 ? 'text-green-500' : 'text-primary'
          )}
        />
        <span className="text-body-sm font-medium text-foreground whitespace-nowrap">
          {completedCount} of {checklist.length} steps complete
        </span>
        <Progress value={progress} className="flex-1 h-1.5" />
        <button
          onClick={toggleOpen}
          className="flex items-center gap-1 text-caption text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap flex-shrink-0"
          aria-expanded={isOpen}
        >
          {isOpen ? 'Hide steps' : 'View steps'}
          <ChevronDown
            className={cn(
              'h-3 w-3 transition-transform duration-200',
              isOpen && 'rotate-180'
            )}
          />
        </button>
        <button
          onClick={handleDismiss}
          aria-label="Dismiss setup checklist"
          className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Expandable checklist */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="border-t border-[var(--paper-3)]">
              <div className="divide-y divide-[var(--paper-3)]">
                {checklist.map((item) => {
                  const metadata = CHECKLIST_METADATA[item.id] ?? {
                    icon: Circle,
                    benefit: item.description ?? 'Complete this step.',
                    link: '#',
                  };
                  const Icon = metadata.icon;
                  const isExpanded = expandedItem === item.id;

                  return (
                    <div key={item.id}>
                      <button
                        onClick={() => toggleItem(item.id)}
                        className={cn(
                          'w-full flex items-center gap-2.5 py-2.5 px-3 text-left transition-colors hover:bg-black/5 dark:hover:bg-white/5 focus:outline-none',
                          isExpanded && 'bg-black/5 dark:bg-white/5'
                        )}
                      >
                        <div
                          className={cn(
                            'flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center',
                            item.completed
                              ? 'bg-green-500 text-white'
                              : 'bg-[var(--paper-3)] text-muted-foreground'
                          )}
                        >
                          {item.completed ? (
                            <CheckCircle2 className="h-2.5 w-2.5" />
                          ) : (
                            <Icon className="h-2.5 w-2.5" />
                          )}
                        </div>

                        <span
                          className={cn(
                            'text-body-sm font-medium flex-1 truncate',
                            item.completed &&
                              'text-muted-foreground line-through font-normal'
                          )}
                        >
                          {item.label}
                        </span>

                        <ChevronDown
                          className={cn(
                            'h-3 w-3 text-muted-foreground transition-transform duration-200',
                            isExpanded && 'rotate-180'
                          )}
                        />
                      </button>

                      <AnimatePresence initial={false}>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.15, ease: 'easeInOut' }}
                            className="overflow-hidden"
                          >
                            <div className="px-4 pb-4 pt-2 bg-black/[0.02] dark:bg-white/[0.02]">
                              <p className="text-caption text-muted-foreground mb-3 leading-relaxed">
                                {metadata.benefit}
                              </p>
                              <Button
                                asChild
                                size="sm"
                                className="h-7.5 px-4 text-caption font-medium rounded-full group/btn w-auto"
                              >
                                <Link to={metadata.link}>
                                  {item.completed ? 'Update' : 'Get Started'}
                                  <ArrowRight className="ml-1.5 h-3 w-3 transition-transform group-hover/btn:translate-x-0.5" />
                                </Link>
                              </Button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>

              {progress === 100 && (
                <div className="px-3 py-2.5 bg-green-50 dark:bg-green-900/10 text-green-600 text-center text-caption font-medium border-t border-green-100 dark:border-green-900/20">
                  🎉 Setup complete!
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
