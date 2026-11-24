export type SourceCountry = 'VN' | 'INT';
export type SourceCategory = 'electronics_store' | 'marketplace' | 'robotics_supplier';
export type SourceTier = 1 | 2 | 3 | 4;

export interface SearchSource {
  id: string;
  domain: string;
  name: string;
  country: SourceCountry;
  category: SourceCategory;
  tier: SourceTier;
  enabled: boolean;
  supportedCategories: string[];
  defaultTrustScore: number; // 0-100
}

export const SEARCH_SOURCES: SearchSource[] = [
  // TIER 1 — Shopee Việt Nam (Nguồn ưu tiên số 1)
  {
    id: 'shopee',
    domain: 'shopee.vn',
    name: 'Shopee Việt Nam',
    country: 'VN',
    category: 'marketplace',
    tier: 1,
    enabled: true,
    supportedCategories: ['mcu', 'sensor', 'motor', 'driver', 'power', 'mechanical', 'wiring', 'robotics'],
    defaultTrustScore: 100,
  },

  // TIER 2 — Vietnamese Electronics & Robotics Stores
  {
    id: 'lkcg',
    domain: 'lkcg.vn',
    name: 'Linh kiện Cầu Giấy',
    country: 'VN',
    category: 'electronics_store',
    tier: 2,
    enabled: true,
    supportedCategories: ['mcu', 'sensor', 'motor', 'driver', 'power', 'mechanical', 'wiring', 'ic'],
    defaultTrustScore: 90,
  },
  {
    id: 'hshop',
    domain: 'hshop.vn',
    name: 'Hshop',
    country: 'VN',
    category: 'robotics_supplier',
    tier: 2,
    enabled: true,
    supportedCategories: ['mcu', 'sensor', 'motor', 'driver', 'power', 'mechanical', 'wiring', 'robotics'],
    defaultTrustScore: 92,
  },
  {
    id: 'nshop',
    domain: 'nshopvn.com',
    name: 'NShop',
    country: 'VN',
    category: 'electronics_store',
    tier: 2,
    enabled: true,
    supportedCategories: ['mcu', 'sensor', 'motor', 'driver', 'power', 'mechanical', 'wiring'],
    defaultTrustScore: 90,
  },
  {
    id: 'banlinhkien',
    domain: 'banlinhkien.com',
    name: 'Banlinhkien',
    country: 'VN',
    category: 'electronics_store',
    tier: 2,
    enabled: true,
    supportedCategories: ['mcu', 'sensor', 'motor', 'driver', 'power', 'mechanical', 'wiring', 'ic'],
    defaultTrustScore: 88,
  },
  {
    id: 'cungcaplinhkien',
    domain: 'cungcaplinhkien.vn',
    name: 'Linh kiện điện tử A to Z',
    country: 'VN',
    category: 'electronics_store',
    tier: 2,
    enabled: true,
    supportedCategories: ['mcu', 'sensor', 'motor', 'driver', 'power', 'ic'],
    defaultTrustScore: 85,
  },

  // TIER 3 — Other Vietnamese E-commerce Marketplaces
  {
    id: 'lazada',
    domain: 'lazada.vn',
    name: 'Lazada Việt Nam',
    country: 'VN',
    category: 'marketplace',
    tier: 3,
    enabled: true,
    supportedCategories: ['mcu', 'sensor', 'motor', 'driver', 'power', 'mechanical', 'wiring', 'robotics'],
    defaultTrustScore: 75,
  },
  {
    id: 'tiki',
    domain: 'tiki.vn',
    name: 'Tiki Việt Nam',
    country: 'VN',
    category: 'marketplace',
    tier: 3,
    enabled: true,
    supportedCategories: ['mcu', 'sensor', 'power', 'electronics'],
    defaultTrustScore: 75,
  },

  // TIER 4 — International Electronics & Robotics Suppliers (Fallback only)
  {
    id: 'digikey',
    domain: 'digikey.com',
    name: 'DigiKey',
    country: 'INT',
    category: 'electronics_store',
    tier: 4,
    enabled: true,
    supportedCategories: ['ic', 'mcu', 'sensor', 'driver', 'power'],
    defaultTrustScore: 96,
  },
  {
    id: 'digikey-vn',
    domain: 'digikey.vn',
    name: 'DigiKey Vietnam',
    country: 'INT',
    category: 'electronics_store',
    tier: 4,
    enabled: true,
    supportedCategories: ['ic', 'mcu', 'sensor', 'driver', 'power'],
    defaultTrustScore: 96,
  },
  {
    id: 'mouser',
    domain: 'mouser.com',
    name: 'Mouser Electronics',
    country: 'INT',
    category: 'electronics_store',
    tier: 4,
    enabled: true,
    supportedCategories: ['ic', 'mcu', 'sensor', 'driver', 'power'],
    defaultTrustScore: 95,
  },
  {
    id: 'pololu',
    domain: 'pololu.com',
    name: 'Pololu Robotics',
    country: 'INT',
    category: 'robotics_supplier',
    tier: 4,
    enabled: true,
    supportedCategories: ['robotics', 'motor', 'driver', 'mechanical', 'sensor'],
    defaultTrustScore: 95,
  },
  {
    id: 'lcsc',
    domain: 'lcsc.com',
    name: 'LCSC Electronics',
    country: 'INT',
    category: 'electronics_store',
    tier: 4,
    enabled: true,
    supportedCategories: ['ic', 'mcu', 'power', 'driver'],
    defaultTrustScore: 92,
  },
  {
    id: 'dfrobot',
    domain: 'dfrobot.com',
    name: 'DFRobot',
    country: 'INT',
    category: 'robotics_supplier',
    tier: 4,
    enabled: true,
    supportedCategories: ['robotics', 'sensor', 'mcu', 'motor', 'mechanical'],
    defaultTrustScore: 93,
  },
  {
    id: 'adafruit',
    domain: 'adafruit.com',
    name: 'Adafruit',
    country: 'INT',
    category: 'robotics_supplier',
    tier: 4,
    enabled: true,
    supportedCategories: ['mcu', 'sensor', 'maker', 'robotics'],
    defaultTrustScore: 94,
  },
  {
    id: 'sparkfun',
    domain: 'sparkfun.com',
    name: 'SparkFun',
    country: 'INT',
    category: 'robotics_supplier',
    tier: 4,
    enabled: true,
    supportedCategories: ['mcu', 'sensor', 'maker', 'robotics'],
    defaultTrustScore: 94,
  },
  {
    id: 'robotshop',
    domain: 'robotshop.com',
    name: 'RobotShop',
    country: 'INT',
    category: 'robotics_supplier',
    tier: 4,
    enabled: true,
    supportedCategories: ['robotics', 'motor', 'mechanical', 'driver'],
    defaultTrustScore: 92,
  },
  {
    id: 'tme',
    domain: 'tme.eu',
    name: 'TME Electronic Components',
    country: 'INT',
    category: 'electronics_store',
    tier: 4,
    enabled: true,
    supportedCategories: ['ic', 'mcu', 'sensor', 'power', 'wiring'],
    defaultTrustScore: 92,
  },
];

export function normalizeHostname(hostname: string): string {
  return hostname.toLowerCase().replace(/^www\./, '').trim();
}

export function getEnabledSources(tier?: SourceTier): SearchSource[] {
  return SEARCH_SOURCES.filter((s) => s.enabled && (tier === undefined || s.tier === tier));
}

export function findSourceByDomain(hostname: string): SearchSource | null {
  const clean = normalizeHostname(hostname);
  if (!clean) return null;
  for (const source of SEARCH_SOURCES) {
    if (!source.enabled) continue;
    const d = normalizeHostname(source.domain);
    if (clean === d || clean.endsWith('.' + d)) {
      return source;
    }
  }
  return null;
}

function quickUnwrapUrl(urlStr: string): string {
  if (!urlStr) return '';
  try {
    const parsed = new URL(urlStr);
    const redirectKeys = ['q', 'url', 'u', 'target', 'redir', 'dest', 'uddg'];
    for (const key of redirectKeys) {
      const val = parsed.searchParams.get(key);
      if (val) {
        let decoded = val;
        try {
          decoded = decodeURIComponent(val);
        } catch {
          // ignore
        }
        if (decoded.startsWith('http://') || decoded.startsWith('https://')) {
          return quickUnwrapUrl(decoded);
        }
      }
    }
    return urlStr;
  } catch {
    return urlStr;
  }
}

export function findSourceByUrl(urlStr: string): SearchSource | null {
  if (!urlStr || typeof urlStr !== 'string') return null;
  try {
    const unwrapped = quickUnwrapUrl(urlStr);
    const parsed = new URL(unwrapped);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    return findSourceByDomain(parsed.hostname);
  } catch {
    return null;
  }
}

export function isAllowedSourceUrl(urlStr: string): boolean {
  return findSourceByUrl(urlStr) !== null;
}

export function getSourcesForCategory(category: string, tier?: SourceTier): SearchSource[] {
  const lower = (category || '').toLowerCase();
  const candidates = getEnabledSources(tier);
  if (!lower) return candidates;

  const matched = candidates.filter((s) =>
    s.supportedCategories.some((c) => lower.includes(c) || c.includes(lower))
  );
  return matched.length > 0 ? matched : candidates;
}
