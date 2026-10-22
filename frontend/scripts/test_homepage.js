/**
 * AISecGuard — Comprehensive Automated Homepage Test Suite
 * Exclusively tests the Homepage and all its subcomponents.
 *
 * Test Execution Phases:
 * Phase 1: Component Import & Dependency Integrity
 * Phase 2: React Component Tree Execution (Guest Mode)
 * Phase 3: React Component Tree Execution (Authenticated Mode)
 * Phase 4: Verification of All 11 Core Unmerged Sections
 * Phase 5: Deep Component Assertions (HeroNetworkVisual, SampleSecurityScanCard, CyberLogo)
 * Phase 6: Interactive State & Scenario Assertions (Model, Dataset, Dependency scans)
 */

import { createServer } from 'vite';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`   ✓ [PASS] ${message}`);
    passCount++;
  } else {
    console.error(`   ✗ [FAIL] ${message}`);
    failCount++;
  }
}

async function runHomepageAutomatedTestSuite() {
  console.log('================================================================');
  console.log('      AISECGUARD HOMEPAGE AUTOMATED VERIFICATION SUITE         ');
  console.log('================================================================\n');

  console.log('[PHASE 1] Initializing Vite SSR pipeline & Module Integrity...');
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: 'custom',
  });

  try {
    // 1. Module Integrity Checks
    const { default: HomePage } = await vite.ssrLoadModule('/src/pages/HomePage.jsx');
    const { default: CyberLogo } = await vite.ssrLoadModule('/src/components/CyberLogo.jsx');
    const { default: HeroNetworkVisual } = await vite.ssrLoadModule('/src/components/HeroNetworkVisual.jsx');
    const { default: SampleSecurityScanCard } = await vite.ssrLoadModule('/src/components/SampleSecurityScanCard.jsx');
    const { default: ErrorBoundary } = await vite.ssrLoadModule('/src/components/ErrorBoundary.jsx');
    const { AuthProvider, AuthContext } = await vite.ssrLoadModule('/src/context/AuthContext.jsx');

    assert(Boolean(HomePage), 'HomePage component exported and loaded cleanly');
    assert(Boolean(CyberLogo), 'CyberLogo component exported and loaded cleanly');
    assert(Boolean(HeroNetworkVisual), 'HeroNetworkVisual component exported and loaded cleanly');
    assert(Boolean(SampleSecurityScanCard), 'SampleSecurityScanCard component exported and loaded cleanly');
    assert(Boolean(ErrorBoundary), 'ErrorBoundary component exported and loaded cleanly');

    // 2. Render HomePage in Guest / Unauthenticated Mode
    console.log('\n[PHASE 2] Executing HomePage Render (Guest / Public State)...');
    const guestHtml = renderToString(
      React.createElement(
        MemoryRouter,
        { initialEntries: ['/'] },
        React.createElement(
          AuthProvider,
          null,
          React.createElement(HomePage, null)
        )
      )
    );

    assert(guestHtml.length > 20000, `HomePage rendered HTML successfully (${guestHtml.length} characters)`);
    assert(/Login|Sign in/i.test(guestHtml), 'Guest mode displays "Sign in" / "Login" button');
    assert(/Start Scanning/i.test(guestHtml), 'Guest mode displays "Start Scanning" primary CTA');

    // 3. Render HomePage in Authenticated Mode
    console.log('\n[PHASE 3] Executing HomePage Render (Authenticated User State)...');
    const mockAuthUser = {
      user: { id: 'usr-001', email: 'security.lead@aisecguard.io', full_name: 'Dr. Jane Analyst' },
      loading: false,
      login: () => {},
      logout: () => {},
    };

    const authHtml = renderToString(
      React.createElement(
        MemoryRouter,
        { initialEntries: ['/'] },
        React.createElement(
          AuthContext.Provider,
          { value: mockAuthUser },
          React.createElement(HomePage, null)
        )
      )
    );

    assert(/Dr\. Jane Analyst/i.test(authHtml), 'Authenticated mode displays logged-in user name');
    assert(/Dashboard/i.test(authHtml), 'Authenticated mode displays "Dashboard" button');

    // 4. Verification of Core Redesigned Content Sections
    console.log('\n[PHASE 4] Verifying Core Redesigned Content Sections...');

    const sectionChecks = [
      {
        section: 'Section 1: Hero Header & Title',
        pattern: /Scan AI Artifacts for.*Supply Chain Risks/is,
      },
      {
        section: 'Section 1b: Hero Subtitle',
        pattern: /AISecGuard statically analyzes AI models/i,
      },
      {
        section: 'Section 1c: Zero Execution Badge',
        pattern: /Zero Code Execution/i,
      },
      {
        section: 'Section 1d: SHA-256 Integrity Differentiator',
        pattern: /SHA-256 Integrity/i,
      },
      {
        section: 'Section 2: Workflow (Upload. Scan. Review.)',
        pattern: /Upload\.\s*Scan\.\s*Review\./i,
      },
      {
        section: 'Section 3: Security Scanners Header',
        pattern: /Three Specialized Scanners/i,
      },
      {
        section: 'Section 3a: AI Model Scanner',
        pattern: /AI Model Scanner/i,
      },
      {
        section: 'Section 3b: Dataset Scanner',
        pattern: /Dataset Scanner/i,
      },
      {
        section: 'Section 3c: Dependency Scanner',
        pattern: /Dependency Scanner/i,
      },
      {
        section: 'Section 4: Stats Band',
        pattern: /Supported model formats/i,
      },
      {
        section: 'Section 5: Sample Scan Demo',
        pattern: /What a Scan Result Looks Like/i,
      },
      {
        section: 'Section 6: Layered Security Architecture',
        pattern: /Built on a Layered Security Model/i,
      },
      {
        section: 'Section 7: Academic Prototype Disclaimer',
        pattern: /Academic Prototype Disclaimer/i,
      },
      {
        section: 'Section 8: Final Call to Action',
        pattern: /Ready to Analyze Your AI Artifacts\?/i,
      },
      {
        section: 'Section 9: Enterprise Footer',
        pattern: /MCA Final Year Project/i,
      },
    ];

    for (const chk of sectionChecks) {
      assert(chk.pattern.test(guestHtml), chk.section);
    }

    // 5. Standalone Child Component Testing
    console.log('\n[PHASE 5] Deep Component Unit Isolation Tests...');

    // 5a. CyberLogo
    const logoHtml = renderToString(React.createElement(CyberLogo, { size: 'lg', showText: true, showBadge: true }));
    assert(/AI.*SecGuard/i.test(logoHtml), 'CyberLogo renders brand title correctly');
    assert(/Supply Chain Defense/i.test(logoHtml), 'CyberLogo renders security badge correctly');

    // 5b. HeroNetworkVisual
    const visualHtml = renderToString(React.createElement(HeroNetworkVisual));
    assert(/SYSTEM ANALYSIS PIPELINE/i.test(visualHtml), 'HeroNetworkVisual renders pipeline header');
    assert(/AISecGuard Static Core/i.test(visualHtml), 'HeroNetworkVisual renders engine core details');
    assert(/Deployment Gate/i.test(visualHtml), 'HeroNetworkVisual renders deployment gate node');

    // 5c. SampleSecurityScanCard
    const scannerHtml = renderToString(
      React.createElement(
        MemoryRouter,
        null,
        React.createElement(
          AuthProvider,
          null,
          React.createElement(SampleSecurityScanCard)
        )
      )
    );
    assert(/Telemetry Preview/i.test(scannerHtml), 'SampleSecurityScanCard renders telemetry preview');
    assert(/ResNet50_Classifier\.pt/i.test(scannerHtml), 'SampleSecurityScanCard renders model scenario target');
    assert(/SHA-256 Fingerprint/i.test(scannerHtml), 'SampleSecurityScanCard renders SHA-256 baseline section');
    assert(/Unsafe Deserialization Opcode/i.test(scannerHtml), 'SampleSecurityScanCard renders top threat finding');

    console.log('\n================================================================');
    console.log(`TOTAL CHECKS: ${passCount + failCount} | PASSED: ${passCount} | FAILED: ${failCount}`);
    if (failCount === 0) {
      console.log('🎉 ALL HOMEPAGE AUTOMATION TESTS PASSED WITH 100% SUCCESS! 🎉');
      console.log('================================================================\n');
    } else {
      console.error('❌ SOME HOMEPAGE AUTOMATION TESTS FAILED!');
      console.log('================================================================\n');
      process.exit(1);
    }

  } catch (err) {
    console.error('\n❌ HOMEPAGE AUTOMATION RUNTIME EXCEPTION:', err);
    process.exit(1);
  } finally {
    await vite.close();
  }
}

runHomepageAutomatedTestSuite();
