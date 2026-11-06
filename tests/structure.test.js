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

test('job submission form link is absent from Contact and Resources', () => {
  const contact = read('src/contact.html');
  const resources = JSON.parse(read('src/_data/resources.json'));
  const resourceItems = resources.flatMap((section) => section.groups.flatMap((group) => group.items));
  const jobFormUrl =
    'https://docs.google.com/forms/d/e/1FAIpQLSemKwvdKV5ZN5GKGohwe8L2BQn4jdRC9SFrVUzFZOagRTWTSA/viewform';

  assert.match(contact, /<h2 id="contact-form-heading">Send a message<\/h2>/);
  assert.doesNotMatch(contact, /Post a Neurodivergent-Friendly Job|job-submission-heading/);
  assert.ok(!contact.includes(jobFormUrl));
  assert.equal(
    resourceItems.some((item) => item.url === jobFormUrl),
    false,
  );
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

test('Contact and Library show the approved page headings', () => {
  assert.match(read('_site/contact/index.html'), /<h1>Contact Us<\/h1>/);
  assert.match(read('_site/library/index.html'), /<h1>Our Library<\/h1>/);
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
      if (item.spotlight_role || item.spotlight_date) {
        assert.ok(item.spotlight_role?.trim(), `${item.title} is missing a Spotlight role`);
        assert.ok(item.spotlight_date?.trim(), `${item.title} is missing a Spotlight date`);
      } else {
        assert.equal(typeof item.description, 'string');
        assert.ok(item.description.trim(), `${item.title} has an empty description`);
      }
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

test('resource and media logos are local so the image CSP can load them', () => {
  const include = read('src/_includes/resource-list.liquid');
  const assignedLogoPaths = [...include.matchAll(/assign source_logo = '([^']+)'/g)].map((match) => match[1]);

  for (const logoPath of assignedLogoPaths) {
    assert.ok(!/^https?:\/\//i.test(logoPath), `${logoPath} must be hosted locally`);
    if (logoPath.startsWith('/assets/')) {
      assert.ok(
        fs.existsSync(path.join(sourceRoot, logoPath.slice(1))),
        `${logoPath} is missing from the site assets`,
      );
    }
  }
});

test('NeuroClastic uses its local favicon asset and short-height Join rules leave the shell alone', () => {
  const include = read('src/_includes/resource-list.liquid');
  const logo = path.join(sourceRoot, 'assets/logos/neuroclastic.png');
  assert.match(
    include,
    /item\.url contains 'neuroclastic\.com'[\s\S]*?assign source_logo = '\/assets\/logos\/neuroclastic\.png'/,
  );
  assert.ok(fs.existsSync(logo), 'The local NeuroClastic favicon asset must exist');

  const responsive = read('src/styles/responsive.css');
  const shortDesktopRules =
    responsive.match(/@media \(min-width: 44\.01rem\) and \(max-height: 48rem\) \{([\s\S]*?)\n\}/)?.[1] ?? '';
  assert.match(shortDesktopRules, /main:has\(\.home\)/);
  assert.doesNotMatch(shortDesktopRules, /brand-bar|site-nav|site-footer/);
});

test('section jump navigation links target every page section and remain accessible', () => {
  const pages = [
    ['Resources', '_site/resources/index.html'],
    ['Library', '_site/library/index.html'],
    ['Media', '_site/media/index.html'],
  ];

  for (const [pageName, pagePath] of pages) {
    const html = read(pagePath);
    const nav = html.match(
      /<nav\b[^>]*class=["'][^"']*resource-jump-nav[^"']*["'][^>]*>[\s\S]*?<\/nav>/,
    )?.[0];
    assert.ok(nav, `${pageName} is missing its section jump navigation`);
    assert.match(nav, /aria-label=["'][^"']+["']/);

    const links = [...nav.matchAll(/<a\b[^>]*href=["']#([^"']+)["'][^>]*>/g)].map((match) => match[1]);
    const sections = [...html.matchAll(/<section\b[^>]*class=["'][^"']*resource-section[^"']*["'][^>]*>/g)]
      .map((match) => match[0].match(/\bid=["']([^"']+)["']/)?.[1])
      .filter(Boolean);

    assert.ok(links.length > 0, `${pageName} has no in-page navigation links`);
    assert.equal(new Set(links).size, links.length, `${pageName} has duplicate jump links`);
    assert.deepEqual(links, sections, `${pageName} jump links must match its sections in order`);
    assert.doesNotMatch(
      nav,
      /<a\b[^>]*tabindex=["']-1["']/i,
      `${pageName} jump links must remain keyboard-focusable`,
    );
    for (const id of links) {
      assert.ok(sections.includes(id), `${pageName} jump link #${id} has no target section`);
    }
  }

  const styles = read('src/styles/pages.css');
  assert.match(styles, /\.resource-jump-nav\s*\{[^}]*flex-wrap:\s*wrap/s);
  assert.match(styles, /\.resource-section\s*\{[^}]*scroll-margin-top:\s*2rem/s);
});

test('page navigation transitions match the shared header and respect reduced motion', () => {
  const foundation = read('src/styles/foundation.css');
  const layout = read('src/styles/layout.css');
  const header = read('src/_includes/header.liquid');

  assert.match(foundation, /@view-transition\s*\{\s*navigation:\s*auto;/);
  assert.match(layout, /\.site-header\s*\{[^}]*view-transition-name:\s*site-header;/s);
  assert.match(layout, /::view-transition-group\(site-header\)\s*\{[^}]*animation:\s*none;/s);
  assert.match(layout, /::view-transition-old\(site-header\)\s*\{[^}]*display:\s*none;/s);
  assert.match(layout, /::view-transition-new\(site-header\)\s*\{[^}]*animation:\s*none;/s);
  assert.match(
    foundation,
    /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{\s*@view-transition\s*\{\s*navigation:\s*none;/s,
  );
  assert.match(
    foundation,
    /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*?::view-transition-new\(\*\)[\s\S]*?animation:\s*none\s*!important;/,
  );
  assert.match(header, /<a[\s\S]*?href='\/about'/);
  assert.doesNotMatch(header, /onclick\s*=/i);
});

test('body and heading fonts are preloaded and cached as versioned local assets', () => {
  const head = read('src/_includes/head.liquid');
  const headers = read('src/_headers');

  assert.match(
    head,
    /rel='preload'[\s\S]*?href='\/assets\/fonts\/Atkinson-Hyperlegible-Bold-102a\.woff2'[\s\S]*?as='font'[\s\S]*?type='font\/woff2'[\s\S]*?crossorigin/s,
  );
  assert.match(
    head,
    /rel='preload'[\s\S]*?href='\/assets\/fonts\/Atkinson-Hyperlegible-Regular-102a\.woff2'[\s\S]*?as='font'[\s\S]*?type='font\/woff2'[\s\S]*?crossorigin/s,
  );
  assert.match(headers, /\/assets\/fonts\/\*[\s\S]*?Cache-Control: public, max-age=31536000, immutable/);
});

test('Resources exposes the requested categories as top-level sections', () => {
  const html = read('_site/resources/index.html');
  const headings = [...html.matchAll(/<h2>([\s\S]*?)<\/h2>/g)].map((match) => match[1].trim());

  assert.deepEqual(headings, ['Communities', 'Learning', 'Job Search', 'Advocacy', 'For Employers']);
  assert.doesNotMatch(html, /<h[23]>\s*For Workers\s*<\/h[23]>/);
});

test('About includes the three approved member quotes with role-only attribution', () => {
  const about = read('_site/about/index.html');
  const aboutText = about.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
  const quotes = [
    [
      'Connecting with others who have similar lived experience in the workforce and are genuinely helping one another.',
      'Founder &amp; Creative Director',
    ],
    [
      'I feel at home here. It has become a community I trust to support me.',
      'Marketing &amp; Communications Professional',
    ],
    [
      'Joining provides valuable resources for navigating challenges we may face in the workplace.',
      'Software Development Student',
    ],
  ];

  assert.match(about, /<h2 id="member-quotes-heading">What members value<\/h2>/);
  assert.match(about, /<ul class="member-quote-list">/);
  assert.doesNotMatch(about, /class="[^"]*resource-list[^"]*member-quote-list/);
  assert.equal((about.match(/<blockquote>/g) ?? []).length, 3);
  const quoteStyles = read('src/styles/pages.css');
  const responsiveStyles = read('src/styles/responsive.css');
  assert.match(quoteStyles, /\.member-quote-list blockquote p\s*\{[^}]*\}/s);
  assert.doesNotMatch(quoteStyles, /\.member-quote-list blockquote p\s*\{[^}]*font-style:\s*italic/s);
  assert.match(quoteStyles, /\.member-quote-list blockquote footer\s*\{[^}]*font-size:\s*0\.875rem/s);
  assert.match(
    responsiveStyles,
    /@media \(min-width: 44\.01rem\)[\s\S]*?grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/,
  );
  assert.match(
    responsiveStyles,
    /@media \(max-width: 44rem\)[\s\S]*?\.member-quote-list\s*\{\s*grid-template-columns: 1fr/s,
  );
  assert.doesNotMatch(quoteStyles, /\.member-quote-list\s*>\s*li\s*\{[^}]*border-bottom/s);
  for (const [quote, role] of quotes) {
    assert.ok(aboutText.includes(quote));
    assert.ok(aboutText.includes(role));
  }
  assert.doesNotMatch(about, /ND In Tech member/);
});

test('ND In Tech guides are owned by Library and not duplicated in Resources', () => {
  const resources = JSON.parse(read('src/_data/resources.json'));
  const library = JSON.parse(read('src/_data/library.json'));
  const resourceItems = resources.flatMap((section) => section.groups.flatMap((group) => group.items));
  const guides = library.find((section) => section.title === 'Official Guides');
  const titles = ['ND Job Hunt Playbook: Interviewing', 'Inclusive Work Culture', 'Inclusive Hiring in Tech'];

  assert.ok(guides, 'Library is missing the Official Guides section');
  assert.deepEqual(
    guides.items.map((item) => item.title),
    titles,
  );
  for (const guide of guides.items) {
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
    'An autistic-led podcast hosted by tech lead Shea Belsky about workplace self-advocacy and neurodivergent careers.',
  );
  assert.equal(resources[0].groups[0].title, 'Learning');
  assert.deepEqual(
    resources[0].groups[0].items.map((item) => item.title),
    ['Autistic Techie', 'Unleash Your ADHD'],
  );
  assert.deepEqual(
    resources[1].groups[0].items.map((item) => item.title),
    [
      'Association for Autism and Neurodiversity',
      'ND Connect',
      'Neurodiverse Hackers',
      'Professionally Neurospicy',
    ],
  );
  assert.equal(resources[1].groups[1].title, 'Advocacy');
  assert.deepEqual(
    resources[1].groups[1].items.map((item) => item.title),
    ['Autistic Self Advocacy Network', 'NeuroClastic'],
  );
  assert.deepEqual(
    resources[2].groups[0].items.map((item) => item.title),
    ['Diversify Tech', 'Jobs for Humanity: Neurodivergent Job Listings', 'Mentra'],
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
  assert.equal(
    descriptions.get('NeuroClastic'),
    'An autistic-led nonprofit publishing free, accessible articles and resources by autistic writers.',
  );
  const bjien = items.find((item) => item.url === 'https://www.bjien.be/en/');
  assert.equal(bjien.title, 'Bjièn: Neurodiversity at Work');
  assert.equal(
    items.find((item) => item.url === 'https://www.jobsforhumanity.com/neurodivergent/').title,
    'Jobs for Humanity: Neurodivergent Job Listings',
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
    ['Official Guides', 'ND Tech Talks', 'Top Talent Spotlights'],
  );
  assert.deepEqual(
    library.map((section) => section.items.length),
    [3, 3, 8],
  );
  assert.deepEqual(
    library[0].items.map((item) => item.audience),
    ['For workers', 'For employers', 'For employers'],
  );
  assert.deepEqual(
    media.map((section) => section.title),
    ['Features', 'Mentions'],
  );
  assert.deepEqual(
    media.map((section) => section.items.length),
    [4, 3],
  );
  const mediaPage = read('_site/media/index.html');
  for (const marker of [
    'aria-label="Media sections"',
    'href="#features"',
    'href="#mentions"',
    'id="features"',
    'id="mentions"',
  ]) {
    assert.ok(mediaPage.includes(marker), `Media jump navigation is missing ${marker}`);
  }
  assert.equal(
    media[1].items[1].description,
    'Mihai Todor, freelance software engineer, with host and tech lead Shea Belsky on coding interviews, focus, self-advocacy, and ND In Tech.',
  );
  assert.equal(media[1].items[0].description, 'Lists ND In Tech as a resource.');
  assert.equal(
    media[1].items[2].description,
    'ND In Tech listed among Slack groups used to share job postings.',
  );
  assert.equal(
    media[0].items[2].description,
    'AI researcher and Neurodiverse Hackers co-founder Charlotte Foudy on the community mission.',
  );
  assert.deepEqual(
    media[0].items.map((item) => item.title),
    [
      'Neurodiversity In Tech',
      'ND In Tech: History, Importance, Community',
      'Building an Inclusive Future with Neurodiversity In Tech',
      'Neurodiversity in Tech',
    ],
  );
  assert.deepEqual(
    media[1].items.map((item) => item.title),
    [
      'Neurodiverse Hackers: The Cognitive Edge',
      'Coding Interviews, ADHD, and Staying Focused with Mihai Todor',
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
  assert.ok(
    read('src/_includes/resource-list.liquid').includes("source_label = 'by Mark Foudy & Charlotte Foudy'"),
  );
  assert.equal(
    turingCard.description,
    'ND In Tech founder and software engineer Hayley Witherell on community history, followed by a Q&A with Turing executive director Jeff Casimir.',
  );
  const resources = JSON.parse(read('src/_data/resources.json'));
  const allDescriptions = [
    ...resources.flatMap((section) => section.groups.flatMap((group) => group.items)),
    ...library.flatMap((section) => section.items),
    ...media.flatMap((section) => section.items),
  ];
  assert.ok(
    allDescriptions.every((item) => /[.!?]$/.test(item.description)),
    'Resources, Library, and Media descriptions should end with punctuation',
  );
  for (const url of libraryUrls) assert.ok(!mediaUrls.includes(url), `${url} is duplicated on Media`);
  for (const id of ['0QR8FSouQSs', 'I6ugv7stPFY', 'RJTJGzorIJ8']) {
    assert.ok(libraryUrls.includes(`https://www.youtube.com/watch?v=${id}`));
  }
  const adamTalk = library
    .flatMap((section) => section.items)
    .find((item) => item.title === 'Neurodiversity as an Asset in Tech');
  assert.equal(adamTalk.speaker_name, 'Adam Compton');
  assert.equal(adamTalk.speaker_role, 'Principal Engineer');
  assert.equal(adamTalk.description, 'Adam explores the value of neurodiversity in the tech industry.');
  const sheaTalk = library
    .flatMap((section) => section.items)
    .find((item) => item.title === 'Leadership from the Autistic Perspective');
  assert.equal(sheaTalk.speaker_name, 'Shea Belsky');
  assert.equal(sheaTalk.speaker_role, 'Tech Lead and Autistic Techie podcast host');
  assert.equal(sheaTalk.description, 'Shea discusses autistic perspectives on leadership.');
  const mihaiTalk = library
    .flatMap((section) => section.items)
    .find((item) => item.title === 'My Career Path in Tech');
  assert.equal(mihaiTalk.speaker_name, 'Mihai Todor');
  assert.equal(mihaiTalk.speaker_role, 'Freelance Software Engineer');
  assert.equal(mihaiTalk.description, 'Mihai shares his career journey in technology.');
  const talentSpotlights = library.find((section) => section.title === 'Top Talent Spotlights');
  assert.deepEqual(
    talentSpotlights.items.map((item) => item.title),
    [
      'David Raynor',
      'Mina Raver',
      'Lauren McAuliffe',
      'Sarah L. Minor',
      'Aurora Sanderson',
      'Amadaya Michael',
      'Amand Milette',
      'Matt Duell',
    ],
  );
  assert.deepEqual(
    talentSpotlights.items.map((item) => [item.spotlight_role, item.spotlight_date]),
    [
      ['Organization Founder', 'June 2026'],
      ['Founder & CEO', 'May 2026'],
      ['Founder & Creative Director', 'May 2026'],
      ['Marketing & Communications Professional', 'June 2024'],
      ['Software Development Student', 'March 2024'],
      ['Full-Stack & QA Engineer', 'January 2024'],
      ['Support, Data, & QA Specialist', 'January 2024'],
      ['Social & Data Scientist', 'January 2024'],
    ],
  );
  assert.deepEqual(
    talentSpotlights.items.map((item) => item.description),
    [
      'David runs Professionally Neurospicy and has healthcare and community organizing skills.',
      'Mina’s skills span public health, neuroscience, and organizational psychology.',
      'Lauren focuses on inclusive design and accessibility at 7Magnolia.',
      'Sarah brings award-winning work and board experience.',
      'Aurora combines technical training with organization and interpersonal skills.',
      'Amadaya graduated with a computer science degree from the University of New Mexico.',
      'Amand brings a decade of administration and operations experience.',
      'Matt moved from blue-collar work to a doctorate in political science.',
    ],
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

test('Library omits source labels on each card', () => {
  const library = read('_site/library/index.html');
  for (const marker of [
    'aria-label="Library sections"',
    'href="#official-guides"',
    'href="#nd-tech-talks"',
    'href="#top-talent-spotlights"',
    'id="official-guides"',
    'id="nd-tech-talks"',
    'id="top-talent-spotlights"',
  ]) {
    assert.ok(library.includes(marker), `Library jump navigation is missing ${marker}`);
  }
  assert.match(library, /class='resource-audience'>For workers/);
  assert.match(library, /class='resource-audience'>For employers/);
  assert.equal((library.match(/class='resource-source-logo/g) ?? []).length, 14);
  assert.equal((library.match(/class='resource-source'>/g) ?? []).length, 0);
  assert.equal((library.match(/class='resource-card-speaker'/g) ?? []).length, 11);
  assert.equal((library.match(/class='resource-card-spotlight-date'/g) ?? []).length, 0);
  assert.doesNotMatch(library, /June 2026|May 2026|March 2024|January 2024/);
  assert.match(
    library,
    /My Career Path in Tech[\s\S]*?Mihai Todor[\s\S]*?Freelance Software Engineer[\s\S]*?Mihai shares his career journey/,
  );
  assert.match(library, /<a[\s\S]*?>Mina Raver<\/a>[\s\S]*?Founder & CEO<\/strong>/);
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
