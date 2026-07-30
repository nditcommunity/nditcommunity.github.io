const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const stylesDirectory = path.join(projectRoot, 'src', 'styles');
const outputFile = path.join(projectRoot, '_site', 'styles', 'style.css');
const sourceFiles = [
  'foundation.css',
  'accessibility.css',
  'layout.css',
  'components.css',
  'pages.css',
  'responsive.css',
];

const bundle = sourceFiles
  .map((file) => {
    const contents = fs.readFileSync(path.join(stylesDirectory, file), 'utf8').trim();
    return `/* Source: ${file} */\n\n${contents}`;
  })
  .join('\n\n');

fs.mkdirSync(path.dirname(outputFile), { recursive: true });
fs.writeFileSync(outputFile, `${bundle}\n`);

console.log(`Bundled ${sourceFiles.length} stylesheets into ${path.relative(projectRoot, outputFile)}`);
