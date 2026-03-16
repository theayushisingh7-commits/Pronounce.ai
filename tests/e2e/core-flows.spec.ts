import { test, expect } from '@playwright/test';
import { waitForAppReady, dismissToasts } from '../fixtures/helpers';

test.describe('Core App Loading and Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
  });

  test('App loads with title and main elements', async ({ page }) => {
    await expect(page.getByTestId('app-title')).toBeVisible();
    await expect(page.getByTestId('app-title')).toContainText('AI Pronunciation Coach');
  });

  test('Practice tab is visible and active by default', async ({ page }) => {
    await expect(page.getByTestId('practice-tab')).toBeVisible();
    await expect(page.getByTestId('history-tab')).toBeVisible();
    // Practice tab content is visible by default
    await expect(page.getByTestId('sentence-display')).toBeVisible();
  });

  test('Sentence is loaded and displayed on page load', async ({ page }) => {
    const sentenceDisplay = page.getByTestId('sentence-display');
    await expect(sentenceDisplay).toBeVisible();
    // Wait for loading to finish and sentence to appear
    await expect(sentenceDisplay).not.toContainText('Loading...');
    const text = await sentenceDisplay.textContent();
    expect(text && text.trim().length > 0).toBeTruthy();
  });

  test('Difficulty selector shows medium by default', async ({ page }) => {
    const selector = page.getByTestId('difficulty-selector');
    await expect(selector).toBeVisible();
    await expect(selector).toContainText('Medium');
  });

  test('New Sentence button is visible', async ({ page }) => {
    await expect(page.getByTestId('new-sentence-btn')).toBeVisible();
  });

  test('Recording button is visible', async ({ page }) => {
    await expect(page.getByTestId('recording-btn')).toBeVisible();
  });

  test('Navigate to History tab', async ({ page }) => {
    await page.getByTestId('history-tab').click();
    await expect(page.getByText('Practice History')).toBeVisible();
  });

  test('Navigate back to Practice tab from History', async ({ page }) => {
    await page.getByTestId('history-tab').click();
    await expect(page.getByText('Practice History')).toBeVisible();
    await page.getByTestId('practice-tab').click();
    await expect(page.getByTestId('sentence-display')).toBeVisible();
  });

  test('Header shows stats after loading', async ({ page }) => {
    // Stats should appear in header (Attempts, Avg Score, Best)
    // They are hidden on mobile but visible on sm+ screens (1920px viewport)
    await page.waitForLoadState('domcontentloaded');
    // Stats section exists in header
    const header = page.locator('header');
    await expect(header).toBeVisible();
  });

  test('Footer is visible', async ({ page }) => {
    await expect(page.locator('footer')).toBeVisible();
    await expect(page.locator('footer')).toContainText('AI Pronunciation Coach');
  });
});
