# GitHub Actions Workflows Documentation

This directory contains comprehensive GitHub Actions workflows for the Medical Military Committee System (2027).

## 📋 Available Workflows

### 1. CI/CD Pipeline (`ci-cd.yml`)
**Trigger:** Push to `main`/`develop`, Pull Requests, Manual

**Purpose:** Complete continuous integration and delivery pipeline

**Jobs:**
- **Backend Build & Validation** - Compiles TypeScript backend, validates API structure
- **Frontend Build & Validation** - Builds React frontend with Vite, validates output
- **API Validation** - Tests API endpoints and server startup
- **Mobile UI Check** - Validates mobile compatibility (375x667 viewport - iPhone SE)
- **Desktop UI Check** - Validates desktop compatibility (1920x1080 viewport)
- **Build Summary** - Aggregates results from all jobs

**Artifacts:**
- Backend build output (`dist_server/`)
- Frontend build output (`dist/`)
- Mobile screenshots
- Desktop screenshots

**Duration:** ~5-8 minutes

---

### 2. PR Management (`pr-management.yml`)
**Trigger:** PR opened/reopened/synchronized/closed

**Purpose:** Automated pull request management and validation

**Features:**
- **Single Active PR Policy** - Warns when multiple PRs are open
- **PR Size Detection** - Labels PRs based on size (XS/S/M/L/XL)
- **Conventional Commits** - Validates PR title format
- **Auto-Assign Reviewers** - Adds review checklist to new PRs
- **PR Cleanup** - Comments on merged/closed PRs

**Labels Used:**
- `size/XS` - < 100 changes
- `size/S` - < 300 changes
- `size/M` - < 1000 changes
- `size/L` - < 3000 changes
- `size/XL` - 3000+ changes

---

### 3. Deploy to Cloudflare Pages (`deploy-cloudflare.yml`)
**Trigger:** Push to `main`, Manual dispatch

**Purpose:** Automated deployment with validation and audit logging

**Jobs:**
- **Build for Deployment** - Creates production build
- **Deploy to Cloudflare** - Deploys to Cloudflare Pages
- **Validate Deployment** - Tests deployment on desktop and mobile
- **Create Audit Log** - Generates comprehensive deployment log
- **Deployment Summary** - Reports deployment status

**Environments:**
- Production: `https://2027-5a0.pages.dev`
- Staging: (configurable)

**Audit Logs:**
- Stored as workflow artifacts (90-day retention)
- Include deployment metadata, timestamps, and status
- Comment posted on commit with deployment details

**Duration:** ~8-12 minutes

---

### 4. Auto Error Detection & Repair (`auto-repair.yml`)
**Trigger:** When CI/CD or Deploy workflows fail

**Purpose:** Automated error detection and repair attempts

**Process:**
1. **Detect Errors** - Analyzes failed workflow logs
2. **Categorize** - Identifies error type (backend/frontend/deployment/api)
3. **Create Issue** - Automatically creates tracking issue
4. **Attempt Repair** - Runs common repair actions:
   - Clear npm cache
   - Fresh dependency install
   - Rebuild affected component
5. **Test Repair** - Validates if repair fixed the issue
6. **Report Status** - Updates issue with repair result
7. **Close or Escalate** - Closes issue if fixed, escalates if manual intervention needed

**Error Categories:**
- `backend` - TypeScript compilation errors
- `frontend` - Vite build errors
- `deployment` - Cloudflare deployment errors
- `api` - API validation errors
- `unknown` - Uncategorized errors

---

## 🚀 Quick Start

### Initial Setup

1. **Configure Secrets** (Repository Settings → Secrets and variables → Actions):
   ```
   CLOUDFLARE_API_TOKEN    # Your Cloudflare API token
   CLOUDFLARE_ACCOUNT_ID   # Your Cloudflare account ID
   GITHUB_TOKEN            # Automatically provided by GitHub
   ```

2. **Create Labels** (for PR management):
   ```bash
   # Create size labels
   gh label create "size/XS" --color "0e8a16" --description "Extra small PR"
   gh label create "size/S" --color "1d76db" --description "Small PR"
   gh label create "size/M" --color "fbca04" --description "Medium PR"
   gh label create "size/L" --color "d93f0b" --description "Large PR"
   gh label create "size/XL" --color "b60205" --description "Extra large PR"
   
   # Create error labels
   gh label create "automated-error" --color "d93f0b" --description "Automated error detection"
   gh label create "needs-review" --color "fbca04" --description "Needs review"
   gh label create "auto-resolved" --color "0e8a16" --description "Auto-resolved by repair system"
   ```

3. **Enable Workflows**:
   - All workflows are enabled by default
   - Check Actions tab to verify they're running

### Usage

#### Running CI/CD
```bash
# Automatically triggered on push
git push origin main

# Or manually trigger
gh workflow run ci-cd.yml
```

#### Deploying to Cloudflare
```bash
# Automatically triggered on push to main
git push origin main

# Or manually deploy
gh workflow run deploy-cloudflare.yml -f environment=production
```

#### Testing Auto-Repair
The auto-repair workflow automatically runs when CI/CD or deployment fails. No manual trigger needed.

---

## 📊 Workflow Status Badges

Add these to your README.md:

```markdown
[![CI/CD Pipeline](https://github.com/Bomussa/2027/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/Bomussa/2027/actions/workflows/ci-cd.yml)
[![Deploy to Cloudflare](https://github.com/Bomussa/2027/actions/workflows/deploy-cloudflare.yml/badge.svg)](https://github.com/Bomussa/2027/actions/workflows/deploy-cloudflare.yml)
[![Auto Error Detection](https://github.com/Bomussa/2027/actions/workflows/auto-repair.yml/badge.svg)](https://github.com/Bomussa/2027/actions/workflows/auto-repair.yml)
```

---

## 🔧 Customization

### Adjusting Node Version
Edit the `NODE_VERSION` environment variable in each workflow:
```yaml
env:
  NODE_VERSION: '22.x'  # Change to your version
```

### Modifying Mobile Viewport
Edit the viewport settings in mobile tests:
```javascript
viewport: { width: 375, height: 667 }  // Default: iPhone SE
```

### Changing Deployment URL
Update the URL in `deploy-cloudflare.yml`:
```yaml
url: https://your-project.pages.dev
```

### Customizing PR Size Thresholds
Edit the size thresholds in `pr-management.yml`:
```javascript
if (total < 100) {
  sizeLabel = 'size/XS';
}
// Modify as needed
```

---

## 🐛 Troubleshooting

### Build Failures
1. Check workflow logs in Actions tab
2. Look for auto-repair issue created
3. Review error messages in job output
4. Run locally: `npm run build`

### Deployment Failures
1. Verify Cloudflare secrets are set correctly
2. Check Cloudflare account has proper permissions
3. Ensure project name matches: `2027`
4. Review deployment logs artifact

### Auto-Repair Not Working
1. Check if workflow has proper permissions
2. Verify issue creation is not disabled
3. Look at repair-summary in workflow run
4. Manual repair may be needed for complex errors

---

## 📈 Best Practices

1. **Small, Focused PRs** - Keep PRs under 300 lines for faster review
2. **Conventional Commits** - Use `feat:`, `fix:`, `docs:`, etc.
3. **Test Locally First** - Run `npm run build` before pushing
4. **Monitor Deployments** - Check validation screenshots after deploy
5. **Review Audit Logs** - Periodically review deployment logs
6. **Close Old PRs** - Maintain single active PR policy
7. **Update Dependencies** - Keep npm packages up to date

---

## 🔒 Security

- All secrets are stored securely in GitHub Secrets
- Workflows use least privilege permissions
- Audit logs track all deployments
- No sensitive data in workflow files
- GITHUB_TOKEN is automatically scoped to repository

---

## 📝 Maintenance

### Regular Tasks
- [ ] Review deployment logs monthly
- [ ] Update Node.js version quarterly
- [ ] Check for workflow updates
- [ ] Clean up old artifacts
- [ ] Review and close stale issues

### When to Update Workflows
- New deployment targets added
- Build process changes
- Additional validation needed
- Security updates required

---

## 🤝 Contributing

To modify workflows:
1. Create a feature branch
2. Update workflow files
3. Test changes carefully
4. Submit PR with clear description
5. Monitor first run after merge

---

## 📚 Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages/)
- [Playwright Documentation](https://playwright.dev/)
- [Conventional Commits](https://www.conventionalcommits.org/)

---

## 💬 Support

For issues or questions:
1. Check workflow logs first
2. Review this documentation
3. Look for auto-created issues
4. Check repository discussions
5. Contact repository maintainers

---

**Last Updated:** 2025-10-17  
**Workflow Version:** 1.0.0
