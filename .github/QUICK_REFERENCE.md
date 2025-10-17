# GitHub Actions Workflows - Quick Reference Card

## 🚀 Quick Commands

### Trigger Workflows Manually

```bash
# Trigger CI/CD Pipeline
gh workflow run ci-cd.yml

# Trigger Deployment (production)
gh workflow run deploy-cloudflare.yml -f environment=production

# Trigger Deployment (staging)
gh workflow run deploy-cloudflare.yml -f environment=staging

# List all workflows
gh workflow list

# View workflow runs
gh run list

# View specific run
gh run view <run-id>

# Watch workflow run in real-time
gh run watch
```

### Check Workflow Status

```bash
# List recent runs
gh run list --limit 5

# View logs for latest run
gh run view --log

# Download artifacts from run
gh run download <run-id>

# View workflow file
gh workflow view ci-cd.yml
```

### Work with PRs

```bash
# Create PR (triggers PR management workflow)
gh pr create --title "feat: add feature" --body "Description"

# List open PRs
gh pr list

# View PR checks
gh pr checks <pr-number>

# Merge PR (triggers deployment)
gh pr merge <pr-number>
```

## 📊 Workflow Overview

| Workflow | Triggers | Duration | Purpose |
|----------|----------|----------|---------|
| CI/CD Pipeline | Push to main/develop, PRs | ~5-8 min | Build validation, UI testing |
| PR Management | PR opened/updated/closed | ~1-2 min | PR lifecycle automation |
| Cloudflare Deploy | Push to main, Manual | ~8-12 min | Production deployment |
| Auto-Repair | Failed workflows | ~3-5 min | Error detection & repair |

## 🏷️ PR Size Labels

| Label | Changes | Review Time | Notes |
|-------|---------|-------------|-------|
| size/XS | < 100 | 5-10 min | Ideal size |
| size/S | < 300 | 15-30 min | Good size |
| size/M | < 1000 | 30-60 min | Consider splitting |
| size/L | < 3000 | 1-2 hours | Should split |
| size/XL | 3000+ | 2+ hours | Must split |

## 🎯 Conventional Commit Prefixes

```
feat:     New feature
fix:      Bug fix
docs:     Documentation changes
style:    Code style changes (formatting)
refactor: Code refactoring
perf:     Performance improvements
test:     Test changes
build:    Build system changes
ci:       CI/CD changes
chore:    Maintenance tasks
revert:   Revert previous commit
```

## 📱 UI Testing Viewports

| Device | Width | Height | Use Case |
|--------|-------|--------|----------|
| Mobile | 375px | 667px | iPhone SE, small phones |
| Desktop | 1920px | 1080px | Full HD monitors |

## 🔍 Error Categories

| Category | Description | Auto-Repair |
|----------|-------------|-------------|
| backend | TypeScript compilation errors | ✅ Yes |
| frontend | Vite build errors | ✅ Yes |
| deployment | Cloudflare deployment errors | ✅ Partial |
| api | API validation errors | ✅ Partial |
| unknown | Uncategorized errors | ⚠️ Limited |

## 🔐 Required Secrets

| Secret | Description | Where to Get |
|--------|-------------|--------------|
| CLOUDFLARE_API_TOKEN | API token with Pages permission | [Cloudflare Dashboard](https://dash.cloudflare.com/profile/api-tokens) |
| CLOUDFLARE_ACCOUNT_ID | Account identifier | Cloudflare Dashboard sidebar |
| GITHUB_TOKEN | Auto-provided | N/A (automatic) |

## 📦 Artifacts Generated

| Workflow | Artifact | Retention | Contents |
|----------|----------|-----------|----------|
| CI/CD | backend-build | 7 days | dist_server/ |
| CI/CD | frontend-build | 7 days | dist/ |
| CI/CD | mobile-screenshots | 7 days | Mobile UI screenshots |
| CI/CD | desktop-screenshots | 7 days | Desktop UI screenshots |
| Deploy | build-artifacts | 7 days | Complete build output |
| Deploy | deployment-logs-* | 90 days | Deployment metadata JSON |
| Deploy | deployment-validation-screenshots | 30 days | Production validation screenshots |

## 🎨 Status Badge URLs

```markdown
[![CI/CD](https://github.com/Bomussa/2027/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/Bomussa/2027/actions/workflows/ci-cd.yml)
[![Deploy](https://github.com/Bomussa/2027/actions/workflows/deploy-cloudflare.yml/badge.svg)](https://github.com/Bomussa/2027/actions/workflows/deploy-cloudflare.yml)
[![PR Mgmt](https://github.com/Bomussa/2027/actions/workflows/pr-management.yml/badge.svg)](https://github.com/Bomussa/2027/actions/workflows/pr-management.yml)
```

## 🐛 Quick Troubleshooting

### Build Fails

```bash
# Local build test
npm ci --legacy-peer-deps
npm run build

# Clear cache and retry
npm cache clean --force
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
npm run build
```

### Deployment Fails

```bash
# Check secrets
gh secret list

# Verify Cloudflare config
cat wrangler.toml

# Manual deploy test
npm run build
npx wrangler pages deploy dist --project-name=2027
```

### Workflows Not Triggering

```bash
# Check if workflows are enabled
gh workflow list

# Enable workflow
gh workflow enable <workflow-name>

# View workflow file
cat .github/workflows/<workflow>.yml
```

## 📈 Monitoring Commands

```bash
# View all recent runs
gh run list --limit 20

# View failed runs
gh run list --status failure

# View running workflows
gh run list --status in_progress

# View completed runs
gh run list --status completed

# Watch specific workflow
gh run watch --workflow=ci-cd.yml
```

## 🔄 Common Workflows

### Creating a Feature

```bash
# 1. Create branch
git checkout -b feature/my-feature

# 2. Make changes
# ... edit files ...

# 3. Commit
git add .
git commit -m "feat: add my feature"

# 4. Push
git push origin feature/my-feature

# 5. Create PR
gh pr create --title "feat: add my feature" --body "Description"

# 6. Monitor CI
gh pr checks

# 7. Merge when ready
gh pr merge --auto
```

### Deploying to Production

```bash
# Option 1: Merge to main (automatic)
git checkout main
git merge develop
git push origin main

# Option 2: Manual trigger
gh workflow run deploy-cloudflare.yml -f environment=production

# Monitor deployment
gh run watch

# Verify deployment
curl https://2027-5a0.pages.dev
```

### Handling Failed Build

```bash
# 1. Check auto-repair issue
gh issue list --label automated-error

# 2. View workflow logs
gh run view --log

# 3. If auto-repair failed, fix manually
# ... make fixes ...

# 4. Commit and push
git add .
git commit -m "fix: resolve build issue"
git push

# 5. Monitor new run
gh run watch
```

## 🔗 Useful Links

- **Repository:** https://github.com/Bomussa/2027
- **Actions Tab:** https://github.com/Bomussa/2027/actions
- **Cloudflare Pages:** https://2027-5a0.pages.dev
- **Workflow Guide:** `.github/WORKFLOWS_GUIDE.md`
- **Workflow README:** `.github/workflows/README.md`

## 💡 Pro Tips

1. **Always test locally first:** `npm run build`
2. **Keep PRs small:** Aim for < 300 line changes
3. **Use conventional commits:** Helps with automatic changelog
4. **Review screenshots:** Check mobile/desktop artifacts after builds
5. **Monitor auto-repair:** Check if errors self-resolve
6. **Close old PRs:** Maintain single active PR policy
7. **Review audit logs:** Monthly deployment log review
8. **Update regularly:** Keep dependencies current

## 📞 Need Help?

1. Check workflow logs: `gh run view --log`
2. Review documentation: `.github/WORKFLOWS_GUIDE.md`
3. Search issues: `gh issue list`
4. Create issue: `gh issue create`

---

**Quick Setup:** Run `.github/setup-workflows.sh` to configure labels and get setup instructions.

**Last Updated:** 2025-10-17
