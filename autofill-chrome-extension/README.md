# Job Autofill Chrome Extension

A Manifest V3 Chrome extension that fills job application forms when triggered by a Claude cowork session. It does not run automatically — it must be activated explicitly via DOM data attributes.

---

## Installation

1. Open `chrome://extensions` and enable **Developer Mode**.
2. Click **Load unpacked** and select this directory (`autofill-chrome-extension/`).
3. Copy your real `candidate-data.json` from `private-files/` into this directory (the committed file contains only placeholders).

---

## Candidate data

Edit `candidate-data.json` with your details before use:

```json
{
  "personal": {
    "first_name": "...",
    "last_name": "...",
    "full_name": "...",
    "email": "...",
    "phone": "+X-XX-XXX-XXXX",
    "phone_local": "0XXXXXXXXX",
    "location": { "city": "...", "country": "..." },
    "linkedin": "https://linkedin.com/in/..."
  },
  "work_experience": [...],
  "screening_defaults": {
    "authorized_to_work": true,
    "requires_sponsorship": false,
    "willing_to_relocate": false,
    "notice_period_days": 30
  }
}
```

`phone` is the full international number. `phone_local` is the number without the country code, used when the form has a separate dial-code picker already set to your country.

---

## Trigger protocol

The extension watches for data attributes on `document.body`. It does **not** run on page load.

```javascript
// 1. Set the job ID (used to build the CV path written to data-resume-input)
document.body.setAttribute('data-job-id', '{job_id}');
// 2. Trigger fill
document.body.setAttribute('data-ready-to-fill', 'true');
// 3. Poll for completion (up to 15s)
await new Promise(resolve => {
  const deadline = Date.now() + 15000;
  const check = () => {
    if (document.body.getAttribute('data-fill-done') === 'true') return resolve('done');
    if (Date.now() > deadline) return resolve('timeout');
    setTimeout(check, 500);
  };
  check();
});
```

To re-trigger on the same page (e.g. after advancing a multi-page form), reset the attribute first:
```javascript
document.body.removeAttribute('data-ready-to-fill');
// then set it back to 'true'
```

### Output attributes

| Attribute | Content |
|---|---|
| `data-fill-done` | `"true"` when the fill run finishes (success or error) |
| `data-fill-skipped` | JSON array of field keys the extension could not fill |
| `data-resume-input` | JSON object describing the detected resume file input (see below) |

#### `data-resume-input` shape

```json
{
  "pdf_path":    "~/Documents/job-application-automation/CVs/tailored/{job_id}.pdf",
  "selector":    "<CSS selector for the file input>",
  "frame_url":   "<iframe URL if input is in a cross-origin iframe, else null>",
  "shadow_host": "<selector of shadow host if input is in a shadow root, else null>"
}
```

Only written when `data-job-id` was set before triggering. Absent if no resume input was found.

#### Error format

If the extension crashes, `data-fill-skipped` will contain `["__error__:<message>"]`. Treat all fields as unfilled and handle them manually.

---

## What the extension fills

- First name, last name, full name
- Email
- Phone — with dial-code detection (sets local number when dial code is already correct; skips and adds `phone_dial_code_not_israel` to skipped list when it cannot set it)
- LinkedIn URL
- City, country, or combined location
- Work authorization (yes/no) → `authorized_to_work`
- Sponsorship required (yes/no) → `requires_sponsorship`

## What it does NOT fill

Years of experience, salary, notice period, willing to relocate, cover letter — these must be handled by the calling workflow or manually.

---

## Platform support

| Platform | Notes |
|---|---|
| Greenhouse | Full. Location uses autocomplete — waits 2.5s for dropdown. |
| Greenhouse embed | Full. Form is in a cross-origin iframe; uses postMessage. |
| Lever | Full. |
| LinkedIn Easy Apply | Full. Form is in a shadow DOM (`#interop-outlet`). Auto-advances up to 8 pages, stops at the resume upload page. |
| Rippling | Full. Dial-code selector is React-controlled — uses a MAIN-world bridge (`bridge-main.js`) to call React props directly. |
| Comeet | Full. Cross-origin iframe; auto-clicks "Apply for this job" button if the iframe is not yet visible. |
| Oracle Cloud | Two-step: submits email first, waits for the full form, then fills. |
| Workday | Partial. Basic fields only; dropdowns are not handled. |
| Dueto | Heuristic only. |
| Generic / unknown | Heuristic only. |

---

## Selector overrides

`selector-overrides.json` maps hostnames to field-specific CSS selectors, for sites where the heuristic detection fails. Currently empty (`{}`).

Format:
```json
{
  "careers.example.com": {
    "first_name": "#firstname",
    "email": "input[name='applicant_email']",
    "resume_input": "input[type='file'].resume-upload"
  }
}
```

Supported field keys: `first_name`, `last_name`, `full_name`, `email`, `phone`, `linkedin`, `city`, `country`, `location`, `resume_input`.

---

## Popup

The extension popup has a single toggle: **Auto-redirect on LinkedIn**. When enabled, the extension automatically clicks the Apply / Easy Apply button when you navigate to a LinkedIn job listing, saving a manual click.
