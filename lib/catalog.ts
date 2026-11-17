import { BomSearchResult } from './types';

export interface CatalogProduct {
  keywords: string[];
  title: string;
  url: string;
  price: number;
  snippet: string;
  subsystem: string;
  source: string;
  alternatives?: { title: string; url: string; price: number; source: string }[];
}

export const ROBOTICS_PRODUCT_CATALOG: CatalogProduct[] = [
  // 1. VI ĐIỀU KHIỂN & MÁY TÍNH NHÚNG
  {
    keywords: ['esp32', 'nodemcu', 'esp-32', 'esp 32'],
    title: 'Kit RF Thu Phát WiFi BLE ESP32 NodeMCU Lua CP2102',
    url: 'https://hshop.vn/products/kit-rf-thu-phat-wifi-ble-esp32-nodemcu-lua-cp2102',
    price: 95000,
    snippet: 'Kit RF Thu Phát WiFi BLE ESP32 NodeMCU Lua CP2102 giá 95.000₫. Vi điều khiển 32-bit lõi kép 240MHz, tích hợp Wi-Fi 802.11 b/g/n và Bluetooth 4.2 BLE.',
    subsystem: 'Hệ thống điều khiển',
    source: 'Hshop.vn',
    alternatives: [
      {
        title: 'Board ESP32 NodeMCU CP2102 Type-C Nshop',
        url: 'https://nshopvn.com/product/kit-rf-thu-phat-wifi-ble-esp32-nodemcu-lua-cp2102-type-c/',
        price: 98000,
        source: 'Nshopvn.com',
      },
      {
        title: 'Mạch ESP32 ESP-WROOM-32 Thế Giới IC',
        url: 'https://thegioiic.com/products/kit-esp32-devkitc-v4-ch340',
        price: 92000,
        source: 'Thegioiic.com',
      },
    ],
  },
  {
    keywords: ['arduino uno', 'uno r3', 'atmega328p', 'arduino'],
    title: 'Kit Arduino Uno R3 DIP Kèm Cáp (Chíp Rời)',
    url: 'https://hshop.vn/products/arduino-uno-r3-dip-kem-capchip-roi',
    price: 135000,
    snippet: 'Kit Arduino Uno R3 DIP kèm cáp giá 135.000₫. Vi điều khiển ATmega328P 16MHz, nạp qua chip nạp ATmega16U2 độ ổn định cao.',
    subsystem: 'Hệ thống điều khiển',
    source: 'Hshop.vn',
    alternatives: [
      {
        title: 'Mạch Arduino Uno R3 CH340G kèm cáp',
        url: 'https://nshopvn.com/product/mach-arduino-uno-r3-ch340g-kem-cap/',
        price: 95000,
        source: 'Nshopvn.com',
      },
      {
        title: 'Arduino Uno R3 Chính Hãng DIP Thegioiic',
        url: 'https://thegioiic.com/products/arduino-uno-r3-dip',
        price: 145000,
        source: 'Thegioiic.com',
      },
    ],
  },
  {
    keywords: ['arduino nano', 'nano v3', 'nano r3'],
    title: 'Kit Arduino Nano V3.0 CH340G Kèm Cáp',
    url: 'https://hshop.vn/products/kit-arduino-nano-v3-0-ch340g-kem-cap',
    price: 65000,
    snippet: 'Kit Arduino Nano V3.0 CH340G kèm cáp giá 65.000₫. Kích thước nhỏ gọn, vi điều khiển ATmega328P 16MHz phù hợp cho xe và robot mini.',
    subsystem: 'Hệ thống điều khiển',
    source: 'Hshop.vn',
    alternatives: [
      {
        title: 'Mạch Arduino Nano V3.0 Type-C Nshop',
        url: 'https://nshopvn.com/product/kit-arduino-nano-v3-0-type-c-ch340/',
        price: 70000,
        source: 'Nshopvn.com',
      },
    ],
  },
  {
    keywords: ['stm32', 'blue pill', 'stm32f103'],
    title: 'Kit STM32F103C8T6 Blue Pill ARM Cortex-M3',
    url: 'https://hshop.vn/products/kit-stm32f103c8t6-blue-pill',
    price: 65000,
    snippet: 'Kit STM32F103C8T6 Blue Pill ARM Cortex-M3 72MHz 64KB Flash giá 65.000₫. Tốc độ cao chuyên dụng cho điều khiển PID động cơ và cân bằng robot.',
    subsystem: 'Hệ thống điều khiển',
    source: 'Hshop.vn',
  },
  {
    keywords: ['raspberry pi', 'pi 4', 'raspberry pi 4'],
    title: 'Máy Tính Nhúng Raspberry Pi 4 Model B (4GB RAM)',
    url: 'https://hshop.vn/products/may-tinh-nhung-raspberry-pi-4-model-b-4gb-ram',
    price: 1650000,
    snippet: 'Máy tính nhúng Raspberry Pi 4 Model B 4GB RAM giá 1.650.000₫. Xử lý thị giác máy tính OpenCV, camera và AI cho robot tự hành.',
    subsystem: 'Hệ thống điều khiển',
    source: 'Hshop.vn',
  },

  // 2. CẢM BIẾN (SENSORS)
  {
    keywords: ['cảm biến dò line', 'dò line', 'tcrt5000', 'line sensor', 'bám vạch'],
    title: 'Mạch Cảm Biến Dò Line 5 Kênh TCRT5000 Line Tracker',
    url: 'https://hshop.vn/products/mach-cam-bien-do-line-5-kenh-tcrt5000',
    price: 45000,
    snippet: 'Mạch cảm biến dò line 5 kênh TCRT5000 giá 45.000₫. Phát hiện vạch đen trắng độ nhạy cao, ngõ ra số Digital dễ đọc với Arduino và ESP32.',
    subsystem: 'Hệ thống cảm biến',
    source: 'Hshop.vn',
    alternatives: [
      {
        title: 'Cảm biến dò đường 4 kênh TCRT5000 Nshop',
        url: 'https://nshopvn.com/product/cam-bien-do-line-4-kenh-tcrt5000/',
        price: 40000,
        source: 'Nshopvn.com',
      },
      {
        title: 'Module Dò Line 5 Kênh BF350 Thế Giới IC',
        url: 'https://thegioiic.com/products/module-cam-bien-do-line-5-kenh',
        price: 48000,
        source: 'Thegioiic.com',
      },
    ],
  },
  {
    keywords: ['siêu âm', 'hc-sr04', 'khoảng cách', 'tránh vật cản', 'ultrasonic'],
    title: 'Cảm Biến Siêu Âm Ultrasonic Ranging Module HC-SR04',
    url: 'https://hshop.vn/products/cam-bien-sieu-am-ultrasonic-ranging-module-hc-sr04',
    price: 25000,
    snippet: 'Cảm biến siêu âm HC-SR04 giá 25.000₫. Đo khoảng cách vật cản 2cm - 400cm, góc quét 15 độ, tương thích vi điều khiển 5V.',
    subsystem: 'Hệ thống cảm biến',
    source: 'Hshop.vn',
    alternatives: [
      {
        title: 'Gá đỡ mica cảm biến siêu âm HC-SR04',
        url: 'https://hshop.vn/products/ga-do-cam-bien-sieu-am-hc-sr04',
        price: 8000,
        source: 'Hshop.vn',
      },
    ],
  },
  {
    keywords: ['cảm biến lửa', 'phát hiện lửa', 'flame', 'cứu hỏa'],
    title: 'Module Cảm Biến Phát Hiện Lửa (Flame Sensor)',
    url: 'https://hshop.vn/products/cam-bien-lua-flame-sensor',
    price: 18000,
    snippet: 'Module cảm biến lửa Flame Sensor giá 18.000₫. Phát hiện bước sóng lửa 760nm - 1100nm phục vụ robot cứu hỏa.',
    subsystem: 'Hệ thống cảm biến',
    source: 'Hshop.vn',
  },
  {
    keywords: ['mpu6050', 'gyro', 'gia tốc', 'imu', 'cân bằng'],
    title: 'Module Cảm Biến Gia Tốc Con Quay Hồi Chuyển GY-521 MPU-6050',
    url: 'https://hshop.vn/products/module-cam-bien-gia-toc-gy-521-mpu-6050',
    price: 40000,
    snippet: 'Module MPU6050 giá 40.000₫. Đo gia tốc 3 trục và con quay hồi chuyển 3 trục I2C, linh kiện cốt lõi cho robot 2 bánh tự cân bằng.',
    subsystem: 'Hệ thống cảm biến',
    source: 'Hshop.vn',
  },
  {
    keywords: ['camera', 'esp32-cam', 'esp32 cam', 'ov2640'],
    title: 'Kit RF Thu Phát WiFi BLE Camera ESP32-CAM Kèm Camera OV2640',
    url: 'https://hshop.vn/products/kit-rf-thu-phat-wifi-ble-camera-esp32-cam-ch340',
    price: 135000,
    snippet: 'Kit ESP32-CAM tích hợp chip nạp CH340 và camera OV2640 2MP giá 135.000₫. Nhận diện hình ảnh và stream video cho robot.',
    subsystem: 'Hệ thống cảm biến',
    source: 'Hshop.vn',
  },

  // 3. TRUYỀN ĐỘNG & DRIVER (ACTUATORS & DRIVERS)
  {
    keywords: ['l298n', 'driver l298n', 'mạch cầu h', 'điều khiển động cơ l298'],
    title: 'Mạch Điều Khiển Động Cơ DC / Bước L298N Motor Driver',
    url: 'https://hshop.vn/products/mach-dieu-khien-dong-co-dc-step-l298n',
    price: 45000,
    snippet: 'Mạch điều khiển động cơ L298N giá 45.000₫. Công suất 2A mỗi kênh, dải điện áp 5V - 35V, điều khiển 2 động cơ DC độc lập.',
    subsystem: 'Hệ thống truyền động',
    source: 'Hshop.vn',
    alternatives: [
      {
        title: 'Mạch điều khiển động cơ L298N Red Nshop',
        url: 'https://nshopvn.com/product/mach-dieu-khien-dong-co-l298n/',
        price: 42000,
        source: 'Nshopvn.com',
      },
    ],
  },
  {
    keywords: ['tb6612', 'tb6612fng', 'driver tb6612'],
    title: 'Mạch Điều Khiển Động Cơ Mini TB6612FNG Dual Motor Driver',
    url: 'https://hshop.vn/products/mach-dieu-khien-dong-co-tb6612fng',
    price: 45000,
    snippet: 'Mạch điều khiển động cơ TB6612FNG giá 45.000₫. Công nghệ MOSFET không sinh nhiệt cao như L298N, dòng 1.2A/kênh, hiệu suất cao.',
    subsystem: 'Hệ thống truyền động',
    source: 'Hshop.vn',
  },
  {
    keywords: ['ga25', 'động cơ ga25', 'động cơ dc giảm tốc ga25'],
    title: 'Động Cơ DC Giảm Tốc GA25 12VDC Kèm Gá Nhôm (Nhiều Tốc Độ)',
    url: 'https://hshop.vn/products/dong-co-dc-giam-toc-ga25-12vdc',
    price: 95000,
    snippet: 'Động cơ DC giảm tốc kim loại GA25 12V giá 95.000₫. Bánh răng thép siêu bền, lực kéo khỏe 2-4kg.cm, tốc độ 100-300rpm.',
    subsystem: 'Hệ thống truyền động',
    source: 'Hshop.vn',
  },
  {
    keywords: ['động cơ v1', 'động cơ giảm tốc vàng', 'động cơ tt', 'động cơ vàng'],
    title: 'Động Cơ DC Giảm Tốc TT Vàng 1:48 (Loại Tốt 3-6V)',
    url: 'https://hshop.vn/products/dong-co-dc-giam-toc-v1-loai-tot',
    price: 18000,
    snippet: 'Động cơ DC giảm tốc TT vàng 1:48 giá 18.000₫. Điện áp 3V-6V, trục kép gắn bánh xe chuyên dụng cho xe robot học sinh sinh viên.',
    subsystem: 'Hệ thống truyền động',
    source: 'Hshop.vn',
    alternatives: [
      {
        title: 'Động cơ giảm tốc V1 vàng kèm bánh xe Nshop',
        url: 'https://nshopvn.com/product/dong-co-giam-toc-v1-kem-banh-xe/',
        price: 25000,
        source: 'Nshopvn.com',
      },
    ],
  },
  {
    keywords: ['mg996r', 'servo mg996r', 'servo kim loại'],
    title: 'Động Cơ RC Servo MG996R (Bánh Răng Kim Loại 180 Độ)',
    url: 'https://hshop.vn/products/dong-co-rc-servo-mg996r',
    price: 85000,
    snippet: 'Động cơ RC Servo MG996R giá 85.000₫. Bánh răng hợp kim kim loại, lực kéo lớn 11kg.cm, góc quay 180 độ cho cánh tay robot.',
    subsystem: 'Hệ thống truyền động',
    source: 'Hshop.vn',
    alternatives: [
      {
        title: 'Servo MG996R TowerPro bánh răng sắt Thegioiic',
        url: 'https://thegioiic.com/products/dong-co-servo-mg996r',
        price: 90000,
        source: 'Thegioiic.com',
      },
    ],
  },
  {
    keywords: ['sg90', 'servo sg90', 'servo mini'],
    title: 'Động Cơ RC Servo SG90 9G (Góc Quay 180 Độ)',
    url: 'https://hshop.vn/products/dong-co-rc-servo-sg90',
    price: 25000,
    snippet: 'Động cơ RC Servo SG90 giá 25.000₫. Trọng lượng siêu nhẹ 9g, điều khiển góc quay giá đỡ cảm biến siêu âm hoặc tay gắp mini.',
    subsystem: 'Hệ thống truyền động',
    source: 'Hshop.vn',
  },
  {
    keywords: ['động cơ bước', '28byj-48', 'uln2003', 'stepper'],
    title: 'Động Cơ Bước 28BYJ-48 5V Kèm Mạch Đệm ULN2003',
    url: 'https://hshop.vn/products/dong-co-buoc-step-28byj-48-5v-kem-driver-uln2003',
    price: 35000,
    snippet: 'Động cơ bước 28BYJ-48 5V kèm driver ULN2003 giá 35.000₫. Điều khiển vị trí bước chính xác góc 5.625 độ.',
    subsystem: 'Hệ thống truyền động',
    source: 'Hshop.vn',
  },

  // 4. NGUỒN ĐIỆN & HẠ ÁP (POWER & BATTERY)
  {
    keywords: ['18650', 'pin 18650', 'cell pin', 'pin sạc'],
    title: 'Cell Pin Sạc Li-ion 18650 3.7V 2600mAh (Xả Cao)',
    url: 'https://hshop.vn/products/cell-pin-li-ion-18650-3-7v-2600mah-xa-cao',
    price: 45000,
    snippet: 'Cell pin sạc Li-ion 18650 3.7V dung lượng 2600mAh giá 45.000₫. Dòng xả cao cấp nguồn ổn định cho động cơ và vi điều khiển.',
    subsystem: 'Hệ thống nguồn điện',
    source: 'Hshop.vn',
  },
  {
    keywords: ['khay pin', 'đế pin 18650', 'hộp pin', 'khay 2 pin'],
    title: 'Khay 2 Pin 18650 Nối Tiếp 7.4V (Có Nắp & Công Tắc)',
    url: 'https://hshop.vn/products/khay-2-pin-18650-co-nap-va-cong-tac',
    price: 18000,
    snippet: 'Khay đựng 2 pin 18650 nối tiếp điện áp 7.4V giá 18.000₫. Có nắp đậy bảo vệ và công tắc bật tắt nguồn an toàn tiện lợi.',
    subsystem: 'Hệ thống nguồn điện',
    source: 'Hshop.vn',
  },
  {
    keywords: ['hạ áp', 'lm2596', 'buck', 'bước giảm áp', 'nguồn hạ áp'],
    title: 'Mạch Giảm Áp DC-DC Buck LM2596 3A Có Hiển Thị Led Vôn Kế',
    url: 'https://hshop.vn/products/mach-giam-ap-dc-dc-buck-lm2596-3a-co-dong-ho-do-ap',
    price: 40000,
    snippet: 'Mạch hạ áp LM2596 3A có đồng hồ LED đo điện áp giá 40.000₫. Giảm từ 7.4V-12V pin xuống 5V chuẩn cấp nguồn cho vi điều khiển.',
    subsystem: 'Hệ thống nguồn điện',
    source: 'Hshop.vn',
  },
  {
    keywords: ['sạc pin', 'tp4056', 'mạch sạc pin'],
    title: 'Mạch Sạc Pin Li-ion 1S TP4056 Type-C Kèm Mạch Bảo Vệ',
    url: 'https://hshop.vn/products/mach-sac-pin-li-ion-1s-tp4056-type-c-co-bao-ve',
    price: 12000,
    snippet: 'Mạch sạc pin TP4056 Type-C giá 12.000₫. Dòng sạc 1A có tích hợp IC bảo vệ ngắt khi pin yếu hoặc quá dòng.',
    subsystem: 'Hệ thống nguồn điện',
    source: 'Hshop.vn',
  },

  // 5. KHUNG CƠ KHÍ & BÁNH XE (MECHANICS & CHASSIS)
  {
    keywords: ['khung xe robot', 'khung xe 2 bánh', 'khung 3 bánh', 'chassis'],
    title: 'Bộ Khung Xe Robot 2 Bánh Thông Minh Đa Hướng (Smart Car Chassis)',
    url: 'https://hshop.vn/products/bo-khung-xe-robot-2-banh-thong-minh',
    price: 95000,
    snippet: 'Bộ khung xe robot 2 bánh thông minh giá 95.000₫. Bao gồm khung mica dày, 2 động cơ giảm tốc TT, 2 bánh xe cao su, 1 bánh mắt trâu đa hướng, khay pin và đĩa đếm xung encoder.',
    subsystem: 'Khung cơ khí & Bánh xe',
    source: 'Hshop.vn',
    alternatives: [
      {
        title: 'Khung xe robot 4 bánh mica 2 tầng Nshop',
        url: 'https://nshopvn.com/product/khung-xe-robot-4-banh-mica-2-tang/',
        price: 145000,
        source: 'Nshopvn.com',
      },
    ],
  },
  {
    keywords: ['mecanum', 'bánh xe mecanum', 'xe 4 bánh'],
    title: 'Bộ 4 Bánh Xe Mecanum Đa Hướng Trục TT Vàng 60mm',
    url: 'https://hshop.vn/products/bo-4-banh-xe-mecanum-60mm-truc-tt',
    price: 185000,
    snippet: 'Bộ 4 bánh xe Mecanum 60mm trục động cơ TT giá 185.000₫. Cho phép robot di chuyển đa hướng xoay tròn, đi ngang, chéo 45 độ.',
    subsystem: 'Khung cơ khí & Bánh xe',
    source: 'Hshop.vn',
  },
  {
    keywords: ['cánh tay robot', 'khung cánh tay', 'arm robot 4 dof', 'tay gắp'],
    title: 'Bộ Khung Cánh Tay Robot 4 Bậc Tự Do 4 DOF Kèm Tay Gắp',
    url: 'https://hshop.vn/products/bo-khung-canh-tay-robot-4-bac-tu-do-4dof-mica',
    price: 195000,
    snippet: 'Bộ khung cánh tay robot 4 DOF mica kèm tay gắp và ốc vít M3 giá 195.000₫. Tương thích lắp ráp 4 servo MG996R hoặc SG90.',
    subsystem: 'Khung cơ khí & Bánh xe',
    source: 'Hshop.vn',
  },
  {
    keywords: ['bánh xe', 'bánh cao su', 'bánh xe 65mm'],
    title: 'Bánh Xe Cao Su V1 Đường Kính 65mm Trục Vát TT',
    url: 'https://hshop.vn/products/banh-xe-robot-v1-duong-kinh-65mm',
    price: 15000,
    snippet: 'Bánh xe cao su robot V1 đường kính 65mm giá 15.000₫. Lốp cao su bám đường tốt, khớp trục động cơ vàng TT.',
    subsystem: 'Khung cơ khí & Bánh xe',
    source: 'Hshop.vn',
  },

  // 6. PHỤ KIỆN & DÂY NỐI (ACCESSORIES & WIRING)
  {
    keywords: ['dây cắm', 'dây cắm breadboard', 'dây dupont', 'dây nối'],
    title: 'Tép 40 Dây Cắm Test Bo Breadboard Đực - Cái 20cm',
    url: 'https://hshop.vn/products/tep-40-day-cam-test-board-duc-cai-20cm',
    price: 15000,
    snippet: 'Tép 40 sợi dây cắm test board đực - cái độ dài 20cm giá 15.000₫. Dây lõi đồng truyền dẫn tốt kết nối mạch điện tử và module cảm biến.',
    subsystem: 'Dây nối & Phụ kiện',
    source: 'Hshop.vn',
    alternatives: [
      {
        title: 'Tép 40 dây cắm đực - đực 20cm Hshop',
        url: 'https://hshop.vn/products/tep-40-day-cam-test-board-duc-duc-20cm',
        price: 15000,
        source: 'Hshop.vn',
      },
    ],
  },
  {
    keywords: ['breadboard', 'test board', 'bo cắm'],
    title: 'Test Board Cắm Breadboard MB-102 830 Lỗ',
    url: 'https://hshop.vn/products/test-board-cam-breadboard-mb-102-830-lo',
    price: 32000,
    snippet: 'Breadboard MB-102 830 lỗ cắm giá 32.000₫. Thiết kế chân cắm đàn hồi mạ niken, giúp lắp ráp mạch nhanh không cần hàn chì.',
    subsystem: 'Dây nối & Phụ kiện',
    source: 'Hshop.vn',
  },
  {
    keywords: ['ốc vít', 'trụ đồng', 'hộp ốc vít m3', 'bulong'],
    title: 'Hộp Trụ Đồng Kèm Ốc Vít Bulong M3 Đa Kích Thước (120 Món)',
    url: 'https://hshop.vn/products/hop-tru-dong-vit-tan-m3-120-mon',
    price: 65000,
    snippet: 'Hộp 120 món trụ đồng ren đực - cái M3 kèm ốc tán inox giá 65.000₫. Phụ kiện cố định mạch vi điều khiển và cảm biến lên khung xe.',
    subsystem: 'Dây nối & Phụ kiện',
    source: 'Hshop.vn',
  },
];

export function findCatalogMatches(query: string, maxResults: number = 5): BomSearchResult[] {
  if (!query) return [];
  const normalized = query.toLowerCase().trim();
  const words = normalized.split(/\s+/).filter((w) => w.length > 1);

  // Score each catalog entry
  const scored = ROBOTICS_PRODUCT_CATALOG.map((item) => {
    let score = 0;

    // Direct keyword match
    for (const kw of item.keywords) {
      if (normalized.includes(kw)) {
        score += 50;
      }
    }

    // Individual word matching in title and snippet
    const lowerTitle = item.title.toLowerCase();
    const lowerSnippet = item.snippet.toLowerCase();

    for (const w of words) {
      if (lowerTitle.includes(w)) score += 15;
      else if (lowerSnippet.includes(w)) score += 5;
    }

    return { item, score };
  })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  const results: BomSearchResult[] = [];

  for (const { item } of scored.slice(0, maxResults)) {
    results.push({
      title: item.title,
      url: item.url,
      content: item.snippet,
      price: item.price,
      engine: item.source,
    });

    if (item.alternatives) {
      for (const alt of item.alternatives) {
        if (results.length >= maxResults) break;
        results.push({
          title: alt.title,
          url: alt.url,
          content: `${alt.title} giá ${alt.price.toLocaleString('vi-VN')}₫ từ ${alt.source}`,
          price: alt.price,
          engine: alt.source,
        });
      }
    }
  }

  return results.slice(0, maxResults);
}
