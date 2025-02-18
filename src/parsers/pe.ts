const MAGIC_PE = 0x00004550; // "PE\0\0"

export function getPESection(fileBuffer: Buffer): Buffer | undefined {
  const coffOffset = fileBuffer.readUInt32LE(0x3c);
  const optionalHeaderSize = fileBuffer.readUInt16LE(coffOffset + 0x14);

  const coffHeader = fileBuffer.subarray(
    coffOffset,
    coffOffset + 0x18 + optionalHeaderSize
  );

  const magic = coffHeader.readUInt32LE(0);
  if (magic !== MAGIC_PE) {
    console.warn("Not a PE file");
    return;
  }

  const numberOfSections = coffHeader.readUInt16LE(6);
  const sectionTable = fileBuffer.subarray(
    coffOffset + coffHeader.length,
    coffOffset + coffHeader.length + 40 * numberOfSections
  );

  for (let i = 0; i < numberOfSections; i++) {
    const sectionHeader = sectionTable.subarray(i * 40, (i + 1) * 40);
    const sectionName = sectionHeader.toString("utf8", 0, 8).replace(/\0/g, "");

    if (sectionName === ".rdata") {
      const sizeOfRawData = sectionHeader.readUInt32LE(16);
      const pointerToRawData = sectionHeader.readUInt32LE(20);

      // Extract the .rdata buffer
      return fileBuffer.subarray(
        pointerToRawData,
        pointerToRawData + sizeOfRawData
      );
    }
  }

  console.warn(".rdata section not found.");
}
