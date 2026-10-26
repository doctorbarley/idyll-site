# joinidyll.com

Static site for Idyll (Idyll Dating LLC). Hosted on Cloudflare Pages from this repo.

- `index.html` — landing page with early-access email form
- `support/`, `privacy/`, `terms/`, `thanks/` — one page each
- `styles.css` — brand tokens (see BrandColors.md in the app repo)
- `functions/subscribe.js` — Pages Function that stores emails in a KV namespace bound as `SIGNUPS`

Deploy: push to `main`. Cloudflare Pages settings: framework None, build command empty, output directory `/`.
