# HTTPS Setup Guide

This guide explains how to set up HTTPS for local development and production deployment.

## Why HTTPS?

- **Security**: Encrypts data in transit, protecting sensitive financial information
- **Modern APIs**: Some browser APIs (like Service Workers, Geolocation) require HTTPS
- **Production Parity**: Matches production environment behavior
- **Clerk Integration**: Clerk authentication works seamlessly with HTTPS

## Development Setup (Self-Signed Certificates)

### Step 1: Generate SSL Certificates

Run the certificate generation script:

```bash
./scripts/generate-ssl-certs.sh
```

This creates self-signed certificates in `.certs/` directory:
- `localhost-key.pem` - Private key
- `localhost-cert.pem` - Certificate

**Note**: These certificates are valid for 365 days and include:
- `localhost` domain
- `*.localhost` wildcard
- `127.0.0.1` IPv4 address
- `::1` IPv6 address

### Step 2: Start Development Server

The Vite dev server will automatically detect the certificates and enable HTTPS:

```bash
pnpm dev
```

You should see output indicating HTTPS is enabled:
```
VITE v5.x.x  ready in xxx ms

➜  Local:   https://localhost:5173/
➜  Network: use --host to expose
```

### Step 3: Accept Browser Certificate Warning

When you first visit `https://localhost:5173`, your browser will show a security warning because the certificate is self-signed. This is **normal and expected** for development.

**Chrome/Edge**:
1. Click "Advanced"
2. Click "Proceed to localhost (unsafe)"

**Firefox**:
1. Click "Advanced"
2. Click "Accept the Risk and Continue"

**Safari**:
1. Click "Show Details"
2. Click "visit this website"
3. Click "Visit Website"

**Note**: You may need to accept the certificate once per browser. The browser will remember your choice for future visits.

### Step 4: Configure Clerk Redirect URLs (Environment Variables)

Clerk handles redirects automatically via environment variables. Add these to your `.env` file:

```bash
# Required: Sign-in and sign-up page paths
CLERK_SIGN_IN_URL=/sign-in
CLERK_SIGN_UP_URL=/sign-up

# Optional: Where to redirect after authentication
CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard
CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/dashboard
```

**Important**: 
- Use **paths** (e.g., `/dashboard`), not full URLs
- Clerk automatically uses your current protocol (HTTP or HTTPS)
- No dashboard configuration needed - Clerk handles redirects automatically

See [`docs/CLERK_REDIRECT_URLS_GUIDE.md`](./CLERK_REDIRECT_URLS_GUIDE.md) for complete details based on [Clerk's official documentation](https://clerk.com/docs/guides/development/customize-redirect-urls).

## Fallback to HTTP

If you haven't generated certificates, the dev server will automatically fall back to HTTP. You can access the app at `http://localhost:5173` without any certificate warnings.

To disable HTTPS temporarily, you can:
1. Remove or rename the `.certs/` directory
2. Restart the dev server

## Environment Variables

### Custom Port

You can customize the HTTPS port using an environment variable:

```bash
VITE_DEV_PORT=3000 pnpm dev
```

This will start the server on `https://localhost:3000` (or `http://localhost:3000` if no certificates).

### Disable HTTPS

To force HTTP even if certificates exist, you can modify `vite.config.ts` or remove the `.certs/` directory.

## Production Deployment

### Platform-Managed HTTPS (Recommended)

Most modern hosting platforms provide automatic HTTPS:

**Vercel**:
- HTTPS is enabled automatically
- Custom domains get free SSL certificates via Let's Encrypt
- No configuration needed

**Netlify**:
- HTTPS is enabled automatically
- Custom domains get free SSL certificates
- No configuration needed

**Cloudflare Pages**:
- HTTPS is enabled automatically
- SSL/TLS encryption is always on

### Custom Server Setup

If you're deploying to a custom server (VPS, EC2, etc.), you'll need to:

1. **Obtain SSL Certificate**:
   - Use Let's Encrypt (free, automated)
   - Use a commercial CA (paid)
   - Use a self-signed certificate (not recommended for production)

2. **Configure Web Server**:
   - **Nginx**: Configure SSL in `/etc/nginx/sites-available/your-site`
   - **Apache**: Configure SSL in virtual host
   - **Node.js**: Use `https` module with certificate files

3. **Update Clerk Redirect URLs**:
   - Add your production HTTPS URLs to Clerk dashboard
   - Example: `https://yourdomain.com/dashboard`

### Let's Encrypt Setup (Example)

For a custom server with Nginx:

```bash
# Install Certbot
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d yourdomain.com

# Auto-renewal (already configured by Certbot)
sudo certbot renew --dry-run
```

## Troubleshooting

### Certificate Not Found

**Error**: `Error: ENOENT: no such file or directory, open '.certs/localhost-key.pem'`

**Solution**: Run `./scripts/generate-ssl-certs.sh` to generate certificates.

### Browser Still Shows HTTP

**Issue**: Browser redirects to HTTP even though HTTPS is configured.

**Solution**: 
- Clear browser cache
- Use an incognito/private window
- Check that you're accessing `https://localhost:5173` (not `http://`)

### Certificate Expired

**Issue**: Browser shows "Certificate expired" error.

**Solution**: Regenerate certificates:
```bash
rm -rf .certs/
./scripts/generate-ssl-certs.sh
```

### Clerk Redirect Errors

**Issue**: Clerk authentication fails with redirect errors.

**Solution**: 
- Verify environment variables are set correctly in `.env`:
  - `CLERK_SIGN_IN_URL=/sign-in`
  - `CLERK_SIGN_UP_URL=/sign-up`
  - `CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard`
- Restart your dev server after changing `.env` variables
- Check that redirect paths are valid (e.g., `/dashboard`, not full URLs)
- Clear browser cache and cookies
- Check browser console for specific error messages

### Port Already in Use

**Issue**: `Error: Port 5173 is already in use`

**Solution**: 
- Use a different port: `VITE_DEV_PORT=3000 pnpm dev`
- Or kill the process using port 5173:
  ```bash
  # macOS/Linux
  lsof -ti:5173 | xargs kill -9
  
  # Windows
  netstat -ano | findstr :5173
  taskkill /PID <PID> /F
  ```

## Security Notes

### Development Certificates

- Self-signed certificates are **only for local development**
- Never use self-signed certificates in production
- Browsers will always show warnings for self-signed certificates
- These certificates are not trusted by any CA

### Production Certificates

- Always use certificates from trusted Certificate Authorities (CA)
- Let's Encrypt provides free, trusted certificates
- Ensure certificates are valid and not expired
- Set up automatic renewal for certificates
- Use strong encryption (TLS 1.2 or higher)

### Best Practices

1. **HTTPS Everywhere**: Use HTTPS in both development and production
2. **Certificate Management**: Automate certificate renewal
3. **HSTS**: Enable HTTP Strict Transport Security in production
4. **Certificate Pinning**: Consider certificate pinning for mobile apps
5. **Regular Updates**: Keep SSL/TLS libraries updated

## Additional Resources

- [Vite Server Options](https://vitejs.dev/config/server-options.html)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [Mozilla SSL Configuration Generator](https://ssl-config.mozilla.org/)
- [Clerk HTTPS Setup](https://clerk.com/docs/authentication/overview)

