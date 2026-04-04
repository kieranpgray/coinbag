import { useEffect } from 'react';
import { MarketingFooter } from '@/components/landing/v2/MarketingFooter';
import { MarketingNav } from '@/components/landing/v2/MarketingNav';
import { PricingSection } from '@/components/landing/v2/PricingSection';
import '@/components/landing/v2/landing-v2.css';

const PAGE_TITLE = 'Pricing — Supafolio';
const PAGE_DESCRIPTION =
  'Start free and upgrade when you are ready. Compare Free, Pro, and Enterprise plans for Supafolio — net worth, Allocate, and brokerage sync.';

export function PricingPage() {
  useEffect(() => {
    document.title = PAGE_TITLE;
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', PAGE_DESCRIPTION);
  }, []);

  return (
    <div className="landing-v2">
      <MarketingNav />

      <main>
        <PricingSection />
      </main>

      <MarketingFooter />
    </div>
  );
}
