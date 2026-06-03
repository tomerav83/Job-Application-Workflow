#!/usr/bin/env node
/*
 * scrape-linkedin-skills.js
 *
 * Pulls the COMPLETE, per-role-attributed skills list from a LinkedIn profile's
 * /details/skills/ page — the data the linkedin-scraper-mcp server truncates to
 * ~10 skills (it has no "full" mode and collapses each role's list as "+N
 * skills"). See ./README.md for the why.
 *
 * It reuses the browser session the MCP already authenticated (stored at
 * ~/.linkedin-mcp/profile) by COPYING that profile to a temp dir and driving it
 * with this repo's bundled Playwright Chromium (same revision as the profile, so
 * the session loads without a re-login). The original profile is never touched.
 *
 * USAGE:
 *   # close the MCP browser first so the session profile is free:
 *   #   (call the MCP close_session tool, or stop the server)
 *   node scripts/linkedin-skills/scrape-linkedin-skills.js <username> [options]
 *
 *   <username>            the profile handle, e.g. "jane-doe" (from
 *                         linkedin.com/in/jane-doe). REQUIRED — never hardcode it;
 *                         derive it from the relevant/authenticated user.
 *   --profile <dir>       session profile dir (default: ~/.linkedin-mcp/profile)
 *   --out <file>          write JSON here (default: stdout)
 *   --headed              run with a visible browser (default: headless)
 *
 * OUTPUT (JSON to stdout or --out):
 *   { "username": "...", "count": N,
 *     "skills": [ { "skill": "Docker", "attribution": "3 experiences at Taboola and 2 other companies" }, ... ] }
 *
 * Exit codes: 0 ok · 2 auth wall (session expired/rejected) · 1 other error.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');
const { chromium } = require('playwright');

function parseArgs(argv) {
  const args = { profile: path.join(os.homedir(), '.linkedin-mcp', 'profile'), out: null, headed: false };
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--profile') args.profile = argv[++i];
    else if (a === '--out') args.out = argv[++i];
    else if (a === '--headed') args.headed = true;
    else rest.push(a);
  }
  args.username = rest[0];
  return args;
}

// An attribution line is the "<role> at <company>" / "N experiences at ..." line
// shown under each skill. Matches English + Hebrew localized UIs.
const isAttribution = (l) =>
  /(experience|experiences|\bat\s|\bב-|ניסיונ|חוויות|endors|המלצ)/i.test(l);

async function run() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.username) {
    console.error('ERROR: <username> is required (e.g. "jane-doe"). Never hardcode it — pass the relevant user.');
    process.exit(1);
  }
  if (!fs.existsSync(args.profile)) {
    console.error(`ERROR: session profile not found at ${args.profile}. Authenticate the LinkedIn MCP first.`);
    process.exit(1);
  }

  // Copy the session profile so we never corrupt the MCP's original, and strip
  // lock files that would otherwise block reuse.
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'li-skills-'));
  execSync(`cp -a ${JSON.stringify(args.profile)}/. ${JSON.stringify(tmp)}/`);
  for (const name of ['SingletonLock', 'SingletonCookie', 'SingletonSocket', 'lockfile']) {
    try { fs.rmSync(path.join(tmp, name), { force: true }); } catch (e) {}
  }

  let ctx;
  try {
    ctx = await chromium.launchPersistentContext(tmp, {
      headless: !args.headed,
      viewport: { width: 1280, height: 1600 },
      args: ['--disable-blink-features=AutomationControlled', '--no-sandbox'],
    });
    const page = ctx.pages()[0] || (await ctx.newPage());
    const url = `https://www.linkedin.com/in/${encodeURIComponent(args.username)}/details/skills/`;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(3000);

    const head = ((await page.evaluate(() => document.body.innerText)) || '').slice(0, 400);
    if (/sign in|join now|authwall/i.test(head) || /\/(login|authwall|checkpoint)/.test(page.url())) {
      console.error('AUTH_WALL: the stored session was not accepted (expired or checkpoint). Re-login the MCP and retry.');
      await ctx.close();
      process.exit(2);
    }

    // Discover the category-filter tabs (All / Tools & Technologies / Industry
    // Knowledge / Other Skills) by SHAPE, not English text — the UI may be
    // localized. They are the first short-text buttons with no aria-label.
    const tabLabels = await page.$$eval('main button', (btns) =>
      btns
        .map((b) => ({ t: (b.innerText || '').trim(), al: b.getAttribute('aria-label') || '' }))
        .filter((b) => b.t && !b.al && b.t.length < 30 && !/\d/.test(b.t))
        .slice(0, 4)
        .map((b) => b.t)
    );
    if (tabLabels.length === 0) tabLabels.push(null); // no tabs: scrape the single view

    const skills = new Map();
    const seenLower = new Set();
    for (const label of tabLabels) {
      if (label) {
        try {
          const b = page.locator('main button', { hasText: label });
          if (await b.count()) { await b.first().click({ timeout: 3000 }); await page.waitForTimeout(1500); }
        } catch (e) {}
      }
      for (let i = 0; i < 10; i++) {
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(700);
      }
      const txt = await page.evaluate(() => (document.querySelector('main') || document.body).innerText);
      const lines = txt.split('\n').map((s) => s.replace(/[‎‏⁦⁩⁧]/g, '').trim()).filter(Boolean);
      const tabSet = new Set(tabLabels.filter(Boolean));
      for (let i = 0; i < lines.length - 1; i++) {
        const l = lines[i];
        const next = lines[i + 1];
        // A skill = a non-attribution, non-tab line immediately followed by an
        // attribution line. Requiring the attribution naturally drops footer/nav
        // noise (those lines aren't followed by "<role> at <company>").
        if (tabSet.has(l) || l.length > 55 || isAttribution(l)) continue;
        if (/[.!?:]$/.test(l)) continue; // skill names never end in sentence punctuation (drops footer/nav lines)
        if (!isAttribution(next)) continue;
        const key = l.toLowerCase();
        if (seenLower.has(key)) continue;
        seenLower.add(key);
        skills.set(l, next);
      }
    }

    await ctx.close();
    fs.rmSync(tmp, { recursive: true, force: true });

    const out = {
      username: args.username,
      count: skills.size,
      skills: [...skills].map(([skill, attribution]) => ({ skill, attribution })),
    };
    const json = JSON.stringify(out, null, 2);
    if (args.out) { fs.writeFileSync(args.out, json); console.error(`Wrote ${skills.size} skills -> ${args.out}`); }
    else console.log(json);
  } catch (e) {
    try { if (ctx) await ctx.close(); } catch (_) {}
    try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (_) {}
    console.error('ERROR: ' + e.message);
    process.exit(1);
  }
}

run();
