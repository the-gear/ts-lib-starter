const kleur = require('kleur');
const prompts = require('prompts');
const sh = require('shelljs');
const sortObjectByKeyNameList = require('sort-object-keys');
const replace = require('replace-in-file');
const { resolve, join, basename } = require('path');
const { writeFileSync } = require('fs');
const { fork } = require('child_process');

const { log, error } = console;
const ROOT = resolve(__dirname, '..');
const pkg = require('../package.json');

/**
 * @typedef {keyof typeof pkg['devDependencies']} PkgKeys
 */

const rmDirs = ['.git', 'templates'];
const rmFiles = ['.gitattributes', 'scripts/init.js', 'scripts/types.d.ts', 'CHANGELOG.md'];
const rmPackages = [
  '@types/chokidar',
  // packages needed for migrate/init script
  'replace-in-file',
  'json5',
  '@types/json5',
  'sort-package-json',
  'sort-object-keys',
  '@types/prompts',
  'prompts',
  'shelljs',
];
const modifyFiles = [
  '.github/CONTRIBUTING.md',
  '.github/ISSUE_TEMPLATE.md',
  'src/index.ts',
  'LICENSE.md',
];

main();

// =============================================================================
//  Helpers
// =============================================================================

/**
 *
 * @param {string[]} value
 */
function normalizeListResponse(value) {
  const isEmptyList = value.length === 1 && value[0] === '';

  return isEmptyList ? [] : value;
}

/**
 *
 * @param {string} value
 */
function isKebabCase(value) {
  const kebabCaseRegex = /^[a-z]+(\-[a-z]+)*$/;
  return kebabCaseRegex.test(value);
}

/**
 *
 * @param {string} value
 */
function isTextRequired(value) {
  return typeof value === 'string' && value.length > 0;
}

/**
 *
 * @param {string} value
 */
function isEmail(value) {
  const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(String(value).toLowerCase());
}

/**
 *
 * @param {string} value
 */
function isValidScopeName(value) {
  return value.startsWith('@') && isKebabCase(value.slice(1));
}

/**
 * Omit object key/values and return new one
 *
 * @param {{[pkgName:string]:string}} objectEntity
 * @param {string[]} propsToRemove
 * @returns {{[pkgName:string]:string}} deps
 */
function omitPropsFromObject(objectEntity, propsToRemove) {
  const objKeys = Object.keys(objectEntity);

  return objKeys.reduce((acc, pkgName) => {
    if (propsToRemove.includes(pkgName)) {
      return acc;
    }
    return { ...acc, [pkgName]: objectEntity[pkgName] };
  }, {});
}

function checkGit() {
  if (!sh.which('git')) {
    log(kleur.red('Sorry, this script requires git'));
    process.exit(1);
  }
}

/**
 *
 * @param {import('./types').LibConfig & {starterCommit: string, starterCommitDescribe:string}} config
 */
function initGit(config) {
  const gitInitOutput = execSilent(`git init "${ROOT}"`);
  log(kleur.green(gitInitOutput.replace(/(\n|\r)+/g, '')));

  const { githubName, libraryName, starterCommit, starterCommitDescribe } = config;
  if (githubName && libraryName) {
    const remote = `git@github.com:${githubName}/${libraryName}.git`;
    const gitRemoteAddCmd = `git -C "${ROOT}" remote add origin "${remote}"`;
    const gitRemoteOutput = execSilent(gitRemoteAddCmd);
    log(kleur.green(`Added remote ${kleur.bold('origin')} → ${remote}`));
  }

  if (starterCommit) {
    const commitMsg = [
      'Initial commit',
      '',
      `Based on ${pkg.name} at ${starterCommitDescribe}`,
      `${pkg.repository.url || pkg.repository}/tree/${starterCommit}`,
    ];

    execSilent(`git -C "${ROOT}" add .`);
    execSilent(`git -C "${ROOT}" commit -n -m "${commitMsg.join('\n')}"`);
    log(kleur.yellow(`\n${kleur.bold('Git — Added')} ${commitMsg.join('\n')}\n`));
  }
}

function initGitHooks() {
  return new Promise((resolve, reject) => {
    const huskyModule = resolve(ROOT, 'node_modules', 'husky', 'husky');
    // Initialize Husky
    const childProcess = fork(huskyModule, ['install'], {
      silent: true,
    });

    childProcess
      .on('close', () => {
        log(kleur.green('Git hooks set up'));
        resolve();
      })
      .on('error', (err) => {
        log(kleur.red('Git hooks set up FAILED 💥'));
        error(err);
        reject(err);
      });
  });
}

/**
 * @param {string|string[]} files
 * @param {import('./types').LibConfig} config
 * @param {Array<[string|RegExp, string]>} extras
 */
function createTemplateVariablesConfig(
  files,
  { libraryName, packageName, description, githubName, username, usermail },
  extras = []
) {
  const extrasConfig = extras.reduce(
    (acc, configPair) => {
      const [from, to] = configPair;
      if (from && to) {
        acc.from = [...acc.from, from];
        acc.to = [...acc.to, to];
      }
      return acc;
    },
    {
      from: /** @type {Array<string|RegExp>} */ ([]),
      to: /** @type {Array<string>} */ ([]),
    }
  );

  return {
    files,
    from: [
      /\{library-name\}/g,
      /\{package-name\}/g,
      /\{library-description\}/g,
      /\{github-name\}/g,
      /\{username\}/g,
      /\{usermail\}/g,
      ...extrasConfig.from,
    ],
    to: [libraryName, packageName, description, githubName, username, usermail, ...extrasConfig.to],
  };
}

/**
 *
 * @param {import('./types').LibConfig} config
 */
function processPgkJson({
  packageName,
  libraryName,
  description,
  keywords,
  username,
  usermail,
  githubName,
  version = '0.0.0',
}) {
  const { devDependencies, scripts } = pkg;

  const newDevDeps = sortObjectByKeyNameList(omitPropsFromObject(devDependencies, rmPackages));
  const newScripts = omitPropsFromObject(scripts, ['postinstall']);

  /**
   * @type {typeof pkg}
   */
  const updatePkg = {
    ...pkg,
    version,
    name: packageName,
    description,
    keywords,
    author: `${username} <${usermail}>`,
    contributors: [],
    repository: {
      ...pkg.repository,
      url: `https://github.com/${githubName}/${libraryName}`,
    },
    scripts: /** @type {any} */ (newScripts),
    devDependencies: /** @type {any} */ (newDevDeps),
  };

  writePackage(updatePkg);

  /**
   * @param {typeof pkg} pkg
   */
  function writePackage(pkg) {
    const updatedLibPkgToWrite = JSON.stringify(pkg, null, 2);
    writeFileSync(join(ROOT, 'package.json'), updatedLibPkgToWrite);

    log(kleur.green('package.json was setup successfully'), '\n');
  }
}

/**
 * Removes items from the project that aren't needed after the initial setup
 *
 * @param {import('./types').LibConfig} config
 */
function removeItems(config) {
  log(kleur.underline().white('Removed'));

  const vsCodeDirToRemove = config.useVSCode ? null : '.vscode';
  const rmItems = /** @type {string[]} */ ([...rmDirs, ...rmFiles, vsCodeDirToRemove].filter(
    Boolean
  ));

  const files = rmItems.map((fileName) => resolve(ROOT, fileName));

  // 'rm' command checks the item type before attempting to remove it
  sh.rm('-rf', files);

  log(kleur.red(rmItems.join('\n')), '\n');
}

/**
 * Updates the contents of the template files with the library name or user details
 *
 * @param {import('./types').LibConfig} config
 */
function modifyContents(config) {
  console.log(kleur.underline().white('Modified'));

  const files = modifyFiles.map((fileName) => resolve(ROOT, fileName));

  const replaceConfig = createTemplateVariablesConfig(files, config, [
    [
      /Martin\s+Hochel/g, // This is here only for LICENSE.md
      `${config.username} <${config.usermail}>`,
    ],
  ]);

  try {
    const changedFiles = replace.sync(replaceConfig);

    log(kleur.yellow(changedFiles.join('\n')));
  } catch (reason) {
    error('An error occurred modifying the file: ', reason);
  }

  log('\n');
}

/**
 * Execute command silently
 * @param {string} command
 * @returns {string}
 */
function execSilent(command) {
  /** @type {import('shelljs').ExecOutputReturnValue} */
  const { code, stdout, stderr } = sh.exec(command, {
    silent: true,
  });

  if (code) {
    throw new Error(`FAILED: ${command}\v${stderr}`);
  }

  return stdout.trim();
}

/**
 * Execute `git config $name`, returns string
 * @param {string} name
 * @returns {string}
 */
function getGitConfig(name) {
  return execSilent(`git config "${name}"`);
}

/**
 * Prepare default values for questions
 * @returns {Partial<import('./types').LibConfig>}
 */
function getUserInfo() {
  const libraryName = basename(ROOT);
  const username = getGitConfig('user.name');
  const usermail = getGitConfig('user.email');
  const githubName = getGitConfig('github.user') || username;

  return { libraryName, username, usermail, githubName };
}

/**
 * @param {Partial<import('./types').LibConfig>} config
 * @returns {import('prompts').PromptObject[]}
 */
function createQuestions(config) {
  return [
    {
      type: 'text',
      name: 'libraryName',
      message: 'What do you want the library to be called? (use kebab-case)',
      initial: config.libraryName,
      validate: (value) =>
        isKebabCase(value) ||
        `"kebab-case" uses lowercase letters, and hyphens for any punctuation`,
    },
    {
      type: 'confirm',
      name: 'useScope',
      message: 'Wanna publish this package under a namespace(like @my-org)',
      // prettier-ignore
      initial: /**@type any */ (false)
    },
    {
      type: /** @type {import('prompts').ValueOrFunc<import('prompts').PromptType>} */ ((prev) =>
        prev === true ? 'text' : null),
      name: 'scope',
      message: 'Scope/namespace (needs to start with @)',
      validate: (value) =>
        isValidScopeName(value) || `namespace needs to start with @ followed by kebab-case`,
    },
    {
      type: 'text',
      name: 'description',
      message: 'Describe your library in one sentence',
      initial: 'A library written in TypeScript',
    },
    {
      type: 'list',
      name: 'keywords',
      message: 'Provide keywords to improve library discovery (coma separated)',
      format: normalizeListResponse,
    },
    {
      type: 'confirm',
      name: 'useVSCode',
      message: 'Are you using VSCode and wanna include recommended configuration?',
      // prettier-ignore
      initial: /**@type any */ (false)
    },
    {
      type: 'text',
      name: 'username',
      message: 'Your name',
      initial: config.username,
      validate: (value) => isTextRequired(value) || `Please provide your name and surname`,
    },
    {
      type: 'text',
      name: 'usermail',
      message: 'Your email',
      initial: config.usermail,
      validate: (value) => isEmail(value) || `Please provide valid email`,
    },
    {
      type: 'text',
      name: 'githubName',
      message: 'Your github account (or organization) name',
      initial: config.githubName,
      validate: (value) => isTextRequired(value) || `Please provide valid github username`,
    },
  ];
}

/**
 *
 * @param {import('./types').PromptAnswers} promptAnswers
 * @returns {import('./types').LibConfig}
 */
function getLibConfig({ scope, libraryName, ...promptAnswers }) {
  const packageName = scope ? `${scope}/${libraryName}` : libraryName;

  return {
    packageName,
    libraryName,
    ...promptAnswers,
  };
}

/**
 * @param {import('./types').LibConfig} config
 */
function processTemplates(config) {
  const templatesDir = resolve(ROOT, 'templates');
  const files = ['README.md'].map((fileName) => resolve(templatesDir, fileName));
  const replaceConfig = createTemplateVariablesConfig(files, config);

  log(kleur.underline().white('Creating files from templates'));

  try {
    const changedFiles = replace.sync(replaceConfig);

    sh.cp('-Rf', `${templatesDir}/*`, `${ROOT}/`);

    log(kleur.yellow(changedFiles.join('\n')));
  } catch (reason) {
    error('An error occurred modifying the file: ', reason);
  }

  log('\n');
}

function onCancel() {
  error(kleur.bgRed(' Aborted ! '));
  process.exit(1);
}

async function main() {
  checkGit();

  const starterCommit = execSilent('git rev-parse --verify HEAD');
  const starterCommitDescribe = execSilent(`git -C "${ROOT}" describe`);

  log(`\n\n⚙️  This is ${kleur.bold(pkg.name)} ${kleur.yellow(starterCommit)}`);
  log(`⚙️  ${pkg.description}`);
  log(`⚙️  > ${ROOT}\n\n`);

  const userInfo = getUserInfo();
  const questions = createQuestions(userInfo);
  const response = /** @type {import('./types').PromptAnswers} */ (await prompts(questions, {
    onCancel: onCancel,
  }));
  const config = getLibConfig(response);

  processPgkJson(config);

  modifyContents(config);

  processTemplates(config);

  removeItems(config);

  initGit({
    ...config,
    starterCommit,
    starterCommitDescribe,
  });

  await initGitHooks();

  log(kleur.cyan("OK, you're all set. Happy type-safe coding!! 🌊 🏄 ‍🤙 \n"));
}
