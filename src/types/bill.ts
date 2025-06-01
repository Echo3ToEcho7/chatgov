export interface BillContent {
  billId: string;
  fullText: string;
  chunks: BillChunk[];
  embeddings: number[][];
  lastUpdated: Date;
}

export interface BillChunk {
  id: string;
  text: string;
  startIndex: number;
  endIndex: number;
  section?: string;
  subsection?: string;
}

export interface SearchResult {
  chunk: BillChunk;
  similarity: number;
}