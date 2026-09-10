import { z } from "zod";

export function maxUtf8Bytes(maxBytes: number) {
  return z.string().refine((value) => utf8ByteLength(value) <= maxBytes, {
    message: `String must contain at most ${maxBytes} UTF-8 bytes`,
  });
}

export function utf8ByteLength(value: string): number {
  let length = 0;

  for (let i = 0; i < value.length; i++) {
    const codePoint = value.codePointAt(i);

    if (codePoint === undefined) {
      break;
    }

    if (codePoint > 0xffff) {
      i++;
    }

    if (codePoint <= 0x7f) {
      length += 1;
    } else if (codePoint <= 0x7ff) {
      length += 2;
    } else if (codePoint <= 0xffff) {
      length += 3;
    } else {
      length += 4;
    }
  }

  return length;
}
