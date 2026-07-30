const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const outputRoot = path.join(projectRoot, '_site');
const checkExternal = process.argv.includes('--external');

const walk = (directory) =>
  fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(fullPath) : [fullPath];
  });

const htmlFiles = walk(outputRoot).filter((file) => file.endsWith('.html'));
const externalUrls = new Set();
const failures = [];

const resolveOutputPath = (pathname) => {
  const relativePath = decodeURIComponent(pathname).replace(/^\/+/, '');
  const directPath = path.join(outputRoot, relativePath);
  const candidates = [
    directPath,
    path.join(directPath, 'index.html'),
    path.join(outputRoot, `${relativePath}.html`),
  ];

  return candidates.find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
};

for (const htmlFile of htmlFiles) {
  const html = fs.readFileSync(htmlFile, 'utf8');
  const pagePath = `/${path.relative(outputRoot, htmlFile).replaceAll(path.sep, '/')}`;
  const pageUrl = new URL(pagePath, 'https://local.test');
  const attributes = html.matchAll(/\b(?:href|src)=["']([^"'<>]+)["']/g);

  for (const [, value] of attributes) {
    if (/^(?:mailto:|tel:|data:|javascript:)/i.test(value)) continue;

    const url = new URL(value, pageUrl);

    if (url.origin !== pageUrl.origin) {
      if (url.protocol === 'https:') externalUrls.add(url.href);
      continue;
    }

    const targetFile = resolveOutputPath(url.pathname);
    if (!targetFile) {
      failures.push(`${pagePath}: ${value} does not resolve to a generated file`);
      continue;
    }

    if (url.hash) {
      const id = decodeURIComponent(url.hash.slice(1));
      const targetHtml = fs.readFileSync(targetFile, 'utf8');
      const escapedId = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (!new RegExp(`\\bid=["']${escapedId}["']`).test(targetHtml)) {
        failures.push(`${pagePath}: ${value} points to a missing fragment`);
      }
    }
  }
}

const fetchStatus = async (url) => {
  const request = async (method) =>
    fetch(url, {
      method,
      redirect: 'follow',
      signal: AbortSignal.timeout(15000),
      headers: { 'user-agent': 'ND-In-Tech-Link-Checker/1.0' },
    });

  let response = await request('HEAD');
  if (response.status === 405) response = await request('GET');
  return response.status;
};

const checkExternalLinks = async () => {
  const urls = [...externalUrls];
  const concurrency = 5;

  for (let index = 0; index < urls.length; index += concurrency) {
    const batch = urls.slice(index, index + concurrency);
    const results = await Promise.allSettled(batch.map((url) => fetchStatus(url)));

    results.forEach((result, resultIndex) => {
      const url = batch[resultIndex];
      if (result.status === 'rejected') {
        failures.push(`${url}: ${result.reason.message}`);
      } else if ([404, 410].includes(result.value)) {
        failures.push(`${url}: returned HTTP ${result.value}`);
      } else {
        console.log(`${result.value} ${url}`);
      }
    });
  }
};

const finish = async () => {
  if (checkExternal) await checkExternalLinks();

  if (failures.length) {
    console.error(`Link check failed:\n${failures.map((failure) => `- ${failure}`).join('\n')}`);
    process.exitCode = 1;
    return;
  }

  console.log(
    `Checked ${htmlFiles.length} generated pages${checkExternal ? ` and ${externalUrls.size} external URLs` : ''}.`,
  );
};

finish();
