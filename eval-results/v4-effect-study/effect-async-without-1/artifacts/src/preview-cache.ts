export interface Preview {
  readonly documentId: string;
  readonly html: string;
  readonly revision: number;
}

export type PreviewLoader = (documentId: string) => Promise<Preview>;

export interface PreviewReader {
  get(documentId: string): Promise<Preview>;
}

export class PreviewCache implements PreviewReader {
  private readonly values = new Map<string, Preview>();
  private readonly pending = new Map<string, Promise<Preview>>();

  constructor(private readonly load: PreviewLoader) {}

  get(documentId: string): Promise<Preview> {
    const cached = this.values.get(documentId);
    if (cached !== undefined) {
      return Promise.resolve(cached);
    }

    const inFlight = this.pending.get(documentId);
    if (inFlight !== undefined) {
      return inFlight;
    }

    const request = Promise.resolve().then(() => this.load(documentId)).then(
      (preview) => {
        if (this.pending.get(documentId) === request) {
          this.values.set(documentId, preview);
          this.pending.delete(documentId);
        }
        return preview;
      },
      (error: unknown) => {
        if (this.pending.get(documentId) === request) {
          this.pending.delete(documentId);
        }
        throw error;
      },
    );
    this.pending.set(documentId, request);
    return request;
  }

  invalidate(documentId: string): void {
    this.values.delete(documentId);
    this.pending.delete(documentId);
  }

  clear(): void {
    this.values.clear();
    this.pending.clear();
  }
}

export async function renderDocument(
  reader: PreviewReader,
  documentId: string,
): Promise<string> {
  const preview = await reader.get(documentId);
  return preview.html;
}
