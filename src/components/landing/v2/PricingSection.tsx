import { Link } from 'react-router-dom';

const CheckIcon = () => (
  <svg className="pcheck" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M3 8l3.5 3.5L13 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export function PricingSection() {
  return (
    <section className="pricing" aria-labelledby="pricing-heading">
      <div className="section-header">
        <div className="section-eyebrow">Pricing</div>
        <h2 id="pricing-heading">Start free. Upgrade when you&apos;re ready.</h2>
        <p>No credit card required. Full access for your first 30 days, no matter which plan you start on.</p>
      </div>
      <div className="pricing-grid">
        <div className="pricing-card">
          <div className="pricing-tier">Free</div>
          <div className="pricing-price">$0</div>
          <div className="pricing-psub">forever</div>
          <div className="pricing-desc">Enough to see your net worth and run a basic Allocate plan every pay cycle.</div>
          <ul className="pricing-feats">
            <li><CheckIcon />1 account, 1 income source</li>
            <li><CheckIcon />Up to 5 recurring expenses</li>
            <li><CheckIcon />Net worth overview</li>
            <li><CheckIcon />Basic Allocate plan</li>
          </ul>
          <Link to="/sign-up" className="btn-plan btn-ghost">Get started free</Link>
        </div>
        <div className="pricing-card featured">
          <div className="pricing-badge">Most popular</div>
          <div className="pricing-tier">Pro</div>
          <div className="pricing-price">$12</div>
          <div className="pricing-psub">per month</div>
          <div className="pricing-desc">For people managing a growing, complex financial life across multiple accounts and income sources.</div>
          <ul className="pricing-feats">
            <li><CheckIcon />Unlimited accounts &amp; income sources</li>
            <li><CheckIcon />Unlimited recurring expenses</li>
            <li><CheckIcon />Bank statement import</li>
            <li><CheckIcon />AI-powered investment insights</li>
            <li><CheckIcon />Shared Access (partner or advisor)</li>
            <li><CheckIcon />Automatic brokerage sync</li>
          </ul>
          <Link to="/sign-up" className="btn-plan btn-white">Start free — upgrade anytime</Link>
        </div>
        <div className="pricing-card">
          <div className="pricing-tier">Enterprise</div>
          <div className="pricing-price" style={{ fontSize: '26px', paddingTop: '8px', marginBottom: '8px' }}>Coming soon</div>
          <div className="pricing-psub">for advisors &amp; firms</div>
          <div className="pricing-desc">Multi-client management, advisor dashboards, and white-label options for financial planning firms.</div>
          <ul className="pricing-feats">
            <li><CheckIcon />Multi-client workspaces</li>
            <li><CheckIcon />Advisor dashboard</li>
            <li><CheckIcon />Priority support</li>
          </ul>
          <a href="mailto:hello@supafolio.com" className="btn-plan btn-ghost">Register interest</a>
        </div>
      </div>
      <div className="full-access-note">
        <strong>Not sure yet?</strong> Sign up on any plan and get full Pro access for your first 30 days — no credit card, no commitment. Decide after you&apos;ve seen what Supafolio can do.
      </div>
    </section>
  );
}
