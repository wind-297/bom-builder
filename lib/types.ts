export interface ManualPrice {
  amount: number | null;
  currency: string;
  entrySource: 'user_input' | null;
  enteredAt?: string;
  note?: string;
}

export interface ProductLinkVerification {
  status: 'verified' | 'unverified' | 'dead' | 'invalid' | 'blocked';
  lastCheckedAt?: string;
  httpStatus?: number;
  reason?: string;
}

export interface BomItemAlternative {
  title: string;
  url: string;
  sourceDomain?: string;
  sourceName?: string;
  country?: 'VN' | 'INT';
  tier?: 1 | 2 | 3;
  supplierDomain?: string;
  supplierName?: string;
  supplierCountry?: 'VN' | 'INT';
  supplierTier?: 1 | 2 | 3;
  linkStatus?: 'verified' | 'unverified' | 'dead' | 'invalid' | 'blocked';
  matchType?: 'best_match' | 'most_reliable' | 'alternative';
  reason?: string;
  // Legacy optional price field for backward compatibility
  price?: number;
}

export interface SearchProduct {
  id: string;
  name: string;
  brand?: string;
  model?: string;
  category: string;
  description?: string;
  specifications?: Record<string, unknown>;
  imageUrl?: string;
  supplier: {
    name: string;
    domain: string;
    country: 'VN' | 'INT';
    type: string;
    tier?: 1 | 2 | 3;
  };
  productUrl: string;
  linkVerification: ProductLinkVerification;
  technicalMatch: {
    score: number;
    reasons: string[];
    warnings: string[];
    matchType?: 'best_match' | 'most_reliable' | 'alternative';
  };
}

export interface SearchLog {
  componentName: string;
  timestamp: string;
  shopeeQueries: string[];
  specializedQueries: string[];
  additionalQueries?: string[];
  rawShopeeCount: number;
  rawSpecializedCount: number;
  totalFilteredCount: number;
  shopeeFound: boolean;
  shopeeProductsRetained: number;
  specializedProductsRetained: number;
  statusNotes?: string;
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
  // Manual Pricing System
  manualPrice?: ManualPrice;
  // Link Verification & Source
  linkStatus?: 'verified' | 'unverified' | 'dead' | 'invalid' | 'blocked';
  supplierDomain?: string;
  supplierName?: string;
  supplierTier?: 1 | 2 | 3;
  supplierCountry?: 'VN' | 'INT';
  matchType?: 'best_match' | 'most_reliable' | 'alternative';
  searchLog?: SearchLog;
  // Architecture, Subsystem & Compatibility
  subsystem?: string;
  category?: string;
  priority?: 'essential' | 'recommended' | 'optional';
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
    manualPrice: {
      amount: null,
      currency: 'VND',
      entrySource: null,
    },
    linkStatus: 'unverified',
  };
}
