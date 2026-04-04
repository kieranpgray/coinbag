import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MarketingFooter } from '@/components/landing/v2/MarketingFooter';
import { MarketingNav } from '@/components/landing/v2/MarketingNav';
import './security-page.css';

const PAGE_TITLE = 'Security & Data Protection — Supafolio';
const PAGE_DESCRIPTION =
  "Your financial data stays in Australia, encrypted at rest and in transit. Supafolio never stores your bank or brokerage credentials. Here's exactly how we protect your data.";

const Arrow16 = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path
      d="M3 8h10M9 4l4 4-4 4"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const Arrow14 = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <path
      d="M2 7h10M7 2l5 5-5 5"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const Arrow12 = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
    <path
      d="M2 6h8M6 2l4 4-4 4"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export function SecurityPage() {
  const [dataLocationExtra, setDataLocationExtra] = useState(false);
  const [bankStatementExtra, setBankStatementExtra] = useState(false);

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
    <div className="landing-v2 security-page">
      <MarketingNav />

      <main>
        <section>
          <div className="page-hero">
            <div className="hero-eyebrow sec-fu sec-fu-1">Security</div>
            <h1 className="sec-fu sec-fu-2">
              Your financial data deserves <em>serious protection.</em>
            </h1>
            <p className="sec-fu sec-fu-3">
              Connecting your investments and financial accounts to a new product is a big decision. Here&apos;s exactly
              how we protect your data — and why you never need to share a password with us.
            </p>
            <p className="sec-fu sec-fu-3 sec-reviewed">Last reviewed: April 2026</p>
          </div>
        </section>

        <div className="summary-strip">
          <div className="summary-inner">
            <div className="summary-item">
              <div className="summary-icon">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                  <rect
                    x="2"
                    y="8"
                    width="14"
                    height="9"
                    rx="2"
                    stroke="rgba(255,255,255,0.6)"
                    strokeWidth="1.5"
                  />
                  <path
                    d="M5 8V6a4 4 0 0 1 8 0v2"
                    stroke="rgba(255,255,255,0.6)"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                  <circle cx="9" cy="12.5" r="1.2" fill="rgba(255,255,255,0.6)" />
                </svg>
              </div>
              <div className="summary-title">Encrypted at rest and in transit</div>
              <div className="summary-body">
                All data encrypted using industry-standard AES-256 at rest and TLS 1.2+ in transit.
              </div>
            </div>
            <div className="summary-item">
              <div className="summary-icon">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                  <circle cx="9" cy="9" r="7" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" />
                  <path
                    d="M5.5 9l2.5 2.5 4.5-5"
                    stroke="rgba(255,255,255,0.6)"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div className="summary-title">Credentials never stored</div>
              <div className="summary-body">
                Your bank and brokerage login credentials are never seen or stored by Supafolio at any point.
              </div>
            </div>
            <div className="summary-item">
              <div className="summary-icon">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                  <path
                    d="M9 2L3 5v5c0 3.5 2.5 6.5 6 7.5C12.5 16.5 15 13.5 15 10V5L9 2z"
                    stroke="rgba(255,255,255,0.6)"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div className="summary-title">Read-only brokerage access</div>
              <div className="summary-body">
                Brokerage connections are read-only. Supafolio cannot move funds, place trades, or change anything.
              </div>
            </div>
            <div className="summary-item">
              <div className="summary-icon">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                  <path
                    d="M9 1l2 6h6l-5 3.5L14 17 9 13.5 4 17l2-6.5L1 7h6z"
                    stroke="rgba(255,255,255,0.6)"
                    strokeWidth="1.3"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div className="summary-title">Your data stays in Australia</div>
              <div className="summary-body">
                All financial data is stored in Australia on AWS infrastructure in Sydney (ap-southeast-2).
              </div>
            </div>
          </div>
        </div>

        <section className="sec-section">
          <div className="section-inner">
            <div className="section-label">Data protection</div>
            <h2>How your data is protected</h2>
            <p className="section-intro">
              Every piece of financial data you enter into Supafolio is protected at multiple layers — from the moment
              you type it to the moment it&apos;s stored.
            </p>

            <div className="detail-list">
              <div className="detail-item">
                <div>
                  <div className="detail-label">Encryption at rest</div>
                </div>
                <div className="detail-value">
                  All data stored in Supafolio is encrypted using <strong>AES-256</strong> — the same standard used by
                  banks and financial institutions. This applies to every record in the database, including your
                  holdings, income sources, and transaction history.
                </div>
              </div>
              <div className="detail-item">
                <div>
                  <div className="detail-label">Encryption in transit</div>
                </div>
                <div className="detail-value">
                  All data moving between your device and Supafolio&apos;s servers is encrypted using{' '}
                  <strong>TLS 1.2 or higher</strong>. Any connection that doesn&apos;t meet this standard is refused.
                </div>
              </div>
              <div className="detail-item">
                <div>
                  <div className="detail-label">
                    Data location <span className="badge">AU</span>
                  </div>
                </div>
                <div className="detail-value">
                  Your financial data is stored on <strong>AWS infrastructure in Sydney, Australia</strong>{' '}
                  (ap-southeast-2) via Supabase — it is not replicated internationally.
                  {!dataLocationExtra && (
                    <button
                      type="button"
                      className="detail-more"
                      onClick={() => setDataLocationExtra(true)}
                    >
                      Learn more ↓
                    </button>
                  )}
                  {dataLocationExtra && (
                    <span className="detail-extra">
                      The application layer runs on Vercel&apos;s global edge network for performance. This handles
                      request routing only — your financial data stays in Australia at all times.
                    </span>
                  )}
                </div>
              </div>
              <div className="detail-item">
                <div>
                  <div className="detail-label">Authentication</div>
                </div>
                <div className="detail-value">
                  Account authentication is managed by <strong>Clerk</strong>, a dedicated identity platform. Supafolio
                  never handles or stores your password.
                </div>
              </div>
              <div className="detail-item">
                <div>
                  <div className="detail-label">Bank statements</div>
                </div>
                <div className="detail-value">
                  When you upload a bank statement, the file is <strong>parsed in memory and immediately discarded</strong>
                  . The original file is never stored on our servers.
                  {!bankStatementExtra && (
                    <button
                      type="button"
                      className="detail-more"
                      onClick={() => setBankStatementExtra(true)}
                    >
                      Learn more ↓
                    </button>
                  )}
                  {bankStatementExtra && (
                    <span className="detail-extra">
                      In the event of a processing error, the file may be retained for up to 24 hours for recovery
                      purposes before being permanently deleted.
                    </span>
                  )}
                </div>
              </div>
              <div className="detail-item">
                <div>
                  <div className="detail-label">Backups</div>
                </div>
                <div className="detail-value">
                  Supabase maintains <strong>daily encrypted backups</strong> for up to 7 days. When an account is
                  deleted, all associated backups are also deleted.
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="sec-section alt">
          <div className="section-inner">
            <div className="section-label">Brokerage connections</div>
            <h2>Powered by SnapTrade</h2>
            <p className="section-intro">
              Connecting your brokerage account is the most sensitive part of Supafolio. We don&apos;t build this
              ourselves — we use <strong>SnapTrade</strong>, open-finance infrastructure purpose-built for read-only
              financial data access.
            </p>

            <div className="detail-list mb">
              <div className="detail-item">
                <div>
                  <div className="detail-label">Credentials never stored</div>
                </div>
                <div className="detail-value">
                  Your brokerage username and password are entered directly into SnapTrade&apos;s secure connection flow.{' '}
                  <strong>Supafolio never sees, receives, or stores your brokerage credentials</strong> at any point in
                  the process.
                </div>
              </div>
              <div className="detail-item">
                <div>
                  <div className="detail-label">Read-only access</div>
                </div>
                <div className="detail-value">
                  Supafolio receives <strong>read-only access</strong> to your brokerage balance and holdings data. We
                  cannot place trades, move funds, change settings, or take any action on your brokerage account. If your
                  brokerage doesn&apos;t support read-only access, we don&apos;t connect to it.
                </div>
              </div>
              <div className="detail-item">
                <div>
                  <div className="detail-label">Revoke at any time</div>
                </div>
                <div className="detail-value">
                  You can disconnect any brokerage connection at any time from{' '}
                  <strong>Settings → Holdings → Connected brokerages</strong>. Disconnecting immediately removes
                  Supafolio&apos;s access to that account. You can also revoke access directly from your brokerage&apos;s
                  security settings.
                </div>
              </div>
              <div className="detail-item">
                <div>
                  <div className="detail-label">SnapTrade security</div>
                </div>
                <div className="detail-value">
                  SnapTrade is a dedicated open-finance infrastructure provider operating across AU and US markets. Their
                  platform is built specifically for the secure handling of financial account connections.{' '}
                  <a href="https://snaptrade.com/security" target="_blank" rel="noopener noreferrer">
                    Read SnapTrade&apos;s security documentation →
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="dont-section">
          <div className="section-inner">
            <div className="section-label">What we don&apos;t do</div>
            <h2>Things Supafolio will never do</h2>
            <p className="section-intro">Some things are worth stating plainly.</p>

            <div className="dont-grid">
              <div className="dont-item">
                <div className="dont-icon">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                    <path
                      d="M2 2l10 10M12 2L2 12"
                      stroke="rgba(255,255,255,0.5)"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                <div>
                  <div className="dont-title">We will never sell your data</div>
                  <div className="dont-body">
                    Your financial data is yours. We don&apos;t sell it, license it, or share it with advertisers, data
                    brokers, or any third party for commercial purposes.
                  </div>
                </div>
              </div>
              <div className="dont-item">
                <div className="dont-icon">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                    <path
                      d="M2 2l10 10M12 2L2 12"
                      stroke="rgba(255,255,255,0.5)"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                <div>
                  <div className="dont-title">We will never store your credentials</div>
                  <div className="dont-body">
                    Your brokerage and bank login details are never stored by Supafolio. Authentication is handled by
                    dedicated infrastructure that keeps credentials separate from your financial data.
                  </div>
                </div>
              </div>
              <div className="dont-item">
                <div className="dont-icon">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                    <path
                      d="M2 2l10 10M12 2L2 12"
                      stroke="rgba(255,255,255,0.5)"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                <div>
                  <div className="dont-title">We will never move your money</div>
                  <div className="dont-body">
                    Supafolio is a read-only view of your financial life. We have no ability to initiate transfers,
                    payments, or any transaction on your behalf — through any connected account.
                  </div>
                </div>
              </div>
              <div className="dont-item">
                <div className="dont-icon">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                    <path
                      d="M2 2l10 10M12 2L2 12"
                      stroke="rgba(255,255,255,0.5)"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                <div>
                  <div className="dont-title">We will never store your bank statements</div>
                  <div className="dont-body">
                    Uploaded bank statements are processed in memory and immediately discarded. We extract the transaction
                    data you need and delete the file — it&apos;s never stored on our servers.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="sec-section alt">
          <div className="section-inner">
            <div className="section-label">Your controls</div>
            <h2>You&apos;re always in control</h2>
            <p className="section-intro">Security isn&apos;t just about what we do — it&apos;s about what you can do.</p>

            <div className="pillar-grid">
              <div className="pillar">
                <div className="pillar-icon">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <circle cx="10" cy="7" r="3" stroke="var(--accent)" strokeWidth="1.5" />
                    <path
                      d="M4 17c0-3.3 2.7-6 6-6s6 2.7 6 6"
                      stroke="var(--accent)"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                <h3>Two-factor authentication</h3>
                <p>
                  Enable 2FA in Settings → Privacy & security to add a second verification step on every sign-in. We
                  support authenticator apps (recommended) and SMS codes.
                </p>
              </div>
              <div className="pillar">
                <div className="pillar-icon">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <rect x="3" y="3" width="14" height="14" rx="3" stroke="var(--accent)" strokeWidth="1.5" />
                    <path d="M7 10h6M10 7v6" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </div>
                <h3>Privacy mode</h3>
                <p>
                  Toggle Privacy mode to hide all dollar values across the app — useful when working in public or sharing
                  your screen. One tap hides everything; one tap reveals it.
                </p>
              </div>
              <div className="pillar">
                <div className="pillar-icon">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <path d="M10 3v14M3 10h14" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </div>
                <h3>Active session management</h3>
                <p>
                  View all devices currently signed in to your Supafolio from Settings → Privacy & security. Sign out any
                  device you don&apos;t recognise — or all other devices at once.
                </p>
              </div>
              <div className="pillar">
                <div className="pillar-icon">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <path d="M4 7h12M4 10h8M4 13h6" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </div>
                <h3>Export your data</h3>
                <p>
                  Download a full copy of your Supafolio data at any time from Settings → Account → Export my data. Your
                  data is yours — you can take it with you whenever you want.
                </p>
              </div>
              <div className="pillar">
                <div className="pillar-icon">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <path d="M6 6l8 8M14 6l-8 8" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </div>
                <h3>Delete your account</h3>
                <p>
                  Delete your account at any time from Settings → Account → Delete my account. Deletion is permanent and
                  immediate — all your data is removed within 14 days.
                </p>
              </div>
              <div className="pillar">
                <div className="pillar-icon">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <path
                      d="M10 3C6.1 3 3 6.1 3 10s3.1 7 7 7 7-3.1 7-7-3.1-7-7-7z"
                      stroke="var(--accent)"
                      strokeWidth="1.5"
                    />
                    <path d="M10 8v2l1.5 1.5" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </div>
                <h3>Shared Access controls</h3>
                <p>
                  If you share your Supafolio with a partner or advisor, you control their access level — Admin, Edit, or
                  Read-only. You can revoke access at any time from Settings → Shared Access.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="sec-section alt">
          <div className="section-inner">
            <div className="disclosure-box">
              <div className="disclosure-copy">
                <div className="section-label disclosure-label-tight">Responsible disclosure</div>
                <h3>Found a vulnerability?</h3>
                <p>
                  We take security reports seriously. If you believe you&apos;ve found a security issue in Supafolio, we
                  want to hear from you — before anyone else does.
                </p>
                <p>
                  We commit to acknowledging your report within 2 business days, keeping you informed of our progress,
                  and not pursuing legal action against good-faith security research.
                </p>
                <a href="mailto:hello@supafolio.app" className="btn-outline">
                  Report a vulnerability
                  <Arrow14 />
                </a>
              </div>
              <div>
                <div className="disclosure-list">
                  <div className="disclosure-step">
                    <div className="sec-step-num">1</div>
                    <div className="step-text">
                      Email <strong>hello@supafolio.app</strong> with a description of the vulnerability, steps to
                      reproduce it, and any supporting evidence.
                    </div>
                  </div>
                  <div className="disclosure-step">
                    <div className="sec-step-num">2</div>
                    <div className="step-text">
                      We&apos;ll acknowledge your report within <strong>2 business days</strong> and begin investigating
                      immediately.
                    </div>
                  </div>
                  <div className="disclosure-step">
                    <div className="sec-step-num">3</div>
                    <div className="step-text">
                      We&apos;ll keep you updated on our progress and notify you when the issue has been resolved.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="sec-section">
          <div className="section-inner">
            <div className="section-label">Infrastructure</div>
            <h2>Built on trusted infrastructure</h2>
            <p className="section-intro">
              Supafolio doesn&apos;t build its own authentication, payment processing, or brokerage connectivity from
              scratch. We use infrastructure partners with stronger security practices than any early-stage product could
              build independently.
            </p>

            <div className="partner-grid">
              <div className="partner-card">
                <div className="partner-name">Supabase</div>
                <div className="partner-role">Database & storage</div>
                <div className="partner-body">
                  Your financial data is stored in Supabase&apos;s PostgreSQL infrastructure, hosted on AWS in Sydney,
                  Australia. Supabase applies row-level security, encrypted backups, and maintains SOC 2 compliance.
                </div>
                <a href="https://supabase.com/security" target="_blank" rel="noopener noreferrer" className="partner-link">
                  Security documentation
                  <Arrow12 />
                </a>
              </div>
              <div className="partner-card">
                <div className="partner-name">Clerk</div>
                <div className="partner-role">Authentication</div>
                <div className="partner-body">
                  Authentication, session management, and two-factor authentication are handled by Clerk — a dedicated
                  identity platform. Your password and authentication credentials are never stored in or accessible by
                  Supafolio.
                </div>
                <a href="https://clerk.com/security" target="_blank" rel="noopener noreferrer" className="partner-link">
                  Security documentation
                  <Arrow12 />
                </a>
              </div>
              <div className="partner-card">
                <div className="partner-name">SnapTrade</div>
                <div className="partner-role">Brokerage connections</div>
                <div className="partner-body">
                  Brokerage account connections are managed by SnapTrade&apos;s open-finance platform, purpose-built for
                  secure read-only financial data access. Your brokerage credentials never leave SnapTrade&apos;s
                  infrastructure.
                </div>
                <a href="https://snaptrade.com/security" target="_blank" rel="noopener noreferrer" className="partner-link">
                  Security documentation
                  <Arrow12 />
                </a>
              </div>
              <div className="partner-card">
                <div className="partner-name">Stripe</div>
                <div className="partner-role">Payment processing</div>
                <div className="partner-body">
                  Subscription billing is handled by Stripe. Supafolio never stores your card number, CVV, or payment
                  details. Stripe is PCI DSS Level 1 certified — the highest level of payment security certification
                  available.
                </div>
                <a href="https://stripe.com/docs/security" target="_blank" rel="noopener noreferrer" className="partner-link">
                  Security documentation
                  <Arrow12 />
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="security-final-cta">
          <div className="security-final-inner">
            <h2>Serious about your finances. Serious about your security.</h2>
            <p>
              Sign up free and see your complete financial picture — protected the way your data deserves to be.
            </p>
            <Link to={{ pathname: '/', hash: 'signup' }} className="btn-white">
              Start building — it&apos;s free
              <Arrow16 />
        </Link>
            <div className="sec-final-trust">Free forever · Full access for 30 days · No credit card required</div>
      </div>
        </section>
    </main>

      <MarketingFooter />
    </div>
  );
}
