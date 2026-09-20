import { expect, test, type Page } from '@playwright/test'
import { signIn } from './helpers'

const navWidth = async (page: Page) => Math.round((await page.getByRole('navigation', { name: 'Main' }).boundingBox())!.width)
const settled = async (page: Page, expected: number) => {
  // width animates for ~220ms, so poll until it lands rather than sleeping
  await expect.poll(() => navWidth(page), { timeout: 3000 }).toBeGreaterThanOrEqual(expected - 2)
  await expect.poll(() => navWidth(page), { timeout: 3000 }).toBeLessThanOrEqual(expected + 2)
}

test.describe('adjustable sidebar', () => {
  test.beforeEach(async ({ page }) => { await signIn(page) })

  test('collapses to an icon rail and expands back, keeping navigation usable', async ({ page }) => {
    await settled(page, 264)
    await page.getByRole('button', { name: 'Collapse sidebar' }).click()
    await settled(page, 76)
    await expect(page.getByText('Salary management')).toBeHidden() // labels gone in the rail
    await page.getByRole('link', { name: 'Employees' }).click() // icons still navigate
    await expect(page).toHaveURL(/\/employees/)
    await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible()
    await page.getByRole('button', { name: 'Expand sidebar' }).click()
    await settled(page, 264)
    await expect(page.getByText('Salary management')).toBeVisible()
  })

  test('can be resized by dragging the edge, and remembers the width after a reload', async ({ page }) => {
    const handle = await page.getByRole('separator', { name: 'Resize sidebar' }).boundingBox()
    const y = handle!.y + 300
    await page.mouse.move(handle!.x + 5, y)
    await page.mouse.down()
    await page.mouse.move(340, y, { steps: 8 })
    await page.mouse.up()
    await settled(page, 340)
    await page.reload()
    await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible()
    await settled(page, 340)
  })

  test('dragging past the threshold snaps to the rail', async ({ page }) => {
    const handle = await page.getByRole('separator', { name: 'Resize sidebar' }).boundingBox()
    const y = handle!.y + 300
    await page.mouse.move(handle!.x + 5, y)
    await page.mouse.down()
    await page.mouse.move(90, y, { steps: 8 })
    await page.mouse.up()
    await settled(page, 76)
  })

  test('is keyboard adjustable and double-click resets it', async ({ page }) => {
    const handle = page.getByRole('separator', { name: 'Resize sidebar' })
    await handle.focus()
    await page.keyboard.press('Home')
    await settled(page, 76)
    await page.keyboard.press('ArrowRight')
    await settled(page, 220)
    await page.keyboard.press('ArrowRight')
    await settled(page, 236)
    await handle.dblclick()
    await settled(page, 264)
  })
})
