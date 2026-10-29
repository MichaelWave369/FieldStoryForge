import { test, expect } from '@playwright/test';
test('demo reader follows choices and can backtrack', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Read The Whispering Door' }).click();
  await expect(page.getByRole('heading', { name: 'The Last Stair' })).toBeVisible();
  await page.getByRole('button', { name: /Search the attic first/ }).click();
  await expect(page.getByRole('heading', { name: 'The Cedar Trunk' })).toBeVisible();
  await page.getByRole('button', { name: /Take the key and approach/ }).click();
  await expect(page.getByRole('heading', { name: 'The Threshold' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Try your silver key/ })).toBeVisible();
  await page.getByRole('button', { name: /Previous choice/ }).click();
  await expect(page.getByRole('heading', { name: 'The Cedar Trunk' })).toBeVisible();
});
test('writer can create a new story and add a scene', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Create a new story/ }).click();
  await page.getByRole('tab', { name: /Book details/ }).click();
  await page.getByLabel('Book title').fill('The Glass City');
  await page.getByRole('tab', { name: /Pages & choices/ }).click();
  await page.getByRole('button', { name: /Add scene/ }).click();
  await page.getByLabel('Scene title').fill('The Rooftop');
  await expect(page.getByRole('heading', { name: 'The Rooftop' }).first()).toBeVisible();
  await page.getByRole('button', { name: /Add reader choice/ }).click();
  await expect(page.getByLabel('Reader sees')).toHaveValue('Continue...');
  await page.getByRole('button', { name: '← Bookshelf' }).click();
  await expect(page.getByText('The Glass City')).toBeVisible();
});
