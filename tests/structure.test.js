const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const projectRoot = path.resolve(__dirname, '..');
const sourceRoot = path.join(projectRoot, 'src');

const read = (relativePath) => fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');

const walk = (directory) =>
  fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(fullPath) : [fullPath];
  });

test('security headers include the expected defenses and required integrations', () => {
  const headers = read('src/_headers');

  for (const directive of [
    "default-src 'self'",
    "script-src 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    'https://calendar.google.com',
    'https://docs.google.com',
    'Cross-Origin-Opener-Policy: same-origin',
    'X-Content-Type-Options: nosniff',
    'X-Frame-Options: DENY',
  ]) {
    assert.match(headers, new RegExp(directive.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

test('production smoke workflow remains manual', () => {
  const workflow = read('.github/workflows/production-smoke.yml');
  assert.match(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /deployment_status/);
  assert.match(workflow, /SITE_URL: https:\/\/nd-in-tech\.org/);
});

test('production smoke plugin only runs for the verified production deploy', () => {
  const { shouldRun } = require('../plugins/production-smoke/runner');
  const production = {
    context: 'production',
    siteId: 'production-site',
    productionSiteId: 'production-site',
    deployUrl: 'https://immutable-deploy.netlify.app',
  };

  assert.equal(shouldRun(production), true);
  assert.equal(shouldRun({ ...production, context: 'deploy-preview' }), false);
  assert.equal(shouldRun({ ...production, siteId: 'staging-site' }), false);
  assert.equal(shouldRun({ ...production, deployUrl: '' }), false);
});

test('production smoke plugin executes against the immutable deploy URL and propagates failures', async () => {
  const { runProductionSmoke, smokeScript } = require('../plugins/production-smoke/runner');
  const calls = [];
  const execFile = (command, args, options, callback) => {
    calls.push({ command, args, options });
    callback(null, 'ok\n', '');
  };
  const environment = {
    CONTEXT: 'production',
    SITE_ID: 'production-site',
    DEPLOY_URL: 'https://immutable-deploy.netlify.app',
  };

  await runProductionSmoke({ inputs: { production_site_id: 'production-site' }, environment, execFile });
  assert.equal(calls[0].args[0], smokeScript);
  assert.equal(calls[0].options.cwd, path.resolve(projectRoot));
  assert.equal(calls[0].options.env.SITE_URL, environment.DEPLOY_URL);

  await runProductionSmoke({
    inputs: { production_site_id: 'production-site' },
    environment: { ...environment, CONTEXT: 'deploy-preview' },
    execFile,
  });
  assert.equal(calls.length, 1);

  await assert.rejects(
    runProductionSmoke({
      inputs: { production_site_id: 'production-site' },
      environment: { ...environment, DEPLOY_URL: '' },
      execFile,
    }),
    /DEPLOY_URL/,
  );
  await assert.rejects(
    runProductionSmoke({
      inputs: { production_site_id: 'production-site' },
      environment,
      execFile: (command, args, options, callback) => callback(new Error('smoke failed')),
    }),
    /smoke failed/,
  );
});

test('new-tab links protect the opener and do not contain tracking parameters', () => {
  const templates = walk(sourceRoot).filter((file) => /\.(html|liquid)$/.test(file));

  for (const file of templates) {
    const contents = fs.readFileSync(file, 'utf8');
    const links = contents.match(/<a\b[\s\S]*?<\/a>/g) ?? [];

    for (const link of links) {
      if (/target=['"]_blank['"]/.test(link)) {
        assert.match(link, /rel=['"][^'"]*noreferrer[^'"]*['"]/, `${file} has an unsafe new-tab link`);
      }
    }

    assert.doesNotMatch(contents, /[?&](utm_[^=]+|fbclid|gclid)=/i, `${file} contains tracking data`);
  }
});

test('required form controls have labels and safe submission settings', () => {
  const contact = read('src/contact.html');

  for (const id of ['contact-name', 'contact-email', 'contact-message']) {
    assert.match(contact, new RegExp(`<label for="${id}">`));
    assert.match(contact, new RegExp(`id="${id}"`));
  }

  assert.match(contact, /method="post"/);
  assert.match(contact, /target="contact-form-response"/);
  assert.match(contact, /type="email"[\s\S]*?required/);
});

test('pages have unique titles, descriptions, and one primary heading', () => {
  const pages = walk(sourceRoot).filter(
    (file) => file.endsWith('.html') && !file.includes(`${path.sep}drafts${path.sep}`),
  );
  const titles = new Set();

  for (const file of pages) {
    const contents = fs.readFileSync(file, 'utf8');
    const title = contents.match(/^title:\s*(.+)$/m)?.[1];
    const description = contents.match(/^description:\s*(.+)$/m)?.[1];
    const headings = contents.match(/<h1(?:\s|>)/g) ?? [];

    assert.ok(title, `${file} is missing a title`);
    assert.ok(description, `${file} is missing a description`);
    assert.equal(headings.length, 1, `${file} must contain exactly one h1`);
    assert.ok(!titles.has(title), `${file} repeats the title "${title}"`);
    titles.add(title);
  }
});

test('resource, media, and library data contain complete, tracking-free HTTPS links unique within each page', () => {
  const collections = [
    JSON.parse(read('src/_data/resources.json')),
    JSON.parse(read('src/_data/media.json')),
    JSON.parse(read('src/_data/library.json')),
  ];
  const visitItems = (items, seenUrls) => {
    for (const item of items) {
      assert.equal(typeof item.title, 'string');
      assert.ok(item.title.trim(), 'An item has an empty title');
      assert.equal(typeof item.description, 'string');
      assert.ok(item.description.trim(), `${item.title} has an empty description`);
      assert.match(item.url, /^https:\/\//, `${item.title} must use HTTPS`);
      assert.doesNotMatch(item.url, /[?&](utm_[^=]+|fbclid|gclid)=/i, `${item.title} contains tracking data`);
      assert.ok(!seenUrls.has(item.url), `${item.title} duplicates ${item.url}`);
      seenUrls.add(item.url);
    }
  };

  for (const collection of collections) {
    const seenUrls = new Set();
    for (const section of collection) {
      assert.ok(section.title?.trim(), 'A section has no title');
      if (section.items) visitItems(section.items, seenUrls);
      for (const group of section.groups ?? []) visitItems(group.items, seenUrls);
    }
  }
});

test('ND In Tech guides are shared consistently on Resources and Library', () => {
  const resources = JSON.parse(read('src/_data/resources.json'));
  const library = JSON.parse(read('src/_data/library.json'));
  const resourceItems = resources.flatMap((section) => section.groups.flatMap((group) => group.items));
  const guides = library.find((section) => section.title === 'Guides');
  const titles = ['ND Job Hunt Playbook: Interviewing', 'Inclusive Work Culture', 'Inclusive Hiring in Tech'];

  assert.ok(guides, 'Library is missing the ND In Tech guides section');
  assert.deepEqual(
    guides.items.map((item) => item.title),
    titles,
  );
  for (const guide of guides.items) {
    assert.deepEqual(
      guide,
      resourceItems.find((item) => item.url === guide.url),
    );
  }
});

test('Library owns the talks and guides while Turing videos stay on Media', () => {
  const library = JSON.parse(read('src/_data/library.json'));
  const media = JSON.parse(read('src/_data/media.json'));
  const libraryUrls = library.flatMap((section) => section.items.map((item) => item.url));
  const mediaUrls = media.flatMap((section) => section.items.map((item) => item.url));

  assert.deepEqual(
    library.map((section) => section.title),
    ['Guides', 'ND Tech Talks'],
  );
  assert.deepEqual(
    library.map((section) => section.items.length),
    [3, 3],
  );
  assert.deepEqual(
    media.map((section) => section.title),
    ['Interviews & Conversations', 'Features & Mentions'],
  );
  assert.deepEqual(
    media.map((section) => section.items.length),
    [3, 5],
  );
  for (const url of libraryUrls) assert.ok(!mediaUrls.includes(url), `${url} is duplicated on Media`);
  for (const id of ['0QR8FSouQSs', 'I6ugv7stPFY', 'RJTJGzorIJ8']) {
    assert.ok(libraryUrls.includes(`https://www.youtube.com/watch?v=${id}`));
  }
  for (const id of ['9jWzUhdn5C0', 'EStNdU5JQo4']) {
    assert.ok(mediaUrls.includes(`https://www.youtube.com/watch?v=${id}`));
  }
});

test('Resources, Media, and Library share the card-list include', () => {
  assert.match(read('src/resources.html'), /include 'resource-list'/);
  assert.match(read('src/media.html'), /include 'resource-list'/);
  assert.match(read('src/library.html'), /include 'resource-list'/);
});

test('mobile navigation groups contain four controls in the requested order', () => {
  const header = read('src/_includes/header.liquid');
  const primary = header.match(/<ul class='nav-primary'>([\s\S]*?)<\/ul>/)?.[1];
  const secondary = header.match(/<ul class='nav-secondary'>([\s\S]*?)<\/ul>/)?.[1];
  assert.ok(primary && secondary, 'Both navigation groups must exist');
  assert.equal((primary.match(/<li>/g) ?? []).length, 4);
  assert.equal((secondary.match(/<li>/g) ?? []).length, 4);
  assert.match(primary, /href='\/'[\s\S]*href='\/about'[\s\S]*href='\/events'[\s\S]*href='\/resources'/);
  assert.match(secondary, /href='\/library'[\s\S]*href='\/media'[\s\S]*href='\/contact'[\s\S]*<button/);
});
