import { readFilesystemSync } from "@electron/asar/lib/disk.js";
import { Filesystem } from "@electron/asar/lib/filesystem.js";
import Pickle from "chromium-pickle-js";
import { createWriteStream, renameSync } from "fs";
import { readFile } from "fs/promises";
import { debloatPatch } from "./debloat.js";
import { decryptFS } from "./encryption.js";

const headerSizeOffset = 8;

export class AsarFix {
  private fs: Filesystem;
  private key: Buffer | undefined;

  constructor(filePath: string, key?: Buffer) {
    this.fs = readFilesystemSync(filePath);
    this.key = key;
  }

  patch(): void {
    debloatPatch(this.fs);
  }

  async readKey(binaryPath: string) {
    const binary = await readFile(binaryPath);
    const keyIndex =
      binary.indexOf("This program has been changed by others.") - 32;
    this.key = binary.subarray(keyIndex, keyIndex + 32);
    console.log("Found AES key:", this.key.toString("hex"));
  }

  /**
   * Write modified asar archive to given absolute file path.
   */
  async write(outputPath: string): Promise<void> {
    const fileBuffer = this.key
      ? decryptFS(this.fs, this.key)
      : (await readFile(this.fs.getRootPath())).subarray(
          headerSizeOffset + this.fs.getHeaderSize()
        );

    // Convert header back to string
    const headerPickle = Pickle.createEmpty();
    headerPickle.writeString(JSON.stringify(this.fs.getHeader()));

    // Read new header size
    const headerBuffer = headerPickle.toBuffer();
    const sizePickle = Pickle.createEmpty();
    sizePickle.writeUInt32(headerBuffer.length);
    const sizeBuffer = sizePickle.toBuffer();

    // Write everything to output file :D
    const tmp = outputPath + ".tmp"; // create temp file bcs we can't read & write the same file at the same time
    const writeStream = createWriteStream(tmp, { flags: "w" });
    writeStream.write(sizeBuffer);
    writeStream.write(headerBuffer);
    writeStream.write(fileBuffer);
    writeStream.end();

    return new Promise((resolve, reject) => {
      writeStream.on("close", () => {
        renameSync(tmp, outputPath);
        resolve();
      });
      writeStream.on("error", reject);
    });
  }
}
