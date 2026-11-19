import { expect, test } from '@playwright/test';
import { addRoom, row, signedInAs, uniqueRoom } from './helpers';

test('status filters narrow the register, report counts and can be cleared', async ({ page }) => {
  await signedInAs(page, 'manager');
  const occupied = page.getByRole('button', { name: /^Occupied/ });
  await expect(occupied).toHaveAttribute('aria-pressed', 'false');
  await occupied.click();
  await expect(occupied).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('tbody tr').first()).toBeVisible();
  await expect(page.locator('tbody tr .badge:not(.occupied)')).toHaveCount(0);

  await page.getByRole('searchbox', { name: 'Search rooms' }).fill('no-such-room-zzz');
  await expect(page.getByRole('heading', { name: 'No matching rooms' })).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(page.getByRole('button', { name: /^All/ })).toHaveAttribute('aria-pressed', 'true');
  await expect(row(page, 'A1')).toBeVisible();
});

test('a guest leaving today is labelled Today so reception can plan the room', async ({ page }) => {
  const label = uniqueRoom();
  await signedInAs(page, 'manager');
  await addRoom(page, label);
  await page.getByRole('button', { name: 'Check in to ' + label }).click();
  const dialog = page.getByRole('dialog', { name: 'Check in to ' + label });
  await dialog.getByLabel('Guest name').fill('Same Day Guest');
  await dialog.getByLabel(/Expected departure/).fill(new Date().toLocaleDateString('en-CA'));
  await dialog.getByRole('button', { name: 'Confirm check-in' }).click();
  await expect(row(page, label)).toContainText('Same Day Guest');
  await expect(row(page, label).locator('time')).toHaveText('Today');
});

test('dialogs close with Escape and return focus to the control that opened them', async ({ page }) => {
  await signedInAs(page, 'manager');
  const trigger = page.getByRole('button', { name: 'Add room' });
  await trigger.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'Add room' });
  await expect(dialog.getByLabel('Room identifier')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test('reduced motion keeps a short fade and removes movement', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await signedInAs(page, 'manager');
  await page.getByRole('button', { name: 'Add room' }).click();
  const dialog = page.getByRole('dialog', { name: 'Add room' });
  const style = await dialog.evaluate(element => { const css = getComputedStyle(element); return { name: css.animationName, duration: parseFloat(css.animationDuration) }; });
  expect(style.name).toBe('fade');
  expect(style.duration).toBeLessThanOrEqual(0.2);
});

test('mobile: check-in is a bottom sheet inside the screen with touch-sized controls @mobile-only', async ({ page }) => {
  const label = uniqueRoom();
  await signedInAs(page, 'manager');
  await addRoom(page, label);
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
  await page.getByRole('button', { name: 'Check in to ' + label }).click();
  const dialog = page.getByRole('dialog', { name: 'Check in to ' + label });
  await expect(dialog).toBeVisible();
  await dialog.evaluate(element => Promise.all(element.getAnimations().map(animation => animation.finished)));
  const viewport = page.viewportSize()!;
  const box = (await dialog.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);
  for (const control of [dialog.getByLabel('Guest name'), dialog.getByRole('button', { name: 'Confirm check-in' }), dialog.getByRole('button', { name: 'Close dialog' })]) {
    expect((await control.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  }
});

test('the selected filter is visibly distinct and the occupancy bar describes the property', async ({ page }) => {
  await signedInAs(page, 'manager');
  const selected = page.getByRole('button', { name: /^All/ });
  const other = page.getByRole('button', { name: /^Occupied/ });
  await expect(selected).toHaveAttribute('aria-pressed', 'true');
  const [on, off] = await Promise.all([selected, other].map(button => button.evaluate(element => getComputedStyle(element).backgroundColor)));
  expect(on).not.toBe(off);
  await expect(page.getByRole('img', { name: /\d+ occupied, \d+ available, \d+ out of service/ })).toBeVisible();
  await expect(page.locator('.monogram')).toHaveText('HG');
});

test('a success notice stays out of the way of room actions and can be dismissed', async ({ page }) => {
  await signedInAs(page, 'manager');
  await addRoom(page, uniqueRoom());
  const notice = page.locator('.notice');
  await expect(notice).toBeVisible();
  const box = (await notice.boundingBox())!;
  for (const button of await page.locator('tbody button').all()) {
    const target = await button.boundingBox();
    if (target) expect(target.y >= box.y + box.height || target.y + target.height <= box.y).toBe(true);
  }
  await page.getByRole('button', { name: 'Dismiss message' }).click();
  await expect(notice).toHaveCount(0);
});

test('mobile: the notice sits above the register, never over a row action @mobile-only', async ({ page }) => {
  await signedInAs(page, 'manager');
  await addRoom(page, uniqueRoom());
  const notice = (await page.locator('.notice').boundingBox())!;
  const register = (await page.getByRole('region', { name: 'Room register' }).boundingBox())!;
  expect(notice.y + notice.height).toBeLessThanOrEqual(register.y);
});
