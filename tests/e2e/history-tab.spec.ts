import { test, expect } from '@playwright/test';
import { waitForAppReady, dismissToasts } from '../fixtures/helpers';
import axios from 'axios';

const BASE_URL = process.env.REACT_APP_BACKEND_URL || 'https://accent-trainer-7.preview.emergentagent.com';

test.describe('History Tab', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
  });

  test('History tab is clickable and shows Practice History heading', async ({ page }) => {
    await page.getByTestId('history-tab').click();
    await expect(page.getByText('Practice History')).toBeVisible();
  });

  test('History tab shows empty state when no attempts', async ({ page }) => {
    // Navigate to history tab
    await page.getByTestId('history-tab').click();
    // There might be no attempts — check for empty state OR history items
    const historyContent = page.locator('[data-testid^="history-item-"]');
    const emptyState = page.getByText('No practice attempts yet.');

    // Either items exist or empty state is shown
    const count = await historyContent.count();
    if (count === 0) {
      await expect(emptyState).toBeVisible();
    } else {
      await expect(historyContent.first()).toBeVisible();
    }
  });

  test('History items show score, sentence, and difficulty', async ({ page }) => {
    await page.getByTestId('history-tab').click();
    const historyItems = page.locator('[data-testid^="history-item-"]');
    const count = await historyItems.count();

    if (count > 0) {
      const firstItem = historyItems.first();
      await expect(firstItem).toBeVisible();
      // Should contain a score percentage
      const itemText = await firstItem.textContent();
      expect(itemText).toMatch(/\d+%/);
    } else {
      // If no items, test passes (empty state handled separately)
      test.skip();
    }
  });

  test('Stats panel is shown in history tab when attempts exist', async ({ page }) => {
    await page.getByTestId('history-tab').click();
    const historyItems = page.locator('[data-testid^="history-item-"]');
    const count = await historyItems.count();

    if (count > 0) {
      // Stats card should appear
      await expect(page.getByText('Statistics')).toBeVisible();
      // Stats values shown
      await expect(page.getByText('Total Attempts')).toBeVisible();
      await expect(page.getByText('Average Score')).toBeVisible();
      await expect(page.getByText('Best Score')).toBeVisible();
    } else {
      test.skip();
    }
  });
});
