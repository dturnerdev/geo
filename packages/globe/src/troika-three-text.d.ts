// troika-three-text ships declarations but no package `types` field; only the
// surface used by the globe is declared here.
declare module 'troika-three-text' {
  export class Text {
    text: string;
    anchorX: number | string;
    anchorY: number | string;
    fontSize: number;
    color: unknown;
    sync(callback?: () => void): void;
    dispose(): void;
  }
}
