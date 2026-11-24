# GIA PHẢ GIA ĐÌNH — VIETNAMESE FAMILY GENEALOGY PLATFORM

Hệ thống quản lý phả hệ gia tộc, biểu diễn mạng lưới huyết thống đa cành nhánh và suy luận cách xưng hô chuẩn phong tục Nam Bộ.

---

## 1. TỔNG QUAN DỰ ÁN

**Gia Phả Gia Đình** là nền tảng phả hệ toàn diện được xây dựng nhằm giải quyết các bài toán phức tạp trong cây gia phả Việt Nam:
- Mô hình đồ thị quan hệ trực hệ và bàng hệ đa chiều (Graph-based Genealogy), không bị giới hạn trong cây nhị phân đơn thuần.
- Công cụ suy luận danh xưng và cách gọi họ hàng hai chiều (Bidirectional Kinship Inference Engine) theo chuẩn tập quán miền Nam ("Bác Hai", "Chú Ba", "Cậu Tư", "Dì Út", "Thím", "Mợ", "Dượng", v.v.).
- Ưu tiên thứ bậc cành họ (*"Bé bằng củ khoai, cứ vai mà gọi"*): Tự động xác định vai vế anh em họ (con chú con bác, con cô con cậu) dựa vào thứ tự cành nhánh của đời cha/mẹ thay vì tuổi tác sinh học.
- Hệ thống ghi đè xưng hô 3 cấp độ (3-Level Overrides):
  - **Level 1 (Toàn cục):** Thiết lập quy chuẩn toàn gia tộc (ví dụ: gọi "Ba" thay vì "Cha", "Má" thay vì "Mẹ").
  - **Level 2 (Nhánh họ):** Quy ước riêng của từng chi tộc / nhánh họ.
  - **Level 3 (Cá nhân):** Ghi đè cách gọi cụ thể giữa 2 người (ví dụ: cháu gọi dì là "Dì Hai Nhỏ").
- Quản lý đa nhánh gia tộc: Phân chia các nhánh Nội tộc, Ngoại tộc, Cành trưởng, Thông gia nhưng giữ nguyên mã định danh duy nhất (Canonical ID) của mỗi cá nhân, không nhân bản dữ liệu.
- Phát hiện trùng lặp & sáp nhập hồ sơ (Duplicate Detection & Merge): Thuật toán so khớp điểm tương đồng theo họ tên, năm sinh, quê quán, quan hệ thân tộc và hỗ trợ sáp nhập hồ sơ an toàn, tự động chuyển tiếp quan hệ.
- Nhập xuất dữ liệu chuẩn quốc tế GEDCOM 5.5.1 và JSON sao lưu đầy đủ.

---

## 2. CÔNG NGHỆ SỬ DỤNG (TECH STACK)

- **Framework:** Next.js (App Router) & React
- **Ngôn ngữ:** TypeScript (Chế độ Strict Type Checking)
- **Styling:** Tailwind CSS & Lucide React
- **Đồ họa & Sơ đồ:** React Flow (`@xyflow/react`)
- **Thuật toán bố cục:** ELK.js (`elkjs`) Layered Layout Engine
- **Xác thực & Cơ sở dữ liệu:** Firebase Auth, Cloud Firestore, Firebase Storage & Firebase Admin SDK
- **Kiểm thử tự động:** Vitest & React Testing Library (27 tests kiểm tra toàn diện đồ thị, xưng hô, sáp nhập, nhập xuất)
- **Triển khai:** Tương thích chuẩn Vercel và Firebase Hosting

---

## 3. CẤU TRÚC THƯ MỤC

```text
gia-pha-web/
├── src/
│   ├── app/
│   │   ├── globals.css              # Định nghĩa kiểu dáng và theme
│   │   ├── layout.tsx               # Khung bố cục chính tiếng Việt
│   │   └── page.tsx                 # Trang chủ tích hợp sơ đồ, thanh công cụ và quản trị
│   ├── components/
│   │   ├── admin/
│   │   │   ├── AdminDashboard.tsx           # Bảng điều khiển quản trị tổng thể
│   │   │   ├── PersonFormModal.tsx          # Biểu mẫu thêm/sửa thành viên
│   │   │   ├── RelationshipFormModal.tsx    # Biểu mẫu thêm liên kết quan hệ
│   │   │   ├── DuplicateDetectorModal.tsx   # Modal đối chiếu & sáp nhập hồ sơ trùng
│   │   │   └── DataImportExportModal.tsx    # Modal xuất nhập JSON & GEDCOM
│   │   ├── graph/
│   │   │   ├── FamilyGraphCanvas.tsx        # Vùng vẽ phả đồ tương tác React Flow
│   │   │   ├── PersonNode.tsx               # Node thành viên mang phong cách truyền thống
│   │   │   └── GraphControls.tsx            # Thanh công cụ: zoom, tìm kiếm, lọc nhánh, đổi góc nhìn
│   │   └── profile/
│   │       ├── PersonProfileDrawer.tsx      # Ngăn kéo thông tin chi tiết cá nhân
│   │       ├── KinshipCalculatorModal.tsx   # Hộp thoại tính toán cách xưng hô 2 chiều
│   │       └── KinshipOverrideModal.tsx     # Hộp thoại ghi đè xưng hô thủ công
│   ├── domain/
│   │   ├── graph/
│   │   │   ├── familyGraph.ts           # Cấu trúc đồ thị phả hệ trong bộ nhớ
│   │   │   ├── graphCycleDetector.ts    # Thuật toán chặn chu trình huyết thống bất hợp lý
│   │   │   ├── graphTraversal.ts        # Thuật toán tìm đường đi & trích xuất phả hệ
│   │   │   └── lcaDetector.ts           # Phát hiện tổ tiên chung gần nhất (LCA)
│   │   ├── kinship/
│   │   │   ├── kinshipClassifier.ts     # Phân loại quan hệ họ hàng chuẩn tắc
│   │   │   ├── southernVietnameseEngine.ts # Bộ máy sinh từ xưng hô Nam Bộ
│   │   │   ├── kinshipExplainer.ts      # Bộ tạo câu giải thích quan hệ tự nhiên
│   │   │   └── kinshipInference.ts      # Điều phối suy luận chính & áp dụng ghi đè
│   │   └── models/
│   │       ├── person.ts                # Định nghĩa dữ liệu Person & PartialGenealogicalDate
│   │       ├── relationship.ts          # Định nghĩa Relationship (Parent-Child, Partnership, Sibling)
│   │       ├── branch.ts                # Định nghĩa nhánh gia tộc (Branch)
│   │       ├── naming.ts                # Quy ước xưng hô & Ghi đè (KinshipOverride)
│   │       ├── kinship.ts               # Kết quả tính toán xưng hô (KinshipResult)
│   │       └── audit.ts                 # Nhật ký kiểm toán thay đổi dữ liệu
│   └── lib/
│       ├── firebase/
│       │   ├── config.ts                # Cấu hình Firebase & phát hiện Local Dev Mode
│       │   ├── client.ts                # Khởi tạo Firebase Web SDK
│       │   └── admin.ts                 # Khởi tạo Firebase Admin SDK
│       ├── gedcom/
│       │   ├── gedcomExporter.ts        # Xuất dữ liệu sang định dạng GEDCOM 5.5.1
│       │   └── gedcomParser.ts          # Đọc dữ liệu từ file GEDCOM
│       ├── layout/
│       │   └── elkLayout.ts             # Bộ xếp đặt vị trí tự động ELK.js
│       ├── storage/
│       │   ├── repository.ts            # Giao diện kho lưu trữ chuẩn
│       │   ├── inMemoryRepository.ts    # Kho lưu trữ nội bộ hỗ trợ LocalStorage
│       │   ├── firestoreRepository.ts   # Kho lưu trữ Firebase Firestore đám mây
│       │   ├── sampleData.ts            # Bộ dữ liệu mẫu thực tế 4 thế hệ Nam Bộ
│       │   └── index.ts                 # Factory cung cấp Repository phù hợp
│       └── utils/
│           ├── cn.ts                    # Tiện ích kết hợp Tailwind class
│           └── dateFormatter.ts         # Định dạng ngày tháng phả hệ linh hoạt
├── firestore.rules                      # Bộ quy tắc bảo mật Firestore nghiêm ngặt
├── storage.rules                        # Bộ quy tắc bảo mật Cloud Storage
├── firestore.indexes.json               # Cấu hình index tối ưu truy vấn quan hệ & audit
├── .env.example                         # Mẫu biến môi trường chi tiết
└── vitest.config.ts                     # Cấu hình kiểm thử Vitest
```

---

## 4. HƯỚNG DẪN CÀI ĐẶT & CHẠY LOCAL (LOCAL DEVELOPMENT MODE)

Ứng dụng được tích hợp sẵn **Chế độ phát triển nội bộ (Local Dev Mode)**: Tự động sử dụng `LocalStorage` và dữ liệu mẫu phong phú 4 thế hệ mà không bắt buộc phải có tài khoản Firebase ngay lập tức. Dữ liệu thay đổi được lưu bền vững trên trình duyệt qua các lần tải lại trang!

### Bước 1: Cài đặt thư viện phụ thuộc
```bash
cd "c:\Tiến Sĩ\gia-pha-web"
npm install --legacy-peer-deps
```

### Bước 2: Kích hoạt biến môi trường
File `.env.local` đã được tạo sẵn với cấu hình:
```env
NEXT_PUBLIC_LOCAL_DEV_MODE=true
```

### Bước 3: Chạy ứng dụng ở chế độ phát triển
```bash
npm run dev
```
Mở trình duyệt tại: `http://localhost:3000`

### Bước 4: Chạy kiểm thử tự động (Test Suite)
```bash
npm test
```
Tất cả 27 bài kiểm thử cho logic gia phả, thuật toán đồ thị, xưng hô và sao lưu sẽ được thực thi qua Vitest.

### Bước 5: Kiểm tra biên dịch Production
```bash
npm run build
```

---

## 5. HƯỚNG DẪN KẾT NỐI FIREBASE & TRIỂN KHAI VERCEL

### 5.1. Cấu hình Firebase
1. Truy cập [Firebase Console](https://console.firebase.google.com/) và tạo một dự án mới (ví dụ: `gia-pha-web`).
2. Vào **Authentication** -> Bật phương thức đăng nhập bằng Email/Password hoặc Google.
3. Vào **Firestore Database** -> Chọn **Create Database**.
4. Vào **Project Settings** -> Thêm ứng dụng Web để lấy các thông số Client SDK.
5. Tạo Service Account: Vào **Project Settings** -> **Service Accounts** -> Nhấn **Generate new private key** để lấy `client_email` và `private_key` cho Firebase Admin SDK.
6. Cập nhật các biến vào `.env.local` hoặc cấu hình Vercel Environment Variables:
   ```env
   NEXT_PUBLIC_LOCAL_DEV_MODE=false
   NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=gia-pha-web.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=gia-pha-web
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=gia-pha-web.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
   NEXT_PUBLIC_FIREBASE_APP_ID=1:...

   FIREBASE_PROJECT_ID=gia-pha-web
   FIREBASE_CLIENT_EMAIL=...
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   ADMIN_PRIMARY_UID=<UID_cua_Admin>
   ```
7. Triển khai Rules lên Firebase:
   ```bash
   firebase deploy --only firestore:rules,storage,firestore:indexes
   ```

### 5.2. Triển khai lên Vercel
1. Đẩy mã nguồn lên kho chứa GitHub / GitLab.
2. Đăng nhập vào [Vercel](https://vercel.com/) -> **Add New Project** -> Chọn kho chứa `gia-pha-web`.
3. Trong phần **Environment Variables**, điền các biến môi trường từ `.env.example`.
4. Nhấn **Deploy**.

---

## 6. KỊCH BẢN NGHIỆM THU (ACCEPTANCE SCENARIO)

Quản trị viên có thể thực hiện toàn bộ kịch bản nghiệp vụ:
1. Mở trang chủ ứng dụng -> Sơ đồ dòng họ Nguyễn Văn hiển thị với 4 thế hệ được sắp xếp tự động bằng thuật toán phân tầng ELK.js.
2. Chọn bất kỳ thành viên nào (ví dụ: "Nguyễn Văn Hùng - Con của Bác Hai") -> Mở ngăn kéo xem thông tin chi tiết.
3. Nhấn nút **"Cách xưng hô"** -> Hệ thống hiển thị:
   - "Tôi (Nguyễn Văn Minh) gọi đối phương là: **Anh họ**"
   - "Đối phương gọi tôi là: **Em họ**"
   - Giải thích: Do Nguyễn Văn Hùng thuộc nhánh cành trưởng (Bác Hai), theo phong tục Nam Bộ, người thuộc cành dưới dù lớn hay nhỏ tuổi hơn đều xưng hô theo vai vế cành họ.
4. Nhấn **"Chỉnh sửa cách xưng hô (Ghi đè)"** -> Đặt từ xưng hô tùy chỉnh: "Anh Hai Hùng", xưng "Em Hai Minh" -> Lưu lại.
5. Tải lại trang (F5) -> Ghi đè vẫn tồn tại chính xác (Lưu bền vững), trong khi sơ đồ và mối quan hệ huyết thống gốc không hề bị biến đổi.
6. Chuyển đổi "Tôi là" từ Admin Minh sang "Nguyễn Văn Khang" (Em họ) -> Hệ thống tự động tính toán lại toàn bộ danh xưng hai chiều tương ứng.
7. Mở **Bảng quản trị** -> Thêm thành viên mới, thêm quan hệ, kiểm tra chống chu trình huyết thống (tự làm cha của chính mình hoặc tổ tiên bị từ chối với thông báo tiếng Việt rõ ràng).
8. Mở **Sao lưu & Xuất nhập** -> Tải file JSON hoặc GEDCOM -> Dữ liệu được bảo toàn nguyên vẹn.
