import { BomSearchResult } from './types';
import { understandComponent, classifyProductMatch } from './component-understanding';

export interface CatalogProduct {
  keywords: string[];
  title: string;
  url: string;
  snippet: string;
  subsystem: string;
  source: string;
  alternatives?: { title: string; url: string; source: string }[];
}

export const ROBOTICS_PRODUCT_CATALOG: CatalogProduct[] = [
  // 1. VI ĐIỀU KHIỂN & MÁY TÍNH NHÚNG
  {
    keywords: ['esp32', 'nodemcu', 'esp-32', 'esp 32', 'esp32 devkit v1', 'devkit v1'],
    title: 'Kit RF Thu Phát WiFi BLE ESP32 DevKit V1 NodeMCU Lua CP2102',
    url: 'https://shopee.vn/kit-rf-thu-phat-wifi-ble-esp32-nodemcu-cp2102-i.84157123.1420556112',
    snippet: 'Kit RF Thu Phát WiFi BLE ESP32 DevKit V1 NodeMCU Lua CP2102. Vi điều khiển 32-bit lõi kép 240MHz, tích hợp Wi-Fi 802.11 b/g/n và Bluetooth 4.2 BLE.',
    subsystem: 'Hệ thống điều khiển',
    source: 'Shopee.vn',
    alternatives: [
      {
        title: 'Board ESP32 NodeMCU CP2102 Type-C Nshop',
        url: 'https://nshopvn.com/product/kit-rf-thu-phat-wifi-ble-esp32-nodemcu-lua-cp2102-type-c/',
        source: 'Nshopvn.com',
      },
      {
        title: 'Mạch phát triển Vietduino ESP32 Hshop',
        url: 'https://hshop.vn/mach-phat-trien-vietduino-esp32',
        source: 'Hshop.vn',
      },
    ],
  },
  {
    keywords: ['arduino uno', 'uno r3', 'atmega328p', 'arduino'],
    title: 'Kit Arduino Uno R3 DIP Kèm Cáp Nạp ATmega328P',
    url: 'https://shopee.vn/mach-arduino-uno-r3-dip-kem-cap-i.84157123.1523441234',
    snippet: 'Kit Arduino Uno R3 DIP kèm cáp nạp. Vi điều khiển ATmega328P 16MHz, nạp qua chip nạp ATmega16U2 độ ổn định cao.',
    subsystem: 'Hệ thống điều khiển',
    source: 'Shopee.vn',
    alternatives: [
      {
        title: 'Mạch Arduino Uno R3 CH340G kèm cáp Nshop',
        url: 'https://nshopvn.com/product/mach-arduino-uno-r3-ch340g-kem-cap/',
        source: 'Nshopvn.com',
      },
      {
        title: 'Kit Arduino Uno R3 Banlinhkien',
        url: 'https://banlinhkien.com/arduino-uno-r3-dip',
        source: 'Banlinhkien.com',
      },
    ],
  },
  {
    keywords: ['arduino nano', 'nano v3', 'nano r3'],
    title: 'Kit Arduino Nano V3.0 CH340G Kèm Cáp Nạp Mini',
    url: 'https://shopee.vn/mach-arduino-nano-v3.0-ch340g-kem-cap-i.84157123.1633551234',
    snippet: 'Kit Arduino Nano V3.0 CH340G kèm cáp nạp. Kích thước nhỏ gọn, vi điều khiển ATmega328P 16MHz phù hợp cho xe và robot mini.',
    subsystem: 'Hệ thống điều khiển',
    source: 'Shopee.vn',
    alternatives: [
      {
        title: 'Mạch Arduino Nano V3.0 Type-C Nshop',
        url: 'https://nshopvn.com/product/kit-arduino-nano-v3-0-type-c-ch340/',
        source: 'Nshopvn.com',
      },
    ],
  },
  {
    keywords: ['stm32', 'blue pill', 'stm32f103'],
    title: 'Kit STM32F103C8T6 Blue Pill ARM Cortex-M3',
    url: 'https://shopee.vn/kit-stm32f103c8t6-blue-pill-arm-cortex-m3-i.84157123.1744661234',
    snippet: 'Kit STM32F103C8T6 Blue Pill ARM Cortex-M3 72MHz 64KB Flash. Tốc độ cao chuyên dụng cho điều khiển PID động cơ và cân bằng robot.',
    subsystem: 'Hệ thống điều khiển',
    source: 'Shopee.vn',
    alternatives: [
      {
        title: 'Kit STM32F103C8T6 Blue Pill Nshop',
        url: 'https://nshopvn.com/product/kit-stm32f103c8t6-blue-pill/',
        source: 'Nshopvn.com',
      },
    ],
  },
  {
    keywords: ['raspberry pi', 'pi 4', 'raspberry pi 4'],
    title: 'Máy Tính Nhúng Raspberry Pi 4 Model B (4GB RAM)',
    url: 'https://shopee.vn/may-tinh-nhung-raspberry-pi-4-model-b-4gb-ram-i.84157123.1855771234',
    snippet: 'Máy tính nhúng Raspberry Pi 4 Model B 4GB RAM. Xử lý thị giác máy tính OpenCV, camera và AI cho robot tự hành.',
    subsystem: 'Hệ thống điều khiển',
    source: 'Shopee.vn',
    alternatives: [
      {
        title: 'Raspberry Pi 4 Model B 4GB Nshop',
        url: 'https://nshopvn.com/product/raspberry-pi-4-model-b-4gb/',
        source: 'Nshopvn.com',
      },
    ],
  },

  // 2. CẢM BIẾN (SENSORS)
  {
    keywords: ['cảm biến dò line', 'dò line', 'tcrt5000', 'line sensor', 'bám vạch', 'cảm biến dò vạch', 'line tracking sensor', 'module dò line'],
    title: 'Mạch Cảm Biến Dò Line 5 Kênh TCRT5000 Line Tracker',
    url: 'https://shopee.vn/mach-cam-bien-do-line-5-kenh-tcrt5000-line-tracker-i.84157123.1966881234',
    snippet: 'Mạch cảm biến dò line 5 kênh TCRT5000. Phát hiện vạch đen trắng độ nhạy cao, ngõ ra số Digital dễ đọc với Arduino và ESP32.',
    subsystem: 'Hệ thống cảm biến',
    source: 'Shopee.vn',
    alternatives: [
      {
        title: 'Cảm biến dò đường 4 kênh TCRT5000 Nshop',
        url: 'https://nshopvn.com/product/cam-bien-do-line-4-kenh-tcrt5000/',
        source: 'Nshopvn.com',
      },
      {
        title: 'Module Cảm biến Dò line 5 Kênh Banlinhkien',
        url: 'https://banlinhkien.com/module-cam-bien-do-line-5-kenh-tcrt5000',
        source: 'Banlinhkien.com',
      },
    ],
  },
  {
    keywords: ['siêu âm', 'hc-sr04', 'khoảng cách', 'tránh vật cản', 'ultrasonic'],
    title: 'Cảm Biến Siêu Âm Ultrasonic Ranging Module HC-SR04',
    url: 'https://shopee.vn/cam-bien-sieu-am-ultrasonic-module-hc-sr04-i.84157123.2077991234',
    snippet: 'Cảm biến siêu âm HC-SR04. Đo khoảng cách vật cản 2cm - 400cm, góc quét 15 độ, tương thích vi điều khiển 5V.',
    subsystem: 'Hệ thống cảm biến',
    source: 'Shopee.vn',
    alternatives: [
      {
        title: 'Cảm biến siêu âm HC-SR04 Nshop',
        url: 'https://nshopvn.com/product/cam-bien-sieu-am-hc-sr04/',
        source: 'Nshopvn.com',
      },
      {
        title: 'Cảm biến siêu âm HC-SR04 LKCG',
        url: 'https://lkcg.vn/cam-bien-sieu-am-hc-sr04',
        source: 'Lkcg.vn',
      },
    ],
  },
  {
    keywords: ['cảm biến lửa', 'phát hiện lửa', 'flame', 'cứu hỏa'],
    title: 'Module Cảm Biến Phát Hiện Lửa (Flame Sensor)',
    url: 'https://shopee.vn/module-cam-bien-phat-hien-lua-flame-sensor-i.84157123.2188101234',
    snippet: 'Module cảm biến lửa Flame Sensor. Phát hiện bước sóng lửa 760nm - 1100nm phục vụ robot cứu hỏa.',
    subsystem: 'Hệ thống cảm biến',
    source: 'Shopee.vn',
    alternatives: [
      {
        title: 'Cảm biến phát hiện lửa Flame Sensor Nshop',
        url: 'https://nshopvn.com/product/cam-bien-phat-hien-lua-flame-sensor/',
        source: 'Nshopvn.com',
      },
    ],
  },
  {
    keywords: ['mpu6050', 'gyro', 'gia tốc', 'imu', 'cân bằng'],
    title: 'Module Cảm Biến Gia Tốc Con Quay Hồi Chuyển GY-521 MPU-6050',
    url: 'https://shopee.vn/module-cam-bien-gia-toc-gy-521-mpu-6050-6dof-i.84157123.2299211234',
    snippet: 'Module MPU6050. Đo gia tốc 3 trục và con quay hồi chuyển 3 trục I2C, linh kiện cốt lõi cho robot 2 bánh tự cân bằng.',
    subsystem: 'Hệ thống cảm biến',
    source: 'Shopee.vn',
    alternatives: [
      {
        title: 'Cảm biến gia tốc GY-521 MPU-6050 Nshop',
        url: 'https://nshopvn.com/product/cam-bien-gia-toc-gy-521-mpu-6050/',
        source: 'Nshopvn.com',
      },
    ],
  },
  {
    keywords: ['camera', 'esp32-cam', 'esp32 cam', 'ov2640'],
    title: 'Kit RF Thu Phát WiFi BLE Camera ESP32-CAM Kèm Camera OV2640',
    url: 'https://shopee.vn/kit-esp32-cam-wifi-ble-kem-camera-ov2640-ch340-i.84157123.2310321234',
    snippet: 'Kit ESP32-CAM tích hợp chip nạp CH340 và camera OV2640 2MP. Nhận diện hình ảnh và stream video cho robot.',
    subsystem: 'Hệ thống cảm biến',
    source: 'Shopee.vn',
    alternatives: [
      {
        title: 'Kit ESP32-CAM OV2640 Nshop',
        url: 'https://nshopvn.com/product/kit-esp32-cam-ov2640/',
        source: 'Nshopvn.com',
      },
    ],
  },

  // 3. TRUYỀN ĐỘNG & DRIVER (ACTUATORS & DRIVERS)
  {
    keywords: ['l298n', 'driver l298n', 'mạch cầu h', 'điều khiển động cơ l298'],
    title: 'Mạch Điều Khiển Động Cơ DC / Bước L298N Motor Driver',
    url: 'https://shopee.vn/mach-dieu-khien-dong-co-dc-step-l298n-dual-h-bridge-i.84157123.2421431234',
    snippet: 'Mạch điều khiển động cơ L298N. Công suất 2A mỗi kênh, dải điện áp 5V - 35V, điều khiển 2 động cơ DC độc lập.',
    subsystem: 'Hệ thống truyền động',
    source: 'Shopee.vn',
    alternatives: [
      {
        title: 'Mạch điều khiển động cơ L298N Red Nshop',
        url: 'https://nshopvn.com/product/mach-dieu-khien-dong-co-l298n/',
        source: 'Nshopvn.com',
      },
      {
        title: 'Module L298N LKCG',
        url: 'https://lkcg.vn/module-l298n',
        source: 'Lkcg.vn',
      },
    ],
  },
  {
    keywords: ['tb6612', 'tb6612fng', 'driver tb6612'],
    title: 'Mạch Điều Khiển Động Cơ Mini TB6612FNG Dual Motor Driver',
    url: 'https://shopee.vn/mach-dieu-khien-dong-co-mini-tb6612fng-dual-motor-driver-i.84157123.2532541234',
    snippet: 'Mạch điều khiển động cơ TB6612FNG. Công nghệ MOSFET không sinh nhiệt cao như L298N, dòng 1.2A/kênh, hiệu suất cao.',
    subsystem: 'Hệ thống truyền động',
    source: 'Shopee.vn',
    alternatives: [
      {
        title: 'Mạch điều khiển động cơ TB6612FNG Nshop',
        url: 'https://nshopvn.com/product/mach-dieu-khien-dong-co-tb6612fng/',
        source: 'Nshopvn.com',
      },
    ],
  },
  {
    keywords: [
      'ga25',
      'động cơ ga25',
      'động cơ dc giảm tốc ga25',
      'động cơ robot chạy nhanh',
      'động cơ tốc độ cao',
      'động cơ robot',
      'motor dc',
      'fast motor',
      'động cơ xe robot'
    ],
    title: 'Động Cơ DC Giảm Tốc GA25 12VDC Kèm Gá Nhôm (Nhiều Tốc Độ)',
    url: 'https://shopee.vn/dong-co-dc-giam-toc-kim-loai-ga25-12vdc-i.84157123.2643651234',
    snippet: 'Động cơ DC giảm tốc kim loại GA25 12V. Bánh răng thép siêu bền, lực kéo khỏe 2-4kg.cm, tốc độ 100-300rpm.',
    subsystem: 'Hệ thống truyền động',
    source: 'Shopee.vn',
    alternatives: [
      {
        title: 'Động cơ DC giảm tốc GA25 Nshop',
        url: 'https://nshopvn.com/product/dong-co-dc-giam-toc-ga25/',
        source: 'Nshopvn.com',
      },
    ],
  },
  {
    keywords: ['n20', 'motor n20', 'động cơ n20', 'n20 12v', 'n20-12v', 'motor n20 12v'],
    title: 'Động Cơ DC Giảm Tốc N20 12V Trục D Kim Loại Mini',
    url: 'https://shopee.vn/dong-co-dc-giam-toc-n20-12v-truc-d-kim-loai-i.84157123.4366211234',
    snippet: 'Động cơ DC giảm tốc N20 12V kim loại mini. Điện áp 12VDC, hộp số bánh răng kim loại siêu bền, lực kéo khỏe cho robot mini và mô hình.',
    subsystem: 'Hệ thống truyền động',
    source: 'Shopee.vn',
    alternatives: [
      {
        title: 'Động cơ giảm tốc N20 12V Nshop',
        url: 'https://nshopvn.com/product/dong-co-giam-toc-n20-12v/',
        source: 'Nshopvn.com',
      },
      {
        title: 'Động cơ DC giảm tốc N20 Hshop',
        url: 'https://hshop.vn/dong-co-dc-giam-toc-n20',
        source: 'Hshop.vn',
      },
    ],
  },
  {
    keywords: ['động cơ v1', 'động cơ giảm tốc vàng', 'động cơ tt', 'động cơ vàng'],
    title: 'Động Cơ DC Giảm Tốc TT Vàng 1:48 (Loại Tốt 3-6V)',
    url: 'https://shopee.vn/dong-co-dc-giam-toc-tt-vang-kem-banh-xe-65mm-i.84157123.2754761234',
    snippet: 'Động cơ DC giảm tốc TT vàng 1:48. Điện áp 3V-6V, trục kép gắn bánh xe chuyên dụng cho xe robot học sinh sinh viên.',
    subsystem: 'Hệ thống truyền động',
    source: 'Shopee.vn',
    alternatives: [
      {
        title: 'Động cơ giảm tốc V1 vàng kèm bánh xe Nshop',
        url: 'https://nshopvn.com/product/dong-co-giam-toc-v1-kem-banh-xe/',
        source: 'Nshopvn.com',
      },
    ],
  },
  {
    keywords: ['mg996r', 'servo mg996r', 'servo kim loại'],
    title: 'Động Cơ RC Servo MG996R (Bánh Răng Kim Loại 180 Độ)',
    url: 'https://shopee.vn/dong-co-rc-servo-mg996r-banh-rang-kim-loai-180-do-i.84157123.2865871234',
    snippet: 'Động cơ RC Servo MG996R. Bánh răng hợp kim kim loại, lực kéo lớn 11kg.cm, góc quay 180 độ cho cánh tay robot.',
    subsystem: 'Hệ thống truyền động',
    source: 'Shopee.vn',
    alternatives: [
      {
        title: 'Servo MG996R TowerPro Nshop',
        url: 'https://nshopvn.com/product/dong-co-servo-mg996r/',
        source: 'Nshopvn.com',
      },
      {
        title: 'Servo MG996R TowerPro bánh răng sắt LKCG',
        url: 'https://lkcg.vn/dong-co-servo-mg996r',
        source: 'Lkcg.vn',
      },
    ],
  },
  {
    keywords: ['sg90', 'servo sg90', 'servo mini'],
    title: 'Động Cơ RC Servo SG90 9G (Góc Quay 180 Độ)',
    url: 'https://shopee.vn/dong-co-rc-servo-sg90-9g-goc-quay-180-do-i.84157123.2976981234',
    snippet: 'Động cơ RC Servo SG90. Trọng lượng siêu nhẹ 9g, điều khiển góc quay giá đỡ cảm biến siêu âm hoặc tay gắp mini.',
    subsystem: 'Hệ thống truyền động',
    source: 'Shopee.vn',
    alternatives: [
      {
        title: 'Động cơ RC Servo SG90 9G Nshop',
        url: 'https://nshopvn.com/product/dong-co-rc-servo-sg90/',
        source: 'Nshopvn.com',
      },
    ],
  },
  {
    keywords: ['động cơ bước', '28byj-48', 'uln2003', 'stepper'],
    title: 'Động Cơ Bước 28BYJ-48 5V Kèm Mạch Đệm ULN2003',
    url: 'https://shopee.vn/dong-co-buoc-step-28byj-48-5v-kem-driver-uln2003-i.84157123.3087091234',
    snippet: 'Động cơ bước 28BYJ-48 5V kèm driver ULN2003. Điều khiển vị trí bước chính xác góc 5.625 độ.',
    subsystem: 'Hệ thống truyền động',
    source: 'Shopee.vn',
    alternatives: [
      {
        title: 'Động cơ bước 28BYJ-48 kèm driver ULN2003 Nshop',
        url: 'https://nshopvn.com/product/dong-co-buoc-28byj-48-kem-driver-uln2003/',
        source: 'Nshopvn.com',
      },
    ],
  },

  // 4. NGUỒN ĐIỆN & HẠ ÁP (POWER & BATTERY)
  {
    keywords: ['18650', 'pin 18650', 'cell pin', 'pin sạc'],
    title: 'Cell Pin Sạc Li-ion 18650 3.7V 2600mAh (Xả Cao)',
    url: 'https://shopee.vn/cell-pin-sac-li-ion-18650-3.7v-2600mah-xa-cao-i.84157123.3198101234',
    snippet: 'Cell pin sạc Li-ion 18650 3.7V dung lượng 2600mAh. Dòng xả cao cấp nguồn ổn định cho động cơ và vi điều khiển.',
    subsystem: 'Hệ thống nguồn điện',
    source: 'Shopee.vn',
    alternatives: [
      {
        title: 'Cell pin sạc 18650 3.7V Nshop',
        url: 'https://nshopvn.com/product/pin-18650-3-7v/',
        source: 'Nshopvn.com',
      },
    ],
  },
  {
    keywords: ['khay pin', 'đế pin 18650', 'hộp pin', 'khay 2 pin'],
    title: 'Khay 2 Pin 18650 Nối Tiếp 7.4V (Có Nắp & Công Tắc)',
    url: 'https://shopee.vn/khay-2-pin-18650-noi-tiep-7.4v-co-nap-va-cong-tac-i.84157123.3209211234',
    snippet: 'Khay đựng 2 pin 18650 nối tiếp điện áp 7.4V. Có nắp đậy bảo vệ và công tắc bật tắt nguồn an toàn tiện lợi.',
    subsystem: 'Hệ thống nguồn điện',
    source: 'Shopee.vn',
    alternatives: [
      {
        title: 'Khay 2 Pin 18650 có nắp Nshop',
        url: 'https://nshopvn.com/product/khay-2-pin-18650-co-nap/',
        source: 'Nshopvn.com',
      },
    ],
  },
  {
    keywords: [
      'hạ áp',
      'lm2596',
      'buck',
      'bước giảm áp',
      'nguồn hạ áp',
      'module chuyển nguồn',
      'chuyển nguồn',
      'bộ giảm áp',
      'mạch hạ áp',
      'dc-dc converter',
      'buck converter'
    ],
    title: 'Mạch Giảm Áp DC-DC Buck LM2596 3A Có Hiển Thị Led Vôn Kế',
    url: 'https://shopee.vn/mach-giam-ap-dc-dc-buck-lm2596-3a-co-dong-ho-do-ap-led-i.84157123.3310321234',
    snippet: 'Mạch hạ áp LM2596 3A có đồng hồ LED đo điện áp. Giảm từ 7.4V-12V pin xuống 5V chuẩn cấp nguồn cho vi điều khiển.',
    subsystem: 'Hệ thống nguồn điện',
    source: 'Shopee.vn',
    alternatives: [
      {
        title: 'Mạch giảm áp DC-DC Buck LM2596 Nshop',
        url: 'https://nshopvn.com/product/mach-giam-ap-dc-lm2596/',
        source: 'Nshopvn.com',
      },
    ],
  },
  {
    keywords: ['sạc pin', 'tp4056', 'mạch sạc pin'],
    title: 'Mạch Sạc Pin Li-ion 1S TP4056 Type-C Kèm Mạch Bảo Vệ',
    url: 'https://shopee.vn/mach-sac-pin-li-ion-1s-tp4056-type-c-co-bao-ve-i.84157123.3421431234',
    snippet: 'Mạch sạc pin TP4056 Type-C. Dòng sạc 1A có tích hợp IC bảo vệ ngắt khi pin yếu hoặc quá dòng.',
    subsystem: 'Hệ thống nguồn điện',
    source: 'Shopee.vn',
    alternatives: [
      {
        title: 'Mạch sạc pin TP4056 Type-C có bảo vệ Nshop',
        url: 'https://nshopvn.com/product/mach-sac-pin-tp4056-type-c/',
        source: 'Nshopvn.com',
      },
    ],
  },

  // 5. KHUNG CƠ KHÍ & BÁNH XE (MECHANICS & CHASSIS)
  {
    keywords: ['khung xe robot', 'khung xe 2 bánh', 'khung 3 bánh', 'chassis'],
    title: 'Bộ Khung Xe Robot 2 Bánh Thông Minh Đa Hướng (Smart Car Chassis)',
    url: 'https://shopee.vn/bo-khung-xe-robot-2-banh-thong-minh-smart-car-chassis-i.84157123.3532541234',
    snippet: 'Bộ khung xe robot 2 bánh thông minh. Bao gồm khung mica dày, 2 động cơ giảm tốc TT, 2 bánh xe cao su, 1 bánh mắt trâu đa hướng, khay pin và đĩa đếm xung encoder.',
    subsystem: 'Khung cơ khí & Bánh xe',
    source: 'Shopee.vn',
    alternatives: [
      {
        title: 'Khung xe robot 4 bánh mica 2 tầng Nshop',
        url: 'https://nshopvn.com/product/khung-xe-robot-4-banh-mica-2-tang/',
        source: 'Nshopvn.com',
      },
    ],
  },
  {
    keywords: ['mecanum', 'bánh xe mecanum', 'xe 4 bánh'],
    title: 'Bộ 4 Bánh Xe Mecanum Đa Hướng Trục TT Vàng 60mm',
    url: 'https://shopee.vn/bo-4-banh-xe-mecanum-60mm-truc-dong-co-tt-i.84157123.3643651234',
    snippet: 'Bộ 4 bánh xe Mecanum 60mm trục động cơ TT. Cho phép robot di chuyển đa hướng xoay tròn, đi ngang, chéo 45 độ.',
    subsystem: 'Khung cơ khí & Bánh xe',
    source: 'Shopee.vn',
    alternatives: [
      {
        title: 'Bánh xe Mecanum 60mm Nshop',
        url: 'https://nshopvn.com/product/banh-xe-mecanum-60mm/',
        source: 'Nshopvn.com',
      },
    ],
  },
  {
    keywords: ['cánh tay robot', 'khung cánh tay', 'arm robot 4 dof', 'tay gắp'],
    title: 'Bộ Khung Cánh Tay Robot 4 Bậc Tự Do 4 DOF Kèm Tay Gắp',
    url: 'https://shopee.vn/bo-khung-canh-tay-robot-4-bac-tu-do-4dof-mica-kem-tay-gap-i.84157123.3754761234',
    snippet: 'Bộ khung cánh tay robot 4 DOF mica kèm tay gắp và ốc vít M3. Tương thích lắp ráp 4 servo MG996R hoặc SG90.',
    subsystem: 'Khung cơ khí & Bánh xe',
    source: 'Shopee.vn',
    alternatives: [
      {
        title: 'Khung cánh tay robot 4DOF mica Nshop',
        url: 'https://nshopvn.com/product/khung-canh-tay-robot-4dof/',
        source: 'Nshopvn.com',
      },
    ],
  },
  {
    keywords: [
      'bánh xe',
      'bánh cao su',
      'bánh xe 65mm',
      'bánh xe robot',
      'robot wheel',
      'wheel for mobile robot',
      'bánh xe v1'
    ],
    title: 'Bánh Xe Cao Su V1 Đường Kính 65mm Trục Vát TT',
    url: 'https://shopee.vn/banh-xe-cao-su-robot-v1-duong-kinh-65mm-truc-vat-tt-i.84157123.3865871234',
    snippet: 'Bánh xe cao su robot V1 đường kính 65mm. Lốp cao su bám đường tốt, khớp trục động cơ vàng TT.',
    subsystem: 'Khung cơ khí & Bánh xe',
    source: 'Shopee.vn',
    alternatives: [
      {
        title: 'Bánh xe robot V1 65mm Nshop',
        url: 'https://nshopvn.com/product/banh-xe-robot-v1-65mm/',
        source: 'Nshopvn.com',
      },
    ],
  },
  {
    keywords: [
      'giá đỡ động cơ',
      'gá động cơ',
      'gá nhôm động cơ',
      'motor bracket',
      'motor mounting holder',
      'gá motor',
      'giá đỡ motor',
      'gá nhôm ga25'
    ],
    title: 'Gá Nhôm Chữ L Giá Đỡ Động Cơ GA25 Kèm Ốc Vít M3',
    url: 'https://shopee.vn/ga-nhom-chu-l-gia-do-dong-co-ga25-kem-oc-vit-i.84157123.3647181234',
    snippet: 'Gá nhôm chữ L dày 2mm cố định động cơ GA25 lên khung xe robot. Đi kèm ốc vít bulong M3 chắc chắn, tương thích motor bracket robot.',
    subsystem: 'Khung cơ khí & Bánh xe',
    source: 'Shopee.vn',
    alternatives: [
      {
        title: 'Gá nhôm chữ L động cơ GA25 Nshop',
        url: 'https://nshopvn.com/product/ga-nhom-dong-co-ga25/',
        source: 'Nshopvn.com',
      },
    ],
  },
  {
    keywords: ['3v670', 'dây curoa 3v670', 'dây đai 3v670', '3v-670', 'dây curoa', 'dây đai'],
    title: 'Dây Curoa 3V670 Dây Đai Truyền Động Chữ V Bando Mitsuboshi',
    url: 'https://shopee.vn/day-curoa-3v670-day-dai-truyen-dong-i.84157123.4255101234',
    snippet: 'Dây Curoa 3V670 dây đai truyền động chữ V công nghiệp. Chiều dài chuẩn 67.0 inch (1702mm), bản rộng 3V 9.5mm, chịu tải nhiệt và ma sát cao cho cơ cấu truyền động.',
    subsystem: 'Khung cơ khí & Bánh xe',
    source: 'Shopee.vn',
    alternatives: [
      {
        title: 'Dây đai truyền động timing belt GT2 Nshop',
        url: 'https://nshopvn.com/product/day-dai-gt2-ban-6mm/',
        source: 'Nshopvn.com',
      },
    ],
  },

  // 6. PHỤ KIỆN & DÂY NỐI (ACCESSORIES & WIRING)
  {
    keywords: ['dây cắm', 'dây cắm breadboard', 'dây dupont', 'dây nối'],
    title: 'Tép 40 Dây Cắm Test Bo Breadboard Đực - Cái 20cm',
    url: 'https://shopee.vn/tep-40-soi-day-cam-test-board-breadboard-duc-cai-20cm-i.84157123.3976981234',
    snippet: 'Tép 40 sợi dây cắm test board đực - cái độ dài 20cm. Dây lõi đồng truyền dẫn tốt kết nối mạch điện tử và module cảm biến.',
    subsystem: 'Dây nối & Phụ kiện',
    source: 'Shopee.vn',
    alternatives: [
      {
        title: 'Dây cắm test board 20cm đực cái Nshop',
        url: 'https://nshopvn.com/product/day-cam-test-board-20cm/',
        source: 'Nshopvn.com',
      },
    ],
  },
  {
    keywords: ['breadboard', 'test board', 'bo cắm'],
    title: 'Test Board Cắm Breadboard MB-102 830 Lỗ',
    url: 'https://shopee.vn/test-board-cam-breadboard-mb-102-830-lo-i.84157123.4087091234',
    snippet: 'Breadboard MB-102 830 lỗ cắm. Thiết kế chân cắm đàn hồi mạ niken, giúp lắp ráp mạch nhanh không cần hàn chì.',
    subsystem: 'Dây nối & Phụ kiện',
    source: 'Shopee.vn',
    alternatives: [
      {
        title: 'Breadboard MB-102 830 lỗ Nshop',
        url: 'https://nshopvn.com/product/breadboard-mb-102-830-lo/',
        source: 'Nshopvn.com',
      },
    ],
  },
  {
    keywords: ['ốc vít', 'trụ đồng', 'hộp ốc vít m3', 'bulong'],
    title: 'Hộp Trụ Đồng Kèm Ốc Vít Bulong M3 Đa Kích Thước (120 Món)',
    url: 'https://shopee.vn/hop-tru-dong-vit-tan-m3-120-mon-i.84157123.4198101234',
    snippet: 'Hộp 120 món trụ đồng ren đực - cái M3 kèm ốc tán inox. Phụ kiện cố định mạch vi điều khiển và cảm biến lên khung xe.',
    subsystem: 'Dây nối & Phụ kiện',
    source: 'Shopee.vn',
    alternatives: [
      {
        title: 'Hộp trụ đồng vít tán M3 Nshop',
        url: 'https://nshopvn.com/product/hop-tru-dong-vit-tan-m3/',
        source: 'Nshopvn.com',
      },
    ],
  },
];

export function findCatalogMatches(query: string, maxResults: number = 5): BomSearchResult[] {
  if (!query) return [];
  const normalized = query.toLowerCase().trim();
  const info = understandComponent(query);

  // Score each catalog entry using both semantic classification and keyword/synonym match
  const scored = ROBOTICS_PRODUCT_CATALOG.map((item) => {
    const fakeResult: BomSearchResult = {
      title: item.title,
      url: item.url,
      content: item.snippet,
      engine: item.source,
    };
    const classification = classifyProductMatch(info, fakeResult);

    if (classification.grade === 'no_match') {
      return { item, score: 0 };
    }

    let score = 0;
    if (classification.grade === 'exact_match') score += 150;
    else if (classification.grade === 'strong_match' || classification.grade === 'equivalent') score += 100;
    else if (classification.grade === 'possible_alternative') score += 60;
    else if (classification.grade === 'related') score += 20;

    // Direct keyword match
    for (const kw of item.keywords) {
      if (normalized.includes(kw) || kw.includes(normalized)) {
        score += 40;
      }
    }

    // Synonym match
    if (info.synonyms?.vietnamese) {
      for (const syn of info.synonyms.vietnamese) {
        if (item.keywords.some((k) => k.includes(syn) || syn.includes(k))) {
          score += 30;
        }
      }
    }

    return { item, score };
  })
    .filter((entry) => entry.score >= 50)
    .sort((a, b) => b.score - a.score);

  const results: BomSearchResult[] = [];
  for (const { item } of scored.slice(0, maxResults)) {
    results.push({
      title: item.title,
      url: item.url,
      content: item.snippet,
      engine: item.source,
    });

    if (item.alternatives) {
      for (const alt of item.alternatives) {
        if (results.length >= maxResults) break;
        results.push({
          title: alt.title,
          url: alt.url,
          content: `${alt.title} từ ${alt.source}`,
          engine: alt.source,
        });
      }
    }
  }

  return results.slice(0, maxResults);
}
