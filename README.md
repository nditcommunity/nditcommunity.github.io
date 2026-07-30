# Neurodiversity In Tech Website

The official website for [Neurodiversity In Tech](https://nd-in-tech.org), a community for neurodivergent
people working in and around technology.

The site is built with [Eleventy](https://www.11ty.dev/), plain HTML, CSS, and JavaScript. Netlify is the
canonical hosting and deployment platform.

## Requirements

- Node.js 22.12.x
- npm
- Python 3 for Playwright's local static test server

If you use `nvm`, run:

```sh
nvm use
```

## Local development

Clone the repository and install the locked dependencies:

```sh
git clone https://github.com/nditcommunity/nditcommunity.github.io.git
cd nditcommunity.github.io
npm ci
```

Start the Eleventy development server:

```sh
npm run dev
```

Open `http://localhost:8080`.

## Available commands

```sh
npm run dev             # Start the development server
npm run build           # Generate the production site in _site
npm run prettier:check  # Check formatting
npm run prettier:write  # Apply formatting
npm run test:structure  # Run fast content and security checks
npm run test:ui         # Run Playwright browser and accessibility tests
npm run test:links      # Check generated internal links and fragments
npm run test:links:external # Check live external links
npm test                # Run the complete test suite
npm audit               # Check dependencies for known vulnerabilities
```

Install Playwright's Chromium browser before the first UI test run:

```sh
npx playwright install chromium
```

## Testing

The test suite includes:

- Structural HTML, metadata, external-link, tracking-parameter, form, and security-header checks
- Validated Resources and Media data, including required fields and duplicate URLs
- Generated internal-link and fragment validation
- Desktop and mobile browser tests
- Automated Axe accessibility scans
- Keyboard navigation and skip-link coverage
- Responsive navbar regression checks
- Light and dark theme behavior and persistence
- Contact form validation, success, and offline paths
- Calendar loading and failure paths
- Browser console and JavaScript error checks

GitHub Actions runs formatting, dependency auditing, the production build, and the complete test suite on
pull requests and pushes to `main`. Failed browser runs upload a Playwright report with traces and screenshots.

## Deployment

Netlify deploys `main` using the settings in [`netlify.toml`](netlify.toml):

- Build command: `npm run build:eleventy:prod`
- Publish directory: `_site`
- Node version: 22.12.0

GitHub Actions validates changes but does not deploy the website. This avoids competing GitHub Pages and
Netlify deployments.

Production security headers are defined in [`src/_headers`](src/_headers) and copied into the generated site
for Netlify to apply.

## Project structure

```text
src/
  _data/          Structured Resources and Media content
  _includes/      Shared page sections
  _layouts/       Eleventy layouts
  assets/         Fonts, icons, and images
  scripts/        Client-side JavaScript
  styles/         Split source stylesheets
  *.html          Site pages
tests/
  structure.test.js
  ui/
tools/
  bundle-css.js   Creates one production stylesheet from the split CSS sources
  check-links.js  Checks generated and external links
.github/
  workflows/      Reusable pull-request and main-branch checks
```

## Contributing

Anyone can help. You do not need open-source experience or need to be neurodivergent to contribute.

1. Select an issue from the [project board](https://github.com/orgs/nditcommunity/projects/1/views/6?filterQuery=is%3Aissue).
2. Create a branch named with the issue number and a short description, such as `110-navbar-update`.
3. Make the change and add or update relevant tests.
4. Run:

   ```sh
   npm run prettier:check
   npm test
   ```

5. Open a pull request into `main` and complete the pull request template.

Only repository owners merge changes into `main`.

## Automated dependency updates

Dependabot checks npm packages and GitHub Actions monthly. Related updates are grouped to reduce pull-request
noise, and every update must pass the same complete test suite.

## Team

The repository owners are [@hayleyw7](https://github.com/hayleyw7) and
[@royemosby](https://github.com/royemosby). All contributors, including owners, are volunteers.

## Attribution

Social brand icons are from [Font Awesome Free](https://fontawesome.com/license/free).

## License

This website is open source under the [MIT License](LICENSE).
