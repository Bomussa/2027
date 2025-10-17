# Quick Start Guide - CI/CD System

This guide will help you get started with the automated CI/CD system for Cloudflare Pages.

## Prerequisites

Before you begin, ensure you have:

1. ✅ A Cloudflare account
2. ✅ A Cloudflare Pages project named "2027"
3. ✅ Admin access to this GitHub repository
4. ✅ Domain configured (optional): `www.mmc-mms.com`

## Step 1: Configure GitHub Secrets (5 minutes)

The CI/CD system requires two secrets to be configured in your GitHub repository.

### Get Cloudflare API Token

1. Login to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Go to **My Profile** → **API Tokens**
3. Click **Create Token**
4. Use the **Edit Cloudflare Workers** template
5. Or create a custom token with these permissions:
   - **Account** → **Cloudflare Pages** → **Edit**
6. Click **Continue to summary** → **Create Token**
7. Copy the token (you won't see it again!)

### Get Cloudflare Account ID

1. In Cloudflare Dashboard, go to **Workers & Pages**
2. Your **Account ID** is shown in the right sidebar
3. Copy this ID

### Add Secrets to GitHub

1. Go to your repository: `https://github.com/Bomussa/2027`
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add the first secret:
   - **Name**: `CLOUDFLARE_API_TOKEN`
   - **Secret**: Paste your API token
   - Click **Add secret**
5. Add the second secret:
   - **Name**: `CLOUDFLARE_ACCOUNT_ID`
   - **Secret**: Paste your Account ID
   - Click **Add secret**

✅ **Done!** Your secrets are now configured.

## Step 2: Verify Workflows (2 minutes)

Check that all workflows are present:

```bash
# List all workflows
ls -la .github/workflows/

# You should see:
# - ci.yml (Build and test)
# - deploy.yml (Deploy to Cloudflare)
# - health-check.yml (Monitor health)
# - auto-repair.yml (Auto-fix issues)
# - auto-merge.yml (Auto-merge PRs)
# - monitoring.yml (Collect metrics)
```

## Step 3: Test the System (10 minutes)

### Test Deployment

1. Make a small change to the code
2. Commit and push to a new branch:
   ```bash
   git checkout -b test-deployment
   # Make a small change
   echo "# Test" >> README.md
   git add README.md
   git commit -m "test: verify CI/CD deployment"
   git push origin test-deployment
   ```
3. Create a pull request
4. Watch the workflows run in the **Actions** tab
5. Check the PR comment for the deployment preview URL

### Test Health Check

1. Go to **Actions** tab
2. Select **Health Check and Auto-Repair** workflow
3. Click **Run workflow** → **Run workflow**
4. Wait for it to complete
5. Check the workflow logs

### Test Scripts

```bash
# Test health check script
./scripts/health-check.sh

# Test deployment verification
./scripts/verify-deployment.sh
```

## Step 4: Enable Auto-Merge (Optional)

To enable auto-merge for a PR:

1. Add the label `auto-merge` to the PR
2. Or use a Copilot PR (they auto-merge by default)
3. Ensure all checks pass
4. The PR will merge automatically

To prevent auto-merge:
- Add the label `manual-review` or `do-not-merge`

## Step 5: Monitor Your Deployments

### Check Workflow Status

View badges in README.md:
- ![Deploy](https://github.com/Bomussa/2027/workflows/Deploy%20to%20Cloudflare%20Pages/badge.svg)
- ![Health Check](https://github.com/Bomussa/2027/workflows/Health%20Check%20and%20Auto-Repair/badge.svg)
- ![Monitoring](https://github.com/Bomussa/2027/workflows/Monitoring%20and%20Logging/badge.svg)

### View Logs and Reports

```bash
# View health check logs
cat logs/health-check.log

# View metrics
ls logs/metrics/

# View reports
ls logs/reports/
```

### Check Cloudflare Dashboard

1. Login to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Go to **Workers & Pages**
3. Select your **2027** project
4. View deployments and analytics

## Common Tasks

### Manual Deployment

```bash
# Build the application
npm run build

# Deploy to Cloudflare
npx wrangler pages deploy dist --project-name=2027
```

### Trigger Health Check

```bash
# Via GitHub UI
# Go to Actions → Health Check → Run workflow

# Or via GitHub CLI
gh workflow run health-check.yml
```

### View Deployment History

```bash
# Via Cloudflare CLI
npx wrangler pages deployment list --project-name=2027
```

### Rollback Deployment

```bash
# List deployments
npx wrangler pages deployment list --project-name=2027

# Rollback to specific deployment
npx wrangler pages deployment rollback <deployment-id> --project-name=2027
```

## Troubleshooting

### Deployment Fails

**Symptom**: Deploy workflow fails

**Solution**:
1. Check workflow logs in Actions tab
2. Verify secrets are correctly set
3. Check build logs for errors
4. Review recent code changes

### Health Check Reports Unhealthy

**Symptom**: Site returns non-200 status

**Solution**:
1. Check Cloudflare Pages dashboard
2. Verify DNS settings
3. Check for recent failed deployments
4. Auto-repair will attempt to fix automatically

### Auto-Repair Fails

**Symptom**: Auto-repair workflow fails

**Solution**:
1. Check auto-repair logs
2. Verify Cloudflare API token permissions
3. Check for build errors
4. Manual deployment may be required

### Scripts Don't Run

**Symptom**: Permission denied

**Solution**:
```bash
# Make scripts executable
chmod +x scripts/*.sh
```

## Next Steps

1. ✅ Review full documentation: `CI_CD_DOCUMENTATION.md`
2. ✅ Set up branch protection rules (optional)
3. ✅ Configure notifications for workflow failures
4. ✅ Customize monitoring intervals
5. ✅ Set up custom domain in Cloudflare

## Getting Help

- **Documentation**: Read `CI_CD_DOCUMENTATION.md`
- **Issues**: Create an issue using the deployment-failure template
- **Logs**: Check Actions tab for detailed workflow logs
- **Cloudflare**: Check Cloudflare dashboard for deployment status

## Maintenance

### Regular Tasks

- **Weekly**: Review monitoring reports
- **Monthly**: Rotate API tokens (security best practice)
- **As Needed**: Update workflow versions

### Updating Workflows

To update workflows:
1. Edit files in `.github/workflows/`
2. Commit and push changes
3. Workflows update automatically

---

**Setup Time**: ~15 minutes  
**Maintenance**: Minimal (automated)  
**Support**: Via GitHub Issues

🎉 **Congratulations!** Your CI/CD system is now fully operational.
