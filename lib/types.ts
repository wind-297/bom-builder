export interface BomItemAlternative {
  title: string;
  url: string;
  price?: number;
  reason?: string;
}

export interface BomItem {
  id: string;
  name: string;
  specification: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  currency: string;
  status: 'pending' | 'searching' | 'found' | 'not_found';
  selectedLink: string;
  alternatives: BomItemAlternative[];
  note: string;
}

export interface BomSearchResult {
  title: string;
  url: string;
  content: string;
  engine?: string;
  price?: number;
}

export interface AppSettings {
  searxngUrl: string;
  llmApiKey: string;
  llmBaseUrl: string;
  llmModel: string;
}

export interface DecomposeRequest {
  description: string;
}

export interface DecomposeResponse {
  items: Partial<BomItem>[];
  error?: string;
}

export interface OptimizeRequest {
  item: BomItem;
  searchResults: BomSearchResult[];
}

export interface OptimizeResponse {
  item: BomItem;
  error?: string;
}
