import { decryptAES } from "../plugins/decrypt.js";
import { getELFSymbol } from "./elf.js";
import { getMachOSymbol } from "./mach-o.js";
import { getPESection } from "./pe.js";

const MAGIC_MACHO_64 = 0xfeedfacf;
const MAGIC_ELF = 0x464c457f;
const MAGIC_DOS = 0x5a4d;

export function extractKey(
  binary: Buffer,
  encryptedBuffers: Buffer[] = []
): Buffer | undefined {
  const magic = binary.readUint32LE();

  if (magic === MAGIC_MACHO_64) {
    return getMachOSymbol(binary, "__ZZN12_GLOBAL__N_16GetKeyEvE3key");
  } else if (magic === MAGIC_ELF) {
    return getELFSymbol(binary, "_ZZN12_GLOBAL__N_16GetKeyEvE3key");
  } else if ((magic & 0xffff) === MAGIC_DOS) {
    const section = getPESection(binary);
    if (section) {
      console.log("PE binary detected. Brute-forcing AES key candidates...");
      for (let i = 0; i < section.length - 32; i += 8) {
        const key = section.subarray(i, i + 32);
        try {
          const decrypted = encryptedBuffers.map((buffer) =>
            decryptAES(buffer, key)
          );
          console.log(
            `Key candidate (${i / 8}/${section.length / 8}):`,
            key.toString("hex"),
            decrypted.map((buffer) => buffer.toString("utf8").slice(0, 32))
          );
        } catch {}
      }
    }
  } else {
    console.warn(
      `Unknown binary format ${magic.toString(16).padStart(8, "0")}.`
    );
  }
}

export function readCString(buffer: Buffer, offset: number): string {
  let str = "";
  for (let i = offset; i < buffer.length; i++) {
    const char = buffer[i];
    if (char === 0) break;
    str += String.fromCharCode(char);
  }
  return str;
}
