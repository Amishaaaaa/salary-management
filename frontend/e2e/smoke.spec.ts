import { expect, test } from '@playwright/test'

function collectErrors(page: import('@playwright/test').Page) {
  const errors: string[] = []
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  page.on('pageerror', (e) => errors.push(e.message))
  return errors
}

test('employees page loads with data and no console errors', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('/employees')
  await expect(page.getByRole('row').nth(1)).toBeVisible()
  expect(errors).toEqual([])
})

test('insights dashboard renders KPIs, all charts and every job-title label', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('/insights')
  await expect(page.getByText('Headcount')).toBeVisible()
  await expect(page.getByText('10,000', { exact: true })).toBeVisible()
  await expect(page.locator('svg.recharts-surface')).toHaveCount(3)
  // interval={0}: no tick skipping, so each of the 12 bars in the job-title chart is labelled
  const jobTitleLabels = page.locator('svg.recharts-surface').nth(1)
    .locator('.recharts-yAxis-tick-labels .recharts-cartesian-axis-tick-label')
  await expect(jobTitleLabels).toHaveCount(12)
  await expect(page.getByText('Who is paid unusually?')).toBeVisible()
  expect(errors).toEqual([])
})

test('filters narrow the dashboard', async ({ page }) => {
  await page.goto('/insights')
  await page.getByLabel('Country').click()
  await page.getByRole('option', { name: 'IN' }).click()
  await expect(page.getByText('10,000', { exact: true })).toBeHidden()
  await expect(page.getByText('Headcount')).toBeVisible()
})
