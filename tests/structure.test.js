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

test('resource and media data contain complete, unique, tracking-free HTTPS links', () => {
  const collections = [
    JSON.parse(read('src/_data/resources.json')),
    JSON.parse(read('src/_data/media.json')),
  ];
  const seenUrls = new Set();

  const visitItems = (items) => {
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
    for (const section of collection) {
      assert.ok(section.title?.trim(), 'A section has no title');
      if (section.items) visitItems(section.items);
      for (const group of section.groups ?? []) visitItems(group.items);
    }
  }
});
