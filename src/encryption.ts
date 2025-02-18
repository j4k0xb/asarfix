import { readFileSync } from "@electron/asar/lib/disk.js";
import { Filesystem } from "@electron/asar/lib/filesystem.js";
import { createDecipheriv } from "crypto";
import { statSync } from "fs";
import { extname, join } from "path";

function decryptAES(entry: Buffer, key: Buffer): Buffer {
  const decoded = Buffer.from(entry.toString(), "base64");
  const iv = decoded.subarray(0, 16);
  const content = decoded.subarray(16);
  const decipher = createDecipheriv("aes-256-cbc", key, iv);
  const decrypted = decipher.update(content);
  return Buffer.concat([decrypted, decipher.final()]);
}

export function decryptFS(fs: Filesystem, key: Buffer): Buffer {
  const maxSize = statSync(fs.getRootPath()).size - fs.getHeaderSize() - 8;
  const files = Buffer.alloc(maxSize);

  for (const path of fs.listFiles()) {
    const fullPath = join(fs.getRootPath(), path);
    const entry = fs.searchNodeFromPath(fullPath);
    if ("offset" in entry) {
      const buffer = readFileSync(fs, path, entry);
      if (isEncrypted(path, buffer)) {
        console.log("Decrypting", path);

        try {
          const decrypted = decryptAES(buffer, key);
          decrypted.copy(files, Number(entry.offset));
          entry.size = decrypted.length;
        } catch (error) {
          console.warn("Failed to decrypt", path);
          buffer.copy(files, Number(entry.offset));
        }
      } else {
        buffer.copy(files, Number(entry.offset));
      }
    }
  }

  return files;
}

const base64Regex = /^[A-Za-z0-9+/]+={0,2}$/;

function isEncrypted(path: string, entry: Buffer): boolean {
  return extname(path) === ".js" && base64Regex.test(entry.toString());
}
