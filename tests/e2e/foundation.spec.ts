import { expect, test } from '@playwright/test';
import { addRoom, hillview, maroela, row, signedInAs, signIn, uniqueRoom } from './helpers';

const roomsApi = (property: string) => `/api/properties/${property}/rooms`;

test('sign-in rejects incorrect credentials without revealing which part was wrong', async ({ page }) => {
  await signIn(page, 'manager', 'not-the-password');
  await expect(page.getByRole('alert')).toHaveText('Email or password was not accepted.');
  await expect(page).toHaveURL(/\/sign-in$/);
  await signIn(page, 'nobody', 'not-the-password');
  await expect(page.getByRole('alert')).toHaveText('Email or password was not accepted.');
});

test('protected routes redirect to sign-in and the API answers 401 without a session', async ({ page, request }) => {
  await page.goto('/rooms');
  await expect(page.getByRole('heading', { name: 'Sign in to Stayflow' })).toBeVisible();
  await expect(page).toHaveURL(/\/sign-in$/);
  expect((await request.get(roomsApi(hillview))).status()).toBe(401);
});

test('manager signs in, sees only their property, and the session survives a refresh', async ({ page }) => {
  await signedInAs(page, 'manager');
  await expect(page).toHaveURL(/\/rooms$/);
  await expect(page.getByRole('banner').getByText('Hillview Guesthouse')).toBeVisible();
  await expect(page.getByRole('banner').getByText('Manager', { exact: true })).toBeVisible();
  await expect(page.getByText('Maroela Lodge')).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Rooms' })).toBeVisible();
  await expect(row(page, 'A1')).toBeVisible();
});

test('room management: add, edit and persist across a refresh', async ({ page }) => {
  const label = uniqueRoom();
  await signedInAs(page, 'manager');
  await addRoom(page, label);
  await expect(row(page, label)).toContainText('Available');

  await page.getByRole('button', { name: 'Edit room ' + label }).click();
  const dialog = page.getByRole('dialog', { name: 'Edit room ' + label });
  await dialog.getByLabel('Status').selectOption('out_of_service');
  await dialog.getByRole('button', { name: 'Save room' }).click();
  await expect(page.getByText('Room ' + label + ' updated.')).toBeVisible();
  await expect(row(page, label)).toContainText('Out of service');

  await page.reload();
  await expect(row(page, label)).toContainText('Out of service');
});

test('room identifiers are unique per property, ignoring case', async ({ page }) => {
  const label = uniqueRoom();
  await signedInAs(page, 'manager');
  await addRoom(page, label);
  await page.getByRole('button', { name: 'Add room' }).click();
  const dialog = page.getByRole('dialog', { name: 'Add room' });
  await dialog.getByLabel('Room identifier').fill(label.toLowerCase());
  await dialog.getByRole('button', { name: 'Add room' }).click();
  await expect(dialog.getByRole('alert')).toContainText('already in use');
});

test('guest check-in occupies the room, persists after refresh and cannot be repeated', async ({ page }) => {
  const label = uniqueRoom();
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  await signedInAs(page, 'manager');
  await addRoom(page, label);
  await page.getByRole('button', { name: 'Check in to ' + label }).click();
  const dialog = page.getByRole('dialog', { name: 'Check in to ' + label });
  await dialog.getByLabel('Guest name').fill('Test Guest');
  await dialog.getByLabel(/Expected departure/).fill(tomorrow);
  await dialog.getByRole('button', { name: 'Confirm check-in' }).click();
  await expect(page.getByText('Guest checked into ' + label + '.')).toBeVisible();
  await expect(row(page, label)).toContainText('Occupied');
  await expect(row(page, label)).toContainText('Test Guest');
  await expect(page.getByRole('button', { name: 'Check in to ' + label })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Edit room ' + label })).toHaveCount(0);

  await page.reload();
  await expect(row(page, label)).toContainText('Test Guest');
});

test('a past departure date is rejected and the room stays available', async ({ page }) => {
  const label = uniqueRoom();
  await signedInAs(page, 'manager');
  await addRoom(page, label);
  await page.getByRole('button', { name: 'Check in to ' + label }).click();
  const dialog = page.getByRole('dialog', { name: 'Check in to ' + label });
  await dialog.getByLabel('Guest name').fill('Past Guest');
  await dialog.getByLabel(/Expected departure/).fill('2020-01-01');
  await dialog.getByRole('button', { name: 'Confirm check-in' }).click();
  await expect(dialog.getByRole('alert')).toHaveText('Expected departure cannot be in the past.');
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(row(page, label)).toContainText('Available');
});

test('reception can check in but not configure rooms', async ({ page }) => {
  await signedInAs(page, 'reception');
  await expect(page.getByRole('button', { name: 'Add room' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Edit room/ })).toHaveCount(0);
});

test('operations staff see rooms but no guest names, departures or management actions', async ({ page }) => {
  await signedInAs(page, 'operations');
  await expect(row(page, 'A1')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add room' })).toHaveCount(0);
  await expect(page.getByText('Thandi Mokoena')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Check in to/ })).toHaveCount(0);
});

test('tenant isolation: another organisation sees only its own rooms and is refused Hillview data', async ({ page }) => {
  await signedInAs(page, 'other');
  await expect(page.getByRole('banner').getByText('Maroela Lodge')).toBeVisible();
  await expect(row(page, 'M1')).toBeVisible();
  await expect(page.getByText('Hillview')).toHaveCount(0);
  await expect(row(page, 'A1')).toHaveCount(0);

  const foreign = await page.request.get(roomsApi(hillview));
  expect(foreign.status()).toBe(403);
  expect(await foreign.text()).not.toContain('Thandi');
  expect((await page.request.get(roomsApi(maroela))).status()).toBe(200);
});

test('a revoked staff account has no property access', async ({ page }) => {
  await signIn(page, 'revoked');
  await expect(page.getByRole('heading', { name: 'No property access' })).toBeVisible();
  await expect(row(page, 'A1')).toHaveCount(0);
});

test('sign-out ends the session and the protected API stops answering', async ({ page }) => {
  await signedInAs(page, 'manager');
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByRole('heading', { name: 'Sign in to Stayflow' })).toBeVisible();
  expect((await page.request.get(roomsApi(hillview))).status()).toBe(401);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Sign in to Stayflow' })).toBeVisible();
});

test('mobile: sign-in and rooms fit the screen without horizontal scrolling @mobile-only', async ({ page }) => {
  const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  await page.goto('/');
  expect(await overflow()).toBeLessThanOrEqual(0);
  await signedInAs(page, 'manager');
  await expect(row(page, 'A1')).toBeVisible();
  expect(await overflow()).toBeLessThanOrEqual(0);
});
