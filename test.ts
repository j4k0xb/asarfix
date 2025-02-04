import { createDecipheriv } from "crypto";
import { readFileSync } from "fs";

function decryptAES(entry: Buffer, key: Buffer): Buffer {
  entry = Buffer.from(entry.toString(), "base64");
  const iv = entry.subarray(0, 16);
  const content = entry.subarray(16);
  const decipher = createDecipheriv("aes-256-cbc", key, iv);
  const decrypted = decipher.update(content);
  return Buffer.concat([decrypted, decipher.final()]);
}

function parseMachO(filePath, symbolName) {
  const machoHeaderSize = 32; // Size of Mach-O header for 64-bit files
  const symtabCommand = 0x2; // LC_SYMTAB
  const segmentLoad64Command = 0x19; // LC_SEGMENT_64

  const fileBuffer = readFileSync(filePath);

  // Read header
  const magic = fileBuffer.readUInt32LE(0);
  const is64Bit = magic === 0xfeedfacf;
  if (!is64Bit) {
    throw new Error("Only 64-bit Mach-O files are supported.");
  }

  const ncmds = fileBuffer.readUInt32LE(16); // Read number of commands

  let symtabOffset = null;
  let symtabSize = null;
  let strtabOffset = null;

  // Iterate load commands
  let offset = machoHeaderSize;
  for (let i = 0; i < ncmds; i++) {
    const cmd = fileBuffer.readUInt32LE(offset);
    const cmdsize = fileBuffer.readUInt32LE(offset + 4);
    console.log(cmd);

    if (cmd === symtabCommand) {
      console.log("Found symtab command");

      // Found symtab command
      const symoff = fileBuffer.readUInt32LE(offset + 8);
      const nsyms = fileBuffer.readUInt32LE(offset + 12);
      const stroff = fileBuffer.readUInt32LE(offset + 16);

      symtabOffset = symoff;
      symtabSize = nsyms;
      strtabOffset = stroff;
      break;
    }

    offset += cmdsize;
  }

  if (!symtabOffset || !strtabOffset) {
    throw new Error("Symbol or string table not found in the Mach-O file.");
  }

  // Locate symbol in symtab
  let symbolAddress = null;
  for (let i = 0; i < symtabSize; i++) {
    const symOffset = symtabOffset + i * 16; // Each symbol table entry is 16 bytes in 64-bit files
    const strx = fileBuffer.readUInt32LE(symOffset);
    const name = readCString(fileBuffer, strtabOffset + strx);

    if (name === symbolName) {
      symbolAddress = Number(fileBuffer.readBigUint64LE(symOffset + 8)); // Symbol value is offset 8 bytes into entry
      break;
    }
  }

  if (!symbolAddress) {
    throw new Error(`Symbol '${symbolName}' not found.`);
  }

  // Extract 32 bytes of data
  const data = fileBuffer.slice(symbolAddress, symbolAddress + 32);
  console.log(`Data at symbol '${symbolName}':`, data);
  return data;
}

function readCString(buffer, offset) {
  let str = "";
  for (let i = offset; i < buffer.length; i++) {
    const char = buffer[i];
    if (char === 0) break;
    str += String.fromCharCode(char);
  }
  return str;
}

console.log(
  parseMachO(
    "/home/jakob/Downloads/Bambu Connect (Beta)/Bambu Connect (Beta).app/Contents/Resources/app.asar.unpacked/.vite/build/main.node",
    "__ZZN12_GLOBAL__N_16GetKeyEvE3key"
  )
);

const binary = readFileSync(
  "/home/jakob/Downloads/Bambu Connect Windows/resources/app.asar.unpacked/.vite/build/main.node"
);

// for (let i = 0; i < binary.length - 36; i += 2) {
//   if ((binary[i] | binary[i + 1] | binary[i + 34] | binary[i + 35]) === 0) {
//     const key = binary.subarray(i + 2, i + 34);
//     try {
//       const decrypted = decryptAES(binary, key);
//       console.log(decrypted.toString());
//     } catch (error) {}
//   }
// }
