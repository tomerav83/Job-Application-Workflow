#!/usr/bin/env node
/**
 * render-cv.js
 *
 * Converts a resume.json into a tailored HTML CV and renders it to PDF.
 *
 * Usage:
 *   node tailoring/render-cv.js <path-to-resume.json>
 *
 * Output (written next to the JSON):
 *   {First-Last}.html
 *   {First-Last}.pdf
 *
 * Personal info resolution order:
 *   1. resume.json → personal
 *   2. ../private-files/candidate-data.json
 *   3. ../autofill-chrome-extension/candidate-data.json
 *   4. Exit with a meaningful error if none found
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ─── 1. CLI arg ──────────────────────────────────────────────────────────────

const [,, resumeJsonPath] = process.argv;

if (!resumeJsonPath) {
  console.error('Usage: node tailoring/render-cv.js <path-to-resume.json>');
  process.exit(1);
}

const jsonAbsPath = path.resolve(resumeJsonPath);

if (!fs.existsSync(jsonAbsPath)) {
  console.error(`Error: file not found: ${jsonAbsPath}`);
  process.exit(1);
}

// ─── 2. Read resume.json ─────────────────────────────────────────────────────

let resume;
try {
  resume = JSON.parse(fs.readFileSync(jsonAbsPath, 'utf8'));
} catch (e) {
  console.error(`Error: could not parse ${jsonAbsPath}\n${e.message}`);
  process.exit(1);
}

// ─── 3. Resolve personal info ────────────────────────────────────────────────

/**
 * Normalises a candidate-data.json personal block (autofill extension schema)
 * into the same shape as resume.json personal.
 */
function normaliseCandidateData(cd) {
  const p = cd.personal || {};
  const city    = (p.location && p.location.city)    || '';
  const country = (p.location && p.location.country) || '';
  const location = [city, country].filter(Boolean).join(', ');

  const linkedin = (p.linkedin || '').replace(/^https?:\/\//, '');

  return {
    name:     p.full_name || [p.first_name, p.last_name].filter(Boolean).join(' '),
    title:    '',          // not in candidate-data; caller must supply
    email:    p.email    || '',
    phone:    p.phone    || '',
    location,
    linkedin,
  };
}

function loadCandidateDataFallback() {
  const scriptDir = __dirname;
  const candidates = [
    path.join(scriptDir, '..', 'private-files', 'candidate-data.json'),
    path.join(scriptDir, '..', 'autofill-chrome-extension', 'candidate-data.json'),
  ];
  for (const fp of candidates) {
    if (fs.existsSync(fp)) {
      try {
        const cd = JSON.parse(fs.readFileSync(fp, 'utf8'));
        console.log(`Info: personal info loaded from fallback: ${fp}`);
        return normaliseCandidateData(cd);
      } catch (e) {
        console.warn(`Warning: could not parse ${fp}: ${e.message}`);
      }
    }
  }
  return null;
}

let personal = resume.personal || null;

// Validate that the primary source has at least a name
if (!personal || !personal.name) {
  const fallback = loadCandidateDataFallback();
  if (!fallback) {
    console.error(
        'Error: no personal info found.\n' +
        '  Checked:\n' +
        '    1. resume.json → personal.name\n' +
        '    2. private-files/candidate-data.json\n' +
        '    3. autofill-chrome-extension/candidate-data.json\n' +
        '  Add a "personal" block to resume.json or create one of the above files.'
    );
    process.exit(1);
  }
  // Merge: use fallback for missing fields, keep anything present in resume.json
  personal = Object.assign({}, fallback, resume.personal || {});
}

// If title came from resume-level (older schema), merge it in
if (!personal.title && resume.title) {
  personal.title = resume.title;
}

// ─── 4. Derive output paths ──────────────────────────────────────────────────

// "Joe Doe" → "Joe-Doe"
const nameSlug = personal.name.trim().replace(/\s+/g, '-');
const outDir   = path.dirname(jsonAbsPath);
const htmlPath = path.join(outDir, `${nameSlug}.html`);
const pdfPath  = path.join(outDir, `${nameSlug}.pdf`);

// ─── 5. SVG icons (inline, identical to Base-CV.html) ───────────────────────

const ICONS = {
  email: `<svg viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>`,
  phone: `<svg viewBox="0 0 24 24"><path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24c1.12.37 2.33.57 3.58.57a1 1 0 011 1V20a1 1 0 01-1 1C10.61 21 3 13.39 3 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.45.57 3.58a1 1 0 01-.25 1.01l-2.2 2.2z"/></svg>`,
  location: `<svg viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 119.5 9 2.5 2.5 0 0112 11.5z"/></svg>`,
  linkedin: `<svg viewBox="0 0 24 24"><path fill="#fff" d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>`,
};

// ─── 6. HTML helpers ─────────────────────────────────────────────────────────

function esc(str) {
  return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
}

function contactItem(text, iconKey, href) {
  const label = href
      ? `<a href="${esc(href)}" target="_blank">${esc(text)}</a>`
      : esc(text);
  return `
      <div class="contact-item">
        <span>${label}</span>
        <div class="contact-icon">${ICONS[iconKey]}</div>
      </div>`;
}

function renderHeader(p) {
  const linkedinHref = p.linkedin
      ? (p.linkedin.startsWith('http') ? p.linkedin : `https://${p.linkedin}`)
      : '';

  return `
  <!-- HEADER -->
  <div class="header">
    <div class="header-left">
      <h1>${esc(p.name)}</h1>
      <p class="subtitle">${esc(p.title)}</p>
    </div>
    <div class="header-right">${
      [
        p.email    ? contactItem(p.email,    'email',    `mailto:${p.email}`)  : '',
        p.phone    ? contactItem(p.phone,    'phone',    '')                   : '',
        p.location ? contactItem(p.location, 'location', '')                   : '',
        p.linkedin ? contactItem(p.linkedin, 'linkedin', linkedinHref)         : '',
      ].join('')
  }
    </div>
  </div>`;
}

function renderJobs(jobs) {
  if (!jobs || !jobs.length) return '';
  return jobs.map((job, i) => {
    const isLast = i === jobs.length - 1;
    const timeline = isLast
        ? `<div class="job-dot"></div>`
        : `<div class="job-dot"></div><div class="job-line"></div>`;

    const bullets = (job.achievements || [])
        .map(a => `              <li>${esc(a)}</li>`)
        .join('\n');

    return `
      <div class="job">
        <div class="job-timeline">
          ${timeline}
        </div>
        <div class="job-content">
          <div class="job-title">${esc(job.title)}</div>
          <div class="job-company">${esc(job.company)}</div>
          <div class="job-date">${esc(job.date)}</div>
          <div class="job-achievements">
            <div class="achievements-label">Achievements/Tasks</div>
            <ul class="achievements-list">
${bullets}
            </ul>
          </div>
        </div>
      </div>`;
  }).join('');
}

function renderSkills(skills) {
  if (!skills || !skills.length) return '';
  const tags = skills.map(s => `        <span class="skill-tag">${esc(s)}</span>`).join('\n');
  return `
      <div class="section-title">Skills</div>
      <div class="skills-grid">
${tags}
      </div>`;
}

function renderAchievements(achievements) {
  if (!achievements || !achievements.length) return '';
  const items = achievements.map(a => `        <div class="achievement-item">${esc(a)}</div>`).join('\n');
  return `
      <div class="achievements-section">
        <div class="section-title">Achievements</div>
${items}
      </div>`;
}

function renderEducation(education) {
  if (!education || !education.length) return '';
  const items = education.map(e => `
        <div class="edu-item">
          <div class="edu-degree">${esc(e.degree)}</div>
          <div class="edu-institution">${esc(e.institution)}</div>
          ${e.date ? `<div class="edu-date">${esc(e.date)}</div>` : ''}
        </div>`).join('');
  return `
      <div class="education-section">
        <div class="section-title">Education</div>${items}
      </div>`;
}

function renderLanguages(languages) {
  if (!languages || !languages.length) return '';
  const items = languages.map(l => `
          <div class="lang-item">
            <div class="lang-name">${esc(l.name)}</div>
            <div class="lang-level">${esc(l.level)}</div>
          </div>`).join('');
  return `
      <div class="languages-section">
        <div class="section-title">Languages</div>
        <div class="languages-grid">${items}
        </div>
      </div>`;
}

function renderInterests(interests) {
  if (!interests || !interests.length) return '';
  const tags = interests.map(i => `          <span class="interest-tag">${esc(i)}</span>`).join('\n');
  return `
      <div class="interests-section">
        <div class="section-title">Interests</div>
        <div class="interests-grid">
${tags}
        </div>
      </div>`;
}

// ─── 7. Build HTML ───────────────────────────────────────────────────────────

function buildHtml(resume, personal) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(personal.name)} - ${esc(personal.title)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      background: #e8e8e8;
      color: #1a2332;
      /* compact */ font-size: 11px; line-height: 1.35;
    }

    .page {
      width: 210mm;
      min-height: 297mm;
      max-height: 297mm;
      overflow: hidden;
      margin: 20px auto;
      background: #fff;
      /* compact */ padding: 14px 26px 12px 26px;
      box-shadow: 0 2px 18px rgba(0,0,0,0.13);
    }

    @media print {
      body { background: #fff; }
      .page { margin: 0; box-shadow: none; }
    }

    /* ── HEADER ── */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 10px;
    }

    .header-left h1 {
      font-size: 25px;
      font-weight: 700;
      color: #1a2332;
      letter-spacing: -0.3px;
    }

    .header-left .subtitle {
      font-size: 11.5px;
      color: #4a5568;
      margin-top: 2px;
    }

    .header-right {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 4px;
      padding-top: 3px;
    }

    .contact-item {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      color: #1a2332;
    }

    .contact-item a {
      color: #1a2332;
      text-decoration: none;
    }

    .contact-icon {
      width: 18px;
      height: 18px;
      background: #1a2332;
      border-radius: 3px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .contact-icon svg {
      width: 11px;
      height: 11px;
      fill: #fff;
    }

    /* ── DIVIDER ── */
    .divider {
      border: none;
      border-top: 1px solid #d0d5dd;
      /* compact */ margin: 7px 0;
    }

    /* ── SUMMARY ── */
    .summary {
      color: #2d3748;
      /* compact */ font-size: 10.5px; margin-bottom: 9px; line-height: 1.4;
    }

    /* ── TWO-COLUMN BODY ── */
    .body {
      display: grid;
      grid-template-columns: 57fr 43fr;
      gap: 20px;
      align-items: start;
    }

    /* ── SECTION TITLE ── */
    .section-title {
      font-weight: 800;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      color: #1a2332;
      border-bottom: 2px solid #1a2332;
      /* compact */ font-size: 12px; margin-bottom: 7px; padding-bottom: 3px;
    }

    /* ── WORK EXPERIENCE ── */
    .job {
      display: flex;
      gap: 10px;
      position: relative;
      /* compact */ margin-bottom: 9px;
    }

    .job-timeline {
      display: flex;
      flex-direction: column;
      align-items: center;
      flex-shrink: 0;
      width: 11px;
    }

    .job-dot {
      width: 11px;
      height: 11px;
      border-radius: 50%;
      background: #1a2332;
      margin-top: 2px;
      flex-shrink: 0;
    }

    .job-line {
      width: 2px;
      flex: 1;
      background: #cbd5e0;
      margin-top: 3px;
    }

    .job-content { flex: 1; }

    .job-title {
      font-size: 12px;
      font-weight: 700;
      color: #1a2332;
    }

    .job-company {
      font-size: 11.5px;
      color: #1a2332;
      margin-bottom: 1px;
    }

    .job-date {
      color: #718096;
      /* compact */ font-size: 10px; margin-bottom: 3px;
    }

    .job-achievements {
      border-left: 2.5px solid #1a2332;
      padding-left: 8px;
      /* compact */ margin-top: 2px;
    }

    .achievements-label {
      font-size: 10px;
      font-style: italic;
      color: #4a5568;
      margin-bottom: 3px;
    }

    .achievements-list {
      list-style: none;
      padding: 0;
    }

    .achievements-list li {
      position: relative;
      padding-left: 12px;
      color: #2d3748;
      /* compact */ font-size: 10px; margin-bottom: 2px; line-height: 1.35;
    }

    .achievements-list li::before {
      content: '-';
      position: absolute;
      left: 0;
      color: #1a2332;
      font-weight: 700;
    }

    /* ── SKILLS ── */
    .skills-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-bottom: 0;
    }

    .skill-tag {
      background: #1a2332;
      color: #fff;
      border-radius: 4px;
      padding: 3px 8px;
      font-size: 10.5px;
      font-weight: 500;
      letter-spacing: 0.1px;
    }

    /* ── RIGHT COLUMN SECTIONS ── */
    .achievements-section { /* compact */ margin-top: 10px; }
    .education-section    { /* compact */ margin-top: 10px; }
    .languages-section    { /* compact */ margin-top: 10px; }
    .interests-section    { /* compact */ margin-top: 10px; }

    .achievement-item {
      color: #2d3748;
      /* compact */ font-size: 10.5px; margin-bottom: 4px; line-height: 1.35;
    }

    /* ── EDUCATION ── */
    .edu-item {
      margin-bottom: 6px;
    }

    .edu-degree {
      font-size: 11px;
      font-weight: 600;
      color: #1a2332;
    }

    .edu-institution {
      font-size: 10.5px;
      color: #2d3748;
    }

    .edu-date {
      font-size: 10px;
      color: #718096;
    }

    /* ── LANGUAGES ── */
    .languages-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px;
    }

    .lang-name {
      font-size: 11.5px;
      font-weight: 600;
      color: #1a2332;
    }

    .lang-level {
      font-size: 10px;
      font-style: italic;
      color: #4a5568;
    }

    /* ── INTERESTS ── */
    .interests-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
    }

    .interest-tag {
      border: 1.5px solid #1a2332;
      border-radius: 4px;
      padding: 3px 10px;
      font-size: 11px;
      color: #1a2332;
      font-weight: 500;
    }
  </style>
</head>
<body>
<div class="page">

${renderHeader(personal)}

  <hr class="divider" />

  <p class="summary">${esc(resume.summary)}</p>

  <!-- TWO-COLUMN BODY -->
  <div class="body">

    <!-- LEFT: WORK EXPERIENCE -->
    <div class="work-section">
      <div class="section-title">Work Experience</div>
${renderJobs(resume.work_experience)}
    </div>

    <!-- RIGHT COLUMN -->
    <div class="right-col">
${renderSkills(resume.skills)}
${renderAchievements(resume.achievements)}
${renderEducation(resume.education)}
${renderLanguages(resume.languages)}
${renderInterests(resume.interests)}
    </div><!-- end right-col -->

  </div><!-- end body -->

</div><!-- end page -->
</body>
</html>`;
}

// ─── 8. Write HTML ───────────────────────────────────────────────────────────

const html = buildHtml(resume, personal);

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(htmlPath, html, 'utf8');
console.log(`HTML written: ${htmlPath}`);

// ─── 8b. Write {Company}-{Title}-Apply.html shortcut ─────────────────────────
// A tiny redirect page so the job's apply link is one double-click away from the
// folder. Plain .html is the only shortcut format that opens by double-click on
// macOS, Linux, and Windows alike (no .url/.webloc/.desktop per-OS quirks).
//
// Filename: {company}-{job-title}-Apply.html, slugified to hyphens. Borderline
// matches (job.borderline === true) get a -BORDERLINE tag before -Apply so they
// stand out in the folder. Falls back to Apply.html when company/title are absent.

// Slugify to filesystem-safe hyphenated text: collapse any run of non-alphanumeric
// characters to a single hyphen, trim leading/trailing hyphens, preserve case.
function slugify(str) {
  return String(str || '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
}

const job = resume.job || {};
const applyUrl = job.apply_url || resume.apply_url || resume.job_url || '';

if (applyUrl) {
  const parts = [slugify(job.company), slugify(job.title)].filter(Boolean);
  if (job.borderline) parts.push('BORDERLINE');
  parts.push('Apply');
  const applyFileName = `${parts.join('-')}.html`;
  const safeUrl = esc(applyUrl);
  const applyHtml = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta http-equiv="refresh" content="0; url=${safeUrl}">
<title>Apply</title>
<style>
  body { font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
         display: flex; align-items: center; justify-content: center;
         min-height: 100vh; margin: 0; background: #f4f5f7; }
  a.btn { display: inline-block; padding: 14px 28px; border-radius: 8px;
          background: #2563eb; color: #fff; text-decoration: none; font-size: 18px;
          font-weight: 600; box-shadow: 0 2px 8px rgba(0,0,0,.15); }
  a.btn:hover { background: #1d4ed8; }
  p { color: #6b7280; font-size: 13px; margin-top: 16px; text-align: center; }
</style>
</head>
<body>
<div style="text-align:center">
  <a class="btn" href="${safeUrl}">Apply now &rarr;</a>
  <p>If you are not redirected automatically, click the button above.</p>
</div>
</body>
</html>`;
  const applyPath = path.join(outDir, applyFileName);
  fs.writeFileSync(applyPath, applyHtml, 'utf8');
  console.log(`Apply link:   ${applyPath}`);
} else {
  console.log('Info: no apply_url in resume.json — skipping Apply.html');
}

// ─── 9. Render PDF via Playwright ────────────────────────────────────────────

async function renderPdf() {
  let chromium;
  try {
    ({ chromium } = require('playwright'));
  } catch (e) {
    console.error(
        'Error: Playwright is not installed.\n' +
        'Run: npm install playwright && npx playwright install chromium'
    );
    process.exit(1);
  }

  const browser = await chromium.launch();
  const page    = await browser.newPage();

  await page.goto(`file://${htmlPath}`);

  // Overflow fallback: shrink fonts if the page content exceeds A4 height
  const overflows = await page.$eval(
      '.page',
      el => el.scrollHeight > el.clientHeight
  );

  if (overflows) {
    console.log('Info: content overflows A4 — applying compact font fallback');
    await page.addStyleTag({
      content: `
        .achievements-list li { font-size: 9.5px !important; line-height: 1.3 !important; margin-bottom: 1px !important; }
        .job { margin-bottom: 7px !important; }
        .job-achievements { margin-top: 2px !important; }
      `,
    });
  }

  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
  });

  await browser.close();
  console.log(`PDF written:  ${pdfPath}`);
  console.log(`Done: ${pdfPath}`);
}

renderPdf().catch(err => {
  console.error(`PDF render error: ${err.message}`);
  process.exit(1);
});
