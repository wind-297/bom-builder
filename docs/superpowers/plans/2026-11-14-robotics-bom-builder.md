# Robotics BOM Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Xây dựng web app Next.js cho CLB Robotics tự động lập Bill of Materials (BOM), phân rã linh kiện từ tên robot qua AI, tìm kiếm qua SearXNG, tối ưu chọn link mua hàng tốt nhất và xuất file Excel/CSV.

**Architecture:** Full-stack Next.js (App Router, TypeScript, Tailwind CSS). Toàn bộ tương tác với SearXNG và LLM API thực hiện tại Server Route Handlers (`/api/...`) để bảo mật API key và xử lý CORS. Phía client là bảng BOM tương tác, hỗ trợ 3 chế độ nhập liệu (tên robot, file Excel/CSV, nhập tay) và xuất file Excel.

**Tech Stack:** Next.js 15+ (App Router), React 19, TypeScript, Tailwind CSS, Lucide React, `xlsx` (SheetJS) cho Excel parsing/export, Vitest cho unit tests.

**Spec:** `docs/superpowers/specs/2026-11-14-robotics-bom-builder-design.md`

## Global Constraints

- Tech Stack: Next.js (App Router), TypeScript, Tailwind CSS.
- Môi trường: Node.js >= 18 trên Windows/Linux.
- SearXNG: Giao tiếp qua endpoint JSON (`/search?format=json`).
- LLM API: Chuẩn OpenAI Chat Completions compatible API (hỗ trợ OpenAI, Groq, OpenRouter, Gemini).
- Bảo mật: Tuyệt đối không để lộ API key phía client browser; lưu và đọc từ biến môi trường hoặc server session.
- Không dùng database phức tạp; lưu trữ trạng thái phiên trên client/localStorage và file xuất.

## Review Focus

1. **SearXNG API trả về mảng rỗng hoặc bị rate limit (HTTP 429/500)**: Hệ thống phải đánh dấu linh kiện đó là "Chưa tìm thấy", không làm đứt đoạn toàn bộ tiến trình quét các linh kiện khác.
2. **File Excel/CSV tải lên có cấu trúc cột dị biệt hoặc sai định dạng**: Parser phải tự động map tên cột thông minh (hỗ trợ cả tiếng Việt và tiếng Anh như "Tên", "Linh kiện", "Item", "SL", "Qty") và báo lỗi rõ ràng nếu file không hợp lệ.
3. **LLM API trả về chuỗi JSON không hợp lệ (malformed JSON) khi phân rã linh kiện**: Parser phải bóc tách markdown code block (` ```json ... ``` `), tự sửa lỗi format hoặc fallback về danh sách dự phòng có thông báo người dùng.
4. **Linh kiện không có giá hoặc giá nhiều đơn vị tiền tệ khác nhau (VND, USD)**: Trình tối ưu hóa phải chuẩn hóa đơn vị tiền tệ hoặc hiển thị nguyên bản kèm ghi chú, tránh cộng dồn sai tổng ngân sách.
5. **Số lượng linh kiện lớn (20+ món) làm tràn context hoặc timeout**: Cơ chế gọi SearXNG và LLM tối ưu phải xử lý theo batch hoặc tuần tự có thanh tiến trình (progress bar), không bắn 20 request đồng thời gây nghẽn mạng.

---

### Task 1: Project Scaffolding & Test Setup

**Files:**
- Create: `package.json`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.mjs`, `next.config.ts`, `vitest.config.ts`
- Create: `app/layout.tsx`, `app/page.tsx`, `app/globals.css`
- Test: `tests/setup.test.ts`

**Interfaces:**
- Produces: Môi trường Next.js khởi chạy được, cấu hình Tailwind CSS hoạt động, Vitest chạy test pass.

- [ ] **Step 1: Write the failing test**

```typescript
// tests/setup.test.ts
import { describe, it, expect } from 'vitest';

describe('Project Setup Verification', () => {
  it('should verify test environment is active and running', () => {
    const isReady = true;
    expect(isReady).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/setup.test.ts`
Expected: FAIL (chưa có vitest / node_modules).

- [ ] **Step 3: Setup Next.js, Tailwind, Vitest and Dependencies**

Khởi tạo cấu trúc dự án Next.js App Router với `package.json`, cài đặt dependencies cơ bản (`next`, `react`, `react-dom`, `lucide-react`, `xlsx`, `clsx`, `tailwind-merge`), devDependencies (`typescript`, `@types/node`, `@types/react`, `vitest`, `tailwindcss`, `postcss`, `autoprefixer`). Tạo file `app/layout.tsx`, `app/page.tsx`, `vitest.config.ts`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/setup.test.ts`
Expected: PASS (1 passed).

- [ ] **Step 5: Commit**

```bash
git add -A ; git commit -m "chore: setup next.js project with tailwind and vitest"
```

---

### Task 2: Core Data Types and Settings Configuration

**Files:**
- Create: `lib/types.ts`
- Create: `lib/config.ts`
- Create: `app/api/settings/route.ts`
- Test: `tests/config.test.ts`

**Interfaces:**
- Produces:
  - Types: `BomItem`, `BomSearchResult`, `AppSettings`, `DecomposeRequest`, `DecomposeResponse`, `OptimizeRequest`, `OptimizeResponse`
  - Function: `getAppSettings(): AppSettings`
  - Route: `GET /api/settings`, `POST /api/settings`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/config.test.ts
import { describe, it, expect } from 'vitest';
import { getAppSettings } from '../lib/config';

describe('AppSettings Configuration', () => {
  it('should return default settings with fallback values', () => {
    const settings = getAppSettings();
    expect(settings).toHaveProperty('searxngUrl');
    expect(settings).toHaveProperty('llmBaseUrl');
    expect(settings).toHaveProperty('llmModel');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/config.test.ts`
Expected: FAIL (Cannot find module `../lib/config`).

- [ ] **Step 3: Implement `lib/types.ts`, `lib/config.ts`, and `app/api/settings/route.ts`**

Định nghĩa kiểu dữ liệu `BomItem` (id, name, specification, quantity, unitPrice, totalPrice, currency, status, selectedLink, alternatives, note). Implement hàm `getAppSettings()` đọc từ `process.env` với fallback mặc định (`SEARXNG_URL`, `LLM_API_KEY`, `LLM_BASE_URL`, `LLM_MODEL`). Tạo route handler lưu và đọc config từ server runtime.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/config.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/types.ts lib/config.ts app/api/settings/route.ts tests/config.test.ts ; git commit -m "feat: add core types and settings configuration"
```

---

### Task 3: Excel & CSV Parser and Generator

**Files:**
- Create: `lib/excel.ts`
- Test: `tests/excel.test.ts`

**Interfaces:**
- Consumes: `BomItem` từ `lib/types.ts`
- Produces:
  - `parseBomFile(buffer: Buffer | ArrayBuffer, fileName: string): Promise<BomItem[]>`
  - `exportBomToExcel(items: BomItem[], projectName?: string): Buffer`
  - `exportBomToCsv(items: BomItem[]): string`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/excel.test.ts
import { describe, it, expect } from 'vitest';
import { exportBomToCsv, parseBomFile } from '../lib/excel';
import { BomItem } from '../lib/types';

describe('Excel/CSV Parser and Generator', () => {
  const sampleItems: BomItem[] = [
    {
      id: '1',
      name: 'Động cơ giảm tốc GA25',
      specification: '12V 300RPM',
      quantity: 4,
      unitPrice: 120000,
      totalPrice: 480000,
      currency: 'VND',
      status: 'found',
      selectedLink: 'https://hshop.vn/ga25',
      alternatives: [],
      note: 'Dùng cho bánh xe sau'
    }
  ];

  it('should export items to CSV and parse back correctly', async () => {
    const csvData = exportBomToCsv(sampleItems);
    expect(csvData).toContain('Động cơ giảm tốc GA25');
    expect(csvData).toContain('480000');

    const encoder = new TextEncoder();
    const buffer = encoder.encode(csvData).buffer;
    const parsed = await parseBomFile(buffer, 'test.csv');
    expect(parsed.length).toBe(1);
    expect(parsed[0].name).toBe('Động cơ giảm tốc GA25');
    expect(parsed[0].quantity).toBe(4);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/excel.test.ts`
Expected: FAIL (Cannot find module `../lib/excel`).

- [ ] **Step 3: Implement `lib/excel.ts`**

Sử dụng thư viện `xlsx` (SheetJS) để:
- Nhận diện cột linh hoạt: tìm kiếm các alias như `["tên", "linh kiện", "item", "name"]`, `["số lượng", "qty", "sl", "quantity"]`, `["thông số", "spec", "mô tả", "description"]`.
- `exportBomToExcel`: tạo file Excel định dạng đẹp với header, cột số lượng, đơn giá, link mua hàng.
- `exportBomToCsv`: xuất file CSV tiêu chuẩn UTF-8 có BOM để Excel tiếng Việt không bị lỗi font.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/excel.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/excel.ts tests/excel.test.ts ; git commit -m "feat: implement excel and csv parser and generator"
```

---

### Task 4: SearXNG Search Service

**Files:**
- Create: `lib/searxng.ts`
- Create: `app/api/search/route.ts`
- Test: `tests/searxng.test.ts`

**Interfaces:**
- Consumes: `getAppSettings` từ `lib/config.ts`
- Produces:
  - `searchSearxng(query: string, customUrl?: string): Promise<BomSearchResult[]>`
  - Route: `POST /api/search` nhận `{ query: string, itemName?: string }`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/searxng.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchSearxng } from '../lib/searxng';

describe('SearXNG Search Service', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should format search results correctly from SearXNG JSON response', async () => {
    const mockSearxResponse = {
      results: [
        {
          title: 'Động cơ giảm tốc V1 - Hshop.vn',
          url: 'https://hshop.vn/products/dong-co-v1',
          content: 'Giá: 25.000đ. Động cơ giảm tốc V1 bánh xe robot',
          engine: 'google'
        }
      ]
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockSearxResponse
    } as Response);

    const results = await searchSearxng('động cơ v1', 'http://localhost:8080');
    expect(results.length).toBe(1);
    expect(results[0].title).toContain('Động cơ giảm tốc V1');
    expect(results[0].url).toBe('https://hshop.vn/products/dong-co-v1');
  });

  it('should handle SearXNG network failure gracefully by returning empty array without throwing', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Connection refused'));
    const results = await searchSearxng('cảm biến', 'http://localhost:8080');
    expect(results).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/searxng.test.ts`
Expected: FAIL (Cannot find module `../lib/searxng`).

- [ ] **Step 3: Implement `lib/searxng.ts` and `app/api/search/route.ts`**

Xây dựng hàm gọi tới endpoint `/search?q=...&format=json&language=vi` của SearXNG. Bọc try/catch chống sập khi timeout hoặc lỗi kết nối. Route handler tiếp nhận request từ client và forward tới SearXNG.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/searxng.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/searxng.ts app/api/search/route.ts tests/searxng.test.ts ; git commit -m "feat: implement searxng search client and api route"
```

---

### Task 5: LLM Client & AI Prompt Engine for Bot Decomposition

**Files:**
- Create: `lib/llm.ts`
- Create: `app/api/decompose/route.ts`
- Test: `tests/decompose.test.ts`

**Interfaces:**
- Consumes: `getAppSettings` từ `lib/config.ts`
- Produces:
  - `decomposeRobotToBom(botDescription: string, apiKey?: string, baseUrl?: string, model?: string): Promise<Partial<BomItem>[]>`
  - Route: `POST /api/decompose` nhận `{ description: string }`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/decompose.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { decomposeRobotToBom } from '../lib/llm';

describe('LLM Robot BOM Decomposition', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should extract structured BOM items from robot description', async () => {
    const mockLlmResponse = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              items: [
                {
                  name: 'Vi điều khiển ESP32',
                  specification: 'ESP-WROOM-32 30 chân Type-C',
                  quantity: 1,
                  note: 'Bộ não xử lý chính'
                },
                {
                  name: 'Mạch điều khiển động cơ L298N',
                  specification: '2A dual H-bridge 5V-35V',
                  quantity: 1,
                  note: 'Điều khiển 2 động cơ'
                }
              ]
            })
          }
        }
      ]
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockLlmResponse
    } as Response);

    const items = await decomposeRobotToBom('Robot dò đường ESP32');
    expect(items.length).toBe(2);
    expect(items[0].name).toContain('ESP32');
    expect(items[1].quantity).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/decompose.test.ts`
Expected: FAIL (Cannot find module `../lib/llm`).

- [ ] **Step 3: Implement `lib/llm.ts` and `app/api/decompose/route.ts`**

Xây dựng client gọi OpenAI-compatible API với system prompt chuyên sâu về robotics (yêu cầu phân tích chi tiết: vi điều khiển, driver, động cơ, cảm biến, module nguồn/pin, khung/bánh xe). Bóc tách JSON chặt chẽ (xử lý trường hợp LLM bọc markdown codeblock).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/decompose.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/llm.ts app/api/decompose/route.ts tests/decompose.test.ts ; git commit -m "feat: implement llm bot decomposition engine"
```

---

### Task 6: AI Product Optimization & Link Selector

**Files:**
- Create: `lib/optimizer.ts`
- Create: `app/api/optimize/route.ts`
- Test: `tests/optimizer.test.ts`

**Interfaces:**
- Consumes: `BomItem`, `BomSearchResult`
- Produces:
  - `optimizeBomItemWithSearchResults(item: BomItem, searchResults: BomSearchResult[], apiKey?: string, baseUrl?: string, model?: string): Promise<BomItem>`
  - Route: `POST /api/optimize` nhận `{ item: BomItem, searchResults: BomSearchResult[] }`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/optimizer.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { optimizeBomItemWithSearchResults } from '../lib/optimizer';
import { BomItem, BomSearchResult } from '../lib/types';

describe('AI Product Optimizer', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should select best matching product link and extract unit price', async () => {
    const item: BomItem = {
      id: 'item-1',
      name: 'Động cơ servo MG996R',
      specification: 'Kim loại 180 độ 5V-7.2V',
      quantity: 2,
      unitPrice: 0,
      totalPrice: 0,
      currency: 'VND',
      status: 'pending',
      selectedLink: '',
      alternatives: [],
      note: ''
    };

    const results: BomSearchResult[] = [
      {
        title: 'Servo MG996R Nhông Kim Loại - Hshop.vn',
        url: 'https://hshop.vn/mg996r',
        content: 'Động cơ RC Servo MG996R nhông kim loại lực kéo khỏe. Giá bán: 85.000đ',
        engine: 'google'
      },
      {
        title: 'Kẹp càng cua cho robot servo',
        url: 'https://thegioiic.com/kep-cang-cua',
        content: 'Phụ kiện robot gắp. Giá: 120.000đ',
        engine: 'google'
      }
    ];

    const mockLlmDecision = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              selectedUrl: 'https://hshop.vn/mg996r',
              estimatedPrice: 85000,
              currency: 'VND',
              reason: 'Đúng chuẩn nhông kim loại MG996R, giá tốt từ shop uy tín',
              alternatives: []
            })
          }
        }
      ]
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockLlmDecision
    } as Response);

    const optimized = await optimizeBomItemWithSearchResults(item, results);
    expect(optimized.selectedLink).toBe('https://hshop.vn/mg996r');
    expect(optimized.unitPrice).toBe(85000);
    expect(optimized.totalPrice).toBe(170000);
    expect(optimized.status).toBe('found');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/optimizer.test.ts`
Expected: FAIL (Cannot find module `../lib/optimizer`).

- [ ] **Step 3: Implement `lib/optimizer.ts` and `app/api/optimize/route.ts`**

Xây dựng logic gửi danh sách kết quả tìm kiếm cùng thông số yêu cầu vào LLM để phân tích so sánh giá và thông số. Nếu không có kết quả tìm kiếm hoặc LLM trả về rỗng, fallback giữ nguyên item với status `not_found` mà không làm crash app.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/optimizer.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/optimizer.ts app/api/optimize/route.ts tests/optimizer.test.ts ; git commit -m "feat: implement ai product search result optimizer"
```

---

### Task 7: Interactive BOM Table UI Component

**Files:**
- Create: `components/BomTable.tsx`
- Create: `components/BomTableRow.tsx`
- Create: `components/SummaryCard.tsx`
- Test: `tests/table.test.ts`

**Interfaces:**
- Consumes: `BomItem` từ `lib/types.ts`
- Produces: Components hiển thị bảng BOM, cho phép sửa số lượng, đơn giá, link, xóa dòng, xem link dự phòng, tính tổng chi phí tự động.

- [ ] **Step 1: Write the failing test**

```typescript
// tests/table.test.ts
import { describe, it, expect } from 'vitest';
import { calculateBomSummary } from '../components/BomTable';
import { BomItem } from '../lib/types';

describe('BOM Table Calculation Logic', () => {
  it('should calculate total estimated budget and item counts correctly', () => {
    const items: BomItem[] = [
      {
        id: '1',
        name: 'Item 1',
        specification: '',
        quantity: 2,
        unitPrice: 50000,
        totalPrice: 100000,
        currency: 'VND',
        status: 'found',
        selectedLink: 'https://example.com/1',
        alternatives: [],
        note: ''
      },
      {
        id: '2',
        name: 'Item 2',
        specification: '',
        quantity: 1,
        unitPrice: 200000,
        totalPrice: 200000,
        currency: 'VND',
        status: 'pending',
        selectedLink: '',
        alternatives: [],
        note: ''
      }
    ];

    const summary = calculateBomSummary(items);
    expect(summary.totalItems).toBe(2);
    expect(summary.foundItems).toBe(1);
    expect(summary.totalEstimatedBudget).toBe(300000);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/table.test.ts`
Expected: FAIL (Cannot find module `../components/BomTable`).

- [ ] **Step 3: Implement `components/BomTable.tsx`, `components/BomTableRow.tsx`, `components/SummaryCard.tsx`**

Xây dựng giao diện bảng BOM:
- Cột: STT, Tên linh kiện, Thông số kỹ thuật, Số lượng, Đơn giá ước tính, Thành tiền, Trạng thái/Link mua, Thao tác (Sửa, Xóa, Tìm lại).
- Hỗ trợ sửa trực tiếp (inline editing) cho số lượng và đơn giá.
- Thẻ thống kê: Tổng số lượng món, Số món đã tìm thấy link, Tổng ngân sách dự toán (định dạng VND với dấu chấm ngăn cách hàng nghìn).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/table.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/BomTable.tsx components/BomTableRow.tsx components/SummaryCard.tsx tests/table.test.ts ; git commit -m "feat: implement interactive bom table components"
```

---

### Task 8: Input Modes & Workflow Integration (Bot Prompt & File Upload)

**Files:**
- Create: `components/InputBar.tsx`
- Create: `components/FileUploadZone.tsx`
- Create: `components/ManualItemModal.tsx`
- Modify: `app/page.tsx`
- Test: `tests/integration.test.ts`

**Interfaces:**
- Consumes: `decomposeRobotToBom`, `parseBomFile`, `searchSearxng`, `optimizeBomItemWithSearchResults`
- Produces: Trang chính kết nối cả 3 phương thức nhập liệu, tiến trình tìm kiếm tự động cho từng linh kiện.

- [ ] **Step 1: Write integration test**

```typescript
// tests/integration.test.ts
import { describe, it, expect } from 'vitest';
import { createNewBomItem } from '../lib/types';

describe('BOM Creation Helpers', () => {
  it('should initialize a fresh BomItem with default values and pending status', () => {
    const item = createNewBomItem('Bánh xe Mecanum 80mm', 'Trục lục giác', 4);
    expect(item.name).toBe('Bánh xe Mecanum 80mm');
    expect(item.quantity).toBe(4);
    expect(item.status).toBe('pending');
    expect(item.unitPrice).toBe(0);
    expect(item.totalPrice).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/integration.test.ts`
Expected: FAIL (`createNewBomItem` is not defined).

- [ ] **Step 3: Implement input components and orchestrate main workflow in `app/page.tsx`**

- `InputBar.tsx`: Ô nhập tên robot ("Robot thám hiểm cứu hộ địa hình", "Xe tự hành AGV") kèm nút "AI Phân Rã BOM". Có animation loading khi AI đang suy nghĩ.
- `FileUploadZone.tsx`: Kéo thả file Excel (`.xlsx`, `.xls`) hoặc CSV, đọc file bằng `parseBomFile` và đẩy dữ liệu vào danh sách.
- `ManualItemModal.tsx`: Form thêm nhanh linh kiện thủ công.
- `app/page.tsx`: Điều phối luồng xử lý:
  - Khi có danh sách BOM, có nút "Bắt đầu dò tìm link mua (SearXNG + AI)".
  - Chạy tuần tự/batch các linh kiện, cập nhật thanh tiến trình (progress bar `X / Y linh kiện`).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/integration.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/InputBar.tsx components/FileUploadZone.tsx components/ManualItemModal.tsx app/page.tsx lib/types.ts tests/integration.test.ts ; git commit -m "feat: integrate input modes and auto-search workflow"
```

---

### Task 9: Export Actions & Settings Modal

**Files:**
- Create: `components/SettingsModal.tsx`
- Create: `components/ExportDropdown.tsx`
- Modify: `app/page.tsx`
- Test: `tests/export.test.ts`

**Interfaces:**
- Consumes: `exportBomToExcel`, `exportBomToCsv`
- Produces: Nút tải file Excel/CSV về máy, modal cài đặt cấu hình URL SearXNG & LLM API Key.

- [ ] **Step 1: Write the failing test**

```typescript
// tests/export.test.ts
import { describe, it, expect } from 'vitest';
import { exportBomToExcel } from '../lib/excel';
import { BomItem } from '../lib/types';

describe('Excel Binary Export', () => {
  it('should generate valid excel buffer from bom list', () => {
    const items: BomItem[] = [
      {
        id: '1',
        name: 'Mạch nạp ST-Link V2',
        specification: 'Hỗ trợ STM32/STM8',
        quantity: 1,
        unitPrice: 45000,
        totalPrice: 45000,
        currency: 'VND',
        status: 'found',
        selectedLink: 'https://thegioiic.com/stlink',
        alternatives: [],
        note: ''
      }
    ];

    const buffer = exportBomToExcel(items, 'Robot Project');
    expect(buffer).toBeDefined();
    expect(buffer.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/export.test.ts`
Expected: FAIL (nếu hàm exportBomToExcel chưa hỗ trợ tạo binary buffer).

- [ ] **Step 3: Implement `components/SettingsModal.tsx` and `components/ExportDropdown.tsx`**

- `ExportDropdown.tsx`: Dropdown chọn "Xuất file Excel (.xlsx)" hoặc "Xuất file CSV (.csv)". Tự động đặt tên file kèm thời gian (`BOM_Robotics_<date>.xlsx`).
- `SettingsModal.tsx`: Modal cho phép cấu hình `SearXNG URL` (mặc định từ env hoặc nhập instance riêng), `LLM API Key`, `LLM Base URL`, `LLM Model`. Lưu vào `localStorage` hoặc server session để CLB tái sử dụng.
- Hoàn thiện UI header, badges trạng thái, dark/light theme style robotics.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/export.test.ts`
Expected: PASS.

- [ ] **Step 5: Run full test suite and build verification**

Run: `npx vitest run` và `npm run build`
Expected: Tất cả unit tests PASS, Next.js build thành công không lỗi type.

- [ ] **Step 6: Commit**

```bash
git add components/SettingsModal.tsx components/ExportDropdown.tsx app/page.tsx tests/export.test.ts ; git commit -m "feat: implement export actions, settings modal and finalize ui"
```
