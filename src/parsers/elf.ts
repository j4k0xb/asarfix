import { readCString } from "./index.js";

export function getELFSymbol(
  fileBuffer: Buffer,
  symbolName: string
): Buffer | undefined {
  const is64Bit = fileBuffer[4] === 2;
  if (!is64Bit) {
    console.warn("32-bit ELF is not supported yet.");
    return;
  }

  const sectionHeaderOffset = fileBuffer.readUInt32LE(0x28);
  const sectionHeaderSize = fileBuffer.readUInt16LE(0x3a);
  const sectionHeaderEntries = fileBuffer.readUInt16LE(0x3c);
  const shstrndx = fileBuffer.readUInt16LE(0x3e);

  // Read section header string table
  const shstrtabOffset = Number(
    fileBuffer.readBigUInt64LE(
      sectionHeaderOffset + shstrndx * sectionHeaderSize + 0x18
    )
  );
  const shstrtabSize = Number(
    fileBuffer.readBigUInt64LE(
      sectionHeaderOffset + shstrndx * sectionHeaderSize + 0x20
    )
  );
  const shstrtab = fileBuffer.subarray(
    shstrtabOffset,
    shstrtabOffset + shstrtabSize
  );

  let symtabOffset: number | undefined;
  let symtabSize: number | undefined;
  let strtabOffset: number | undefined;
  let strtabSize: number | undefined;

  for (let i = 0; i < sectionHeaderEntries; i++) {
    const offset = sectionHeaderOffset + i * sectionHeaderSize;
    const shOffset = Number(fileBuffer.readBigUInt64LE(offset + 0x18));
    const shSize = Number(fileBuffer.readBigUInt64LE(offset + 0x20));
    const shNameOffset = fileBuffer.readUInt32LE(offset);

    const sectionName = readCString(shstrtab, shNameOffset);

    if (sectionName === ".strtab") {
      strtabOffset = shOffset;
      strtabSize = shSize;
    } else if (sectionName === ".symtab") {
      symtabOffset = shOffset;
      symtabSize = shSize;
    }
  }

  if (
    symtabOffset === undefined ||
    symtabSize === undefined ||
    strtabOffset === undefined ||
    strtabSize === undefined
  ) {
    console.warn("Symbol table or string table not found.");
    return;
  }

  for (let i = 0; i < symtabSize; i += 24) {
    const offset = symtabOffset + i;
    const stName = fileBuffer.readUInt32LE(offset);
    const stValue = Number(fileBuffer.readBigUInt64LE(offset + 8));

    const name = readCString(fileBuffer, strtabOffset + stName);

    if (name === symbolName) {
      return fileBuffer.subarray(stValue, stValue + 32);
    }
  }

  console.warn(`Symbol '${symbolName}' not found.`);
}
