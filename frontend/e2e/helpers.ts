import { expect, type APIRequestContext, type Page } from '@playwright/test'

export const USER = process.env.E2E_USER ?? 'hr'
export const PASSWORD = process.env.E2E_PASSWORD ?? 'acme-hr-2026'

export async function signIn(page: Page, path = '/insights') {
  await page.goto(path)
  await page.getByLabel('Username').fill(USER)
  await page.getByLabel(/^Password/).fill(PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible()
}

/** Delete any employees whose name matches `term`. Runs via the API so it works even if the UI test died midway. */
export async function deleteEmployeesMatching(request: APIRequestContext, term: string) {
  const login = await request.post('/api/auth/login/', { data: { username: USER, password: PASSWORD } })
  const headers = { Authorization: `Token ${(await login.json()).token}` }
  const found = await request.get(`/api/employees/?search=${encodeURIComponent(term)}`, { headers })
  for (const e of (await found.json()).results) await request.delete(`/api/employees/${e.id}/`, { headers })
}
