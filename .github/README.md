# GitHub Automation Scripts

This directory contains automation scripts for maintaining the Cloudflare Pages deployment.

## Scripts

### auto-repair.sh
Automatically detects and fixes TypeScript build failures in Cloudflare Pages deployments.

**What it does:**
1. Detects if build log contains `tsc: not found` or `exit code 127`
2. Moves TypeScript from devDependencies to dependencies
3. Adds tslib to dependencies if missing
4. Updates build:backend script to use `npx tsc`
5. Reinstalls dependencies and rebuilds
6. Creates verification logs

**Usage:**
```bash
./.github/auto-repair.sh
```

### verify-deployment.sh
Tests API endpoints after Cloudflare Pages deployment to ensure everything is working.

**What it tests:**
- `/api/health`
- `/api/pin`
- `/api/queue`
- `/api/notifications`

**Usage:**
```bash
./.github/verify-deployment.sh [https://your-deployment-url.pages.dev]
```

Example:
```bash
./.github/verify-deployment.sh https://2027-5a0.pages.dev
```

Results are logged to `.github/logs/deploy-verification.log`

## Logs Directory

The `logs/` directory contains:
- `deploy-verification.log` - API endpoint test results
- `auto-repair.log` - Auto-repair execution logs
- `.gitkeep` - Ensures the directory is tracked in git

## Cloudflare Pages Build Configuration

### Current Setup
- **Build command:** `npm run build`
- **Build output directory:** `dist`
- **Dependencies:** TypeScript and tslib are in `dependencies` (not `devDependencies`)
- **Build script:** Uses `npx tsc` to ensure TypeScript is always available

### Why These Changes?

Cloudflare Pages only installs packages from `dependencies`, not `devDependencies`. 
Previously, TypeScript was in `devDependencies`, causing build failures with:
- `sh: 1: tsc: not found`
- `exit code 127`

By moving TypeScript to `dependencies` and using `npx tsc`, we ensure:
1. TypeScript is always available during Cloudflare Pages builds
2. Builds are reproducible across all environments
3. No manual intervention needed when deployment fails

## Automatic Deployment Flow

1. Push code to `main` branch
2. Cloudflare Pages automatically triggers build
3. Build runs: `npm install` → `npm run build`
4. TypeScript compiles backend (`npx tsc`)
5. Vite builds frontend
6. Deployment completes successfully

If build fails with TypeScript errors:
1. Run `./github/auto-repair.sh` locally
2. Commit and push the fixes
3. Cloudflare Pages will automatically retry and succeed

## Maintenance

These scripts ensure the deployment remains stable. If you encounter build failures:

1. Check `.github/logs/auto-repair.log`
2. Run auto-repair script if needed
3. Verify deployment with verify-deployment.sh
4. Check API endpoints are responding correctly

## Notes

- All scripts are executable (`chmod +x`)
- Logs are excluded from git (see .gitignore)
- Scripts are designed to be idempotent (safe to run multiple times)
- Compatible with both local development and CI/CD environments
