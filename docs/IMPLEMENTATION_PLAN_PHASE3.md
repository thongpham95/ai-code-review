# Giai đoạn 3: Tích hợp Sâu - Kế hoạch Chức năng

**Phiên bản:** 3.0.0
**Mục tiêu:** Quý 3 2026
**Trạng thái:** Đang Lên Kế Hoạch

---

## Tổng quan

Giai đoạn 3 (Phase 3) tập trung vào các tính năng tích hợp sâu nhằm biến ứng dụng AI Code Review từ một sản phẩm độc lập trở thành một phần gắn kết trực tiếp vào quy trình phát triển.

---

## Tính năng 1: Khối Hiển thị Mã Nguồn (Diff View) Nâng cao đi kèm Bình luận AI ✅ HOÀN THÀNH

**Trạng thái:** ✅ Đã hoàn thiện trong phiên bản v2.1.1

### Các hạng mục đã nghiệm thu:
- [x] Giao diện code review thống nhất tương tự GitHub/GitLab
- [x] Lời bình AI được gắn vào vị trí nội tuyến (inline) dưới mỗi file
- [x] Các khối file có khả năng ẩn/hiện, mở rộng thu gọn dễ dàng
- [x] Hiển thị Điểm chất lượng (Quality score)
- [x] Lỗi từ pattern scanner hiển thị nội tuyến
- [x] Copy-to-clipboard nhanh cho riêng từng file
- [x] Khắc phục và cố định cuộn ngang/dọc dễ nhìn
- [x] Tối ưu hóa mật độ giao diện, hiển thị tập trung trên màn hình

---

## Tính năng 2: Liên kết với Git (Đẩy Bình luận/Kết quả lên GitLab/GitHub)

**Độ ưu tiên:** P0 - Tác động Lớn (High Impact)
**Ước lượng Thời gian:** 2-3 tuần

### 2.1 Mục tiêu
- Đẩy trực tiếp tất cả các bình luận kiểm duyệt của AI ngược lại vào Merge Request (MR) trên GitLab hoặc Pull Request (PR) trên GitHub.
- Cho phép người dùng đánh dấu chọn lọc các bình luận muốn đẩy lên.
- Hỗ trợ tranh luận theo chuỗi (thread) được chỉ định trên các dòng mã cụ thể.

### 2.2 Phương pháp Kỹ thuật

#### Phương Án A: Intergration API GitLab (Ưu Tiên Khuyên dùng)
```
Người sử dụng → Tích chọn các bình luận → Gọi POST tới `/api/gitlab/comment` → Gitlab API
```

**Các Endpoints của GitLab API:**
- `POST /projects/:id/merge_requests/:mr_iid/notes` - Thêm bình luận MR chung
- `POST /projects/:id/merge_requests/:mr_iid/discussions` - Thêm một luồng bàn luận (thread)
- `POST /projects/:id/repository/commits/:sha/comments` - Chỉ định bình luận cho từng dòng cụ thể

#### Phương Án B: Intergration API GitHub
```
Người sử dụng → Tích chọn các bình luận → Gọi POST tới `/api/github/comment` → GitHub API
```

**Các Endpoints của GitHub API:**
- `POST /repos/:owner/:repo/pulls/:pull_number/comments` - Đẩy bình luận PR Review
- `POST /repos/:owner/:repo/pulls/:pull_number/reviews` - Tổng kết một bản review hoàn chỉnh

### 2.3 Đầu công việc cần triển khai (Tasks)

#### Backend (Lớp Xử lý)
- [ ] **API-01**: Tạo endpoint `/api/gitlab/push-comments`
  - Đầu vào chấp nhận: reviewId, comments[], mrUrl
  - Ánh xạ định dạng lời bình AI sang khung ghi chú của GitLab
  - Xử lý xác thực đăng nhập (sử dụng Token PAT đã có)

- [ ] **API-02**: Tạo endpoint `/api/github/push-comments`
  - Tính năng và thông số tương đương cho tích hợp GitHub
  - Đọc url gốc và nhận diện tự động nền tảng (detect provider via sourceUrl)

- [ ] **API-03**: Thêm bảng theo dõi bình luận vào cơ sở dữ liệu
  - Theo dõi những bình luận nào đã được đẩy lên thành công
  - Ngăn ngừa tình trạng đẩy đè thông báo trùng lặp

#### Frontend (Lớp Hiển thị)
- [ ] **UI-01**: Thêm nút Nhấn (Button) "Push to GitLab" ra màn hình giao diện review
- [ ] **UI-02**: Các hộp kiểm Checkbox cho tuỳ chọn bình luận
- [ ] **UI-03**: Khung pop-up xác thực hộp thoại trước khi Push
- [ ] **UI-04**: Các trạng thái đèn báo tiến trình quá trình Push (Đã đẩy/Chuẩn bị chờ)

### 2.4 Mô Hình Dữ Liệu Lưu Trữ

```sql
-- Bổ sung vào schema cơ sở dữ liệu hiện hành
CREATE TABLE pushed_comments (
    id TEXT PRIMARY KEY,
    reviewId TEXT NOT NULL,
    commentIndex INTEGER NOT NULL,
    provider TEXT NOT NULL, -- 'gitlab' | 'github'
    externalId TEXT,        -- ID Của GitLab/GitHub Comment gán nhãn ngoài
    pushedAt TEXT NOT NULL,
    FOREIGN KEY (reviewId) REFERENCES reviews(id)
);
```

### 2.5 Luồng Trải nghiệm Người sử Dụng (User Flow)

```
┌─────────────────────────────────────────────────────────────┐
│ Giao diện Chi tiết Review                                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [File: src/app.ts]                                         │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ ☑ Bình Luận AI: "Cân nhắc dùng hằng số ở đoạn này"    │  │
│  │ ☐ Bình Luận AI: "Quên bổ sung bám bắt lỗi error xử lý"│  │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  [Push Phần Chọn Sang GitLab] [Push Toàn Bộ]                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Tính Năng 3: Mô hình RAG / Gắn Ngữ Cảnh Các Document Tài liệu Dữ Kiện Nâng Cao

**Độ ưu tiên:** P1 - Trung Bình Cần Thiết
**Cước phí Công suất Ước Lượng:** 1-2 Tuần

### 3.1 Hiện Trạng Được Chạy
- Đã có khung upload tài liệu cơ bản
- Các hồ sơ này cung cấp trần trụi thẳng qua khối context cho nội dung prompt AI

### 3.2 Hạng mục Tăng Kích Thúc Cần Bồi Đắp (Enhancements)

#### 3.2.1 Kho Lưu Viễn Tài Liệu Kéo Dài Vĩnh Cửu (Persistent Document Library)
- [ ] **DB-01**: Tái cấu hình CSDL đổ bảng upload document vào lưu tồn
- [ ] **DB-02**: Móc kết nối Project với kho riêng rẽ (Không chỉ ghép ở luồng review tạm)
- [ ] **UI-01**: Tái tạo Bảng Trang Màn hỉnh Quản tài nguyên văn thư
- [ ] **UI-02**: Xoay chuyển bộ chọn select thả xuống (dropdown) gắn file riêng lẻ cho review.

#### 3.2.2 Cắt Hàm Phân Thư Tối Ưu Hiểu Ý Ngữ Vựng (Smart Chunking cho tệp lớn)
- [ ] **AI-01**: Chia cắt xẻ nhỏ văn thư tài liệu có dung lượng mảng trật quy cách
- [ ] **AI-02**: Tái Chạy Các khối Embedding (véc-tơ hóa) để trích đoạn đúng điểm mong muốn
- [ ] **AI-03**: Gán chuyển giao trực tiếp đoạn khớp (mẩu nhỏ chunk) tiết kiệm chi phí dán tokens.

#### 3.2.3 Đọc Mở Rộng Hỗ Trợ Đầy Mọi Định Lượng Văn Thư
- [ ] **PARSE-01**: Tệp Markdown (.md)
- [ ] **PARSE-02**: Tệp Plain text (.txt)
- [ ] **PARSE-03**: PDF (cơ cấu nhặt text thông thường)
- [ ] **PARSE-04**: Giải đọc thẳng mã Code để biến tấu giống hệt làm tệp thiết kế

### 3.3 Kiểu Thiết kế Lớp Lưu SQL

```sql
CREATE TABLE documents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    content TEXT NOT NULL,
    type TEXT NOT NULL,        -- Cho phép chỉ: 'markdown' | 'text' | 'pdf' | 'code'
    projectId TEXT,            -- Tuỳ chọn ràng kết project
    userId TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
);

CREATE TABLE review_documents (
    reviewId TEXT NOT NULL,
    documentId TEXT NOT NULL,
    PRIMARY KEY (reviewId, documentId),
    FOREIGN KEY (reviewId) REFERENCES reviews(id),
    FOREIGN KEY (documentId) REFERENCES documents(id)
);
```

### 3.4 Luồng Xài Upload Văn Bằng

```
┌─────────────────────────────────────────────────────────────┐
│ Tuỳ chọn (Settings) → Documents Quản Thư                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📄 API_HUONG_DAN.md            [Delete]                    │
│  📄 CODE_LUAN.txt               [Delete]                    │
│  📄 kientruc_toanhthong.md      [Delete]                    │
│                                                             │
│  [+ Thêm Tài Khoản Tệp Mới Vào Hệ Quy Chiếu Này]            │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Tạo Khởi Mới (New Review) → Ngữ Cảnh Các Mục Documents      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Nhóm lựa các mục chọn liên đới tài liệu gốc:               │
│  ☑ API_HUONG_DAN.md                                        │
│  ☑ CODE_LUAN.txt                                           │
│  ☐ kientruc_toanhthong.md                                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Tính Năng 4: Tính Năng Webhook Đọc Auto Review Kéo Dây Lắp Ngầm (Bonus Yếu Tố Phụ)

**Độ Ưu Tiên Mức:** P2 - Tính Nổi Bật Bổ Sung Tiện Dung (Nice to Have)
**Định Mức Lịch Điểm:** 1 Tuần Xử Lưu

### 4.1 Cơ chế Tác Dụng Xoáy Hoạt
- Mắc cổng Webhooks (Móc Nhận tín hiệu động) Của GitLab/GitHub gọi Tín chạy AutoReview với Mới Kéo MR/PR
- Kéo Nhận Bào Thử Cấu Hình sau chót trả Mảng Quả trực thăng Nhảy Trả Cổng Commit Lại (Comment Trả)

### 4.2 Triển Phát Lộ Làm Mã Hành Động 
- [ ] **HOOK-01**: Đúc Điểm Endpoint Máy Nhạn Tín Webhook ở `/api/webhooks/gitlab`
- [ ] **HOOK-02**: Parser Trình Đoạn Lắng Khía Cạnh Hành Động Biến Chủng Sự Kiện MR 
- [ ] **HOOK-03**: Bấm Đường Bơm Xích Bắn Máy AI Đích Auto Review Triển Duyệt
- [ ] **HOOK-04**: Lực Đẩy Bình Đổ Code Trở Trả Nơi Bằng MR Lại Cho Đội Dev Phát (Auto-post)

---

## Bảng Cân Bày Bố Cục Và Đường Thời Lộ Giai Tuyến (Timeline)

| Tính Năng (Feature) | Độ Quan Tâm (Priority) | Gia Thành Độ Căng (Effort) | Thước Điểm Chỉ Đỉnh (Target) |
|---------|----------|--------|--------|
| Giao Diện Diff Kép Phong Phú (Rich Diff View) | P0 | - | ✅ Đoạt Rồi (Done) |
| Cổng Kết Nối Đường GiT (Git Integration) | P0 | Tầm Quanh 2-3 Weeks (Tuần)| Của Tuần 1-3 |
| Siêu RAG Thu Nạp Sắc Rõ Dần Dữ Ý AI (RAG Enhance) | P1 | Từ 1 - Mức Cao 2 Tuần Cỡ Dài | Của Quanh 4-5 |
| Bắn Ngầm Tự Chạy Kéo Báo Hook (Webhook Auto) | P2 | Ròng Trọn Chấm 1 Tuần | Hạn Kết 6 |

---

## Ràng Buộc Các Yếu Tố Khớp Mắc Cho Ắp Kế Cầu Khống (Dependencies Phụ Cấp)

1. **Thẻ Chốt Đeo Mã GitLab/GitHub PAT (Giao Mã Định Hình Cá Thể Cổng Token)** - Bày Lên Sẵn Từ Giai OAuth
2. **Chi Trục Rung Đồng Bàn Mảng Cày SQLite (Sửa Bản Khung Nền Schema Database updates)** - Khởi Sắc Dò Cần Tạo Kháng Cứ Ghi Code Tráo Đổi (Migration)
3. **Giới Hạn Vận Hành Chắn Limit Rải Kéo Của Git (Hàng Giới Hạn Cập Cầu APIs Mức Chuẩn rate limits)** - Nhu Lực Mềm Đở Bê Gracefully Dịu Cách Không Mòn.

---

## Thước Đo Sát Thù Định Chuẩn Cầu Kết Trái Thắng Đo Thành Công Nhất  Đạt Thành Tự(Success Metrics Kiểm Chuẩn Đạt Khá)

- [ ] Lập trình Lái Web Kéo Gắn Chọn Comment Dẫn Thêm Đẩy Mạnh Vào Khung Báo MR
- [ ] Nội Lệnh Y Báo Phục Hưng Sẽ Không Bị Hỏng Mã Điểm Diff Xem Qua Thước Gắn Chuẩn Chế Cáo Nền 
- [ ] Rừng Lưu Băng Trải Documents Tại Hồ File Chứa Database Có Mặt Theo Sau Hoàn Tất Băng Đổi Ngắt Điện Chờ (Sống Lâu)
- [ ] Cỡ Bản Siêu Đại Bàng Bự Có Mảng Cào Tệp Nặng Kí Không Còn Trở Ngại Hoà Mảng Tốt Hiểu Nhanh  Lên Xé Phỏng Nhỏ Tình Theo Độ Chunking Sắc Chỉnh  

---

## Những Nốt Bắt Điểm Hướng Hàng (Next Steps Trạm Bám Bước Đầu Tiết Tháo Tới Tiếp Định Kỳ Làm) 

1. **Khấp Tức Liền Chống (Ngay Giờ Này Phút Làm Ngay):** Đổi Cập Bản Chảo Phổ Khung Yêu Quy Khảo PRD.md Thả Cho Liền Nhập Thể Chi Tiết Của Phase Bàn 3 Móc Đinh Liền Nhựa Nhẵn
2. **Lo Lo Bước Làm Đầu Tuần Thử Số 1 (Vô Tuần Khởi Dấn):** Bơm Viết Đào Tuyến Tuyết Sứ Trình Mở Đạo Git (Chạy Ép Gitlab Quá Cứng Nên Làm Đầu Làm Tới Lấy Test Cho Khoẻ Tự Sải Tiền Trạch Giờ Cấp).
3. **Mốc Tuyến Cho Tuần Kháng Sinh Số 3 (Thử Đạn Kiểm Án Tại Kho GitLab Số 3):** Tái Mộc Gắn Link Sống Cho GitLab Chạy Phá Cửa Có Cấp Báo Rằng Vị Ngữ Đúng Mạng Thông Cho Nhau Hiểu Dừng Hay Ko Cổng Gắn.
4. **Vị Đường Dời Cho Tuần Lưu Rạch Số 4 (Lách Tuyến Khôn Ra Cánh RAG Siêu Xịn Khôn Mãn Số 4):** Biến Hoá Kéo Bắp Mô Hình Văn Giải AI Tài Liệt Thư Viện Kiến Kiến Thức Code Ghi Code Giải Luật .
5. **Gói Mốc Tận Hạng Tại Đường Tuyến Cáo Trắng Tuần Số Lộc 6 (Bật Công Web Tự Nghe Nóng Tiếng Bước Máy Số 6):** Cắt Xả Máy Sinh Khởi Mát Đẩy Phun Ngược Auto Cấp Nguyền Webhook Thả (Tuỳ Ngấm Tự Biến Nguồn Vốn Quỹ Thời Cho Chảo Trống Tuỳ Cơ Rẽ Lửa Nước Tràn Nếu Hết Không Còn Chỗ Thi Phát Đạt Tín Ngưỡng Đua Kịp) .

---

## Ghi Nhớ Nghe Dặn Kèm (Notes)
- Băng Hình Tạo Màu Mẽ Cho Diff Nổi Răng Cưa Rich Bày Sắc Nhận View Đã Trọn Cầm Phiên Cho Quản Mảng Bước Phase 2 Làm Chuốc Làm Cho Rồi Phiên Qua v2.1.1 Xong Chấm Đứt Mảng Món Kéo Lời Cho Phase (Hoàng Thiện Rồi Làm Cái Khác).
- Bổ Máy Đi GiT Có Nguồn Thuận Phát Sinh Rẽ Có Món Trí Mùi Giá Nhãn Là Thứ Đập Đầu Ngôi To Lớn Tại Kì Bàn Định Phán Khai Trọng Phase Sàn  Kéo 3
- Hệ Thông RAG Document Vón Cục Bào Ra Nho Nho Khớp Răng Từ Dáng Lõi Máy Tài Liệu Cho Phép Hiện Thực Làm Cho Trở Thành Công Thủ Mở Rộng Ứng Nghiệm Thư To.
