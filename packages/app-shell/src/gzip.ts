interface ReaderResult {
  readonly done: boolean;
  readonly value?: Uint8Array;
}

interface ByteReader {
  read(): Promise<ReaderResult>;
}

interface ByteWriter {
  write(chunk: Uint8Array): Promise<void>;
  close(): Promise<void>;
}

interface ByteStream {
  readonly readable: { getReader(): ByteReader };
  readonly writable: { getWriter(): ByteWriter };
}

interface TransformConstructor {
  new (format: string): ByteStream;
}

interface CompressionGlobals {
  CompressionStream?: TransformConstructor;
  DecompressionStream?: TransformConstructor;
}

function constructorFor(name: 'CompressionStream' | 'DecompressionStream'): TransformConstructor {
  const globals = globalThis as CompressionGlobals;
  const constructor = globals[name];
  if (constructor === undefined) {
    throw new Error(`${name} is not available on this platform`);
  }
  return constructor;
}

async function transform(
  bytes: Uint8Array,
  constructor: TransformConstructor,
): Promise<Uint8Array> {
  const stream = new constructor('gzip');
  const writer = stream.writable.getWriter();
  const writing = (async () => {
    await writer.write(bytes);
    await writer.close();
  })();

  const reader = stream.readable.getReader();
  const chunks: Uint8Array[] = [];
  for (;;) {
    const result = await reader.read();
    if (result.done) {
      break;
    }
    if (result.value !== undefined) {
      chunks.push(result.value);
    }
  }
  await writing;

  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const output = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.length;
  }
  return output;
}

export function gzip(bytes: Uint8Array): Promise<Uint8Array> {
  return transform(bytes, constructorFor('CompressionStream'));
}

export function gunzip(bytes: Uint8Array): Promise<Uint8Array> {
  return transform(bytes, constructorFor('DecompressionStream'));
}
