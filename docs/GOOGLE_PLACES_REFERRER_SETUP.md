# Google Places API – Referrer setup

If you see **RefererNotAllowedMapError** and a message like:

```text
Your site URL to be authorized: https://localhost:5173/app/wealth
```

the API key’s **HTTP referrer** list in Google Cloud Console does not match the URL your app is actually using.

## Fix

1. Open [Google Cloud Console](https://console.cloud.google.com) → **APIs & Services** → **Credentials**.
2. Edit the API key used for `VITE_GOOGLE_PLACES_API_KEY`.
3. Under **Application restrictions** → **HTTP referrers**, add **patterns** (not only a single full URL):
   - For local dev: `https://localhost:5173/*` and optionally `http://localhost:5173/*`.
   - For production: `https://yourdomain.com/*` and `https://www.yourdomain.com/*` (or your real domain).
   - For Vercel previews: `https://*.vercel.app/*`.
4. Save. Changes can take a short time to apply.

Use the `/*` suffix so any path on that origin is allowed (e.g. `/app/wealth`, `/app/assets`, etc.). Adding only `https://localhost:5173/app/wealth` can still fail depending on how the referrer is sent; `https://localhost:5173/*` is the recommended pattern for localhost.

## Other errors

- **ApiNotActivatedMapError**: Enable **Maps JavaScript API** and **Places API** for the project and ensure billing is on.
- **“Not available to new customers”** (AutocompleteService / PlacesService): For new Google Cloud projects you may need to use the new Places APIs (AutocompleteSuggestion, Place) instead of the legacy ones; the current app uses the legacy APIs.
