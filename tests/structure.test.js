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
      for (const link of item.additional_links ?? []) {
        assert.equal(typeof link.title, 'string');
        assert.ok(link.title.trim(), `${item.title} has an empty additional link title`);
        assert.match(link.url, /^https:\/\//, `${link.title} must use HTTPS`);
        assert.doesNotMatch(
          link.url,
          /[?&](utm_[^=]+|fbclid|gclid)=/i,
          `${link.title} contains tracking data`,
        );
        assert.ok(!seenUrls.has(link.url), `${link.title} duplicates ${link.url}`);
        seenUrls.add(link.url);
      }
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

test('ND In Tech guides are owned by Library and not duplicated in Resources', () => {
  const resources = JSON.parse(read('src/_data/resources.json'));
  const library = JSON.parse(read('src/_data/library.json'));
  const resourceItems = resources.flatMap((section) => section.groups.flatMap((group) => group.items));
  const guides = library.filter((section) => ['For Workers', 'For Employers'].includes(section.title));
  const titles = ['ND Job Hunt Playbook: Interviewing', 'Inclusive Work Culture', 'Inclusive Hiring in Tech'];

  assert.equal(guides.length, 2, 'Library is missing an audience guide section');
  assert.deepEqual(
    guides.flatMap((section) => section.items).map((item) => item.title),
    titles,
  );
  for (const guide of guides.flatMap((section) => section.items)) {
    assert.equal(
      resourceItems.some((item) => item.url === guide.url),
      false,
    );
  }
});

test('approved Resources descriptions stay exact', () => {
  const resources = JSON.parse(read('src/_data/resources.json'));
  const items = resources.flatMap((section) => section.groups.flatMap((group) => group.items));
  const descriptions = new Map(items.map((item) => [item.title, item.description]));

  assert.equal(
    descriptions.get('Autistic Techie'),
    'A podcast hosted by Shea Belsky about workplace self-advocacy and navigating careers as a neurodivergent professional.',
  );
  assert.equal(
    descriptions.get('Unleash Your ADHD'),
    'Coaching and practical resources for founders and senior leaders with ADHD, informed by lived experience.',
  );
  assert.equal(
    descriptions.get('Neurodiverse Hackers'),
    'A neurodivergent-led nonprofit community supporting people in cybersecurity.',
  );
  assert.equal(
    descriptions.get('Professionally Neurospicy'),
    'A neurodivergent-founded peer-support community for professionals navigating work life unmasked.',
  );
  const bjien = items.find((item) => item.url === 'https://www.bjien.be/en/');
  assert.equal(bjien.title, 'bjien: Unlocking the power of neurodiversity at work');
  assert.equal(
    items.find((item) => item.url === 'https://www.jobsforhumanity.com/neurodivergent/').title,
    'Jobs for Humanity: Jobs for the Neurodivergent',
  );
  assert.equal(
    bjien.description,
    'Neuro-inclusion training, workshops, and resources from a team founded by autistic ADHDers.',
  );
  const disabilityin = items.find(
    (item) => item.url === 'https://www.disabilityin.org/committees/neurodiversity-roundtable',
  );
  assert.equal(disabilityin.title, 'Disability:IN Neurodiversity Roundtable');
});

test('Library owns the talks and guides while Turing videos stay on Media', () => {
  const library = JSON.parse(read('src/_data/library.json'));
  const media = JSON.parse(read('src/_data/media.json'));
  const libraryUrls = library.flatMap((section) => section.items.map((item) => item.url));
  const mediaUrls = media.flatMap((section) =>
    section.items.flatMap((item) => [item.url, ...(item.additional_links ?? []).map((link) => link.url)]),
  );

  assert.deepEqual(
    library.map((section) => section.title),
    ['For Workers', 'For Employers', 'ND Tech Talks'],
  );
  assert.deepEqual(
    library.map((section) => section.items.length),
    [1, 2, 3],
  );
  assert.deepEqual(
    media.map((section) => section.title),
    ['Interviews & Conversations', 'Features & Mentions'],
  );
  assert.deepEqual(
    media.map((section) => section.items.length),
    [2, 5],
  );
  assert.deepEqual(
    media[1].items.map((item) => item.title),
    [
      'Neurodiversity In Tech',
      'Neurodiverse Hackers: The Cognitive Edge',
      'Neurodiversity in Tech',
      'Building an Inclusive Future with Neurodiversity In Tech',
      '2024 Asian American Employment Plan Report',
    ],
  );
  const turingCard = media[0].items.find((item) => item.additional_links?.length);
  assert.equal(turingCard.title, 'ND In Tech: History, Importance, Community');
  assert.deepEqual(turingCard.additional_links, [
    {
      title: 'ND In Tech: Showcase Q&A',
      url: 'https://www.youtube.com/watch?v=EStNdU5JQo4',
    },
  ]);
  assert.equal(
    turingCard.description,
    "ND In Tech founder and software engineer Hayley Witherell presents the community's history and joins Turing's executive director, Jeff Casimir, for a Q&A.",
  );
  for (const url of libraryUrls) assert.ok(!mediaUrls.includes(url), `${url} is duplicated on Media`);
  for (const id of ['0QR8FSouQSs', 'I6ugv7stPFY', 'RJTJGzorIJ8']) {
    assert.ok(libraryUrls.includes(`https://www.youtube.com/watch?v=${id}`));
  }
  const adamTalk = library
    .flatMap((section) => section.items)
    .find((item) => item.title === 'Neurodiversity as an Asset in Tech');
  assert.equal(
    adamTalk.description,
    'Principal Engineer Adam Compton explores the value of neurodiversity in the tech industry.',
  );
  for (const id of ['9jWzUhdn5C0', 'EStNdU5JQo4']) {
    assert.ok(mediaUrls.includes(`https://www.youtube.com/watch?v=${id}`));
  }
});

test('Resources, Media, and Library share the card-list include', () => {
  assert.match(read('src/resources.html'), /include 'resource-list'/);
  assert.match(read('src/media.html'), /include 'resource-list'/);
  assert.match(read('src/library.html'), /include 'resource-list'/);
});

test('source badges keep a consistent contain-fit alignment box', () => {
  const styles = read('src/styles/pages.css');
  const resourceList = read('src/_includes/resource-list.liquid');
  assert.match(styles, /\.resource-source\s*\{[\s\S]*min-height: 1\.65rem/);
  assert.match(styles, /\.resource-source-logo\s*\{[\s\S]*flex: 0 0 1\.65rem/);
  assert.match(styles, /\.resource-source-logo\s*\{[\s\S]*object-fit: contain/);
  assert.match(
    resourceList,
    /unless source_label == item\.title[\s\S]*source_label == 'YouTube'[\s\S]*source_label == 'LinkedIn'/,
  );
});

test('Library visibly identifies Neurodiversity In Tech on every card', () => {
  const library = read('_site/library/index.html');
  assert.equal((library.match(/class='resource-source'>[\s\S]*?>Neurodiversity In Tech</g) ?? []).length, 6);
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
