import { homedir } from 'os';
import { join, isAbsolute } from 'path';
import fs from 'fs';

export interface Cog {
  watcher?: string;
  [key: string]: unknown;
}

export interface CogLoaderOptions {
  cwd?: string;
  cogPath?: string;
  override?: boolean;
  overridePath?: string;
  checkHomeDirectory?: boolean;
}

interface InstantiatedOptions {
  cwd: string;
  cogPath: string;
  override: boolean;
  overridePath: string;
  checkHomeDirectory: boolean;
}

/**
 * Given a target object and an override object, we override any keys in target whose values
 * are the boolean true. This modifies the target in-place.
 */
export function overrideObject(target: Cog, override: {[key: string]: unknown}): Cog {
  // because we interop with JS libraries, and do not trust them to understand type signatures
  if (typeof override !== 'object' || Array.isArray(override)) {
    return target;
  }
  for (const key in override) {
    if (target[key] && target[key] === true) {
      target[key] = override[key];
    }
  }
  return target;
}

export default function loadCogFile(options?: CogLoaderOptions): Cog {
  const finalOptions: InstantiatedOptions = Object.assign({
    cwd: process.cwd(),
    cogPath: 'cog.json',
    override: true,
    overridePath: 'cog.override.json',
    checkHomeDirectory: true,
  }, options);

  if (!isAbsolute(finalOptions.cogPath)) {
    finalOptions.cogPath = join(finalOptions.cwd, finalOptions.cogPath);
  }

  if (!isAbsolute(finalOptions.overridePath)) {
    finalOptions.overridePath = join(finalOptions.cwd, finalOptions.overridePath);
  }

  if (!fs.existsSync(finalOptions.cogPath)) {
    throw new Error(`Could not load cog file at ${finalOptions.cogPath}`);
  }

  const cog: Cog = JSON.parse(fs.readFileSync(finalOptions.cogPath, {encoding: 'utf8'}));

  // overrides that sit next to final take precendence over global home overrides
  if (finalOptions.override && fs.existsSync(finalOptions.overridePath)) {
    overrideObject(cog, JSON.parse(fs.readFileSync(finalOptions.overridePath, {encoding: 'utf8'})));
  }

  const homeCogPath = join(homedir(), '.cog.json');
  if (finalOptions.override && finalOptions.checkHomeDirectory && fs.existsSync(homeCogPath)) {
    overrideObject(cog, JSON.parse(fs.readFileSync(homeCogPath, {encoding: 'utf8'})));
  }
  return cog;
}
