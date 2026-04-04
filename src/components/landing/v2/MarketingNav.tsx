import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ROUTES } from '@/lib/constants/routes';
import './landing-v2.css';

const ArrowIcon = () => (
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

const landingHash = (hash: string) => ({ pathname: '/', hash });

function scrollDocumentToTop() {
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

export function MarketingNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const wasOpenRef = useRef(false);

  const closeMobile = useCallback(() => {
    setOpen(false);
  }, []);

  const toggleMobile = useCallback(() => {
    setOpen((v) => !v);
  }, []);

  useEffect(() => {
    const prev = wasOpenRef.current;
    wasOpenRef.current = open;

    if (open) {
      document.body.style.overflow = 'hidden';
      toggleRef.current?.setAttribute('aria-expanded', 'true');
      toggleRef.current?.setAttribute('aria-label', 'Close menu');
      requestAnimationFrame(() => {
        overlayRef.current?.querySelector<HTMLElement>('a[href]')?.focus();
      });
    } else {
      document.body.style.overflow = '';
      toggleRef.current?.setAttribute('aria-expanded', 'false');
      toggleRef.current?.setAttribute('aria-label', 'Open menu');
      if (prev) {
        requestAnimationFrame(() => toggleRef.current?.focus());
      }
    }
  }, [open]);

  useEffect(() => {
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const isSecurity = location.pathname === '/security';
  const isPricing = location.pathname === ROUTES.pricing;

  const handleLogoClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      e.preventDefault();
      closeMobile();
      navigate(ROUTES.root, { replace: location.pathname === ROUTES.root });
      window.setTimeout(() => {
        scrollDocumentToTop();
      }, 0);
    },
    [closeMobile, location.pathname, navigate]
  );

  return (
    <>
      <nav aria-label="Primary navigation">
        <Link to={ROUTES.root} className="nav-logo" onClick={handleLogoClick}>
          Supafolio
        </Link>
        <ul className="nav-links">
          <li>
            <Link to={landingHash('how-it-works')}>Product</Link>
          </li>
          <li>
            <Link to={ROUTES.pricing} className={isPricing ? 'active' : undefined}>
              Pricing
            </Link>
          </li>
          <li>
            <Link to="/security" className={isSecurity ? 'active' : undefined}>
              Security
            </Link>
          </li>
          <li>
            <Link to={ROUTES.signIn}>Log in</Link>
          </li>
          <li>
            <Link to={ROUTES.signUp} className="nav-cta">
              Sign up free
            </Link>
          </li>
        </ul>
        <div className="nav-mobile-right">
          <Link to={ROUTES.signUp} className="nav-mobile-cta">
            Sign up free
          </Link>
          <button
            type="button"
            ref={toggleRef}
            className={`nav-hamburger${open ? ' open' : ''}`}
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            aria-controls="marketing-nav-menu"
            id="marketing-nav-toggle"
            onClick={toggleMobile}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </nav>
      <div
        id="marketing-nav-menu"
        ref={overlayRef}
        className={`nav-overlay${open ? ' open' : ''}`}
        role="dialog"
        aria-modal={open ? true : undefined}
        aria-label="Navigation menu"
        aria-hidden={!open}
      >
        <Link to={landingHash('how-it-works')} className="nav-overlay-link" onClick={closeMobile}>
          Product
        </Link>
        <Link to={ROUTES.pricing} className="nav-overlay-link" onClick={closeMobile}>
          Pricing
        </Link>
        <Link to="/security" className="nav-overlay-link" onClick={closeMobile}>
          Security
        </Link>
        <Link to={ROUTES.signIn} className="nav-overlay-link" onClick={closeMobile}>
          Log in
        </Link>
        <Link to={landingHash('signup')} className="nav-overlay-cta" onClick={closeMobile}>
          Start building — it&apos;s free
          <ArrowIcon />
        </Link>
        <div className="nav-overlay-trust">Free forever · No credit card required</div>
      </div>
    </>
  );
}
