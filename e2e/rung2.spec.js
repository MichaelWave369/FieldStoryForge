import { test, expect } from '@playwright/test';

test('author creates comic panel; undo and redo restore it; reader renders it', async ({ page })=>{
  await page.goto('/');
  await page.getByRole('button',{name:/Create a new story/}).click();
  await page.getByRole('button',{name:/Add comic panel/}).click();
  await expect(page.getByLabel('Comic panel composer')).toContainText('1/8 panels');
  await page.getByRole('button',{name:/Undo last change/}).click();
  await expect(page.getByLabel('Comic panel composer')).toContainText('0/8 panels');
  await page.getByRole('button',{name:/Redo last change/}).click();
  await expect(page.getByLabel('Comic panel composer')).toContainText('1/8 panels');
  await page.getByLabel('Narration caption').fill('An illustrated first panel');
  await page.getByRole('button',{name:/Read comic/}).click();
  await expect(page.getByText('An illustrated first panel')).toBeVisible();
  await expect(page.locator('.reader .comic-panel')).toHaveCount(1);
});

test('importer previews and appends chapter manuscript without deleting original',async({page})=>{
  await page.goto('/');
  await page.getByRole('button',{name:/Create a new story/}).click();
  await page.getByRole('button',{name:/Import manuscript or outline/}).click();
  await page.getByLabel('Story manuscript text').fill('# Arrival\n\nShe comes to the harbor.\n\n# The Decision\n\nShe sees a signal.');
  await expect(page.locator('.manuscript-preview')).toContainText('2 scenes');
  await page.getByRole('button',{name:/Import 2 scenes/}).click();
  await expect(page.locator('.scene-link')).toHaveCount(3);
  await expect(page.getByText('Arrival').first()).toBeVisible();
  await expect(page.getByText('Once upon a time').first()).toBeVisible();
});

test('visual story map can connect two nodes using canonical choice graph',async({page})=>{
  await page.goto('/');
  await page.getByRole('button',{name:/Create a new story/}).click();
  await page.getByRole('button',{name:/Add scene/}).click();
  await page.getByLabel('Scene title').fill('The Mirror');
  await page.getByRole('tab',{name:/Story map/}).click();
  await page.getByRole('button',{name:/Connect scenes/}).click();
  await page.getByRole('button',{name:/Scene Once upon a time/}).click();
  await page.getByRole('button',{name:/Scene The Mirror/}).click();
  await expect(page.getByText(/Choice created:/)).toBeVisible();
  await expect(page.locator('.graph-node')).toContainText(['Go to The Mirror','No links']);
});
