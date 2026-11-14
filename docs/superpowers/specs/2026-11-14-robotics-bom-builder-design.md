# Robotics BOM Builder - Design Document

## 1. Intent and Why
Câu lạc bộ Robotics cần công cụ lập Bill of Materials (BOM) nhanh chóng và tối ưu. Thay vì phải thủ công tìm kiếm linh kiện trên nhiều trang web (Hshop, Thegioiic, Shopee, Taobao, LCSC...) và so sánh giá, hệ thống sẽ tự động hóa:
- Từ tên/ý tưởng robot (ví dụ: "Robot dò line tốc độ cao", "Robot gắp bóng mini"), AI tự động phân rã cấu trúc linh kiện (BOM) cần thiết.
- Tự động tạo truy vấn tìm kiếm chuyên sâu và tìm kiếm qua SearXNG (tận dụng công cụ tìm kiếm meta).
- AI phân tích kết quả tìm kiếm, so sánh thông số kỹ thuật, giá thành, độ tin cậy để đề xuất link mua hàng tối ưu nhất kèm danh sách linh kiện dự phòng/thay thế.
- Hỗ trợ tải lên danh sách linh kiện có sẵn qua Excel/CSV hoặc nhập từng món thủ công, cho phép chỉnh sửa trực tiếp và xuất file Excel hoàn chỉnh để CLB duyệt mua.

## 2. Goals, Non-Goals, and Anti-Goals

### Goals
- **3 chế độ đầu vào**:
  1. Nhập tên/mô tả robot: AI phân tích yêu cầu kỹ thuật và sinh BOM dự kiến (động cơ, driver, vi điều khiển, cảm biến, nguồn, khung cơ khí).
  2. Tải lên file Excel (`.xlsx`, `.xls`) hoặc CSV danh mục linh kiện có sẵn.
  3. Nhập/chỉnh sửa từng linh kiện thủ công trên giao diện.
- **Tích hợp SearXNG**: Gửi query tìm kiếm đa nguồn, lấy danh sách link, tiêu đề, snippet và giá tham khảo.
- **Tối ưu hóa bởi AI (LLM)**:
  - Đánh giá độ khớp kỹ thuật (spec match), giá thành và nguồn bán uy tín.
  - Chọn link mua tốt nhất (primary link) và đề xuất 1-2 link dự phòng (alternatives).
- **Quản lý BOM tương tác**:
  - Bảng hiển thị: Tên linh kiện, quy cách/thông số, số lượng, đơn giá, thành tiền, link mua tối ưu, ghi chú.
  - Cho phép người dùng sửa đổi, thêm/xóa dòng, chọn link thay thế.
  - Tự động tính tổng ngân sách ước tính.
- **Xuất dữ liệu**: Xuất bảng BOM hoàn thiện ra file Excel (`.xlsx`) và CSV tiêu chuẩn.
- **Cấu hình linh hoạt**: Hỗ trợ cấu hình URL SearXNG và API Key của LLM (OpenAI-compatible như OpenAI, Gemini, Groq, OpenRouter) qua biến môi trường (`.env`) hoặc giao diện cài đặt.

### Non-Goals
- Không thực hiện đặt hàng tự động (auto-checkout) hay thanh toán trực tiếp trên sàn TMĐT.
- Không xây dựng hệ thống quản lý tài khoản người dùng nhiều tầng (multi-tenant SaaS) phức tạp; app hướng tới chạy nội bộ cho CLB (local server hoặc Docker private).
- Không quản lý tồn kho kho vật lý thời gian thực của CLB.

### Anti-Goals
- Không để lộ API key của LLM hoặc cấu hình SearXNG ra phía client (trình duyệt).
- Không ép buộc phụ thuộc vào database nặng (PostgreSQL/MySQL); ưu tiên lưu trữ phiên làm việc nhẹ nhàng (session/in-memory/localStorage) để dễ triển khai và bảo trì.

## 3. Constraints
- **Môi trường**: Chạy được trên môi trường Node.js (Windows, Linux, Docker).
- **Tech Stack**: Next.js (App Router), TypeScript, Tailwind CSS.
- **SearXNG**: Kết nối tới instance SearXNG có sẵn (nội bộ hoặc công khai) qua REST API dạng JSON (`/search?format=json`).
- **LLM API**: Tương thích định dạng OpenAI Chat Completions API (hỗ trợ OpenAI, Groq, DeepSeek, OpenRouter, Google Gemini qua OpenAI compatibility layer).

## 4. Approaches Considered

### Approach 1 (Selected): Full-stack Next.js (App Router, TypeScript, Tailwind CSS)
- **Kiến trúc**: 1 dự án duy nhất. UI (React) và API routes (`app/api/...`) cùng nằm trong Next.js.
- **Lý do chọn**:
  - Gọn gàng, dễ bảo trì, chỉ cần 1 lệnh `npm run dev` hoặc 1 container Docker.
  - Toàn bộ gọi API ra ngoài (SearXNG, LLM) chạy ở Server Route Handler, bảo vệ an toàn API key và xử lý CORS tự nhiên.
  - Hệ sinh thái thư viện parse Excel (`xlsx`/`papaparse`) trên Node.js/browser hoàn chỉnh.

### Approach 2: FastAPI (Python) + React (Vite)
- **Kiến trúc**: Tách rời Backend (FastAPI) và Frontend (Vite).
- **Đánh đổi**: Tốn công quản lý 2 repo/subfolder, 2 môi trường runtime (Python venv + Node.js), phải cấu hình CORS và proxy. Quá cồng kềnh cho nhu cầu nội bộ CLB.

### Approach 3: Frontend-only Static React
- **Kiến trúc**: Toàn bộ logic chạy trên trình duyệt người dùng.
- **Đánh đổi**: Bắt buộc SearXNG phải cấu hình CORS mở; người dùng phải nhập API key trực tiếp trên web gây nguy cơ lộ lọt key nếu dùng máy tính chung ở phòng lab CLB.

## 5. System Architecture & Workflows

### 5.1 Architecture Diagram
```
[ User Browser (Next.js React UI) ]
   ├── Input: Bot Concept / File Upload / Manual Rows
   ├── Interactive BOM Table (Edit, Review, Select Alternative)
   └── Export: Excel/CSV Download
                │  HTTP POST (Internal API)
                ▼
[ Next.js Server Route Handlers ]
   ├── /api/decompose : Nhận tên robot -> Gọi LLM phân rã thành danh sách BOM (JSON)
   ├── /api/search     : Nhận tên linh kiện -> Gọi SearXNG API -> Lấy kết quả web/shop
   ├── /api/optimize   : Gửi kết quả tìm kiếm + spec vào LLM -> Chọn link tối ưu & parse giá
   └── /api/settings   : Kiểm tra kết nối SearXNG / LLM
                │
        ┌───────┴────────────────────────┐
        ▼                                ▼
[ SearXNG Instance ]            [ External LLM API ]
(Web/Shop search results)        (OpenAI/Groq/Gemini API)
```

### 5.2 Key Workflows

#### Workflow A: Tự động phân rã từ tên Robot
1. Người dùng nhập: "Robot cứu hỏa tự hành dò đường tránh vật cản".
2. Next.js backend gọi LLM với system prompt chuyên sâu về robotics để xuất danh sách linh kiện chuẩn JSON (Tên linh kiện, vai trò, thông số kỹ thuật khuyến nghị, số lượng dự tính).
3. Hiển thị danh sách trích xuất lên bảng để người dùng rà soát/sửa đổi trước khi bắt đầu quét tìm kiếm.

#### Workflow B: Tải file Excel/CSV
1. Người dùng kéo thả file `.xlsx` hoặc `.csv`.
2. Parser đọc file, chuẩn hóa các cột: Tên linh kiện, Quy cách/Mô tả, Số lượng, Ghi chú.
3. Đổ dữ liệu vào bảng BOM tương tác.

#### Workflow C: Tìm kiếm và Tối ưu hóa linh kiện (BOM Enrichment)
1. Với từng linh kiện, backend tạo query tối ưu hóa (kèm từ khóa robot, linh kiện điện tử, tên shop uy tín).
2. Gọi SearXNG JSON API (`format=json`, category `general` hoặc cấu hình thêm engines mua sắm).
3. LLM duyệt danh sách kết quả (title, snippet, url), đánh giá:
   - Có đúng thông số kỹ thuật không?
   - Mức giá hiển thị (VND/USD).
   - Độ uy tín của tên miền / shop (Hshop, Thegioiic, DienTuTuHu, Shopee Mall, LCSC...).
4. Trả về cho client:
   - Link mua tối ưu nhất (best match) + Giá + Tên shop.
   - 1-2 link thay thế (alternatives).
   - Đánh dấu trạng thái: Đã tìm thấy / Cần người dùng kiểm tra thủ công.

#### Workflow D: Xuất báo cáo BOM
1. Người dùng click "Xuất Excel" hoặc "Xuất CSV".
2. Client/Server tạo file Excel định dạng bảng biểu chuẩn (STT, Tên linh kiện, Thông số, Số lượng, Đơn giá ước tính, Thành tiền, Link mua hàng, Ghi chú).
3. Tải về máy người dùng.

## 6. What's Left to the Builder
- Thiết kế giao diện chi tiết (Dark/Light mode phong cách Robotics CLB, hiện đại, clean UI bằng Tailwind CSS).
- Chi tiết system prompt cho việc phân rã BOM và lọc kết quả tìm kiếm SearXNG.
- Cơ chế queue hoặc rate-limit tìm kiếm (tránh gửi dồn dập hàng chục request đồng thời khiến SearXNG hoặc LLM bị 429).
- Bộ parser Excel linh hoạt nhận diện các tên cột phổ biến (ví dụ: "Tên", "Linh kiện", "Item", "Số lượng", "Qty", "SL"...).
