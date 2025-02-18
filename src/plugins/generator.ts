import Pickle from "chromium-pickle-js";
import { createWriteStream, renameSync } from "fs";
import { readFile } from "fs/promises";
import { PluginContext } from "../index.js";

const headerSizeOffset = 8;

export async function generator(ctx: PluginContext): Promise<void> {
  const fileBuffer =
    ctx.fileBuffer ??
    (await readFile(ctx.fs.getRootPath())).subarray(
      headerSizeOffset + ctx.fs.getHeaderSize()
    );

  // Convert header back to string
  const headerPickle = Pickle.createEmpty();
  headerPickle.writeString(JSON.stringify(ctx.fs.getHeader()));

  // Read new header size
  const headerBuffer = headerPickle.toBuffer();
  const sizePickle = Pickle.createEmpty();
  sizePickle.writeUInt32(headerBuffer.length);
  const sizeBuffer = sizePickle.toBuffer();

  // Write everything to output file :D
  const tmp = ctx.options.output + ".tmp"; // create temp file bcs we can't read & write the same file at the same time
  const writeStream = createWriteStream(tmp, { flags: "w" });
  writeStream.write(sizeBuffer);
  writeStream.write(headerBuffer);
  writeStream.write(fileBuffer);
  writeStream.end();

  return new Promise((resolve, reject) => {
    writeStream.on("close", () => {
      renameSync(tmp, ctx.options.output);
      resolve();
    });
    writeStream.on("error", reject);
  });
}
