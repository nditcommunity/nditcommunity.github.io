# Contributing

Thank you for helping improve the Neurodiversity In Tech website. You do not need prior open-source experience
or need to be neurodivergent to contribute.

Please follow the project [Code of Conduct](CODE_OF_CONDUCT.md) in all project spaces.

## Choose an issue

Start with an issue from the
[project board](https://github.com/orgs/nditcommunity/projects/1/views/6?filterQuery=is%3Aissue), or open an
issue before beginning a substantial change. This helps prevent duplicated work and gives maintainers a chance
to confirm the direction.

For small documentation corrections, opening a pull request directly is fine.

## Set up the project

Fork or clone the repository, then create a branch from the latest `main`:

```sh
nvm use
npm ci
git checkout -b 110-short-description
```

Use the related issue number at the beginning of the branch name when one exists.

Start the local site with:

```sh
npm run dev
```

The development site is available at `http://localhost:8080`.

The latest build from `main` is available on the [staging site](https://ndit-staging.netlify.app).

## Make a focused change

- Keep the pull request limited to one issue or closely related group of changes.
- Follow the existing HTML, Liquid, CSS, and JavaScript patterns.
- Preserve semantic HTML, keyboard access, visible focus styles, and sufficient color contrast.
- Test visible changes at mobile and desktop sizes in both light and dark modes.
- Add or update automated tests when behavior changes or a regression is fixed.
- Do not edit generated files in `_site/`.
- Do not add tracking parameters to links.

See the README's [editing guidance](README.md#editing-the-site) for where content, data, styles, scripts, and
shared templates live.

## Run the checks

Before opening a pull request, run:

```sh
npm run prettier:check
npm test
```

Use `npm run prettier:write` if formatting needs to be applied. The UI tests require Playwright Chromium; install
it once with:

```sh
npx playwright install chromium
```

For changes to external Resource or Media links, also run:

```sh
npm run test:links:external
```

This check requires internet access and may occasionally report a third-party service that blocks automated
requests. Include that context in the pull request if the URL works in a browser.

## Open a pull request

Open the pull request into `main`, complete the template, and link the relevant issue using wording such as
`Closes #110`. Explain what changed, how it was tested, and any behavior reviewers should verify manually.

GitHub Actions checks formatting, dependencies, the production build, internal links, browser behavior, and
automated accessibility rules. Address failing checks or explain any external failure before requesting review.

Only repository maintainers merge changes into `main`.
