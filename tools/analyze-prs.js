#!/usr/bin/env node

/**
 * Pull Request Analysis Tool
 * 
 * This script analyzes all open pull requests in the repository and identifies
 * those that are redundant or outdated, excluding PR #18.
 * 
 * Usage: node tools/analyze-prs.js
 */

import https from 'https';
import fs from 'fs';
import path from 'path';

const REPO_OWNER = 'Bomussa';
const REPO_NAME = '2027';
const EXCLUDED_PR = 18;
const API_BASE = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}`;

/**
 * Makes an HTTPS GET request to the GitHub API
 */
function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: path,
      method: 'GET',
      headers: {
        'User-Agent': 'PR-Analysis-Tool',
        'Accept': 'application/vnd.github.v3+json'
      }
    };

    https.get(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            resolve(JSON.parse(data));
          } catch (error) {
            reject(new Error(`Failed to parse JSON response: ${error.message}`));
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    }).on('error', reject);
  });
}

/**
 * Fetches all open pull requests
 */
async function getOpenPRs() {
  const path = `/repos/${REPO_OWNER}/${REPO_NAME}/pulls?state=open&per_page=100`;
  return makeRequest(path);
}

/**
 * Analyzes PR similarity based on titles and descriptions
 */
function analyzeSimilarity(pr1, pr2) {
  const title1 = pr1.title.toLowerCase();
  const title2 = pr2.title.toLowerCase();
  const body1 = (pr1.body || '').toLowerCase();
  const body2 = (pr2.body || '').toLowerCase();

  // Check for common keywords that indicate similar functionality
  const keywords = [
    'device compatibility', 'fix device', 'ios android desktop',
    'frontend', 'react', 'deploy', 'cloudflare',
    'ci/cd', 'github actions', 'workflow',
    'build', 'vite', 'merge conflict'
  ];

  let sharedKeywords = 0;
  for (const keyword of keywords) {
    if ((title1.includes(keyword) || body1.includes(keyword)) &&
        (title2.includes(keyword) || body2.includes(keyword))) {
      sharedKeywords++;
    }
  }

  return sharedKeywords;
}

/**
 * Determines if a PR is outdated based on its age and update time
 */
function isOutdated(pr) {
  const created = new Date(pr.created_at);
  const updated = new Date(pr.updated_at);
  const now = new Date();
  
  const daysSinceCreation = (now - created) / (1000 * 60 * 60 * 24);
  const daysSinceUpdate = (now - updated) / (1000 * 60 * 60 * 24);
  
  // Consider outdated if:
  // - Created more than 7 days ago and not updated in last 3 days
  // - Or created more than 14 days ago
  return (daysSinceCreation > 7 && daysSinceUpdate > 3) || daysSinceCreation > 14;
}

/**
 * Categorizes PRs by their primary focus using explicit priority and keyword configuration
 */
function categorizePR(pr) {
  const title = pr.title.toLowerCase();
  const body = (pr.body || '').toLowerCase();
  const combined = title + ' ' + body;

  // Configuration object: category -> keywords (priority = order)
  const CATEGORY_KEYWORDS = [
    { name: 'device-compatibility', keywords: ['device compatibility', 'ios', 'android'] },
    { name: 'frontend-deployment', keywords: ['frontend', 'react', 'deploy', 'vite', 'cloudflare pages'] },
    { name: 'ci-cd', keywords: ['ci/cd', 'github actions', 'workflow', 'cloudflare pages'] },
    { name: 'merge-conflict', keywords: ['merge conflict'] },
    { name: 'copilot-setup', keywords: ['copilot instructions'] }
  ];

  for (const category of CATEGORY_KEYWORDS) {
    for (const keyword of category.keywords) {
      if (combined.includes(keyword)) {
        return category.name;
      }
    }
  }
  return 'other';
}

/**
 * Generates a detailed analysis report
 */
function generateReport(prs, redundantGroups, outdatedPRs) {
  console.log('\n' + '='.repeat(80));
  console.log('PULL REQUEST ANALYSIS REPORT');
  console.log('Repository: Bomussa/2027');
  console.log('Date: ' + new Date().toISOString());
  console.log('Excluded PRs: #' + EXCLUDED_PR);
  console.log('='.repeat(80) + '\n');

  // Summary
  console.log('SUMMARY');
  console.log('-'.repeat(80));
  console.log(`Total Open PRs: ${prs.length + 1} (including excluded #${EXCLUDED_PR})`);
  console.log(`Analyzed PRs: ${prs.length} (excluding #${EXCLUDED_PR})`);
  console.log(`Redundant PR Groups: ${redundantGroups.length}`);
  console.log(`Outdated PRs: ${outdatedPRs.length}`);
  console.log('');

  // All Open PRs
  console.log('ALL OPEN PULL REQUESTS');
  console.log('-'.repeat(80));
  prs.forEach(pr => {
    const age = Math.floor((new Date() - new Date(pr.created_at)) / (1000 * 60 * 60 * 24));
    const category = categorizePR(pr);
    const isDraft = pr.draft ? ' [DRAFT]' : '';
    console.log(`\nPR #${pr.number}${isDraft}: ${pr.title}`);
    console.log(`  Created: ${pr.created_at.split('T')[0]} (${age} days ago)`);
    console.log(`  Updated: ${pr.updated_at.split('T')[0]}`);
    console.log(`  Category: ${category}`);
    console.log(`  URL: ${pr.html_url}`);
  });

  // Excluded PR
  console.log('\n\nEXCLUDED FROM ANALYSIS');
  console.log('-'.repeat(80));
  console.log(`PR #${EXCLUDED_PR} is excluded from redundancy analysis per requirements.`);
  console.log('This PR contains comprehensive GitHub Actions CI/CD workflow system.');

  // Redundant PRs
  if (redundantGroups.length > 0) {
    console.log('\n\nREDUNDANT PULL REQUESTS');
    console.log('-'.repeat(80));
    redundantGroups.forEach((group, index) => {
      console.log(`\nGroup ${index + 1}: ${group.category}`);
      console.log(`These PRs address similar functionality and may be redundant:\n`);
      group.prs.forEach(pr => {
        console.log(`  • PR #${pr.number}: ${pr.title}`);
        console.log(`    Created: ${pr.created_at.split('T')[0]}, Draft: ${pr.draft ? 'Yes' : 'No'}`);
        console.log(`    URL: ${pr.html_url}`);
      });
      console.log(`\n  Recommendation: Review and consolidate these PRs. Consider:`);
      console.log(`  - Closing older/draft PRs in favor of more complete ones`);
      console.log(`  - Merging the best implementation if they solve the same problem`);
      console.log(`  - Keeping only one PR per feature/fix`);
    });
  } else {
    console.log('\n\nREDUNDANT PULL REQUESTS');
    console.log('-'.repeat(80));
    console.log('No redundant PR groups found.');
  }

  // Outdated PRs
  if (outdatedPRs.length > 0) {
    console.log('\n\nOUTDATED PULL REQUESTS');
    console.log('-'.repeat(80));
    console.log('These PRs have not been updated recently and may need attention:\n');
    outdatedPRs.forEach(pr => {
      const daysSinceUpdate = Math.floor((new Date() - new Date(pr.updated_at)) / (1000 * 60 * 60 * 24));
      console.log(`  • PR #${pr.number}: ${pr.title}`);
      console.log(`    Last updated: ${daysSinceUpdate} days ago`);
      console.log(`    URL: ${pr.html_url}`);
    });
    console.log(`\n  Recommendation: Review these PRs to determine if they should be:`);
    console.log(`  - Updated and continued`);
    console.log(`  - Closed as no longer relevant`);
    console.log(`  - Superseded by newer PRs`);
  } else {
    console.log('\n\nOUTDATED PULL REQUESTS');
    console.log('-'.repeat(80));
    console.log('No outdated PRs found. All PRs have been recently updated.');
  }

  // Recommendations
  console.log('\n\nRECOMMENDATIONS');
  console.log('-'.repeat(80));
  console.log('1. Address redundant PRs by consolidating similar changes');
  console.log('2. Review outdated PRs and decide on their fate');
  console.log('3. Keep PR #18 (CI/CD workflow) as it provides comprehensive automation');
  console.log('4. Consider closing draft PRs that are superseded by newer implementations');
  console.log('5. Prioritize merging non-redundant, up-to-date PRs');
  
  console.log('\n' + '='.repeat(80));
  console.log('END OF REPORT');
  console.log('='.repeat(80) + '\n');
}

/**
 * Saves the report to a markdown file
 */
function saveReportToFile(prs, redundantGroups, outdatedPRs) {
  const lines = [];
  
  lines.push('# Pull Request Analysis Report');
  lines.push('');
  lines.push(`**Repository:** Bomussa/2027  `);
  lines.push(`**Date:** ${new Date().toISOString()}  `);
  lines.push(`**Excluded PRs:** #${EXCLUDED_PR}  `);
  lines.push('');

  // Summary
  lines.push('## Summary');
  lines.push('');
  lines.push(`- **Total Open PRs:** ${prs.length + 1} (including excluded #${EXCLUDED_PR})`);
  lines.push(`- **Analyzed PRs:** ${prs.length} (excluding #${EXCLUDED_PR})`);
  lines.push(`- **Redundant PR Groups:** ${redundantGroups.length}`);
  lines.push(`- **Outdated PRs:** ${outdatedPRs.length}`);
  lines.push('');

  // All Open PRs
  lines.push('## All Open Pull Requests');
  lines.push('');
  prs.forEach(pr => {
    const age = Math.floor((new Date() - new Date(pr.created_at)) / (1000 * 60 * 60 * 24));
    const category = categorizePR(pr);
    const isDraft = pr.draft ? ' 🔸' : ' ✅';
    lines.push(`### ${isDraft} PR #${pr.number}: ${pr.title}`);
    lines.push('');
    lines.push(`- **Created:** ${pr.created_at.split('T')[0]} (${age} days ago)`);
    lines.push(`- **Updated:** ${pr.updated_at.split('T')[0]}`);
    lines.push(`- **Category:** ${category}`);
    lines.push(`- **Status:** ${pr.draft ? 'Draft' : 'Ready for Review'}`);
    lines.push(`- **URL:** ${pr.html_url}`);
    lines.push('');
  });

  // Excluded PR
  lines.push('## Excluded from Analysis');
  lines.push('');
  lines.push(`**PR #${EXCLUDED_PR}** is excluded from redundancy analysis per requirements.`);
  lines.push('This PR contains a comprehensive GitHub Actions CI/CD workflow system.');
  lines.push('');

  // Redundant PRs
  lines.push('## Redundant Pull Requests');
  lines.push('');
  if (redundantGroups.length > 0) {
    redundantGroups.forEach((group, index) => {
      lines.push(`### Group ${index + 1}: ${group.category}`);
      lines.push('');
      lines.push('These PRs address similar functionality and may be redundant:');
      lines.push('');
      group.prs.forEach(pr => {
        lines.push(`- **PR #${pr.number}:** ${pr.title}`);
        lines.push(`  - Created: ${pr.created_at.split('T')[0]}, Draft: ${pr.draft ? 'Yes' : 'No'}`);
        lines.push(`  - [View PR](${pr.html_url})`);
      });
      lines.push('');
      lines.push('**Recommendation:** Review and consolidate these PRs. Consider:');
      lines.push('- Closing older/draft PRs in favor of more complete ones');
      lines.push('- Merging the best implementation if they solve the same problem');
      lines.push('- Keeping only one PR per feature/fix');
      lines.push('');
    });
  } else {
    lines.push('No redundant PR groups found.');
    lines.push('');
  }

  // Outdated PRs
  lines.push('## Outdated Pull Requests');
  lines.push('');
  if (outdatedPRs.length > 0) {
    lines.push('These PRs have not been updated recently and may need attention:');
    lines.push('');
    outdatedPRs.forEach(pr => {
      const daysSinceUpdate = Math.floor((new Date() - new Date(pr.updated_at)) / (1000 * 60 * 60 * 24));
      lines.push(`- **PR #${pr.number}:** ${pr.title}`);
      lines.push(`  - Last updated: ${daysSinceUpdate} days ago`);
      lines.push(`  - [View PR](${pr.html_url})`);
    });
    lines.push('');
    lines.push('**Recommendation:** Review these PRs to determine if they should be:');
    lines.push('- Updated and continued');
    lines.push('- Closed as no longer relevant');
    lines.push('- Superseded by newer PRs');
    lines.push('');
  } else {
    lines.push('No outdated PRs found. All PRs have been recently updated.');
    lines.push('');
  }

  // Recommendations
  lines.push('## Recommendations');
  lines.push('');
  lines.push('1. Address redundant PRs by consolidating similar changes');
  lines.push('2. Review outdated PRs and decide on their fate');
  lines.push('3. Keep PR #18 (CI/CD workflow) as it provides comprehensive automation');
  lines.push('4. Consider closing draft PRs that are superseded by newer implementations');
  lines.push('5. Prioritize merging non-redundant, up-to-date PRs');
  lines.push('');

  return lines.join('\n');
}

/**
 * Main execution
 */
async function main() {
  try {
    console.log('Fetching open pull requests...');
    const allPRs = await getOpenPRs();
    
    // Filter out excluded PR
    const prs = allPRs.filter(pr => pr.number !== EXCLUDED_PR);
    
    console.log(`Found ${prs.length} open PRs (excluding #${EXCLUDED_PR})`);
    
    // Group PRs by category
    const categoryGroups = {};
    prs.forEach(pr => {
      const category = categorizePR(pr);
      if (!categoryGroups[category]) {
        categoryGroups[category] = [];
      }
      categoryGroups[category].push(pr);
    });
    
    // Identify redundant groups (categories with multiple PRs)
    const redundantGroups = [];
    for (const [category, groupPRs] of Object.entries(categoryGroups)) {
      if (groupPRs.length > 1) {
        redundantGroups.push({
          category,
          prs: groupPRs
        });
      }
    }
    
    // Identify outdated PRs
    const outdatedPRs = prs.filter(pr => isOutdated(pr));
    
    // Generate and display report
    generateReport(prs, redundantGroups, outdatedPRs);
    
    // Save report to file
    const reportContent = saveReportToFile(prs, redundantGroups, outdatedPRs);
    
    // Write to file in the repository root
    const reportPath = path.join(process.cwd(), 'PR_ANALYSIS_REPORT.md');
    fs.writeFileSync(reportPath, reportContent);
    console.log(`\nReport saved to: PR_ANALYSIS_REPORT.md`);
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
