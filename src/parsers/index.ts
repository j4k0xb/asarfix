import { getELFSymbol } from "./elf.js";
import { getMachOSymbol } from "./mach-o.js";

const MAGIC_MACHO_64 = 0xfeedfacf;
const MAGIC_ELF = 0x464c457f;
const DOS_SIGNATURE = 0x5a4d;

export function extractKey(binary: Buffer): Buffer | undefined {
  const magic = binary.readUint32LE();

  if (magic === MAGIC_MACHO_64) {
    return getMachOSymbol(binary, "__ZZN12_GLOBAL__N_16GetKeyEvE3key");
  } else if (magic === MAGIC_ELF) {
    return getELFSymbol(binary, "_ZZN12_GLOBAL__N_16GetKeyEvE3key");
  } else if ((magic & 0xffff) === DOS_SIGNATURE) {
    console.log("DOS executable detected. Skipping...");
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
