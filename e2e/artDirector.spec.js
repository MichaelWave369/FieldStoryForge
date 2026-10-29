import {test,expect} from '@playwright/test';

test('artist authors identity guide and generates a consistent scene prompt',async({page})=>{
 await page.goto('/');
 await page.getByRole('button',{name:'Edit story'}).click();
 await page.getByRole('tab',{name:/Characters/}).click();
 await page.getByLabel('Visual appearance').first().fill('Deep blue hair with a single silver ribbon');
 await page.getByRole('tab',{name:/Art Director/}).click();
 await expect(page.getByRole('heading',{name:'Art Director'})).toBeVisible();
 await page.getByRole('checkbox',{name:'Mara'}).check();
 await expect(page.locator('.art-brief-text')).toContainText('Deep blue hair with a single silver ribbon');
 await expect(page.locator('.art-brief-text')).toContainText('Grandmother’s attic');
 await page.getByRole('button',{name:/Export all shot prompts/}).click();
 await expect(page.getByRole('status').filter({hasText:/Prompt pack exported/})).toBeVisible();
});

test('artwork stays out of the reader until author explicitly approves it',async({page})=>{
 await page.goto('/');
 await page.getByRole('button',{name:/Create a new story/}).click();
 await page.getByRole('tab',{name:/Art Director/}).click();
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO2q53YAAAAASUVORK5CYII=','base64');
 await page.locator('.art-review-controls input[type=file]').setInputFiles({name:'sample.png',mimeType:'image/png',buffer:png});
 await expect(page.getByText(/Candidate preview only/)).toBeVisible();
 await page.getByRole('button',{name:'Discard candidate'}).click();
 await page.getByRole('tab',{name:/Pages & choices/}).click();
 await page.getByRole('button',{name:/Read comic/}).click();
 await expect(page.locator('.comic-art img')).toHaveCount(0);
 await page.getByRole('button',{name:/Studio/}).click();
 await page.getByRole('tab',{name:/Art Director/}).click();
 await page.locator('.art-review-controls input[type=file]').setInputFiles({name:'sample.png',mimeType:'image/png',buffer:png});
 await page.getByLabel('Candidate image description').fill('A tiny painted blue star');
 await page.getByRole('button',{name:/Approve artwork/}).click();
 await expect(page.getByText(/Approved artwork ·/)).toBeVisible();
 await page.getByRole('button',{name:/Read comic/}).click();
 await expect(page.locator('.comic-art img')).toHaveCount(1);
});
