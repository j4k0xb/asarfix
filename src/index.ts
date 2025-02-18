import { readFilesystemSync } from "@electron/asar/lib/disk.js";
import { Filesystem } from "@electron/asar/lib/filesystem.js";
import { debloat } from "./plugins/debloat.js";
import { decrypt } from "./plugins/decrypt.js";
import { generator } from "./plugins/generator.js";

const DEFAULT_PLUGINS: Plugin[] = [debloat, decrypt, generator];

export type Plugin = (ctx: PluginContext) => Promise<void> | void;

export interface PluginContext {
  fs: Filesystem;
  fileBuffer: Buffer | undefined;
  options: Options;
}

export interface Options {
  input: string;
  output: string;
  binary?: string;
  key?: Buffer;
  plugins?: Plugin[];
}

export async function asarfix(options: Options): Promise<void> {
  const ctx = {
    fs: readFilesystemSync(options.input),
    fileBuffer: undefined,
    options,
  };

  for (const plugin of options.plugins ?? DEFAULT_PLUGINS) {
    await plugin(ctx);
  }
}
