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
  ChevronUp,
  X,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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

const CHECKLIST_METADATA: Record<string, { icon: any; benefit: string; link: string }> = {
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
    link: ROUTES.wealth.createAsset('Investments'),
  },
};

export function SetupProgress({ progress, checklist, isLoading }: SetupProgressProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const { data: preferences } = useUserPreferences();
  const updatePreferences = useUpdateUserPreferences();

  // Hide component if user has dismissed it
  if (preferences?.hideSetupChecklist) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Skeleton className="h-14 w-14 rounded-full shadow-lg" />
      </div>
    );
  }

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
    
    // If opening, expand the first incomplete item
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
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20, x: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20, x: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-24 right-6 z-[100] w-[calc(100vw-3rem)] sm:w-72 max-h-[calc(100vh-10rem)] overflow-hidden flex flex-col shadow-2xl rounded-2xl border-none"
          >
            <div className="bg-white dark:bg-zinc-950 flex flex-col h-full overflow-hidden border border-zinc-200 dark:border-zinc-800 rounded-2xl">
              <div className="bg-primary p-3 shrink-0">
                <div className="flex justify-between items-center mb-1.5 px-0.5">
                  <span className="text-body-sm font-bold text-white tracking-wider uppercase">Setup Progress</span>
                  <span className="text-caption font-bold text-white/90">{checklist.filter(i => i.completed).length}/{checklist.length}</span>
                </div>
                <div className="h-1 w-full bg-white/20 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-white transition-all duration-500 ease-out" 
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto bg-white dark:bg-zinc-950">
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                  {checklist.map((item) => {
                    const metadata = CHECKLIST_METADATA[item.id] || { 
                      icon: Circle, 
                      benefit: item.description || 'Complete this step.', 
                      link: '#' 
                    };
                    const Icon = metadata.icon;
                    const isExpanded = expandedItem === item.id;

                    return (
                      <div key={item.id} className="bg-white dark:bg-zinc-950">
                        <button
                          onClick={() => toggleItem(item.id)}
                          className={cn(
                            "w-full flex items-center gap-2.5 py-2.5 px-3 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900 focus:outline-none",
                            isExpanded && "bg-zinc-50 dark:bg-zinc-900"
                          )}
                        >
                          <div className={cn(
                            "flex-shrink-0 w-4.5 h-4.5 rounded-full flex items-center justify-center",
                            item.completed ? "bg-green-500 text-white" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"
                          )}>
                            {item.completed ? (
                              <CheckCircle2 className="h-3 w-3" />
                            ) : (
                              <Icon className="h-2.5 w-2.5" />
                            )}
                          </div>
                          
                          <span className={cn(
                            "text-body-sm font-semibold flex-1 truncate",
                            item.completed && "text-zinc-400 line-through font-normal"
                          )}>
                            {item.label}
                          </span>

                          <ChevronUp className={cn(
                            "h-3 w-3 text-zinc-300 transition-transform duration-200",
                            !isExpanded && "rotate-180"
                          )} />
                        </button>

                        <AnimatePresence initial={false}>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.15, ease: "easeInOut" }}
                              className="bg-zinc-50 dark:bg-zinc-900/50"
                            >
                              <div className="px-4 pb-4 pt-2">
                                <p className="text-caption text-zinc-500 dark:text-zinc-400 mb-3 leading-relaxed">
                                  {metadata.benefit}
                                </p>
                                <Button 
                                  asChild 
                                  size="sm" 
                                  className="h-7.5 px-4 text-caption font-bold rounded-full group/btn w-auto"
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
              </div>
              
              {progress === 100 && (
                <div className="p-2 bg-green-50 dark:bg-green-900/10 text-green-600 text-center text-caption font-bold border-t border-green-100 dark:border-green-900/20">
                  🎉 Completed!
                </div>
              )}
              
              <div className="px-3 py-2 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  onClick={handleDismiss}
                  className="text-caption text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors w-full text-left"
                >
                  Don't show me this again
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="fixed bottom-6 right-6 z-[110]">
        <Button
          onClick={toggleOpen}
          className="h-14 w-14 rounded-full shadow-2xl p-0 bg-primary hover:bg-primary/90 flex items-center justify-center transition-all duration-200"
          aria-label={isOpen ? "Close setup progress" : "Open setup progress"}
        >
          {isOpen ? (
            <X className="h-6 w-6 text-white flex-shrink-0" strokeWidth={2.5} />
          ) : (
            <div className="relative flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-white flex-shrink-0" strokeWidth={2} />
              {progress < 100 && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-white shadow-sm" />
                </span>
              )}
            </div>
          )}
        </Button>
      </div>
    </>
  );
}
