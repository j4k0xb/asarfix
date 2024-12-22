#!/usr/bin/env node

import { program } from "commander";
import { AsarFix } from "./asarfix";

interface Options {
  output: string;
  binary?: string;
  key?: Buffer;
}

program
  .requiredOption("-o, --output <output>", "output asar file")
  .option("-b, --binary <binary>", "path to main.node, used for decryption")
  .option("-k, --key <key>", "use AES key (hex) for decryption", parseKey)
  .argument("<archive>", "input asar file")
  .action(async (archive: string, options: Options) => {
    const asarfix = new AsarFix(archive, options.key);
    asarfix.patch();
    if (options.binary) {
      await asarfix.readKey(options.binary);
    }
    await asarfix.write(options.output);
  })
  .parse(process.argv);

function parseKey(value: string) {
  if (value.length === 64) {
    return Buffer.from(value, "hex");
  } else if (value.length === 159) {
    return Buffer.from(value.split(",").map((x) => parseInt(x, 16)));
  } else {
    throw new Error("Invalid key format");
  }
}
