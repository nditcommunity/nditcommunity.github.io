const baseUrl = new URL(process.env.SITE_URL ?? 'https://nd-in-tech.org');
const routes = ['/', '/about/', '/events/', '/resources/', '/media/', '/contact/', '/code-of-conduct/'];

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const fetchPage = async (route) => {
  const url = new URL(route, baseUrl);
  const response = await fetch(url, {
    redirect: 'follow',
    signal: AbortSignal.timeout(20000),
    headers: { 'user-agent': 'ND-In-Tech-Production-Smoke-Test/1.0' },
  });

  assert(response.status === 200, `${url} returned HTTP ${response.status}`);
  return { body: await response.text(), response, url };
};

const run = async () => {
  const home = await fetchPage('/');
  const requiredHeaders = {
    'content-security-policy': ["default-src 'self'", "object-src 'none'", "frame-ancestors 'none'"],
    'cross-origin-opener-policy': ['same-origin'],
    'permissions-policy': ['camera=()', 'microphone=()'],
    'referrer-policy': ['strict-origin-when-cross-origin'],
    'strict-transport-security': ['max-age='],
    'x-content-type-options': ['nosniff'],
    'x-frame-options': ['DENY'],
  };

  for (const [header, expectedValues] of Object.entries(requiredHeaders)) {
    const value = home.response.headers.get(header);
    assert(value, `Production is missing the ${header} header`);
    for (const expected of expectedValues) {
      assert(value.includes(expected), `${header} does not include ${expected}`);
    }
  }

  for (const route of routes) {
    const page = route === '/' ? home : await fetchPage(route);
    assert(/<title>[\s\S]*?<\/title>/i.test(page.body), `${page.url} has no title`);
    assert(/<h1(?:\s|>)/i.test(page.body), `${page.url} has no h1`);
    assert(!/<meta[^>]+name=["']robots["'][^>]+noindex/i.test(page.body), `${page.url} contains noindex`);
    console.log(`200 ${page.url}`);
  }

  const events = await fetchPage('/events/');
  assert(events.body.includes('https://calendar.google.com/calendar/embed'), 'Events calendar is missing');

  const contact = await fetchPage('/contact/');
  assert(contact.body.includes('https://docs.google.com/forms/'), 'Contact form integration is missing');

  console.log('Production smoke test passed.');
};

run().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
