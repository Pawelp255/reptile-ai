# Deployment Readiness Checklist
- Ensure required environment variables are provided via your hosting platform (no `.env*` committed).
- Use `npm ci` with `package-lock.json`, then build with `npm run build`.
- Verify the web/PWA assets generated in `dist/` are what your deployment serves.
- Confirm theme preferences persist via the Settings page (Light / Dark / System).
