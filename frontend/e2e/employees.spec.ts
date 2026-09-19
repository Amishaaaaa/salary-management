import { expect, test } from '@playwright/test'

const unique = `E2E${Date.now()}`

test('HR manager can add, raise, review history and delete an employee', async ({ page }) => {
  await page.goto('/employees')
  await expect(page.getByText(/Export CSV \(\d/)).toBeVisible()

  // Add
  await page.getByRole('button', { name: 'Add employee' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('First name').fill(unique)
  await dialog.getByLabel('Last name').fill('Tester')
  await dialog.getByLabel('Email').fill(`${unique}@acme.test`.toLowerCase())
  const pick = async (label: string, option: string) => {
    await dialog.getByLabel(label).click()
    await page.getByRole('option', { name: option }).click()
  }
  await pick('Job title', 'Recruiter')
  await pick('Department', 'HR')
  await pick('Level', 'L2')
  await pick('Gender', 'Non-binary / other')
  await pick('Country', 'US (USD)')
  await dialog.getByLabel('Hire date').fill('2022-05-01')

  // Invalid salary is rejected by the server and shown on the field
  await dialog.getByLabel(/Annual salary/).fill('999999999')
  await dialog.getByRole('button', { name: 'Add employee' }).click()
  await expect(dialog.getByText(/Salary must be between/)).toBeVisible()

  await dialog.getByLabel(/Annual salary/).fill('80000')
  await dialog.getByRole('button', { name: 'Add employee' }).click()
  await expect(dialog).toBeHidden()

  // Find the new person via search
  await page.getByLabel('Search name, email or title').fill(unique)
  const row = page.getByRole('row', { name: new RegExp(unique) })
  await expect(row).toBeVisible()
  await expect(row).toContainText('$80,000')

  // Raise, with a reason
  await row.getByRole('button', { name: /^Edit/ }).click()
  await dialog.getByLabel(/Annual salary/).fill('90000')
  await dialog.getByLabel(/Reason for change/).fill('Promotion')
  await dialog.getByRole('button', { name: 'Save changes' }).click()
  await expect(row).toContainText('$90,000')

  // History keeps both the hire salary and the raise
  await row.getByRole('button', { name: /^History/ }).click()
  await expect(dialog).toContainText('$80,000')
  await expect(dialog).toContainText('$90,000')
  await expect(dialog).toContainText('Promotion')
  await dialog.getByRole('button', { name: 'Close' }).click()

  // Delete (cleans up after the test)
  await row.getByRole('button', { name: /^Delete/ }).click()
  await page.getByRole('button', { name: 'Delete', exact: true }).click()
  await expect(page.getByText('No employees match these filters.')).toBeVisible()
})
