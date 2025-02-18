import { readCString } from "./index.js";

const HEADER_SIZE = 32; // Size of Mach-O header for 64-bit files
const LC_SYMTAB_COMMAND = 0x2;

export function getMachOSymbol(
  fileBuffer: Buffer,
  symbolName: string
): Buffer | undefined {
  let symtabOffset: number | undefined;
  let symtabSize: number | undefined;
  let strtabOffset: number | undefined;

  // Iterate load commands
  let offset = HEADER_SIZE;
  const ncmds = fileBuffer.readUInt32LE(16);
  for (let i = 0; i < ncmds; i++) {
    const cmd = fileBuffer.readUInt32LE(offset);
    const cmdsize = fileBuffer.readUInt32LE(offset + 4);

    if (cmd === LC_SYMTAB_COMMAND) {
      symtabOffset = fileBuffer.readUInt32LE(offset + 8);
      symtabSize = fileBuffer.readUInt32LE(offset + 12);
      strtabOffset = fileBuffer.readUInt32LE(offset + 16);
      break;
    }

    offset += cmdsize;
  }

  if (!symtabOffset || !symtabSize || !strtabOffset) {
    console.warn("Symbol table or string table not found.");
    return;
  }

  // Locate symbol in symtab
  let symbolAddress = null;
  for (let i = 0; i < symtabSize; i++) {
    const symOffset = symtabOffset + i * 16;
    const strx = fileBuffer.readUInt32LE(symOffset);
    const name = readCString(fileBuffer, strtabOffset + strx);

    if (name === symbolName) {
      symbolAddress = Number(fileBuffer.readBigUint64LE(symOffset + 8));
      break;
    }
  }

  if (!symbolAddress) {
    console.warn(`Symbol '${symbolName}' not found.`);
    return;
  }

  return fileBuffer.subarray(symbolAddress, symbolAddress + 32);
}
