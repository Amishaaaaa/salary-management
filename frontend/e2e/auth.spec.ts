import { expect, test } from '@playwright/test'
import { PASSWORD, USER, signIn } from './helpers'

test('visiting a protected page while signed out redirects to login', async ({ page }) => {
  await page.goto('/employees')
  await expect(page).toHaveURL(/\/login/)
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()
})

test('wrong password shows a clear error and stays on login', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Email').fill(USER)
  await page.getByLabel(/^Password/).fill('not-the-password')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('alert')).toContainText('Invalid email or password')
  await expect(page).toHaveURL(/\/login/)
})

test('signing in lands on the overview, survives a refresh, and returns to the requested page', async ({ page }) => {
  await signIn(page, '/employees') // deep link is remembered through login
  await expect(page).toHaveURL(/\/employees/)
  await page.reload()
  await expect(page.getByText(/people match your filters/)).toBeVisible()
})

test('signing out ends the session: protected pages redirect again', async ({ page }) => {
  await signIn(page)
  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page).toHaveURL(/\/login/)
  await page.goto('/insights')
  await expect(page).toHaveURL(/\/login/)
})

test('a signed-in user visiting /login is sent to the app', async ({ page }) => {
  await signIn(page)
  await page.goto('/login')
  await expect(page).toHaveURL(/\/insights/)
})

test('password can be revealed', async ({ page }) => {
  await page.goto('/login')
  const field = page.getByLabel(/^Password/)
  await field.fill(PASSWORD)
  await expect(field).toHaveAttribute('type', 'password')
  await page.getByRole('button', { name: 'Show password' }).click()
  await expect(field).toHaveAttribute('type', 'text')
})
