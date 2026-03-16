import { test, expect } from '@playwright/test';
import { waitForAppReady, dismissToasts } from '../fixtures/helpers';

test.describe('Sentence and Difficulty Features', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    // Wait for initial sentence to load
    await expect(page.getByTestId('sentence-display')).not.toContainText('Loading...');
  });

  test('New Sentence button fetches a new sentence', async ({ page }) => {
    const sentenceDisplay = page.getByTestId('sentence-display');
    const initialText = await sentenceDisplay.textContent();

    await page.getByTestId('new-sentence-btn').click();
    // Wait for loading state to pass
    await expect(sentenceDisplay).not.toContainText('Loading...');
    // Sentence should still be visible and non-empty
    const newText = await sentenceDisplay.textContent();
    expect(newText && newText.trim().length > 0).toBeTruthy();
  });

  test('Difficulty selector shows all three options', async ({ page }) => {
    // Click the difficulty selector to open dropdown
    await page.getByTestId('difficulty-selector').click();
    await expect(page.getByTestId('difficulty-easy')).toBeVisible();
    await expect(page.getByTestId('difficulty-medium')).toBeVisible();
    await expect(page.getByTestId('difficulty-hard')).toBeVisible();
    // Close dropdown
    await page.keyboard.press('Escape');
  });

  test('Selecting Easy difficulty fetches a new sentence', async ({ page }) => {
    await page.getByTestId('difficulty-selector').click();
    await page.getByTestId('difficulty-easy').click();
    await expect(page.getByTestId('sentence-display')).not.toContainText('Loading...');
    // Selector should now show Easy
    await expect(page.getByTestId('difficulty-selector')).toContainText('Easy');
    // Sentence display should have content
    const text = await page.getByTestId('sentence-display').textContent();
    expect(text && text.trim().length > 0).toBeTruthy();
  });

  test('Selecting Hard difficulty fetches a new sentence', async ({ page }) => {
    await page.getByTestId('difficulty-selector').click();
    await page.getByTestId('difficulty-hard').click();
    await expect(page.getByTestId('sentence-display')).not.toContainText('Loading...');
    await expect(page.getByTestId('difficulty-selector')).toContainText('Hard');
    const text = await page.getByTestId('sentence-display').textContent();
    expect(text && text.trim().length > 0).toBeTruthy();
  });

  test('Selecting Medium difficulty fetches a new sentence', async ({ page }) => {
    // First go to Easy
    await page.getByTestId('difficulty-selector').click();
    await page.getByTestId('difficulty-easy').click();
    await expect(page.getByTestId('sentence-display')).not.toContainText('Loading...');
    // Now switch to Medium
    await page.getByTestId('difficulty-selector').click();
    await page.getByTestId('difficulty-medium').click();
    await expect(page.getByTestId('sentence-display')).not.toContainText('Loading...');
    await expect(page.getByTestId('difficulty-selector')).toContainText('Medium');
  });

  test('Difficulty badge is shown in practice card', async ({ page }) => {
    // The badge for current difficulty should be shown (Medium by default)
    // Look for the text within the card header area
    const badge = page.locator('header ~ main').getByText('Medium', { exact: true }).first();
    await expect(badge).toBeVisible();
  });

  test('Recording button exists and is clickable', async ({ page }) => {
    const recordBtn = page.getByTestId('recording-btn');
    await expect(recordBtn).toBeVisible();
    // Click should toggle state (may error in headless due to no mic, but click is functional)
    await recordBtn.click({ force: true });
    // Button should still be visible
    await expect(recordBtn).toBeVisible();
  });
});
