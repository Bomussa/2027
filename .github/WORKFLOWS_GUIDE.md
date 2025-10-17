# GitHub Actions Workflow Integration Guide

## 🎯 Overview

This document provides a comprehensive guide to the GitHub Actions workflows implemented for the Medical Military Committee System (2027) repository. The workflows provide complete CI/CD automation, including build validation, deployment, error detection, and audit logging.

## 📦 What Was Implemented

### 1. Core Workflows

#### **CI/CD Pipeline** (`ci-cd.yml`)
Comprehensive continuous integration and delivery pipeline that validates all aspects of the application.

**Features:**
- ✅ Backend TypeScript compilation and validation
- ✅ Frontend Vite build and validation
- ✅ API endpoint structure validation
- ✅ Mobile UI compatibility testing (iPhone SE viewport: 375x667)
- ✅ Desktop UI compatibility testing (Full HD viewport: 1920x1080)
- ✅ Automated screenshot capture for UI validation
- ✅ Build artifact management with 7-day retention
- ✅ Comprehensive build status summary

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests targeting `main` or `develop`
- Manual workflow dispatch

#### **PR Management** (`pr-management.yml`)
Automated pull request lifecycle management with quality controls.

**Features:**
- ✅ **Single Active PR Policy Enforcement** - Warns when multiple PRs are open
- ✅ **PR Size Detection and Labeling** - Automatically labels based on changes:
  - `size/XS`: < 100 changes
  - `size/S`: < 300 changes
  - `size/M`: < 1000 changes
  - `size/L`: < 3000 changes
  - `size/XL`: 3000+ changes
- ✅ **Conventional Commit Validation** - Checks PR title format
- ✅ **Auto-Generated Review Checklist** - Adds checklist to new PRs
- ✅ **Automated PR Comments** - Status updates and merge notifications
- ✅ **PR Status Summary** - Detailed metrics in workflow summary

**Triggers:**
- Pull request opened/reopened/synchronized/closed

#### **Cloudflare Pages Deployment** (`deploy-cloudflare.yml`)
Automated deployment with comprehensive validation and audit logging.

**Features:**
- ✅ Production build creation
- ✅ Deployment to Cloudflare Pages
- ✅ **Desktop Deployment Validation** (1920x1080)
- ✅ **Mobile Deployment Validation** (375x667, iPhone SE UA)
- ✅ Validation screenshot capture
- ✅ **Comprehensive Audit Logging**:
  - Deployment metadata
  - Build status
  - Timestamps
  - Actor information
  - Environment details
- ✅ Commit comment with deployment status
- ✅ 90-day audit log retention
- ✅ Deployment summary with all details

**Triggers:**
- Push to `main` branch
- Manual workflow dispatch with environment selection

**Deployment Target:**
- Production: `https://2027-5a0.pages.dev`

#### **Auto Error Detection & Repair** (`auto-repair.yml`)
Intelligent error detection and automated repair system.

**Features:**
- ✅ **Automated Error Detection** from failed workflows
- ✅ **Error Categorization** (backend/frontend/deployment/api)
- ✅ **Automatic Issue Creation** for tracking
- ✅ **Automated Repair Attempts**:
  - npm cache clearing
  - Fresh dependency installation
  - Component-specific rebuilds
- ✅ **Repair Validation** - Tests if repair fixed the issue
- ✅ **Status Reporting** - Updates tracking issue
- ✅ **Auto-Close on Success** - Closes issue if repair worked
- ✅ **Escalation for Manual Intervention** when repair fails

**Triggers:**
- When CI/CD or Deployment workflows fail

**Error Types Handled:**
- `backend` - TypeScript compilation errors
- `frontend` - Vite build errors
- `deployment` - Cloudflare deployment errors
- `api` - API validation errors
- `unknown` - Uncategorized errors

## 🔧 Setup Requirements

### Required Secrets

Configure in Repository Settings → Secrets and variables → Actions:

```
CLOUDFLARE_API_TOKEN    # Cloudflare API token with Pages deploy permission
CLOUDFLARE_ACCOUNT_ID   # Your Cloudflare account ID
```

**Note:** `GITHUB_TOKEN` is automatically provided by GitHub Actions.

### Getting Cloudflare Credentials

1. **API Token:**
   - Go to Cloudflare Dashboard → My Profile → API Tokens
   - Create token with "Cloudflare Pages" permissions
   - Copy the token

2. **Account ID:**
   - Go to Cloudflare Dashboard
   - Select your domain
   - Find Account ID in the sidebar

### Required Labels

Create these labels in your repository for PR management:

```bash
# Size labels
gh label create "size/XS" --color "0e8a16" --description "Extra small PR (< 100 changes)"
gh label create "size/S" --color "1d76db" --description "Small PR (< 300 changes)"
gh label create "size/M" --color "fbca04" --description "Medium PR (< 1000 changes)"
gh label create "size/L" --color "d93f0b" --description "Large PR (< 3000 changes)"
gh label create "size/XL" --color "b60205" --description "Extra large PR (3000+ changes)"

# Error detection labels
gh label create "automated-error" --color "d93f0b" --description "Automated error detection"
gh label create "needs-review" --color "fbca04" --description "Needs manual review"
gh label create "auto-resolved" --color "0e8a16" --description "Auto-resolved by repair system"
gh label create "backend" --color "fef2c0" --description "Backend related"
gh label create "frontend" --color "bfdadc" --description "Frontend related"
gh label create "deployment" --color "c5def5" --description "Deployment related"
gh label create "api" --color "f9d0c4" --description "API related"
```

Or create via GitHub UI:
- Go to Issues → Labels → New label
- Add each label with the specified color and description

## 🚀 Usage Guide

### Development Workflow

1. **Create Feature Branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes and Commit:**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   git push origin feature/your-feature-name
   ```

3. **Create Pull Request:**
   - GitHub will automatically run CI/CD pipeline
   - PR Management workflow will add labels and checklist
   - Review the build status and screenshots

4. **Review and Merge:**
   - Wait for all checks to pass
   - Address any issues found
   - Merge when ready

5. **Automatic Deployment:**
   - On merge to `main`, deployment workflow triggers
   - Application deploys to Cloudflare Pages
   - Validation runs on desktop and mobile
   - Audit log created

### Manual Deployment

```bash
# Deploy to production
gh workflow run deploy-cloudflare.yml -f environment=production

# Deploy to staging (if configured)
gh workflow run deploy-cloudflare.yml -f environment=staging
```

### Monitoring Deployments

1. **Check Workflow Status:**
   - Go to Actions tab in GitHub
   - Find the deployment run
   - Review job statuses

2. **View Screenshots:**
   - Click on completed workflow
   - Download "deployment-validation-screenshots" artifact
   - Review desktop-view.png and mobile-view.png

3. **Review Audit Logs:**
   - Download "deployment-logs-*" artifact
   - Check deployment JSON for metadata
   - Review commit comments for summary

### Handling Failed Builds

The auto-repair workflow automatically activates when builds fail:

1. **Automatic Response:**
   - Error detection runs immediately
   - Issue created with error details
   - Repair attempts common fixes
   - Issue updated with repair status

2. **If Auto-Repair Succeeds:**
   - Issue closed automatically
   - Build can be retried
   - Normal workflow resumes

3. **If Manual Intervention Needed:**
   - Issue remains open with details
   - Review workflow logs
   - Apply manual fixes
   - Push changes to trigger new build

## 📊 Monitoring and Metrics

### Workflow Badges

Add to your README.md to show status:

```markdown
[![CI/CD Pipeline](https://github.com/Bomussa/2027/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/Bomussa/2027/actions/workflows/ci-cd.yml)
[![Deploy to Cloudflare](https://github.com/Bomussa/2027/actions/workflows/deploy-cloudflare.yml/badge.svg)](https://github.com/Bomussa/2027/actions/workflows/deploy-cloudflare.yml)
[![PR Management](https://github.com/Bomussa/2027/actions/workflows/pr-management.yml/badge.svg)](https://github.com/Bomussa/2027/actions/workflows/pr-management.yml)
```

### Key Metrics to Track

- **Build Success Rate:** % of successful CI/CD runs
- **Deployment Frequency:** Number of deployments per week
- **Auto-Repair Success Rate:** % of errors auto-fixed
- **PR Review Time:** Time from PR open to merge
- **Average PR Size:** Track if PRs are appropriately sized

### Audit Log Review

Regularly review deployment logs to:
- Track deployment history
- Identify patterns in failures
- Monitor deployment frequency
- Verify deployment validation

## 🔍 Troubleshooting

### Build Failures

**Symptom:** CI/CD pipeline fails

**Steps:**
1. Check workflow logs in Actions tab
2. Look for red X on failed job
3. Click on failed job to see logs
4. Check if auto-repair issue was created
5. Review error messages

**Common Issues:**
- Dependency installation failures → Clear cache and retry
- TypeScript compilation errors → Check type definitions
- Vite build errors → Check import paths and configs

### Deployment Failures

**Symptom:** Deploy workflow fails

**Steps:**
1. Verify Cloudflare secrets are set correctly
2. Check Cloudflare account permissions
3. Ensure project name matches: `2027`
4. Review deployment logs

**Common Issues:**
- Invalid API token → Regenerate and update secret
- Account ID mismatch → Verify account ID
- Project not found → Create project in Cloudflare Pages
- Build size too large → Check build output size

### PR Management Issues

**Symptom:** Labels not applied or comments not posted

**Steps:**
1. Verify labels exist in repository
2. Check GITHUB_TOKEN permissions
3. Review workflow logs for API errors

**Common Issues:**
- Labels don't exist → Create them manually
- Permission denied → Check repository settings
- API rate limits → Wait and retry

### Auto-Repair Not Triggering

**Symptom:** Failed workflow doesn't trigger auto-repair

**Steps:**
1. Check if workflow_run trigger is enabled
2. Verify workflow has write permissions
3. Check if initial failure was in correct workflow

**Common Issues:**
- Workflow not completed → Must finish before trigger
- Wrong workflow → Only CI/CD and Deploy trigger repair
- Permissions issue → Check workflow permissions

## 🛡️ Security Considerations

### Secrets Management
- All sensitive data in GitHub Secrets
- Secrets never logged or exposed
- Tokens have minimal required permissions
- Regular secret rotation recommended

### Workflow Permissions
- GITHUB_TOKEN auto-scoped to repository
- Workflows use least privilege principle
- No external secret access except Cloudflare

### Audit Trail
- All deployments logged with metadata
- 90-day retention for compliance
- Actor tracking for accountability
- Commit association for traceability

## 📈 Best Practices

### For Developers

1. **Keep PRs Small:** Aim for < 300 changes for faster review
2. **Use Conventional Commits:** `feat:`, `fix:`, `docs:`, etc.
3. **Test Locally First:** Run `npm run build` before pushing
4. **Review Screenshots:** Check UI screenshots after deployment
5. **Close Completed PRs:** Follow single PR policy

### For Maintainers

1. **Monitor Workflows:** Regularly check Actions tab
2. **Review Audit Logs:** Monthly audit log review
3. **Update Dependencies:** Keep npm packages current
4. **Clean Old Issues:** Close resolved auto-error issues
5. **Document Changes:** Update workflows README when modified

### For DevOps

1. **Secret Rotation:** Rotate Cloudflare tokens quarterly
2. **Workflow Updates:** Keep actions versions current
3. **Artifact Cleanup:** Manage artifact storage
4. **Performance Monitoring:** Track workflow execution times
5. **Cost Management:** Monitor GitHub Actions minutes

## 🔄 Continuous Improvement

### Planned Enhancements

- Integration tests for API endpoints
- E2E tests with Playwright
- Performance budgets and monitoring
- Automatic dependency updates (Dependabot)
- Slack/Discord notifications
- Multiple environment support
- Blue-green deployment strategy

### Feedback and Contributions

To suggest improvements:
1. Create an issue with [Workflow] prefix
2. Describe the enhancement
3. Provide use case and benefits
4. Submit PR if implementing

## 📞 Support

### Getting Help

1. **Check Documentation:** Review this guide and workflows README
2. **Search Issues:** Look for similar problems
3. **Workflow Logs:** Always check logs first
4. **Create Issue:** If problem persists, create detailed issue

### Reporting Bugs

Include:
- Workflow name and run number
- Error messages from logs
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable

## 📚 Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
- [Playwright Documentation](https://playwright.dev/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)

## 🎉 Success Criteria

Your workflows are working correctly when:

✅ All four workflows appear in Actions tab  
✅ Badges show passing status in README  
✅ PRs automatically get size labels and checklists  
✅ Builds complete in under 10 minutes  
✅ Deployments succeed with validation screenshots  
✅ Failed builds trigger auto-repair attempts  
✅ Audit logs are created for each deployment  
✅ Single PR policy warnings appear when needed  

---

**Version:** 1.0.0  
**Last Updated:** 2025-10-17  
**Maintainer:** Bomussa/2027 Team
