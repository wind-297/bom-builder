import { describe, it, expect } from 'vitest';
import {
  extractPriceFromSnippet,
  extractPriceFromHtml,
  normalizePrice,
  ProductPrice,
  formatPriceDisplay,
} from '../lib/price';

describe('Price Extraction Engine', () => {
  describe('Method A: Search Snippet Extraction', () => {
    it('should correctly parse standard Vietnamese currency formats', () => {
      expect(extractPriceFromSnippet('Động cơ giảm tốc GA25 giá 150.000đ chính hãng')?.amount).toBe(150000);
      expect(extractPriceFromSnippet('Bán động cơ GA25 giá 150,000 VND bảo hành 6 tháng')?.amount).toBe(150000);
      expect(extractPriceFromSnippet('ESP32 NodeMCU giá chỉ 150.000 VNĐ tại TP.HCM')?.amount).toBe(150000);
      expect(extractPriceFromSnippet('Cảm biến siêu âm ₫150.000 giao nhanh')?.amount).toBe(150000);
      expect(extractPriceFromSnippet('Pin Li-ion 18650 giá 150k dung lượng cao')?.amount).toBe(150000);
      expect(extractPriceFromSnippet('Giá: 150.000 đồng cho 1 mạch sạc')?.amount).toBe(150000);
    });

    it('should handle price ranges and mark as range status', () => {
      const result = extractPriceFromSnippet('Động cơ DC 12V giá từ 150.000 – 180.000 đồng');
      expect(result).not.toBeNull();
      expect(result?.status).toBe('range');
      expect(result?.minAmount).toBe(150000);
      expect(result?.maxAmount).toBe(180000);
      expect(result?.amount).toBe(150000); // lowest as reference
    });

    it('should handle "150k - 200k" price range', () => {
      const result = extractPriceFromSnippet('Mạch điều khiển 150k - 200k tùy phiên bản');
      expect(result).not.toBeNull();
      expect(result?.status).toBe('range');
      expect(result?.minAmount).toBe(150000);
      expect(result?.maxAmount).toBe(200000);
    });

    it('should NOT confuse technical specifications with prices', () => {
      // 12V, 100W, 2A, 65mm must NOT be extracted as 12, 100, 2, or 65
      const text = 'Động cơ DC giảm tốc 12V công suất 100W dòng 2A đường kính trục 65mm';
      const result = extractPriceFromSnippet(text);
      expect(result).toBeNull();
    });

    it('should extract the real price even when technical specs (12V, 2A) are in the same text', () => {
      const text = 'Động cơ bước 12V 2A bước 1.8 độ, giá bán: 85.000đ';
      const result = extractPriceFromSnippet(text);
      expect(result?.amount).toBe(85000);
      expect(result?.amount).not.toBe(12);
      expect(result?.amount).not.toBe(2);
    });

    it('should handle package/bundle quantity if indicated in text', () => {
      const text = 'Gói 10 cái ốc vít M3 giá 20.000đ';
      const result = extractPriceFromSnippet(text);
      expect(result?.amount).toBe(20000);
      expect(result?.priceType).toBe('bundle');
      expect(result?.quantityPerPackage).toBe(10);
    });

    it('should return null when no price is mentioned', () => {
      expect(extractPriceFromSnippet('Hướng dẫn chế tạo robot dò line tự hành sử dụng Arduino')).toBeNull();
      expect(extractPriceFromSnippet('')).toBeNull();
    });
  });

  describe('Method B: Structured Data Extraction (JSON-LD & Meta)', () => {
    it('should extract price from schema.org JSON-LD Offer', () => {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <script type="application/ld+json">
          {
            "@context": "https://schema.org/",
            "@type": "Product",
            "name": "Động cơ giảm tốc GA25 12V",
            "offers": {
              "@type": "Offer",
              "priceCurrency": "VND",
              "price": "135000",
              "availability": "https://schema.org/InStock"
            }
          }
          </script>
        </head>
        <body></body>
        </html>
      `;
      const result = extractPriceFromHtml(html, 'https://hshop.vn/products/dong-co-ga25', 'Động cơ GA25');
      expect(result).not.toBeNull();
      expect(result?.amount).toBe(135000);
      expect(result?.currency).toBe('VND');
      expect(result?.status).toBe('verified');
    });

    it('should extract price from OpenGraph meta tags', () => {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta property="og:title" content="Mạch Arduino Uno R3" />
          <meta property="product:price:amount" content="95000" />
          <meta property="product:price:currency" content="VND" />
        </head>
        <body></body>
        </html>
      `;
      const result = extractPriceFromHtml(html, 'https://thegioiic.com/products/arduino-uno-r3', 'Arduino Uno');
      expect(result?.amount).toBe(95000);
      expect(result?.currency).toBe('VND');
      expect(result?.status).toBe('verified');
    });

    it('should extract price from Microdata itemprop="price"', () => {
      const html = `
        <div itemscope itemtype="http://schema.org/Product">
          <span itemprop="name">Driver L298N</span>
          <span itemprop="price" content="35000">35.000 ₫</span>
          <meta itemprop="priceCurrency" content="VND" />
        </div>
      `;
      const result = extractPriceFromHtml(html, 'https://nshopvn.com/l298n', 'Driver L298N');
      expect(result?.amount).toBe(35000);
      expect(result?.status).toBe('verified');
    });
  });

  describe('Method C & Fallback: Price Normalization & Status', () => {
    it('should normalize missing price to unavailable status without creating fake 0 VND', () => {
      const result = normalizePrice(null);
      expect(result.status).toBe('unavailable');
      expect(result.amount).toBeNull();
    });

    it('should format unavailable price with user friendly message', () => {
      const unavailablePrice: ProductPrice = {
        amount: null,
        currency: 'VND',
        status: 'unavailable',
      };
      expect(formatPriceDisplay(unavailablePrice)).toBe('Chưa lấy được giá — Xem tại nhà cung cấp');
    });

    it('should format range price properly', () => {
      const rangePrice: ProductPrice = {
        amount: 150000,
        minAmount: 150000,
        maxAmount: 180000,
        currency: 'VND',
        status: 'range',
      };
      expect(formatPriceDisplay(rangePrice)).toBe('150.000 - 180.000 ₫');
    });

    it('should format verified single price properly', () => {
      const singlePrice: ProductPrice = {
        amount: 85000,
        currency: 'VND',
        status: 'verified',
      };
      expect(formatPriceDisplay(singlePrice)).toBe('85.000 ₫');
    });
  });
});
