import { expect, type Page } from '@playwright/test';

// Publicly documented synthetic identities from supabase/seed.sql (local project only).
export const password = 'Stayflow-local-demo-007!';
export const hillview = '10000000-0000-4000-8000-000000000011';
export const maroela = '10000000-0000-4000-8000-000000000021';

export async function signIn(page: Page, alias: string, secret = password) {
  await page.goto('/');
  await page.getByLabel('Work email').fill(alias + '@stayflow.test');
  await page.getByLabel('Password').fill(secret);
  await page.getByRole('button', { name: 'Sign in' }).click();
}

export async function signedInAs(page: Page, alias: string) {
  await signIn(page, alias);
  await expect(page.getByRole('heading', { name: 'Rooms' })).toBeVisible();
}

export const uniqueRoom = () => 'E2E-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

export async function addRoom(page: Page, label: string, status: 'available' | 'out_of_service' = 'available') {
  await page.getByRole('button', { name: 'Add room' }).click();
  const dialog = page.getByRole('dialog', { name: 'Add room' });
  await dialog.getByLabel('Room identifier').fill(label);
  await dialog.getByLabel('Status').selectOption(status);
  await dialog.getByRole('button', { name: 'Add room' }).click();
  await expect(page.getByText('Room ' + label + ' added.')).toBeVisible();
}

export const row = (page: Page, label: string) => page.getByRole('row', { name: new RegExp('^' + label + '\\b') });
