declare module 'anki-apkg-export' {
  interface AddCardOptions {
    tags?: string;
  }

  class AnkiExport {
    constructor(deckName: string);
    addCard(front: string, back: string, options?: AddCardOptions): void;
    save(): Promise<Buffer>;
  }

  export = AnkiExport;
}
