type CommonProps = {
  /**
   * this is just name of the library kebab-cased
   */
  libraryName: string;
  description: string;
  keywords: string[];
  useVSCode: boolean;
  username: string;
  usermail: string;
  githubName: string;
};

export type LibConfig = {
  /**
   * if scope is provided this property is the published npm name `@scope/libName`
   */
  packageName: string;
  scope?: string;
  version?: string;
} & CommonProps;

export type PromptAnswers = {
  useScope: boolean;
  scope: string;
} & CommonProps;

declare module 'replace-in-file' {
  interface Options {
    files: string | string[];
    from: Array<string | RegExp>;
    to: string | string[];
    ignore: string | string[];
    dry: boolean;
    encoding: string;
    disableGlobs: boolean;
    allowEmptyPaths: boolean;
  }

  interface API {
    (options: Partial<Options>): string[];
    sync(options: Partial<Options>): string[];
  }

  const api: API;
  export = api;
}

declare module 'standard-version' {
  async function standardVersion(args: any): Promise<any>;
  export = standardVersion;
}
