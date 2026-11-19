import { test } from '@playwright/test';
import { row, signedInAs } from './helpers';

// Evidence capture, not a regression test: CAPTURE_SCREENSHOTS=1 node scripts/project-npm.mjs test:e2e
// The check-in flow checks in to room A5, which is not in the seed data; remove it afterwards to repeat.
test.skip(!process.env.CAPTURE_SCREENSHOTS, 'set CAPTURE_SCREENSHOTS=1 to refresh the evidence screenshots');
const folder = 'docs/audit/007b1/screens/';
const sizes = { desktop: { width: 1440, height: 900 }, tablet: { width: 768, height: 1024 }, mobile: { width: 390, height: 844 } } as const;

test('capture sign-in and rooms @screenshots', async ({ page }, info) => {
  const device = info.project.name as keyof typeof sizes;
  await page.setViewportSize(sizes[device]);
  await page.goto('/');
  await page.getByRole('heading', { name: 'Sign in to Stayflow' }).waitFor();
  await page.waitForTimeout(1000); // let the one-off sign-in artwork finish
  await page.screenshot({ path: `${folder}sign-in-${device}.png` });
  await signedInAs(page, 'manager');
  await row(page, 'A1').waitFor();
  await page.screenshot({ path: `${folder}rooms-${device}.png`, fullPage: true });
});

test('capture the guest check-in flow @screenshots', async ({ page }, info) => {
  const device = info.project.name as keyof typeof sizes;
  if (device === 'tablet') test.skip(true, 'desktop and phone cover the flow');
  await page.setViewportSize(sizes[device]);
  await signedInAs(page, 'manager');
  await page.getByRole('button', { name: 'Add room' }).click();
  const add = page.getByRole('dialog', { name: 'Add room' });
  await add.getByLabel('Room identifier').fill('A5');
  await add.getByRole('button', { name: 'Add room' }).click();
  await page.getByText('Room A5 added.').waitFor();
  await page.getByRole('button', { name: 'Available' }).click();
  await page.getByRole('button', { name: 'Check in to A5' }).click();
  const dialog = page.getByRole('dialog', { name: 'Check in to A5' });
  await dialog.getByLabel('Guest name').fill('Pieter van der Westhuizen');
  await dialog.getByLabel(/Expected departure/).fill(new Date(Date.now() + 3 * 86_400_000).toLocaleDateString('en-CA'));
  await dialog.evaluate(element => Promise.all(element.getAnimations().map(animation => animation.finished)));
  await page.screenshot({ path: `${folder}check-in-dialog-${device}.png` });
  await dialog.getByRole('button', { name: 'Confirm check-in' }).click();
  await page.getByText('Guest checked into A5.').waitFor();
  await page.getByRole('button', { name: /^All/ }).click();
  await row(page, 'A5').waitFor();
  await page.screenshot({ path: `${folder}check-in-done-${device}.png` });
});
