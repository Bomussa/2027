# GitHub Actions Workflow Architecture

## 🏗️ Workflow Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     DEVELOPER WORKFLOW                                  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ git push / PR
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     TRIGGER POINT                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                │
│  │ Push to      │  │ Pull Request │  │   Manual     │                │
│  │ main/develop │  │  Created     │  │   Trigger    │                │
│  └──────────────┘  └──────────────┘  └──────────────┘                │
└─────────────────────────────────────────────────────────────────────────┘
        │                    │                    │
        │                    │                    │
        ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   CI/CD         │  │  PR Management  │  │  Manual Deploy  │
│   Pipeline      │  │   Workflow      │  │   Workflow      │
└─────────────────┘  └─────────────────┘  └─────────────────┘
        │                    │                    │
        ▼                    ▼                    ▼

═══════════════════════════════════════════════════════════════════════════
                          CI/CD PIPELINE WORKFLOW
═══════════════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────────────┐
│  STAGE 1: BUILD & VALIDATION                                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────────┐        ┌──────────────────┐                     │
│  │  Backend Build   │        │  Frontend Build  │                     │
│  │  ──────────────  │        │  ───────────────  │                     │
│  │  • npm install   │        │  • npm install   │                     │
│  │  • tsc compile   │        │  • vite build    │                     │
│  │  • verify output │        │  • verify output │                     │
│  │  • upload        │        │  • upload dist/  │                     │
│  │    dist_server/  │        │                  │                     │
│  └────────┬─────────┘        └────────┬─────────┘                     │
│           │                           │                                │
│           └───────────┬───────────────┘                                │
│                       ▼                                                │
│           ┌───────────────────────┐                                    │
│           │   API Validation      │                                    │
│           │   ───────────────     │                                    │
│           │   • Check structure   │                                    │
│           │   • Validate routes   │                                    │
│           │   • Test server       │                                    │
│           └───────────┬───────────┘                                    │
└───────────────────────┼─────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  STAGE 2: UI COMPATIBILITY TESTING                                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────────┐        ┌──────────────────┐                     │
│  │  Mobile UI Test  │        │ Desktop UI Test  │                     │
│  │  ──────────────  │        │ ───────────────  │                     │
│  │  • Viewport:     │        │  • Viewport:     │                     │
│  │    375 x 667     │        │    1920 x 1080   │                     │
│  │  • iPhone SE UA  │        │  • Standard UA   │                     │
│  │  • Playwright    │        │  • Playwright    │                     │
│  │  • Screenshot    │        │  • Screenshot    │                     │
│  └────────┬─────────┘        └────────┬─────────┘                     │
│           │                           │                                │
│           └───────────┬───────────────┘                                │
│                       ▼                                                │
│           ┌───────────────────────┐                                    │
│           │   Build Summary       │                                    │
│           │   ─────────────       │                                    │
│           │   • Aggregate status  │                                    │
│           │   • Generate report   │                                    │
│           │   • Post summary      │                                    │
│           └───────────┬───────────┘                                    │
└───────────────────────┼─────────────────────────────────────────────────┘
                        │
                        ▼
                  ┌─────────┐
                  │ SUCCESS?│
                  └────┬────┘
                       │
                ┌──────┴──────┐
                │             │
               YES            NO
                │             │
                │             ▼
                │    ┌─────────────────┐
                │    │  AUTO-REPAIR    │
                │    │  WORKFLOW       │
                │    │  ───────────    │
                │    │  • Detect error │
                │    │  • Categorize   │
                │    │  • Create issue │
                │    │  • Attempt fix  │
                │    │  • Report status│
                │    └─────────────────┘
                │
                ▼

═══════════════════════════════════════════════════════════════════════════
                      PR MANAGEMENT WORKFLOW
═══════════════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────────────┐
│  PR Events: opened, reopened, synchronized, closed                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────────┐        ┌──────────────────┐                     │
│  │ Single PR Policy │        │  PR Validation   │                     │
│  │ ────────────────  │        │  ─────────────   │                     │
│  │ • Check open PRs │        │ • Validate title │                     │
│  │ • Warn if > 1    │        │ • Check size     │                     │
│  │ • Post comment   │        │ • Add label      │                     │
│  └──────────────────┘        └──────────────────┘                     │
│                                                                         │
│  ┌──────────────────┐        ┌──────────────────┐                     │
│  │  Auto-assign     │        │   PR Cleanup     │                     │
│  │  ────────────    │        │   ──────────     │                     │
│  │ • Add checklist  │        │ • On close       │                     │
│  │ • Welcome msg    │        │ • Post summary   │                     │
│  └──────────────────┘        └──────────────────┘                     │
└─────────────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════
                    CLOUDFLARE DEPLOYMENT WORKFLOW
═══════════════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────────────┐
│  STAGE 1: BUILD                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────┐       │
│  │  Production Build                                            │       │
│  │  • npm install                                               │       │
│  │  • npm run build (backend + frontend)                       │       │
│  │  • Verify outputs                                            │       │
│  │  • Upload artifacts                                          │       │
│  └──────────────────────────┬───────────────────────────────────┘       │
└────────────────────────────┼─────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  STAGE 2: DEPLOY                                                        │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────┐       │
│  │  Cloudflare Pages Deployment                                │       │
│  │  • Deploy dist/ to Cloudflare Pages                         │       │
│  │  • Create deployment record                                 │       │
│  │  • Generate deployment log (JSON)                           │       │
│  │  • Upload audit logs (90-day retention)                     │       │
│  └──────────────────────────┬───────────────────────────────────┘       │
└────────────────────────────┼─────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  STAGE 3: VALIDATION                                                    │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐        ┌──────────────────┐                     │
│  │ Desktop Validate │        │ Mobile Validate  │                     │
│  │ ────────────────  │        │ ───────────────  │                     │
│  │ • Load deployed  │        │ • Load deployed  │                     │
│  │   site (desktop) │        │   site (mobile)  │                     │
│  │ • Take screenshot│        │ • Take screenshot│                     │
│  │ • Verify loading │        │ • Verify loading │                     │
│  └────────┬─────────┘        └────────┬─────────┘                     │
│           │                           │                                │
│           └───────────┬───────────────┘                                │
└───────────────────────┼─────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  STAGE 4: AUDIT LOG                                                     │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────┐       │
│  │  Create Comprehensive Audit Log                             │       │
│  │  • Deployment metadata                                       │       │
│  │  • Build status                                              │       │
│  │  • Timestamps                                                │       │
│  │  • Actor information                                         │       │
│  │  • Environment details                                       │       │
│  │  • Post commit comment                                       │       │
│  │  • Generate summary                                          │       │
│  └──────────────────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════
                    AUTO-REPAIR WORKFLOW
═══════════════════════════════════════════════════════════════════════════

Triggered by: CI/CD or Deploy workflow failure

┌─────────────────────────────────────────────────────────────────────────┐
│  STAGE 1: DETECTION                                                     │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────┐       │
│  │  Detect Errors                                               │       │
│  │  • Analyze failed workflow logs                              │       │
│  │  • Identify failed jobs                                      │       │
│  │  • Categorize error type:                                    │       │
│  │    - backend    (TypeScript errors)                          │       │
│  │    - frontend   (Vite build errors)                          │       │
│  │    - deployment (Cloudflare errors)                          │       │
│  │    - api        (API validation errors)                      │       │
│  │  • Create tracking issue                                     │       │
│  └──────────────────────────┬───────────────────────────────────┘       │
└────────────────────────────┼─────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  STAGE 2: REPAIR                                                        │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────┐       │
│  │  Attempt Automated Repair                                    │       │
│  │  Common repairs:                                             │       │
│  │  • Clear npm cache                                           │       │
│  │  • Remove node_modules and package-lock.json                │       │
│  │  • Fresh npm install                                         │       │
│  │                                                              │       │
│  │  Category-specific repairs:                                 │       │
│  │  • backend    → npm run build:backend                       │       │
│  │  • frontend   → npm run build:frontend                      │       │
│  │  • deployment → full rebuild                                │       │
│  └──────────────────────────┬───────────────────────────────────┘       │
└────────────────────────────┼─────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  STAGE 3: VALIDATION                                                    │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────┐       │
│  │  Test Repair                                                 │       │
│  │  • Run npm run build                                         │       │
│  │  • Check if repair fixed the issue                          │       │
│  │  • Update tracking issue with status                        │       │
│  │  • If success: close issue                                  │       │
│  │  • If failure: escalate for manual intervention             │       │
│  └──────────────────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════
                    ARTIFACT FLOW
═══════════════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────────────┐
│  Artifact Storage & Retention                                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  CI/CD Artifacts (7 days):                                             │
│  ├─ backend-build          → dist_server/                              │
│  ├─ frontend-build         → dist/                                     │
│  ├─ mobile-screenshots     → mobile-view.png                           │
│  └─ desktop-screenshots    → desktop-view.png                          │
│                                                                         │
│  Deployment Artifacts:                                                 │
│  ├─ build-artifacts        → dist/ + dist_server/ (7 days)            │
│  ├─ deployment-logs-*      → deployment-*.json (90 days)              │
│  └─ validation-screenshots → desktop-view.png + mobile-view.png       │
│                              (30 days)                                  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════
                    WORKFLOW INTEGRATION
═══════════════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────────────┐
│  Complete Workflow Integration Flow                                     │
│                                                                         │
│  Developer                                                              │
│      │                                                                  │
│      ├─── Creates PR ────────────┐                                     │
│      │                           │                                     │
│      │                           ▼                                     │
│      │                    PR Management                                │
│      │                           │                                     │
│      │                           ▼                                     │
│      │                      CI/CD Pipeline ──┐                         │
│      │                           │           │                         │
│      │                           ▼           │ (if fails)              │
│      │                      ┌────────┐       │                         │
│      │                      │SUCCESS?│       │                         │
│      │                      └────┬───┘       │                         │
│      │                           │           │                         │
│      │                          YES          │                         │
│      │                           │           │                         │
│      ├─── Merges PR ─────────────┤           │                         │
│      │                           │           │                         │
│      │                           ▼           ▼                         │
│      │                    CI/CD Pipeline  Auto-Repair                  │
│      │                           │           │                         │
│      │                           ▼           │                         │
│      │                  Cloudflare Deploy    │                         │
│      │                           │           │                         │
│      │                           ▼           │                         │
│      │                    Validation         │                         │
│      │                           │           │                         │
│      │                           ▼           │                         │
│      │                      Audit Log        │                         │
│      │                           │           │                         │
│      └───────────────────────────┴───────────┘                         │
│                                 │                                      │
│                                 ▼                                      │
│                           Production                                   │
│                    https://2027-5a0.pages.dev                         │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════
```

## 🔑 Key Components

### Workflow Files
- `ci-cd.yml` - Main build and validation pipeline
- `pr-management.yml` - PR lifecycle automation
- `deploy-cloudflare.yml` - Cloudflare Pages deployment
- `auto-repair.yml` - Error detection and repair

### Documentation
- `WORKFLOWS_GUIDE.md` - Complete integration guide
- `workflows/README.md` - Workflow reference
- `QUICK_REFERENCE.md` - Command cheat sheet
- `IMPLEMENTATION_SUMMARY.md` - Implementation overview

### Tools
- `setup-workflows.sh` - Automated setup
- `validate-workflows.sh` - Configuration validation

## 📊 Workflow Metrics

| Workflow | Jobs | Steps | Avg Duration |
|----------|------|-------|--------------|
| CI/CD Pipeline | 6 | 30+ | 5-8 min |
| PR Management | 5 | 15+ | 1-2 min |
| Cloudflare Deploy | 5 | 25+ | 8-12 min |
| Auto-Repair | 4 | 20+ | 3-5 min |

## 🎯 Integration Points

1. **GitHub Repository** - All workflows triggered by repository events
2. **Cloudflare Pages** - Deployment target for production
3. **Playwright** - UI testing framework
4. **npm/Node.js** - Build and dependency management
5. **GitHub API** - PR management and issue creation

---

**Architecture Version:** 1.0.0  
**Last Updated:** 2025-10-17
