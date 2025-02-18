import { extractAll } from "@electron/asar";
import * as asarmor from "asarmor";
import { spawnSync } from "node:child_process";
import { readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, onTestFinished, test } from "vitest";
import { asarfix } from "../src";

const ASARMOR_BINARY_PATH = require.resolve("asarmor/build/main.node");
const APP_ASAR_PATH = resolve("test", "app.asar");

async function validateExtractedFiles(dir: string) {
  const files = await readdir(dir);
  const a = await readFile(join(dir, "a.js"), "utf-8");
  const b = await readFile(join(dir, "b.js"), "utf-8");

  expect(files).toEqual(["a.js", "b.js"]);
  expect(a).toBe(`const b = require("./b");\nconsole.log(b);\n`);
  expect(b).toBe(`module.exports = "b module";\n`);
}

describe("asarmor", () => {
  test("bloat", async () => {
    const bloatPath = resolve(tmpdir(), "asarmor-bloat.asar");
    const debloatedPath = resolve(tmpdir(), "asarmor-debloated.asar");
    const extractedPath = resolve(tmpdir(), "asarmor-bloat-extracted");

    onTestFinished(async () => {
      await rm(bloatPath, { force: true, recursive: true });
      await rm(debloatedPath, { force: true, recursive: true });
      await rm(extractedPath, { force: true, recursive: true });
    });

    const archive = await asarmor.open(APP_ASAR_PATH);
    archive.patch(asarmor.createBloatPatch(1));
    await archive.write(bloatPath);

    await asarfix({ input: bloatPath, output: debloatedPath });
    extractAll(debloatedPath, extractedPath);

    await validateExtractedFiles(extractedPath);
  });

  test("encryption", async () => {
    const encryptedPath = resolve(tmpdir(), "asarmor-encrypted.asar");
    const decryptedPath = resolve(tmpdir(), "asarmor-decrypted.asar");
    const extractedPath = resolve(tmpdir(), "asarmor-encryption-extracted");

    onTestFinished(async () => {
      await rm(encryptedPath, { force: true, recursive: true });
      await rm(decryptedPath, { force: true, recursive: true });
      await rm(extractedPath, { force: true, recursive: true });
    });

    await asarmor.encrypt({ src: APP_ASAR_PATH, dst: encryptedPath });

    await asarfix({
      input: encryptedPath,
      output: decryptedPath,
      binary: ASARMOR_BINARY_PATH,
    });
    extractAll(decryptedPath, extractedPath);

    await validateExtractedFiles(extractedPath);
  });
});

describe("asarbreak", () => {
  test("duplicate + break-windows + invalid-entries", async () => {
    const outPath = resolve(tmpdir(), "asarbreak.asar");
    const fixedPath = resolve(tmpdir(), "asarbreak-fixed.asar");
    const extractedPath = resolve(tmpdir(), "asarbreak-extracted");

    onTestFinished(async () => {
      await rm(outPath, { force: true, recursive: true });
      await rm(fixedPath, { force: true, recursive: true });
      await rm(extractedPath, { force: true, recursive: true });
    });

    spawnSync("node_modules/.bin/asarbreak", [
      "--duplicate",
      "--break-windows",
      "--no-backup",
      "--no-delete",
      "--output",
      outPath,
      APP_ASAR_PATH,
    ]);

    await asarfix({ input: outPath, output: fixedPath });
    extractAll(fixedPath, extractedPath);

    await validateExtractedFiles(extractedPath);
  });
});
