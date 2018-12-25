# @the-gear/ts-lib-starter

[![Build Status](https://travis-ci.com/the-gear/ts-lib-starter.svg?branch=ts-lib-starter)](https://travis-ci.com/the-gear/ts-lib-starter)
[![Standard Version](https://img.shields.io/badge/release-standard%20version-brightgreen.svg)](https://github.com/conventional-changelog/standard-version)
[![styled with prettier](https://img.shields.io/badge/styled_with-prettier-ff69b4.svg)](https://github.com/prettier/prettier)
[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-yellow.svg)](https://conventionalcommits.org)
[![Greenkeeper badge](https://badges.greenkeeper.io/the-gear/ts-lib-starter.svg)](https://greenkeeper.io/)

**`git clone https://github.com/the-gear/ts-lib-starter`** _LIBNAME_ **`&& cd $_ && yarn`**

This npm library starter:

- creates package for both Node and Browser
- build will creates 4 standard "package" formats:
  - `umd` 👉 UMD bundle for Node and Browser
    > `main` field in package.json
  - `esm5` 👉 transpiled files to ES5 + es2015 modules for tree shaking
    > `module` field in package.json
  - `esm2015` 👉 raw javascript files transpiled from typescript to latest ES standard ( es2018 )
    > `es2015` field in package.json
    >
    > this is useful if you wanna transpile everything or just wanna ship untranspiled esNext code for evergreen browsers)
  - `fesm` 👉 experimental bundle type introduced by Angular team (TL;DR: it's an es2015 flattened bundle, like UMD but with latest ECMAscript and JS modules)
- type definitions are automatically generated and shipped with your package
  - > `types` field in package.json
- `sideEffects` 👉 [support proper tree-shaking](https://webpack.js.org/guides/tree-shaking/#mark-the-file-as-side-effect-free) for whole library ( Webpack >= 4). Turn this off or adjust as needed if your modules are not pure!

## Start coding in seconds !

1.  `git clone https://github.com/the-gear/ts-lib-starter LIBNAME && cd $_`
2.  `yarn`

[![asciicast](https://asciinema.org/a/217978.svg)](https://asciinema.org/a/217978)

Yes that's it. Happy coding ! 🖖

## Consumption of published library:

1.  install it 🤖

```sh
yarn add my-new-library
# OR
npm install my-new-library
```

2.  use it 💪

### Webpack

> #### NOTE:
>
> Don't forget to turn off ES modules transpilation to enable tree-shaking!
>
> - babel: `{"modules": false}`
> - typescript: `{"module": "esnext"}`

```ts
// main.ts or main.js
import { Greeter } from 'my-new-library';

const mountPoint = document.getElementById('app');
const App = () => {
  const greeter = new Greeter('Stranger');
  return `<h1>${greeter.greet()}</h1>`;
};
const render = (Root: Function, where: HTMLElement) => {
  where.innerHTML = Root();
};

render(App, mountPoint);
```

```html
<!-- index.htm -->
<html>
  <head>
    <script src="bundle.js" async></script>
  </head>
  <body>
    <div id="app"></div>
  </body>
</html>
```

### UMD/ES2015 module aware browsers ( no bundler )

```html
<html>
  <head>
    <script type="module">
      import { Greeter } from './node_modules/my-lib/esm2015/index.js';

      const mountPoint = document.querySelector('#root');

      const App = () => {
        const greeter = new Greeter('Stranger');
        return `<h1>${greeter.greet()}</h1>`;
      };

      const render = (Root, where) => {
        where.innerHTML = Root();
      };

      render(App, mountPoint);
    </script>
    <script nomodule src="node_modules/my-lib/bundles/my-new-library.umd.min.js"></script>
    <script nomodule async>
      var Greeter = MyLib.Greeter;

      var mountPoint = document.querySelector('#root');

      var App = function() {
        var greeter = new Greeter('Stranger');
        return '<h1>' + greeter.greet() + '</h1>';
      };

      var render = function(Root, where) {
        where.innerHTML = Root();
      };

      render(App, mountPoint);
    </script>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
```

## Publish your library

> #### NOTE:
>
> you have to create npm account and register token on your machine
> 👉 `npm adduser`
>
> If you are using scope ( you definitely should 👌) don't forget to [`--scope`](https://docs.npmjs.com/cli/adduser#scope)

Execute `yarn release` which will handle following tasks:

- bump package version and git tag
- update/(create if it doesn't exist) CHANGELOG.md
- push to github master branch + push tags
- publish build packages to npm

> **NOTE:**
>
> all package files are gonna be within `/dist` folder from where `npm publish` will be executed

> releases are handled by awesome [standard-version](https://github.com/conventional-changelog/standard-version)

### Initial Release (without bumping package.json version):

`yarn release --first-release`

### Pre-release

- To get from `1.1.2` to `1.1.2-0`:

`yarn release --prerelease`

- **Alpha**: To get from `1.1.2` to `1.1.2-alpha.0`:

`yarn release --prerelease alpha`

- **Beta**: To get from `1.1.2` to `1.1.2-beta.0`:

`yarn release --prerelease beta`

### Dry run mode

See what commands would be run, without committing to git or updating files

`yarn release --dry-run`

## Check what files are gonna be published to npm

- `cd dist && yarn pack` OR `yarn release:preflight` which will create a tarball with everything that would get published to NPM

## Check size of your published NPM bundle

`yarn size`

## Format and fix lint errors

`yarn ts:style:fix`

## Generate documentation

`yarn docs`

## Commit ( via commitizen )

- this is preferred way how to create conventional-changelog valid commits
- if you prefer your custom tool we provide a commit hook linter which will error out, it you provide invalid commit message
- if you are in rush and just wanna skip commit message validation just prefix your message with `WIP: something done` ( if you do this please squash your work when you're done with proper commit message so standard-version can create Changelog and bump version of your library appropriately )

`yarn commit` - will invoke [commitizen CLI](https://github.com/commitizen/cz-cli)

### Troubleshooting

#### dynamic `import()`

This starter uses latest **TypeScript >=2.9** which has support for lazy loading chunks/modules via `import()` and also definition acquisition via [`import('../path-to-module').TypeFoo`](http://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-9.html#import-types)

Before TS 2.9, it wasn't possible to properly generate ambient definitions if you used dynamic `import()`. This works now as expected without any hacks ❤️ !

---

> ### Before TS 2.9
>
> Please note that if you wanna use that feature, compiler will complain because declaration generation is turned on, and currently TS can't handle type generation with types that will be loaded in the future ( lazily )
>
> **How to solve this:**
>
> - turn of type checking and don't generate types for that lazy import: `import('./components/button') as any`
> - or you can use this [temporary workaround](https://github.com/Microsoft/TypeScript/issues/16603#issuecomment-310208259)

## Thanks

This is fork of [typescript-lib-starter](https://github.com/Hotell/typescript-lib-starter)
by [Martin Hochel](https://github.com/Hotell)
but [almost entirely rewritten](https://github.com/Hotell/typescript-lib-starter/pull/154)

## Other TypeScript Starters

- [Hotell/typescript-lib-starter](https://github.com/Hotell/typescript-lib-starter)
- [alexjoverm/typescript-library-starter](https://github.com/alexjoverm/typescript-library-starter)
