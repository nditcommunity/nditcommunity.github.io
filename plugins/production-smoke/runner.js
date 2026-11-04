const path = require('node:path');

const smokeScript = path.resolve(__dirname, '../../tools/smoke-production.js');

const shouldRun = ({ context, siteId, productionSiteId, deployUrl }) =>
  context === 'production' && siteId === productionSiteId && Boolean(deployUrl);

const runSmokeTest = ({ deployUrl, execFile, environment = process.env }) =>
  new Promise((resolve, reject) => {
    execFile(
      process.execPath,
      [smokeScript],
      { env: { ...environment, SITE_URL: deployUrl }, cwd: path.resolve(__dirname, '../..') },
      (error, stdout = '', stderr = '') => {
        if (stdout) process.stdout.write(stdout);
        if (stderr) process.stderr.write(stderr);
        if (error) reject(error);
        else resolve();
      },
    );
  });

const runProductionSmoke = ({ inputs, environment = process.env, execFile }) => {
  const { CONTEXT, SITE_ID, DEPLOY_URL } = environment;
  if (CONTEXT !== 'production' || SITE_ID !== inputs.production_site_id) return Promise.resolve();
  if (!DEPLOY_URL) return Promise.reject(new Error('Netlify production deploy did not provide DEPLOY_URL'));
  return runSmokeTest({ deployUrl: DEPLOY_URL, execFile, environment });
};

module.exports = { runProductionSmoke, runSmokeTest, shouldRun, smokeScript };
