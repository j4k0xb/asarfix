export function getPESymbol(
  fileBuffer: Buffer,
  symbolName: string
): Buffer | undefined {
  const peHaderOffset = fileBuffer.readUInt32LE(0x3c);
}
