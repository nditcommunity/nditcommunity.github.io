# Neurodiversity In Tech Website

The source for the official [Neurodiversity In Tech](https://nd-in-tech.org) website. Neurodiversity In Tech
is a neurodivergent-led community for people working in and around technology.

The site is a static [Eleventy](https://www.11ty.dev/) project built with Liquid templates, HTML, CSS, and
client-side JavaScript. Netlify is the canonical hosting and deployment platform.

The latest build from `main` is available on the [staging site](https://ndit-staging.netlify.app).

## Quick start

### Requirements

- Node.js 22.12.x
- npm (included with Node.js)

Using the version in [`.nvmrc`](.nvmrc) is recommended:

```sh
nvm use
npm ci
npm run dev
```

Open `http://localhost:8080`. Eleventy watches the source files and refreshes the site as they change.

If this is your first time running the browser tests, also install Chromium:

```sh
npx playwright install chromium
```

## Commands

| Command                       | Purpose                                                                |
| ----------------------------- | ---------------------------------------------------------------------- |
| `npm run dev`                 | Start the local Eleventy server                                        |
| `npm run build`               | Build the site into `_site/` and bundle its CSS                        |
| `npm run clean`               | Remove the generated `_site/` directory                                |
| `npm run dry-run`             | Validate Eleventy templates without writing output                     |
| `npm run prettier:check`      | Check formatting                                                       |
| `npm run prettier:write`      | Apply formatting                                                       |
| `npm run test:structure`      | Run source, content, metadata, form, and security checks               |
| `npm run test:links`          | Check generated internal links and fragments                           |
| `npm run test:links:external` | Build the site and check live external links; requires internet access |
| `npm run test:ui`             | Run Playwright UI and automated accessibility tests                    |
| `npm run test:production`     | Smoke-test the deployed site and its HTTP security headers             |
| `npm test`                    | Build and run the structure, internal-link, and UI test suites         |
| `npm audit`                   | Check dependencies for known vulnerabilities                           |

The scheduled external-link check is intentionally separate from `npm test` because third-party sites can be
slow, unavailable, or resistant to automated requests. The production smoke test targets
`https://nd-in-tech.org` by default; set `SITE_URL` to test another deployment.

## Editing the site

- Edit page content and front matter in `src/*.html`.
- Edit shared navigation, metadata, footer, and other repeated markup in `src/_includes/`.
- Edit page layouts in `src/_layouts/`.
- Add or update Resource and Media cards in `src/_data/resources.json` and `src/_data/media.json`.
- Edit styles in the split files under `src/styles/`. `tools/bundle-css.js` combines them into
  `_site/styles/style.css` after each build.
- Keep page-specific behavior in `src/scripts/` and load it only on pages that need it.
- Place images and locally hosted fonts in `src/assets/`.

Resource and Media entries require a title, description, and unique HTTPS URL. Do not add analytics or
advertising parameters such as `utm_*`, `fbclid`, or `gclid` to links.

Files under `src/drafts/` and `src/blog/` are excluded from the Eleventy build by `.eleventyignore`.

## Project structure

```text
src/
  _data/          Resource and Media card data
  _includes/      Shared Liquid partials
  _layouts/       Shared page layouts
  assets/         Fonts, images, and logos
  drafts/         Unpublished or unfinished page content
  scripts/        Page-specific and shared browser JavaScript
  styles/         Split source stylesheets
  *.html          Published site pages
tests/
  structure.test.js
  ui/site.spec.js
tools/
  bundle-css.js          Build the production stylesheet
  check-links.js         Check internal or external links
  serve-site.js          Serve `_site/` during browser tests
  smoke-production.js    Verify production pages and headers
.github/
  workflows/             Pull-request, main, link, and production checks
```

Eleventy copies the static assets, scripts, manifests, favicons, styles, and `src/_headers` into `_site/`.
Generated files in `_site/` should not be edited or committed.

## Testing and accessibility

The automated checks cover:

- Page titles, descriptions, heading structure, forms, and security-related markup
- Resource and Media data completeness, duplicate URLs, and tracking parameters
- Generated internal links and fragment targets
- Desktop, mobile, and tablet navigation layouts
- Keyboard navigation and skip links
- Light and dark themes, including persistence and storage failures
- Contact-form validation, success, and offline behavior
- Calendar loading, success, and failure behavior
- Browser console errors and page-specific script loading
- Automated [Axe](https://www.deque.com/axe/) accessibility scans

Automated accessibility testing cannot replace manual review. For visible UI changes, also check keyboard-only
use, focus order and visibility, zoom, responsive layouts, and both color themes.

## Continuous integration and deployment

Pull requests into `main` and pushes to `main` run formatting, dependency auditing, a production build, and the
full local test suite in GitHub Actions. Failed browser runs upload a Playwright report with traces and
screenshots. A weekly workflow checks live external links.

Netlify deploys `main` using [`netlify.toml`](netlify.toml):

- Build command: `npm run build:eleventy:prod`
- Publish directory: `_site`
- Node.js version: 22.12.0

GitHub Actions validates the site but does not deploy it. Successful deployment notifications trigger a smoke
test of the production pages, integrations, and HTTP security headers. The site-managed header policy lives in
[`src/_headers`](src/_headers).

## Contributing

Contributions are welcome; open-source experience and a neurodivergent identity are not required. See
[`CONTRIBUTING.md`](CONTRIBUTING.md) for the development workflow, testing expectations, and pull-request
guidance. Participation in this project is governed by the [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md).

Dependabot checks npm packages and GitHub Actions monthly. Related updates are grouped and must pass the same
quality checks as other contributions.

## Maintainers

The repository maintainers are [@hayleyw7](https://github.com/hayleyw7) and
[@royemosby](https://github.com/royemosby). Everyone working on the project, including its maintainers, is a
volunteer.

## Attribution and license

Social brand icons are from [Font Awesome Free](https://fontawesome.com/license/free). The website is available
under the [MIT License](LICENSE).
