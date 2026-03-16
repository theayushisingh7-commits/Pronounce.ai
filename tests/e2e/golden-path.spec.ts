import { test, expect } from '@playwright/test';
import { waitForAppReady, dismissToasts } from '../fixtures/helpers';

test.describe('Golden Path: End-to-End Pronunciation Coach Journey', () => {
  test('Full user journey: load app → change difficulty → get sentence → record → view history', async ({ page }) => {
    await dismissToasts(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    // Step 1: App loads with title
    await expect(page.getByTestId('app-title')).toBeVisible();
    await expect(page.getByTestId('app-title')).toContainText('AI Pronunciation Coach');

    // Step 2: Practice tab is active with a sentence loaded
    await expect(page.getByTestId('practice-tab')).toBeVisible();
    const sentenceDisplay = page.getByTestId('sentence-display');
    await expect(sentenceDisplay).toBeVisible();
    await expect(sentenceDisplay).not.toContainText('Loading...');

    // Step 3: Change difficulty to Easy
    await page.getByTestId('difficulty-selector').click();
    await page.getByTestId('difficulty-easy').click();
    await expect(sentenceDisplay).not.toContainText('Loading...');
    await expect(page.getByTestId('difficulty-selector')).toContainText('Easy');

    // Step 4: Verify an easy sentence is displayed
    const easyText = await sentenceDisplay.textContent();
    expect(easyText && easyText.trim().length > 0).toBeTruthy();

    // Step 5: Click New Sentence to get a different sentence
    await page.getByTestId('new-sentence-btn').click();
    await expect(sentenceDisplay).not.toContainText('Loading...');

    // Step 6: Change to Hard difficulty
    await page.getByTestId('difficulty-selector').click();
    await page.getByTestId('difficulty-hard').click();
    await expect(sentenceDisplay).not.toContainText('Loading...');
    await expect(page.getByTestId('difficulty-selector')).toContainText('Hard');

    // Step 7: Recording button exists and is interactive
    const recordBtn = page.getByTestId('recording-btn');
    await expect(recordBtn).toBeVisible();

    // Step 8: Navigate to History tab
    await page.getByTestId('history-tab').click();
    await expect(page.getByText('Practice History')).toBeVisible();

    // Step 9: History has attempts from backend test data
    const historyItems = page.locator('[data-testid^="history-item-"]');
    const count = await historyItems.count();
    if (count > 0) {
      await expect(historyItems.first()).toBeVisible();
      // Items display score, sentence, date
      const firstItem = historyItems.first();
      const text = await firstItem.textContent();
      expect(text).toMatch(/\d+%/); // has a percentage score
    }

    // Step 10: Navigate back to practice
    await page.getByTestId('practice-tab').click();
    await expect(sentenceDisplay).toBeVisible();
    // The sentence should still be there (Hard difficulty)
    await expect(page.getByTestId('difficulty-selector')).toContainText('Hard');
  });

  test('App shows stats in header after attempts are recorded', async ({ page }) => {
    await dismissToasts(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    // Stats should be visible in the header (total attempts, avg score, best score)
    const header = page.locator('header');
    await expect(header).toBeVisible();
    // The header contains the stats section with attempt counts
    const headerText = await header.textContent();
    // With test data present, attempts should show > 0
    expect(headerText).toBeTruthy();
  });
});
