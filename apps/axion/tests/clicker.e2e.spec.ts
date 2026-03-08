import { test, expect } from '@playwright/test';

test.describe('Clicker e2e', () => {
  test('should search for axion clicker on sport.pl', async ({ page }) => {
    // Navigate to sport.pl website
    await page.goto('https://sport.pl');
    
    // Accept privacy policy if cookie consent appears
    const acceptButton = page.getByRole('button', { name: 'AKCEPTUJĘ' });
    if (await acceptButton.isVisible()) {
      await acceptButton.click();
    }
    
    // Search for "axion clicker" in the search box
    // Note: This test assumes search functionality is available on the page
    const searchInputs = page.locator('input[type="text"], input[type="search"], [role="searchbox"]');
    if (await searchInputs.first().isVisible()) {
      await searchInputs.first().fill('axion clicker');
      await searchInputs.first().press('Enter');
      
      // Click on the first search result
      const firstResult = page.locator('a').first();
      await expect(firstResult).toBeVisible();
      await firstResult.click();
      
      // Verify navigation occurred
      await expect(page).not.toHaveURL('https://sport.pl');
    }
  });
});
