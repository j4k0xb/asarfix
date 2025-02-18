import * as disk from "@electron/asar/lib/disk.js";
import {
  Filesystem,
  FilesystemFileEntry,
} from "@electron/asar/lib/filesystem.js";
import { createDecipheriv } from "crypto";
import { readFileSync, statSync } from "fs";
import { extname, join } from "path";
import { PluginContext } from "../index.js";
import { extractKey } from "../parsers/index.js";

export function decrypt(ctx: PluginContext): void {
  const entries = getEntries(ctx.fs);
  const encryptedEntries = entries.filter((entry) => entry.isEncrypted);
  if (encryptedEntries.length === 0) {
    console.log("No encrypted entries found.");
    return;
  }

  console.log(
    "Asar contains encrypted entries:",
    encryptedEntries.map((entry) => entry.path)
  );

  let key = ctx.options.key;
  if (!key) {
    const asarmorBinary = getAsarmorBinary(ctx);
    if (!asarmorBinary) {
      console.warn(
        "main.node binary not found. Please provide the path with the -b argument, or provide the key with the -k argument."
      );
      return;
    }
    key = extractKey(
      asarmorBinary,
      encryptedEntries.map((entry) => entry.buffer)
    );
  }

  if (key) {
    console.log("Using AES key:", key.toString("hex"));
    ctx.fileBuffer = decryptFS(ctx.fs, entries, key);
  } else {
    console.warn(
      "Failed to find the AES key. Please provide it via the -k argument."
    );
  }
}

function getAsarmorBinary(ctx: PluginContext) {
  if (ctx.options.binary) {
    return readFileSync(ctx.options.binary);
  }

  const ASARMOR_BINARIES = [".vite/build/main.node", "dist/main.node"];
  for (const path of ASARMOR_BINARIES) {
    try {
      return readFileSync(join(ctx.fs.getRootPath() + ".unpacked", path));
    } catch {}
  }
}

function decryptFS(fs: Filesystem, entries: Entry[], key: Buffer): Buffer {
  const maxSize = statSync(fs.getRootPath()).size - fs.getHeaderSize() - 8;
  const files = Buffer.alloc(maxSize);

  for (const entry of entries) {
    try {
      if (entry.isEncrypted) {
        const decrypted = decryptAES(entry.buffer, key);
        decrypted.copy(files, Number(entry.entry.offset));
        entry.entry.size = decrypted.length;
        continue;
      }
    } catch {
      console.warn("Failed to decrypt", entry.path);
    }
    entry.buffer.copy(files, Number(entry.entry.offset));
  }

  return files;
}

export function decryptAES(buffer: Buffer, key: Buffer): Buffer {
  const decoded = Buffer.from(buffer.toString(), "base64");
  const iv = decoded.subarray(0, 16);
  const content = decoded.subarray(16);
  const decipher = createDecipheriv("aes-256-cbc", key, iv);
  const decrypted = decipher.update(content);
  return Buffer.concat([decrypted, decipher.final()]);
}

interface Entry {
  path: string;
  entry: FilesystemFileEntry;
  buffer: Buffer;
  isEncrypted: boolean;
}

function getEntries(fs: Filesystem): Entry[] {
  const entries: Entry[] = [];

  for (const path of fs.listFiles()) {
    const fullPath = join(fs.getRootPath(), path);
    const entry = fs.searchNodeFromPath(fullPath);
    if ("offset" in entry) {
      const buffer = disk.readFileSync(fs, path, entry);
      entries.push({
        path,
        entry,
        buffer,
        isEncrypted: isEncrypted(path, buffer),
      });
    }
  }
  return entries;
}

function isEncrypted(path: string, buffer: Buffer): boolean {
  const base64Regex = /^[A-Za-z0-9+/]+={0,2}$/;
  return extname(path) === ".js" && base64Regex.test(buffer.toString());
}
