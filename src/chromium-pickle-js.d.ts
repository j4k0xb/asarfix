declare module "chromium-pickle-js" {
  function createEmpty(): Pickle;
  function createFromBuffer(buffer: Buffer): Pickle;

  interface Pickle {
    initEmpty(): void;
    initFromBuffer(buffer: Buffer): void;
    createIterator(): PickleIterator;
    toBuffer(): Buffer;
    writeBool(value: boolean): boolean;
    writeInt(value: number): boolean;
    writeUInt32(value: number): boolean;
    writeInt64(value: number): boolean;
    writeUInt64(value: number): boolean;
    writeFloat(value: number): boolean;
    writeDouble(value: number): boolean;
    writeString(value: string): boolean;
    setPayloadSize(payloadSize: number): boolean;
    getPayloadSize(): number;
    writeBytes(
      data: Buffer | string,
      length: number,
      method?: (header: Buffer, data: Buffer, offset: number) => void
    ): boolean;
    resize(newCapacity: number): void;
  }

  interface PickleIterator {
    readBool(): boolean;
    readInt(): number;
    readUInt32(): number;
    readInt64(): number;
    readUInt64(): number;
    readFloat(): number;
    readDouble(): number;
    readString(): string;
    readBytes(
      length: number,
      method?: (payload: Buffer, offset: number, length: number) => Buffer
    ): Buffer;
    getReadPayloadOffsetAndAdvance(length: number): number;
    advance(size: number): void;
  }
}
