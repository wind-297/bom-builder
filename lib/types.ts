import { ProductPrice } from './price';

export interface BomItemAlternative {
  title: string;
  url: string;
  price?: number;
  priceInfo?: ProductPrice;
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
  // Enhanced attributes for architecture, compatibility and price verification
  subsystem?: string;
  category?: string;
  priority?: 'essential' | 'recommended' | 'optional';
  priceInfo?: ProductPrice;
  compatibilityStatus?: 'compatible' | 'conditional' | 'incompatible' | 'unknown';
  compatibilityNote?: string;
  alreadyOwned?: boolean;
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

export function createNewBomItem(
  name: string,
  specification: string = '',
  quantity: number = 1
): BomItem {
  const qty = typeof quantity === 'number' && !isNaN(quantity) && quantity > 0 ? quantity : 1;
  const id =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : Math.random().toString(36).substring(2, 11);

  return {
    id,
    name: (name || '').trim(),
    specification: (specification || '').trim(),
    quantity: qty,
    unitPrice: 0,
    totalPrice: 0,
    currency: 'VND',
    status: 'pending',
    selectedLink: '',
    alternatives: [],
    note: '',
  };
}

