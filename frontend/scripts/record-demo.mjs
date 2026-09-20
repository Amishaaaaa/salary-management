// Records the product demo video by driving the real UI with Playwright: no mocks, no edits.
//
//   npm run demo                                   # records against the live site
//   DEMO_URL=http://127.0.0.1:5173 npm run demo    # or against a local stack
//   DEMO_FAST=1 npm run demo                       # 8x faster dry run, to check the script
//
// Output: docs/demo/acme-pay-demo.mp4 (+ a poster image). Needs ffmpeg for the MP4 conversion.
//
// Voiceover: generated locally with macOS `say` (nothing leaves the machine). Every caption has a spoken line; a caption
// waits until the previous line has finished, so speech never overlaps, and each line's start time is logged and mixed
// onto the video afterwards. DEMO_VOICE=... picks another voice (e.g. a Premium one), DEMO_VOICEOVER=0 disables it.
//
// Sync: Playwright's recorder stretches its timeline (measured ~11% slower than real time, and it varies), so wall-clock
// timestamps drift away from the picture. The script therefore flashes the screen red once at the start and once at the end,
// finds both flashes in the recorded video, derives that run's exact stretch factor, trims the flashes out, restores true
// speed, and places each spoken line by the real clock.
import { chromium } from '@playwright/test'
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

const BASE = process.env.DEMO_URL ?? 'https://acme-salary.onrender.com'
const EMAIL = process.env.DEMO_EMAIL ?? 'hr@acme.com'
const PASSWORD = process.env.DEMO_PASSWORD ?? 'acme-hr-2026'
const OUT = path.resolve(process.env.DEMO_OUT ?? '../docs/demo')
const FAST = process.env.DEMO_FAST === '1'
const REPO = 'github.com/Amishaaaaa/salary-management'
const VOICE = process.env.DEMO_VOICE ?? 'Samantha'
const RATE = process.env.DEMO_RATE ?? '170' // words per minute: clear, unhurried
const VOICEOVER = process.env.DEMO_VOICEOVER !== '0' && !FAST && spawnSync('which', ['say']).status === 0
const PERSON = { first: 'Maya', last: 'Ortega', email: 'maya.ortega@acme.com' }

const wait = (ms) => new Promise((r) => setTimeout(r, FAST ? Math.min(ms, 400) / 4 : ms))
const type = { delay: FAST ? 4 : 55 }

// What is said for each caption (keyed by the caption text). Written to be listened to, not just to repeat the caption.
const NARRATION = {
  'ACME Pay: salary management for HR':
    'This is ACME Pay, a salary management tool for an HR team. It replaces the Excel sheets used to manage ten thousand employees across ten countries.',
  'Sign in with a work email':
    'Sign in with a work email. Sessions use a token, which is revoked on the server when you sign out.',
  'Overview: how does ACME pay its people?':
    'The overview answers the question HR actually asks: how does the company pay its people? Headcount, total payroll, and the median and average salary, all at a glance.',
  'Where does the payroll money go?':
    'Where does the payroll money go? Switch between country, department and level.',
  'Typical salary by job title':
    'For each job title, the bar shows the median salary, and the whisker shows the middle fifty percent of people.',
  'Is there a gender pay gap?':
    'Is there a gender pay gap? This compares people with peers in the same country, department and level, so a difference in job mix cannot fake a gap. Hovering shows the exact gap, and how many women and men are in each group.',
  'Who is paid unusually?':
    'And who is paid unusually? These are people far from the median of peers with the same title, level and country. You can tighten the threshold.',
  'Filter every number by country, department or level':
    'Every number can be filtered by country, department or level. Here is Germany on its own, and everything updates.',
  '10,000 employees: search, filter, sort and paginate':
    'The employee list handles all ten thousand people. Searching, filtering, sorting and paging all happen on the server, so it stays fast.',
  'Sort by salary, or export the filtered list to CSV':
    'Sort by salary, or export the filtered list to a CSV file.',
  'Add an employee': 'Now, adding an employee. Every field is validated by the server.',
  'A typo is caught, not saved':
    'A typo, like a few extra zeros in the salary, is caught and never saved.',
  'Fix it and save':
    'Fix it and save. The salary is stored in local currency, with a US dollar copy so people in different countries can be compared.',
  'Added': 'The new employee appears with their salary in pounds, and the dollar equivalent.',
  'Give a raise': 'Now a raise. The old salary is kept, not overwritten.',
  'Full salary history':
    'Every employee has a full salary history: the hire salary, and each change after it, with the reason.',
  'Deleting asks for confirmation': 'Deleting always asks for confirmation first.',
  'The sidebar is adjustable':
    'The sidebar is adjustable. Collapse it to icons, or drag its edge to any width. It remembers your choice.',
  'Light and dark themes': 'There are light and dark themes.',
  'Signing out revokes the session on the server': 'Signing out revokes the session on the server.',
  END: 'That is ACME Pay. The live demo, and all the code, tests and design notes, are linked in the repository. Thank you for watching.',
}

// ---- voiceover: pre-generate each line so its length is known before recording
const speech = new Map() // key -> { file, seconds }
const clips = [] // { file, startSeconds } in the order they are spoken
let recordingStart = 0
let speechBusyUntil = 0 // seconds since recordingStart
const nowSeconds = () => (performance.now() - recordingStart) / 1000

function prepareVoice(dir) {
  if (!VOICEOVER) return
  for (const [key, text] of Object.entries(NARRATION)) {
    const file = path.join(dir, `${Object.keys(NARRATION).indexOf(key)}.aiff`)
    spawnSync('say', ['-v', VOICE, '-r', RATE, '-o', file, text], { stdio: 'inherit' })
    const probe = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { encoding: 'utf8' })
    speech.set(key, { file, seconds: parseFloat(probe.stdout) })
  }
}

/** Start speaking `key` as soon as the previous line is done; resolves at the moment the line starts. */
async function speak(key) {
  const line = speech.get(key)
  if (!line) return
  const waitFor = speechBusyUntil - nowSeconds()
  if (waitFor > 0) await new Promise((r) => setTimeout(r, waitFor * 1000))
  const start = nowSeconds()
  clips.push({ file: line.file, startSeconds: start })
  speechBusyUntil = start + line.seconds + 0.45 // a small breath between lines
}

// ---- overlay: captions, a visible cursor with click feedback, and an end card (injected into every page)
const overlay = () => {
  const install = () => {
    if (document.getElementById('demo-caption')) return
    const style = document.createElement('style')
    style.textContent = `
      #demo-caption{position:fixed;z-index:2147483647;pointer-events:none;color:#fff;font:600 22px/1.35 Inter,system-ui,sans-serif;
        background:rgba(15,12,41,.9);padding:14px 26px;border-radius:14px;box-shadow:0 12px 40px rgba(0,0,0,.4);opacity:0;
        transition:opacity .35s,transform .35s;text-align:center;max-width:880px;left:50%;bottom:30px;transform:translate(-50%,12px)}
      #demo-caption.on{opacity:1;transform:translate(-50%,0)}
      #demo-caption small{display:block;font-weight:500;font-size:16px;opacity:.78;margin-top:5px}
      #demo-caption.side{left:22px;bottom:auto;top:50%;width:290px;max-width:290px;text-align:left;transform:translate(-12px,-50%)}
      #demo-caption.side.on{transform:translate(0,-50%)}
      #demo-cursor{position:fixed;left:-60px;top:-60px;width:24px;height:24px;border-radius:50%;z-index:2147483647;pointer-events:none;
        background:rgba(99,102,241,.32);border:2.5px solid #6366f1;transform:translate(-50%,-50%);transition:transform .12s,background .12s}
      #demo-cursor.down{transform:translate(-50%,-50%) scale(.62);background:rgba(236,72,153,.55);border-color:#ec4899}
      #demo-end{position:fixed;inset:0;z-index:2147483647;display:grid;place-items:center;text-align:center;color:#fff;opacity:0;pointer-events:none;
        background:linear-gradient(135deg,#0f0c29,#1e1b4b 45%,#4c1d95);font-family:Inter,system-ui,sans-serif;transition:opacity .6s}
      #demo-end.on{opacity:1}
      #demo-end h1{font-size:54px;margin:0 0 10px;letter-spacing:-.02em}
      #demo-end p{font-size:22px;opacity:.85;margin:6px 0}
      #demo-end b{background:linear-gradient(90deg,#a5b4fc,#f9a8d4);-webkit-background-clip:text;color:transparent}`
    document.head.appendChild(style)
    for (const [id, html] of [['demo-caption', ''], ['demo-cursor', ''], ['demo-end', '']]) {
      const el = document.createElement('div')
      el.id = id
      el.innerHTML = html
      document.body.appendChild(el)
    }
    const cursor = document.getElementById('demo-cursor')
    window.addEventListener('mousemove', (e) => { cursor.style.left = e.clientX + 'px'; cursor.style.top = e.clientY + 'px' }, true)
    window.addEventListener('mousedown', () => cursor.classList.add('down'), true)
    window.addEventListener('mouseup', () => cursor.classList.remove('down'), true)
  }
  if (document.body) install()
  else document.addEventListener('DOMContentLoaded', install)
}

const caption = (page, text, sub = '', pos = 'bottom') =>
  page.evaluate(([t, s, p]) => {
    const el = document.getElementById('demo-caption')
    if (!el) return
    el.className = `${p === 'side' ? 'side ' : ''}on`
    el.innerHTML = `${t}${s ? `<small>${s}</small>` : ''}`
  }, [text, sub, pos])
const flashes = { start: 0, end: 0 } // wall-clock seconds at which each sync flash was shown
async function syncFlash(page) {
  const at = nowSeconds()
  await page.evaluate(() => {
    const d = document.createElement('div')
    d.id = 'demo-flash'
    d.style.cssText = 'position:fixed;inset:0;background:#f00;z-index:2147483647'
    document.body.appendChild(d)
  })
  await new Promise((r) => setTimeout(r, 600))
  await page.evaluate(() => document.getElementById('demo-flash')?.remove())
  return at
}
const uncaption = (page) => page.evaluate(() => document.getElementById('demo-caption')?.classList.remove('on'))

async function glide(page, locator) {
  await locator.scrollIntoViewIfNeeded()
  const box = await locator.boundingBox()
  if (!box) throw new Error('element has no box')
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: FAST ? 2 : 24 })
}
async function click(page, locator) {
  await glide(page, locator)
  await wait(350)
  await page.mouse.down(); await wait(90); await page.mouse.up()
  await wait(300)
}
async function typeInto(page, locator, text, { clear = false } = {}) {
  await click(page, locator)
  if (clear) await locator.fill('')
  await locator.pressSequentially(text, type)
}
const scroll = async (page, y) => { await page.evaluate((top) => window.scrollTo({ top, behavior: 'smooth' }), y); await wait(1100) }
const step = async (page, text, sub, ms, pos) => {
  await speak(text) // no-op when voiceover is off; otherwise waits for the previous line to finish
  await caption(page, text, sub, pos)
  await wait(ms)
}

// ---- the recording
const tmp = mkdtempSync(path.join(tmpdir(), 'demo-'))
mkdirSync(OUT, { recursive: true })
prepareVoice(tmp)
const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, recordVideo: { dir: tmp, size: { width: 1280, height: 720 } } })
await context.addInitScript(overlay)
const page = await context.newPage()
recordingStart = performance.now() // the video's clock starts when the page is created
page.setDefaultTimeout(30_000)
const problems = []
page.on('pageerror', (e) => problems.push(e.message))
// The demo deliberately submits one invalid salary, so the server's 400 for it is expected, not a problem.
page.on('console', (m) => m.type() === 'error' && !/status of 400/.test(m.text()) && problems.push(m.text()))

try {
  // 1. Sign in
  await page.goto(`${BASE}/login`)
  await page.getByLabel('Email').waitFor()
  if (VOICEOVER) { flashes.start = await syncFlash(page); await wait(900) } // sync marker, trimmed out later
  await wait(1200)
  await step(page, 'ACME Pay: salary management for HR', '10,000 employees across 10 countries, replacing the Excel sheets', 4800)
  await step(page, 'Sign in with a work email', 'Sessions are token-based and revoked on sign-out', 1200)
  await typeInto(page, page.getByLabel('Email'), EMAIL)
  await typeInto(page, page.getByLabel(/^Password/), PASSWORD)
  await click(page, page.getByRole('button', { name: 'Sign in' }))
  await page.getByText('Headcount').waitFor()
  await page.locator('svg.recharts-surface').nth(2).waitFor()
  await wait(1500)

  // 2. Overview
  await step(page, 'Overview: how does ACME pay its people?', 'Headcount, total payroll, median and average salary at a glance', 4800)
  await scroll(page, 430)
  await step(page, 'Where does the payroll money go?', 'Switch between country, department and level', 2200)
  await click(page, page.getByRole('button', { name: /^department$/i }).first())
  await wait(2600)
  await click(page, page.getByRole('button', { name: /^level$/i }).first())
  await wait(2200)
  await step(page, 'Typical salary by job title', 'The bar is the median; the whisker is the middle 50% of people', 5200)
  await scroll(page, 900)
  await step(page, 'Is there a gender pay gap?', 'Compared with peers in the same country, department and level, so role mix cannot fake a gap', 3000)
  await glide(page, page.locator('svg.recharts-surface').nth(2).locator('.recharts-bar-rectangle').first())
  await wait(3200)
  await step(page, 'Who is paid unusually?', 'People far from the median of peers with the same title, level and country', 3400)
  await click(page, page.getByRole('button', { name: '25', exact: true }))
  await wait(2600)
  await scroll(page, 0)
  await step(page, 'Filter every number by country, department or level', '', 1400)
  await click(page, page.getByLabel('Country', { exact: true }))
  await click(page, page.getByRole('option', { name: /\bDE\b/ }))
  await page.getByRole('listbox').waitFor({ state: 'hidden' })
  await wait(3800)
  await click(page, page.getByRole('button', { name: 'Clear filters' }))
  await wait(1200)

  // 3. Employees list
  await click(page, page.getByRole('link', { name: 'Employees' }))
  await page.getByText(/people match your filters/).waitFor()
  await step(page, '10,000 employees: search, filter, sort and paginate', 'All done on the server, so it stays fast at this size', 3200)
  await typeInto(page, page.getByLabel('Search name, email or title'), 'smith')
  await wait(2600)
  await page.getByLabel('Search name, email or title').fill('')
  await click(page, page.getByRole('button', { name: /Salary \(USD\)/ }))
  await click(page, page.getByRole('button', { name: /Salary \(USD\)/ }))
  await step(page, 'Sort by salary, or export the filtered list to CSV', '', 3200)

  // 4. Add an employee (with a rejected value)
  await click(page, page.getByRole('button', { name: 'Add employee' }))
  const dialog = page.getByRole('dialog')
  await dialog.waitFor()
  await step(page, 'Add an employee', 'Every field is validated by the server', 2400, 'side')
  await typeInto(page, dialog.getByLabel('First name'), PERSON.first)
  await typeInto(page, dialog.getByLabel('Last name'), PERSON.last)
  await typeInto(page, dialog.getByLabel('Email'), PERSON.email)
  const pick = async (label, option) => {
    await click(page, dialog.getByLabel(label))
    await click(page, page.getByRole('option', { name: option }))
    await page.getByRole('listbox').waitFor({ state: 'hidden' }) // the closing menu would otherwise swallow the next click
  }
  await pick('Job title', 'Software Engineer')
  await pick('Department', 'Engineering')
  await pick('Level', 'L3')
  await pick('Gender', 'Female')
  await pick('Country', 'GB (GBP)')
  await dialog.getByLabel('Hire date').fill('2024-03-01')
  await typeInto(page, dialog.getByLabel(/Annual salary/), '999999999')
  await step(page, 'A typo is caught, not saved', 'Salary above the allowed maximum', 900, 'side')
  await click(page, dialog.getByRole('button', { name: 'Add employee' }))
  await dialog.getByText(/Salary must be between/).waitFor()
  await wait(3200)
  await typeInto(page, dialog.getByLabel(/Annual salary/), '68000', { clear: true })
  await step(page, 'Fix it and save', 'Salary is stored in local currency, with a USD copy for comparisons', 1500, 'side')
  await click(page, dialog.getByRole('button', { name: 'Add employee' }))
  await dialog.waitFor({ state: 'hidden' })
  await typeInto(page, page.getByLabel('Search name, email or title'), PERSON.last)
  const row = page.getByRole('row', { name: new RegExp(PERSON.last) })
  await row.waitFor()
  await step(page, 'Added', 'Shown in pounds, and in USD for like-for-like comparison', 3600)

  // 5. Raise + history
  await click(page, row.getByRole('button', { name: /^Edit/ }))
  await dialog.waitFor()
  await step(page, 'Give a raise', 'The old salary is kept, not overwritten', 2000, 'side')
  await typeInto(page, dialog.getByLabel(/Annual salary/), '74000', { clear: true })
  await typeInto(page, dialog.getByLabel(/Reason for change/), 'Annual review')
  await click(page, dialog.getByRole('button', { name: 'Save changes' }))
  await dialog.waitFor({ state: 'hidden' })
  await row.getByText('£74,000').waitFor()
  await wait(1400)
  await click(page, row.getByRole('button', { name: /^History/ }))
  await dialog.waitFor()
  await dialog.getByText('Annual review').waitFor()
  await step(page, 'Full salary history', 'Hire salary and every change after it, with the reason', 4800, 'side')
  await click(page, dialog.getByRole('button', { name: 'Close' }))

  // 6. Delete (also leaves no demo data behind)
  await click(page, row.getByRole('button', { name: /^Delete/ }))
  await step(page, 'Deleting asks for confirmation', '', 2200, 'side')
  await click(page, page.getByRole('button', { name: 'Delete', exact: true }))
  await page.getByText('No employees match these filters.').waitFor()
  await uncaption(page)
  await wait(800)

  // 7. Polish
  await step(page, 'The sidebar is adjustable', 'Collapse it, or drag its edge to any width; it remembers your choice', 1200)
  await click(page, page.getByRole('button', { name: 'Collapse sidebar' }))
  await wait(2400)
  await click(page, page.getByRole('button', { name: 'Expand sidebar' }))
  await wait(1000)
  await step(page, 'Light and dark themes', '', 800)
  await click(page, page.getByRole('button', { name: 'Toggle colour mode' }))
  await wait(3200)
  await click(page, page.getByRole('button', { name: 'Toggle colour mode' }))
  await wait(1000)

  // 8. Sign out
  await step(page, 'Signing out revokes the session on the server', '', 1500)
  await click(page, page.getByRole('button', { name: 'Sign out' }))
  await page.getByRole('heading', { name: 'Welcome back' }).waitFor()
  await wait(2400)

  // End card
  await uncaption(page)
  await page.evaluate(([repo, live]) => {
    const end = document.getElementById('demo-end')
    end.innerHTML = `<div><h1>ACME <b>Pay</b></h1><p>Live demo: ${live}</p><p>Code, tests and design notes: ${repo}</p>
      <p style="opacity:.6;font-size:17px;margin-top:22px">Django REST Framework · React · 100+ automated tests</p></div>`
    end.classList.add('on')
  }, [REPO, BASE.replace(/^https?:\/\//, '')])
  await speak('END')
  await wait(Math.max(6500, (speechBusyUntil - nowSeconds()) * 1000 + 800))
  if (VOICEOVER) { flashes.end = await syncFlash(page); await wait(500) } // sync marker, trimmed out later
} finally {
  await page.close().catch(() => {})
  await context.close()
  await browser.close()
}

// ---- find the sync flashes in the raw recording (runs of fully red frames, as [start, end] seconds of video time)
function redRuns(file) {
  const raw = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-vf', 'fps=25,scale=16:9,format=rgb24', '-f', 'rawvideo', '-'], { maxBuffer: 1 << 29 }).stdout
  const frame = 16 * 9 * 3
  const runs = []
  let begin = null
  for (let i = 0; i * frame < raw.length; i++) {
    let r = 0, g = 0
    for (let p = 0; p < frame; p += 3) { r += raw[i * frame + p]; g += raw[i * frame + p + 1] }
    const red = (r - g) / 144 > 170
    if (red && begin === null) begin = i / 25
    if (!red && begin !== null) { runs.push([begin, i / 25]); begin = null }
  }
  return runs
}

// ---- convert to MP4, mix the voiceover in, and grab a poster image
const webm = readdirSync(tmp).find((f) => f.endsWith('.webm'))
const mp4 = path.join(OUT, 'acme-pay-demo.mp4')
const silent = path.join(tmp, 'silent.mp4')
const ff = (args) => spawnSync('ffmpeg', ['-y', '-loglevel', 'error', ...args], { stdio: 'inherit' })
const encode = ['-c:v', 'libx264', '-crf', '23', '-preset', 'slow', '-pix_fmt', 'yuv420p']
let wallAtVideoStart = 0 // the wall-clock second that the first kept video frame corresponds to
if (VOICEOVER) {
  const runs = redRuns(path.join(tmp, webm))
  if (runs.length < 2) throw new Error(`Expected 2 sync flashes in the video, found ${runs.length}`)
  const first = runs[0]
  const last = runs[runs.length - 1]
  const stretch = (last[0] - first[0]) / (flashes.end - flashes.start) // video seconds per real second
  const keepFrom = first[1] + 0.15
  const keepTo = last[0] - 0.1
  wallAtVideoStart = flashes.start + (keepFrom - first[0]) / stretch
  console.log(`Sync: video runs ${stretch.toFixed(3)}x real time; keeping ${keepFrom.toFixed(1)}s..${keepTo.toFixed(1)}s of the raw video`)
  ff(['-i', path.join(tmp, webm), '-vf', `trim=start=${keepFrom}:end=${keepTo},setpts=(PTS-STARTPTS)/${stretch},fps=30`, ...encode, '-movflags', '+faststart', silent])
} else {
  ff(['-i', path.join(tmp, webm), ...encode, '-r', '30', '-movflags', '+faststart', mp4])
}
if (VOICEOVER) {
  const inputs = clips.flatMap((c) => ['-i', c.file])
  const delayed = clips.map((c, i) => {
    const ms = Math.max(0, Math.round((c.startSeconds - wallAtVideoStart) * 1000))
    return `[${i + 1}:a]aresample=44100,adelay=${ms}|${ms}[a${i}]`
  })
  const mix = `${clips.map((_, i) => `[a${i}]`).join('')}amix=inputs=${clips.length}:normalize=0:duration=longest,loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000[voice]`
  ff(['-i', silent, ...inputs, '-filter_complex', [...delayed, mix].join(';'), '-map', '0:v', '-map', '[voice]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', mp4])
}
ff(['-ss', FAST ? '3' : '9', '-i', mp4, '-frames:v', '1', '-q:v', '3', path.join(OUT, 'poster.jpg')])
if (VOICEOVER) console.log(`Voiceover: ${clips.length} lines, voice "${VOICE}" at ${RATE} wpm`)
rmSync(tmp, { recursive: true, force: true })

const uniqueProblems = [...new Set(problems)]
console.log(`\nSaved ${mp4}`)
console.log(uniqueProblems.length ? `Browser problems seen while recording:\n - ${uniqueProblems.join('\n - ')}` : 'No console errors while recording.')
