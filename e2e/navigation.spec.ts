import { test, expect } from '@playwright/test';

test.describe('Navigation & Tab Structure', () => {
  test('splash screen renders and can be dismissed', async ({ page }) => {
    await page.goto('/');
    // Splash should show "Touch anywhere to start"
    await expect(page.getByText('Touch anywhere to start')).toBeVisible();
    // Click to dismiss
    await page.click('body');
    // After splash, should see login or main app
    await expect(page.getByText('Touch anywhere to start')).not.toBeVisible();
  });

  test('login overlay appears after splash dismiss', async ({ page }) => {
    await page.goto('/');
    await page.click('body');
    // Login overlay should appear with access code input
    await expect(page.getByText('SDC Study')).toBeVisible();
    await expect(page.getByText('Please enter your access code')).toBeVisible();
    await expect(page.locator('input#code')).toBeVisible();
  });

  test('bottom navigation has no home tab (legacy removed)', async ({ page }) => {
    await page.goto('/');
    await page.click('body');
    // The bottom nav should NOT contain a "홈" tab
    const homeTab = page.getByRole('button', { name: '홈' });
    await expect(homeTab).toHaveCount(0);
  });

  test('bottom navigation contains expected tabs', async ({ page }) => {
    await page.goto('/');
    await page.click('body');
    // These tabs should exist in the nav (visible even on login screen if nav renders)
    // Since login overlay blocks main app, we verify the nav structure won't include 홈
    // by checking the DOM does not contain a button with 홈 text
    const allButtons = await page.getByRole('button').allTextContents();
    expect(allButtons).not.toContain('홈');
  });
});

test.describe('Learning Page - Mode Selection', () => {
  // These tests require authentication. Skip if not authenticated.
  // In a full setup, we'd seed the emulator. For now, test structure validation.

  test('login form accepts input and submits', async ({ page }) => {
    await page.goto('/');
    await page.click('body');
    const input = page.locator('input#code');
    await expect(input).toBeVisible();
    await input.fill('TEST-CODE');
    // Verify the input accepted the value (uppercased)
    await expect(input).toHaveValue('TEST-CODE');
    // Submit button should be present
    const submitBtn = page.getByRole('button', { name: /continue|sign in|login|enter/i });
    await expect(submitBtn).toBeVisible();
  });
});

test.describe('Speed Listening Page Structure', () => {
  test('SpeedListeningPage component file exists and exports correctly', async ({}) => {
    // This is a build-time structural test
    // Verified via tsc --noEmit passing. This test documents the contract.
    const fs = await import('fs');
    const path = await import('path');
    const indexPath = path.resolve('src/components/learning/SpeedListening/index.ts');
    const pagePath = path.resolve('src/components/learning/SpeedListening/SpeedListeningPage.tsx');
    expect(fs.existsSync(indexPath)).toBeTruthy();
    expect(fs.existsSync(pagePath)).toBeTruthy();

    // Legacy SpeedListeningQuiz should be deleted
    const legacyPath = path.resolve('src/components/SpeedListeningQuiz.tsx');
    expect(fs.existsSync(legacyPath)).toBeFalsy();
  });

  test('legacy RepetitionLearningPage is removed', async ({}) => {
    const fs = await import('fs');
    const path = await import('path');
    const legacyPath = path.resolve('src/components/home/RepetitionLearningPage.tsx');
    expect(fs.existsSync(legacyPath)).toBeFalsy();
  });
});

test.describe('LearningPage imports verification', () => {
  test('LearningPage imports SpeedListeningPage not SpeedListeningQuiz', async ({}) => {
    const fs = await import('fs');
    const path = await import('path');
    const content = fs.readFileSync(
      path.resolve('src/components/learning/LearningPage.tsx'),
      'utf-8'
    );
    expect(content).toContain("import { SpeedListeningPage }");
    expect(content).not.toContain("SpeedListeningQuiz");
  });

  test('App.tsx does not import RepetitionLearningPage', async ({}) => {
    const fs = await import('fs');
    const path = await import('path');
    const content = fs.readFileSync(path.resolve('src/App.tsx'), 'utf-8');
    expect(content).not.toContain('RepetitionLearningPage');
    expect(content).not.toContain("'home'");
    expect(content).toContain("useState<TabId>('learning')");
  });

  test('BottomNavigation does not include home tab', async ({}) => {
    const fs = await import('fs');
    const path = await import('path');
    const content = fs.readFileSync(
      path.resolve('src/components/layout/BottomNavigation.tsx'),
      'utf-8'
    );
    expect(content).not.toContain("'home'");
    expect(content).not.toContain("Home");
  });
});

test.describe('Streak Cloud Function', () => {
  test('updateStreaks uses batch writes', async ({}) => {
    const fs = await import('fs');
    const path = await import('path');
    const content = fs.readFileSync(
      path.resolve('functions/src/stats/updateStreaks.ts'),
      'utf-8'
    );
    // Should use batch operations
    expect(content).toContain('db.batch()');
    expect(content).toContain('batch.update');
    expect(content).toContain('batch.commit()');
    expect(content).toContain('MAX_BATCH_SIZE');
    // Should NOT have sequential individual updates
    expect(content).not.toContain('await userDoc.ref.update');
  });
});
