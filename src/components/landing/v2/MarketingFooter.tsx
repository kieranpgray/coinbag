import { Link } from 'react-router-dom';
import { ROUTES } from '@/lib/constants/routes';
import './landing-v2.css';

const landingHash = (hash: string) => ({ pathname: '/', hash });

export function MarketingFooter() {
  return (
    <footer>
      <Link to="/" className="footer-logo">
        Supafolio
      </Link>
      <ul className="footer-links">
        <li>
          <Link to={landingHash('how-it-works')}>Product</Link>
        </li>
        <li>
          <Link to={ROUTES.pricing}>Pricing</Link>
        </li>
        <li>
          <Link to="/security">Security</Link>
        </li>
        <li>
          <Link to="/privacy">Privacy policy</Link>
        </li>
        <li>
          <Link to="/terms">Terms</Link>
        </li>
        <li>
          <a href="mailto:hello@supafolio.app">Contact</a>
        </li>
      </ul>
      <div className="footer-copy">© 2026 Supafolio. Built in Australia.</div>
    </footer>
  );
}
