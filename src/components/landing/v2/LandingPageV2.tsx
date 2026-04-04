import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { HeroHeadline } from './HeroHeadline';
import { useHeroHeadlineIndex } from './useHeroHeadlineIndex';
import { MarketingFooter } from './MarketingFooter';
import { MarketingNav } from './MarketingNav';
import './landing-v2.css';

const ArrowIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export function LandingPageV2() {
  const heroIndex = useHeroHeadlineIndex();

  return (
    <div className="landing-v2">
      <MarketingNav />

      <main>
        <section>
          <div className="hero">
            <div>
              <h1 className="fu fu-1"><HeroHeadline index={heroIndex} /></h1>
              <p className="hero-sub fu fu-2">Supafolio is built for people with a growing net worth and a lot of moving parts — <strong>property, shares, RSUs, super, loans.</strong> One place to see your complete picture and a clear plan for where your money needs to go.</p>
              <div className="cta-group fu fu-3">
                <Link to="/sign-up" className="btn-primary">Start building — it&apos;s free <ArrowIcon /></Link>
                <div className="trust-strip">
                  <span className="trust-item"><span className="trust-dot" />Free forever</span>
                  <span className="trust-item"><span className="trust-dot" />Full access for 30 days</span>
                  <span className="trust-item"><span className="trust-dot" />No credit card required</span>
                </div>
              </div>
            </div>
            <div className="fu fu-4">
              <div className="app-frame">
                <div className="app-topbar">
                  <div className="app-dot app-dot-r" /><div className="app-dot app-dot-y" /><div className="app-dot app-dot-g" />
                  <div className="app-tab-label">Allocate</div>
                </div>
                <div className="app-content">
                  <div className="allocate-header">
                    <div className="allocate-title">Pay day plan</div>
                    <div className="allocate-date">Fri 14 Feb 2025</div>
                  </div>
                  <div className="income-card">
                    <div className="income-label">Income arriving</div>
                    <div className="income-amount">$5,833</div>
                    <div className="income-source">Salary · CBA Everyday · Fortnightly</div>
                  </div>
                  <div className="allocation-rows">
                    <div className="alloc-row">
                      <div className="alloc-left">
                        <div className="alloc-icon ai-m">🏠</div>
                        <div><div className="alloc-name">Mortgage</div><div className="alloc-acct">ANZ Home Loan</div></div>
                      </div>
                      <div><div className="alloc-amount">−$2,100</div><div className="alloc-bar"><div className="alloc-bar-fill" style={{ '--pct': '72%', '--delay': '0.5s' } as CSSProperties} /></div></div>
                    </div>
                    <div className="alloc-row">
                      <div className="alloc-left">
                        <div className="alloc-icon ai-s">💰</div>
                        <div><div className="alloc-name">Emergency fund</div><div className="alloc-acct">ING Savings</div></div>
                      </div>
                      <div><div className="alloc-amount">−$500</div><div className="alloc-bar"><div className="alloc-bar-fill" style={{ '--pct': '17%', '--delay': '0.7s' } as CSSProperties} /></div></div>
                    </div>
                    <div className="alloc-row">
                      <div className="alloc-left">
                        <div className="alloc-icon ai-i">📈</div>
                        <div><div className="alloc-name">Stake — US equities</div><div className="alloc-acct">Investment top-up</div></div>
                      </div>
                      <div><div className="alloc-amount">−$800</div><div className="alloc-bar"><div className="alloc-bar-fill" style={{ '--pct': '27%', '--delay': '0.9s' } as CSSProperties} /></div></div>
                    </div>
                  </div>
                  <div className="surplus-card">
                    <div><div className="surplus-label">Unallocated surplus</div><div className="surplus-sub">Move to offset or spending</div></div>
                    <div className="surplus-amount">$2,433</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="broker-strip">
          <div className="broker-inner">
            <span className="broker-label">Securely connect</span>
            <div className="broker-div" />
            <div className="broker-logos">
              <span className="broker-logo">CommSec</span>
              <span className="broker-logo">Stake</span>
              <span className="broker-logo">SelfWealth</span>
              <span className="broker-logo">NAB Trade</span>
              <span className="broker-logo">Pearler</span>
              <span className="broker-more">+ more AU &amp; US brokerages</span>
            </div>
          </div>
        </div>

        <section id="product">
          <div className="problem">
            <div>
              <div className="section-label">The problem</div>
              <h2 className="serif">Your spreadsheet wasn&apos;t built for this.</h2>
              <div className="body-copy">
                <p>Most finance tools were built for one job — tracking spending or tracking investments. Neither one tells you what to do when your salary lands, your RSUs vest, or your rental income hits.</p>
                <p>You&apos;re left connecting the dots yourself. Usually in a spreadsheet that&apos;s <strong>two months out of date</strong> — one that doesn&apos;t account for super, offset accounts, or the fact you get paid fortnightly.</p>
                <p>Supafolio was built for the gap between knowing your financial position and acting on it.</p>
              </div>
            </div>
            <div>
              <div className="ss-card">
                <div className="ss-hdr"><div className="ss-col">Account</div><div className="ss-col">Balance</div><div className="ss-col">Updated</div></div>
                <div className="ss-row"><div className="ss-cell">Everyday</div><div className="ss-cell stale">$4,220</div><div className="ss-cell stale">Nov 2024</div></div>
                <div className="ss-row"><div className="ss-cell">Stake portfolio</div><div className="ss-cell stale">$34,100</div><div className="ss-cell stale">Oct 2024</div></div>
                <div className="ss-row"><div className="ss-cell">Super (est.)</div><div className="ss-cell stale">$89,000?</div><div className="ss-cell stale">Jun 2024</div></div>
                <div className="ss-row"><div className="ss-cell">Mortgage</div><div className="ss-cell">$412,000</div><div className="ss-cell">Manual</div></div>
                <div className="ss-warn">⚠️ Some values may be out of date. Update before calculating net worth.</div>
              </div>
            </div>
          </div>
        </section>

        <section className="how" id="how-it-works">
          <div className="how-inner">
            <div className="section-header">
              <div className="section-eyebrow">How it works</div>
              <h2>From your complete picture to your next move</h2>
              <p>Three things Supafolio does that a spreadsheet never will.</p>
            </div>
            <div className="steps">
              <div className="step"><div className="step-num">01</div><h3>See everything</h3><p>Connect your complete net worth — property, shares, RSUs, super, loans, cash. Manual entry or automatic brokerage sync. Your wealth, always current.</p><div className="step-tags"><span className="step-tag">Holdings</span><span className="step-tag">Auto-sync</span><span className="step-tag">Net worth</span></div></div>
              <div className="step"><div className="step-num">02</div><h3>Know what&apos;s committed</h3><p>Set up your income sources and recurring expenses at whatever frequency they actually occur. Supafolio normalises everything to your real pay cadence — not a generic monthly budget.</p><div className="step-tags"><span className="step-tag">Recurring</span><span className="step-tag">Multi-income</span></div></div>
              <div className="step"><div className="step-num">03</div><h3>Allocate with confidence</h3><p>Every time money arrives, Supafolio shows you exactly which accounts need funding and what to do with your surplus. No guesswork. No spreadsheet required.</p><div className="step-tags"><span className="step-tag">Pay day plan</span><span className="step-tag">Manage surplus</span></div></div>
            </div>
          </div>
        </section>

        <section>
          <div className="allocate-sec">
            <div className="allocate-grid">
              <div className="allocate-copy">
                <div className="section-label green" style={{ marginBottom: '16px' }}>Allocate</div>
                <h2>Every pay cycle, a <em>clear plan.</em></h2>
                <p>Most financial tools show you a picture. Supafolio shows you what to do with it. Every time income arrives — salary, rental income, RSU vest — Allocate works out what&apos;s committed, what&apos;s left, and where it should go.</p>
                <p><strong>No more guessing which account needs topping up.</strong> No more mental arithmetic on a Friday afternoon. Just open Supafolio, see your plan, and move your money with confidence.</p>
                <p>Set your income sources, link your recurring expenses, and tell Supafolio where your surplus should land. It handles the rest — built around your actual pay cadence, not a simplified monthly average.</p>
              </div>
              <div>
                <div className="scenario-badge">
                  <img
                    className="scenario-av"
                    src="/landing/scenario-avatar.png"
                    alt=""
                    width={20}
                    height={20}
                    decoding="async"
                    loading="lazy"
                  />
                  Alex · Sydney · Paid fortnightly
                </div>
                <div className="app-frame">
                  <div className="app-topbar"><div className="app-dot app-dot-r" /><div className="app-dot app-dot-y" /><div className="app-dot app-dot-g" /><div className="app-tab-label">Allocate</div></div>
                  <div className="app-content">
                    <div className="income-card"><div className="income-label">Fortnightly salary</div><div className="income-amount">$5,833</div><div className="income-source">+ $1,400 rental income arriving Mon</div></div>
                    <div className="allocation-rows">
                      <div className="alloc-row"><div className="alloc-left"><div className="alloc-icon ai-m">🏠</div><div><div className="alloc-name">Mortgage</div><div className="alloc-acct">Committed · ANZ</div></div></div><div className="alloc-amount">−$2,100</div></div>
                      <div className="alloc-row"><div className="alloc-left"><div className="alloc-icon ai-i">📋</div><div><div className="alloc-name">Recurring bills</div><div className="alloc-acct">Committed · 6 expenses</div></div></div><div className="alloc-amount">−$680</div></div>
                      <div className="alloc-row"><div className="alloc-left"><div className="alloc-icon ai-s">💰</div><div><div className="alloc-name">Offset account</div><div className="alloc-acct">Surplus destination</div></div></div><div className="alloc-amount surplus">+$3,053</div></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="proof">
          <div className="proof-inner">
            <div className="section-header" style={{ marginBottom: '48px' }}>
              <div className="section-eyebrow">Built for how wealth actually works</div>
              <h2>Not another budgeting app.</h2>
              <p>Supafolio is built for the full complexity of a growing financial life — not just your bank account.</p>
            </div>
            <div className="proof-grid">
              <div className="proof-card"><div className="proof-icon"><svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true"><rect x="2" y="2" width="7" height="7" rx="2" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5"/><rect x="11" y="2" width="7" height="7" rx="2" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5"/><rect x="2" y="11" width="7" height="7" rx="2" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5"/><rect x="11" y="11" width="7" height="7" rx="2" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5"/></svg></div><h3>Complete wealth tracking</h3><p>Property, shares, RSUs, super, crypto, vehicles, loans — if it contributes to your net worth, Supafolio tracks it. Manual entry or automatic brokerage sync.</p></div>
              <div className="proof-card"><div className="proof-icon"><svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="10" cy="10" r="7" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5"/><path d="M10 6v4l2.5 2.5" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round"/></svg></div><h3>Real income cadence</h3><p>Fortnightly salary, monthly rent, quarterly dividends, RSU vests. Supafolio plans around your real income — not a simplified monthly average that never quite adds up.</p></div>
              <div className="proof-card"><div className="proof-icon"><svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M10 2C5.58 2 2 5.58 2 10s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8z" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5"/><path d="M6.5 10.5l2 2 4-4" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg></div><h3>Australian-built</h3><p>Super, fortnightly pay, offset accounts — Supafolio is built around how Australians actually manage money, not adapted from a US product that doesn&apos;t know what super is.</p></div>
            </div>
          </div>
        </section>

        <section>
          <div className="faq">
            <div className="section-header"><div className="section-eyebrow">Common questions</div><h2 style={{ fontFamily: "var(--serif)", fontSize: "clamp(28px,3.5vw,38px)", letterSpacing: "-0.02em" }}>Before you sign up</h2></div>
            <div className="faq-list">
              <details className="faq-item"><summary className="faq-q">Is my financial data safe?<svg className="faq-chev" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M5 7.5l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg></summary><p className="faq-a">Yes. All data is encrypted at rest and in transit using bank-level standards. Your credentials are never stored in Supafolio — brokerage connections are handled through SnapTrade&apos;s secure infrastructure, purpose-built for financial data. <Link to="/security">Read more about our security approach →</Link></p></details>
              <details className="faq-item"><summary className="faq-q">Do you connect directly to my bank?<svg className="faq-chev" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M5 7.5l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg></summary><p className="faq-a">For brokerage accounts, yes — via SnapTrade&apos;s secure open-finance infrastructure. For bank accounts, Supafolio currently supports manual entry and bank statement upload. Direct bank connection is on the roadmap. Your credentials are never stored in Supafolio at any point.</p></details>
              <details className="faq-item"><summary className="faq-q">Is this built for Australians?<svg className="faq-chev" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M5 7.5l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg></summary><p className="faq-a">Yes. Supafolio natively supports superannuation, fortnightly pay cycles, AU brokerage accounts (CommSec, Stake, SelfWealth, Pearler and more), and Australian dollar formatting. US support is also available for users with cross-border investments.</p></details>
              <details className="faq-item"><summary className="faq-q">What&apos;s included in the free plan?<svg className="faq-chev" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M5 7.5l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg></summary><p className="faq-a">The free plan includes 1 account, 1 income source, and up to 5 recurring expenses — enough to see how Allocate works. For the first 30 days, all limits are removed so you can experience the full product before deciding whether to upgrade.</p></details>
              <details className="faq-item"><summary className="faq-q">What happens after 30 days?<svg className="faq-chev" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M5 7.5l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg></summary><p className="faq-a">After 30 days you move to the free plan limits unless you upgrade. Your data is never deleted. You&apos;ll always be able to see your net worth and run a basic Allocate plan — upgrading unlocks unlimited accounts, statement import, AI-powered insights, and more.</p></details>
              <details className="faq-item"><summary className="faq-q">Can I share access with my partner?<svg className="faq-chev" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M5 7.5l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg></summary><p className="faq-a">Yes. Supafolio supports Shared Access — invite a partner or financial advisor with role-based permissions (Admin, Edit, or Read-only). Both see the same complete picture with the right level of control for each person.</p></details>
            </div>
          </div>
        </section>

        <section className="comparison">
          <div className="comparison-inner">
            <div className="section-header"><div className="section-eyebrow">The comparison</div><h2>Most people manage their wealth in a spreadsheet.<br />Most spreadsheets are two months out of date.</h2></div>
            <div className="compare-table">
              <div className="compare-hdr" /><div className="compare-hdr">Spreadsheet</div><div className="compare-hdr hl">Supafolio</div>
              <div className="compare-cell">Keep balances current</div><div className="compare-cell na">Manual, when you remember</div><div className="compare-cell hl">Auto-sync or on-demand</div>
              <div className="compare-cell">Pay cycle planning</div><div className="compare-cell na">Build your own logic from scratch</div><div className="compare-cell hl">Built in — Allocate</div>
              <div className="compare-cell">Super, RSUs, crypto</div><div className="compare-cell na">Manual rows and formulas</div><div className="compare-cell hl">Native support</div>
              <div className="compare-cell">Fortnightly income</div><div className="compare-cell na">Manually adjust each month</div><div className="compare-cell hl">Any frequency, normalised</div>
              <div className="compare-cell">Share with a partner</div><div className="compare-cell na">Email a file, hope for the best</div><div className="compare-cell hl">Shared Access with roles</div>
              <div className="compare-cell">Mobile</div><div className="compare-cell na">Barely</div><div className="compare-cell hl">Designed for it</div>
            </div>
          </div>
        </section>

        <section className="final-cta" id="signup">
          <div className="final-inner">
            <h2>Your financial life has outgrown a spreadsheet.</h2>
            <p>Sign up free and see your complete picture — and your first Allocate plan — in minutes.</p>
            <Link to="/sign-up" className="btn-final">Start building — it&apos;s free <ArrowIcon /></Link>
            <div className="final-trust">Free forever · Full access for 30 days · No credit card required</div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
