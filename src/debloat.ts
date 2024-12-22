import {
  Filesystem,
  FilesystemDirectoryEntry,
} from "@electron/asar/lib/filesystem.js";
import { statSync } from "node:fs";

const headerSizeOffset = 8;

export function debloatPatch(fs: Filesystem): void {
  const maxSize =
    statSync(fs.getRootPath()).size - fs.getHeaderSize() - headerSizeOffset;

  function removeInvalidFiles(dir: FilesystemDirectoryEntry) {
    for (const [name, entry] of Object.entries(dir.files)) {
      if (name.includes("/")) {
        console.log(`Removing ${name} (invalid path)`);
        delete dir.files[name];
      } else if ("files" in entry) {
        removeInvalidFiles(entry);
      } else if ("offset" in entry) {
        const offset = parseInt(String(entry.offset));
        const size = parseInt(String(entry.size));
        if (offset < 0 || size < 0 || offset + size > maxSize) {
          console.log(`Removing ${name} (offset: ${offset}, size: ${size})`);
          delete dir.files[name];
        }
      } else if (entry.unpacked) {
        console.log(`Removing ${name} (unpacked)`);
        delete dir.files[name];
      }
    }
  }

  removeInvalidFiles(fs.getHeader() as FilesystemDirectoryEntry);
}
