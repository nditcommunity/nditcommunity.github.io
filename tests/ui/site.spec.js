const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

const pages = [
  ['/', 'Neurodivergent-led'],
  ['/about/', 'About'],
  ['/events/', 'Events'],
  ['/resources/', 'Resources'],
  ['/media/', 'Media'],
  ['/contact/', 'Contact'],
  ['/code-of-conduct/', 'Code of Conduct'],
];

const mockCalendar = async (page) => {
  await page.route('https://calendar.google.com/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: '<!doctype html><title>Community calendar</title>',
    }),
  );
};

test.describe('core pages', () => {
  for (const [path, heading] of pages) {
    test(`${heading} loads without accessibility or browser errors`, async ({ page }) => {
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('console', (message) => {
        if (message.type() === 'error') errors.push(message.text());
      });

      if (path === '/events/') await mockCalendar(page);

      const response = await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toContainText(heading);
      expect(response?.status()).toBe(200);
      expect(errors).toEqual([]);

      const accessibility = await new AxeBuilder({ page }).analyze();
      expect(accessibility.violations).toEqual([]);
    });
  }

  test('unknown routes display the custom 404 page', async ({ page }) => {
    const response = await page.goto('/this-page-does-not-exist/');
    expect(response?.status()).toBe(404);
  });
});

test.describe('navigation and responsive layout', () => {
  test('keyboard users can skip to the main content', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('main')).toBeFocused();
  });

  for (const width of [375, 500, 575, 600, 768]) {
    test(`navigation fits without horizontal overflow at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 700 });
      await page.goto('/');

      const dimensions = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));

      expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
      await expect(page.getByRole('button', { name: /Switch to (light|dark) mode/ })).toBeVisible();
    });
  }

  test('tablet navigation keeps Events and Resources together', async ({ page }) => {
    await page.setViewportSize({ width: 600, height: 700 });
    await page.goto('/');

    const events = await page.getByRole('link', { name: 'Events', exact: true }).boundingBox();
    const resources = await page.getByRole('link', { name: 'Resources', exact: true }).boundingBox();
    const gap = resources.x - (events.x + events.width);

    expect(gap).toBeGreaterThanOrEqual(0);
    expect(gap).toBeLessThan(24);
  });
});

test.describe('theme behavior', () => {
  test('theme toggles and persists after reload', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');

    await page.getByRole('button', { name: 'Switch to dark mode' }).click();
    await expect(page.locator('html')).toHaveClass(/dark-mode/);
    await page.reload();
    await expect(page.locator('html')).toHaveClass(/dark-mode/);
    await expect(page.getByRole('button', { name: 'Switch to light mode' })).toBeVisible();
  });

  test('legacy saved theme names are migrated', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('theme', 'night-mode'));
    await page.goto('/');
    await expect(page.locator('html')).toHaveClass(/dark-mode/);
  });

  test('theme works when storage is unavailable', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        get() {
          throw new Error('Storage unavailable');
        },
      });
    });
    await page.goto('/');
    await page.getByRole('button', { name: /Switch to (light|dark) mode/ }).click();
    await expect(page.locator('html')).toHaveClass(/(light|dark)-mode/);
  });
});

test.describe('page-specific scripts', () => {
  test('pages only load the behavior they use', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('script[src="/scripts/theme.js"]')).toHaveCount(1);
    await expect(page.locator('script[src="/scripts/contact.js"]')).toHaveCount(0);
    await expect(page.locator('script[src="/scripts/calendar.js"]')).toHaveCount(0);

    await page.goto('/contact/');
    await expect(page.locator('script[src="/scripts/contact.js"]')).toHaveCount(1);
    await expect(page.locator('script[src="/scripts/calendar.js"]')).toHaveCount(0);

    await mockCalendar(page);
    await page.goto('/events/');
    await expect(page.locator('script[src="/scripts/calendar.js"]')).toHaveCount(1);
    await expect(page.locator('script[src="/scripts/contact.js"]')).toHaveCount(0);
  });
});

test.describe('contact form', () => {
  test('native validation blocks missing required fields', async ({ page }) => {
    await page.goto('/contact/');
    await page.getByRole('button', { name: 'Send Message' }).click();
    await expect(page.locator('#contact-email')).toBeFocused();
    await expect(page.locator('#contact-email')).toHaveJSProperty('validity.valid', false);
  });

  test('a valid submission shows confirmation and resets the form', async ({ page }) => {
    await page.route('https://docs.google.com/forms/**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: '<!doctype html><title>Submitted</title>',
      }),
    );
    await page.goto('/contact/');
    await page.locator('#contact-email').fill('worker@example.com');
    await page.locator('#contact-message').fill('Hello from the test suite.');
    await page.getByRole('button', { name: 'Send Message' }).click();

    await expect(page.locator('.form-status')).toHaveText('Thanks! Your message has been sent.');
    await expect(page.locator('#contact-email')).toHaveValue('');
    await expect(page.getByRole('button', { name: 'Send Message' })).toBeEnabled();
  });

  test('offline submissions retain the message and explain recovery', async ({ page, context }) => {
    await page.goto('/contact/');
    await page.locator('#contact-email').fill('worker@example.com');
    await page.locator('#contact-message').fill('Please keep this text.');
    await context.setOffline(true);
    await page.getByRole('button', { name: 'Send Message' }).click();

    await expect(page.locator('.form-status')).toContainText('offline');
    await expect(page.locator('#contact-message')).toHaveValue('Please keep this text.');
    await expect(page.getByRole('button', { name: 'Send Message' })).toBeEnabled();
  });
});

test.describe('calendar states', () => {
  test('loading status disappears when the calendar loads', async ({ page }) => {
    await mockCalendar(page);
    await page.goto('/events/');
    await expect(page.locator('.calendar-status')).toBeHidden();
    await expect(page.locator('.calendar')).toBeVisible();
  });

  test('calendar failure offers the external fallback', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'onLine', { get: () => false });
    });
    await page.route('https://calendar.google.com/**', (route) => route.abort('failed'));
    await page.goto('/events/');

    await expect(page.locator('.calendar-status')).toContainText('offline');
    await expect(page.getByRole('link', { name: 'Open calendar in a new tab' })).toBeVisible();
  });
});
