# CI/CD and Error Detection System for Cloudflare Pages

This document describes the automated CI/CD and error detection system implemented for the 2027 project.

## Overview

The system provides:
- ✅ Automated deployment to Cloudflare Pages
- 🔄 Auto-repair for deployment failures
- 🏥 Health checks and monitoring
- 🔒 Branch protection for critical files
- 🤖 Auto-merge with status checks
- 📊 Continuous monitoring and logging

## GitHub Actions Workflows

### 1. Deploy to Cloudflare Pages (`deploy.yml`)

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop`
- Manual workflow dispatch

**Features:**
- Builds backend and frontend
- Verifies build artifacts
- Deploys to Cloudflare Pages
- Comments on PRs with deployment URL

**Required Secrets:**
- `CLOUDFLARE_API_TOKEN` - Cloudflare API token with Pages access
- `CLOUDFLARE_ACCOUNT_ID` - Your Cloudflare account ID

### 2. Health Check and Auto-Repair (`health-check.yml`)

**Triggers:**
- Hourly schedule (cron)
- Manual workflow dispatch
- Deployment status changes

**Features:**
- Checks production and preview deployments
- Verifies HTTP status and response times
- Creates issues for failures
- Triggers auto-repair workflow if needed
- Logs all health check results

**URLs Monitored:**
- Production: `https://www.mmc-mms.com`
- Preview: `https://2027-5a0.pages.dev`

### 3. Auto-Repair Deployment (`auto-repair.yml`)

**Triggers:**
- Manual workflow dispatch
- Triggered by health-check workflow
- Repository dispatch events

**Features:**
- Clean reinstalls dependencies
- Rebuilds application
- Redeploys to Cloudflare Pages
- Verifies deployment with retries
- Updates issues with status
- Creates new issue if repair fails

### 4. Auto-Merge with Status Checks (`auto-merge.yml`)

**Triggers:**
- Pull request opened/updated
- Pull request review submitted

**Features:**
- Checks for auto-merge label or Copilot PRs
- Verifies all status checks pass
- Ensures required approvals (if needed)
- Automatically merges when ready
- Provides status comments

**Labels:**
- `auto-merge` or `automerge` - Enable auto-merge
- `manual-review` or `do-not-merge` - Prevent auto-merge

### 5. Monitoring and Logging (`monitoring.yml`)

**Triggers:**
- Every 6 hours (cron)
- Manual workflow dispatch
- Deployment status changes

**Features:**
- Collects deployment metrics
- Measures response times and sizes
- Generates monitoring reports
- Checks for performance degradation
- Archives old logs (30 days retention)
- Creates performance issues if needed

## Scripts

### Health Check Script (`scripts/health-check.sh`)

Standalone script for verifying deployment health.

**Usage:**
```bash
# Check default URLs
./scripts/health-check.sh

# Check custom URLs
PRODUCTION_URL=https://your-domain.com ./scripts/health-check.sh
```

**Features:**
- Retries failed checks
- Checks critical resources
- Collects metrics
- Color-coded output
- Exits with error code on failure

### Deployment Verification Script (`scripts/verify-deployment.sh`)

Verifies a deployment is successful and functional.

**Usage:**
```bash
# Verify default deployment
./scripts/verify-deployment.sh

# Verify custom deployment
DEPLOYMENT_URL=https://your-preview.pages.dev ./scripts/verify-deployment.sh
```

**Features:**
- Waits for deployment availability
- Runs comprehensive checks
- Executes smoke tests
- Generates verification reports
- Configurable timeouts

## File Protection (CODEOWNERS)

Critical files are protected and require review:

- Configuration files: `package.json`, `tsconfig.json`, `wrangler.toml`
- Workflows: `.github/workflows/`
- Deployment: `deploy/`, `infra/`
- Database: `db/`
- Core application files

## Required GitHub Secrets

You must configure these secrets in your GitHub repository:

1. **CLOUDFLARE_API_TOKEN**
   - Go to Cloudflare Dashboard → My Profile → API Tokens
   - Create token with "Cloudflare Pages - Edit" permission
   - Add to GitHub: Settings → Secrets and variables → Actions

2. **CLOUDFLARE_ACCOUNT_ID**
   - Find in Cloudflare Dashboard → Workers & Pages
   - Copy Account ID from the sidebar
   - Add to GitHub: Settings → Secrets and variables → Actions

## Setting Up Secrets

### Step 1: Get Cloudflare API Token

```bash
# Login to Cloudflare and create an API token
# Navigate to: https://dash.cloudflare.com/profile/api-tokens
# Click "Create Token"
# Use the "Edit Cloudflare Workers" template or create custom token with:
#   - Account.Cloudflare Pages: Edit
```

### Step 2: Get Cloudflare Account ID

```bash
# Login to Cloudflare Dashboard
# Navigate to: Workers & Pages
# Your Account ID is shown in the right sidebar
```

### Step 3: Add Secrets to GitHub

```bash
# Navigate to your repository on GitHub
# Go to: Settings → Secrets and variables → Actions
# Click "New repository secret"
# Add:
#   Name: CLOUDFLARE_API_TOKEN
#   Value: <your-api-token>
# Click "Add secret"
# Repeat for CLOUDFLARE_ACCOUNT_ID
```

## Monitoring and Logs

### Log Structure

```
logs/
├── metrics/
│   ├── production-2025-10-17_12-00-00.json
│   └── preview-2025-10-17_12-00-00.json
└── reports/
    ├── monitoring-2025-10-17.md
    └── deployment-verification-2025-10-17_12-00-00.md
```

### Metrics Format

```json
{
  "timestamp": "2025-10-17T12:00:00Z",
  "name": "production",
  "url": "https://www.mmc-mms.com",
  "status": 200,
  "response_time": 0.234,
  "size_bytes": 1024
}
```

### Log Retention

- Metrics: 30 days
- Reports: 30 days
- Automatic cleanup runs with monitoring workflow

## Workflow Status

Add these badges to your README to show workflow status:

```markdown
![Deploy](https://github.com/Bomussa/2027/workflows/Deploy%20to%20Cloudflare%20Pages/badge.svg)
![Health Check](https://github.com/Bomussa/2027/workflows/Health%20Check%20and%20Auto-Repair/badge.svg)
![Monitoring](https://github.com/Bomussa/2027/workflows/Monitoring%20and%20Logging/badge.svg)
```

## Troubleshooting

### Deployment Fails

1. Check GitHub Actions logs
2. Verify Cloudflare secrets are set correctly
3. Check build logs for errors
4. Review recent code changes

### Health Check Fails

1. Check if site is accessible manually
2. Review Cloudflare Pages dashboard
3. Check for recent deployments
4. Verify DNS settings

### Auto-Repair Doesn't Work

1. Check auto-repair workflow logs
2. Verify workflow has write permissions
3. Check Cloudflare API token permissions
4. Review build errors in logs

### Performance Issues

1. Review monitoring reports in `logs/reports/`
2. Check metrics in `logs/metrics/`
3. Analyze bundle size
4. Review Cloudflare analytics

## Best Practices

1. **Always review auto-merge PRs** before they merge
2. **Monitor health check results** regularly
3. **Keep secrets updated** and rotated
4. **Review performance metrics** weekly
5. **Archive old logs** to save space
6. **Test deployments** in preview before production

## Manual Deployment

If you need to deploy manually:

```bash
# Build the application
npm run build

# Deploy to Cloudflare Pages
npx wrangler pages deploy dist --project-name=2027
```

## Emergency Rollback

If a deployment causes issues:

1. Go to Cloudflare Pages dashboard
2. Navigate to your project
3. Find the last working deployment
4. Click "Rollback to this deployment"

Or use the Cloudflare CLI:

```bash
# List recent deployments
npx wrangler pages deployment list --project-name=2027

# Rollback to specific deployment
npx wrangler pages deployment rollback <deployment-id> --project-name=2027
```

## Support and Issues

- GitHub Issues: Report bugs or request features
- Workflow Logs: Check Actions tab for detailed logs
- Cloudflare Dashboard: Monitor deployments and analytics

## Updates and Maintenance

The CI/CD system is self-maintaining with:
- Automatic log cleanup
- Self-healing deployments
- Continuous monitoring
- Auto-generated issues for problems

Review and update:
- Workflows: Monthly
- Scripts: As needed
- Documentation: With major changes
- Secrets: Every 90 days

---

**Last Updated:** 2025-10-17  
**System Version:** 1.0  
**Maintained By:** GitHub Actions + Cloudflare Pages
