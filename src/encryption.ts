import { readFileSync } from "@electron/asar/lib/disk.js";
import { Filesystem } from "@electron/asar/lib/filesystem.js";
import { createDecipheriv } from "crypto";
import { statSync } from "fs";
import { extname, join } from "path";

function decryptAES(entry: Buffer, key: Buffer): Buffer {
  entry = Buffer.from(entry.toString(), "base64");
  const iv = entry.subarray(0, 16);
  const content = entry.subarray(16);
  const decipher = createDecipheriv("aes-256-cbc", key, iv);
  const decrypted = decipher.update(content);
  return Buffer.concat([decrypted, decipher.final()]);
}

function isEncrypted(path: string): boolean {
  return extname(path) === ".js";
}

export function decryptFS(fs: Filesystem, key: Buffer): Buffer {
  const maxSize = statSync(fs.getRootPath()).size - fs.getHeaderSize() - 8;
  const files = Buffer.alloc(maxSize);

  for (const path of fs.listFiles()) {
    const fullPath = join(fs.getRootPath(), path);
    const entry = fs.searchNodeFromPath(fullPath);
    if ("offset" in entry) {
      const buffer = readFileSync(fs, path, entry);
      if (isEncrypted(path)) {
        console.log("Decrypting", path);

        try {
          const decrypted = decryptAES(buffer, key);
          decrypted.copy(files, Number(entry.offset));
          entry.size = decrypted.length;
        } catch (error) {
          console.log("Failed to decrypt", path);
          buffer.copy(files, Number(entry.offset));
        }
      } else {
        buffer.copy(files, Number(entry.offset));
      }
    }
  }

  return files;
}
