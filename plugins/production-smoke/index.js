const { execFile } = require('node:child_process');
const { runProductionSmoke } = require('./runner');

module.exports = {
  async onSuccess({ inputs }) {
    await runProductionSmoke({ inputs, execFile });
  },
};
