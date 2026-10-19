# Hướng Dẫn Triển Khai Nhanh Jenkins CI/CD (Quick-Setup)

> **Mục tiêu:** Dựng máy chủ Jenkins CI/CD hoàn chỉnh và kích hoạt Pipeline kiểm thử tự động của DAFL chỉ trong vài bước đơn giản.

---

## 1. Yêu Cầu Chuẩn Bị
- Đã cài đặt và đang bật **Docker Desktop** (hoặc Docker Engine).
- Cổng `8080`, `3000`, `5000` trên máy không bị ứng dụng khác chiếm dụng.

---

## 2. Các Bước Triển Khai Chi Tiết

### Bước 1: Tạo file cấu hình môi trường `.env`
Tại thư mục gốc dự án, tạo file `.env` từ file mẫu `.env.example`:
```bash
cp .env.example .env
```
*(Trên Windows PowerShell bạn có thể gõ `cp .env.example .env` hoặc `Copy-Item .env.example .env`)*.

### Bước 2: Di chuyển vào thư mục quick-setup
```bash
cd ci/jenkins/quick-setup
```

### Bước 3: Dọn dẹp dữ liệu cũ (Khuyến nghị để khởi tạo sạch)
Nếu trước đó bạn đã từng khởi động Jenkins, hãy xóa dữ liệu cũ để tránh xung đột cấu hình:
```bash
docker compose -f docker-compose.jenkins.yml down -v
```

### Bước 4: Khởi chạy Jenkins
Chạy lệnh sau để build và khởi động Jenkins dưới nền:
```bash
docker compose -f docker-compose.jenkins.yml up -d --build
```
> **Ghi chú:** Quá trình này sẽ tự động cài sẵn Docker CLI, Allure CLI 2.30.0, 10 plugins cần thiết và tự tạo tài khoản Admin cùng Job Pipeline sẵn có.

### Bước 5: Kiểm tra trạng thái khởi động
Chạy lệnh xem log:
```bash
docker logs -f dafl-jenkins
```
Khi thấy thông báo `Jenkins is fully up and running`, nhấn `Ctrl + C` để dừng xem log.

### Bước 6: Đăng nhập vào Jenkins
1. Mở trình duyệt Web và truy cập: **[http://localhost:8080](http://localhost:8080)**
2. Đăng nhập với tài khoản được tạo tự động:
   - **Tên đăng nhập (Username):** `admin`
   - **Mật khẩu (Password):** `adminpassword123`

### Bước 7: Chạy Pipeline kiểm thử & triển khai
1. Tại màn hình Dashboard chính, bấm vào Job **`DAFL-Pipeline`** đã được tạo sẵn.
2. Bấm nút **Build Now** ở thanh menu bên trái.
3. Jenkins sẽ tự động thực hiện các giai đoạn:
   - **Stage 1 (Checkout):** Kéo code nhánh `develop` và tạo worktree.
   - **Prepare SUT:** Dựng hệ sinh thái SUT (Postgres, Kafka, Backend, Frontend).
   - **Stage 2 & 3 (Selenium):** Chạy kiểm thử tự động luồng mua hàng và kiểm tra Quality Gate chức năng.
   - **Stage 4 & 5 (JMeter):** Bắn tải hiệu năng API và kiểm tra Quality Gate hiệu năng.
   - **Deploy Production:** Tự động cập nhật phiên bản mới của ứng dụng.

### Bước 8: Xem báo cáo kiểm thử
Sau khi quá trình Build hoàn tất:
- **Xem kết quả Test Unit/Functional:** Bấm vào **Test Result** ở menu bên trái lượt build.
- **Xem giao diện Allure:** Bấm vào icon **Allure Report** ở thanh menu.
- **Xem biểu đồ tải JMeter:** Bấm vào link **JMeter Performance Dashboard**.

---

### Bước 9 (Tùy chọn): Cấu hình Webhook Tự Động Kích Hoạt (Khai báo trong Jenkinsfile)
Trong file `Jenkinsfile`, khối trigger tự động được cấu hình sẵn như sau:
```groovy
triggers {
    githubPush()
}
```
- **Cơ chế hoạt động:** Chỉ thị `githubPush()` yêu cầu Jenkins tự động lắng nghe Webhook HTTP POST từ GitHub gửi về endpoint `/github-webhook/`. Khi có commit mới được `git push` lên nhánh `develop` (khai báo tại `TARGET_BRANCH = 'develop'`), Jenkins sẽ tự động kích hoạt Pipeline chạy mà không cần bấm "Build Now" thủ công.
- **Cách kết nối với GitHub:**
  1. Mở cổng Jenkins ra ngoài internet (nếu chạy local) bằng ngrok: `ngrok http 8080`.
  2. Vào GitHub Repo > **Settings** > **Webhooks** > **Add webhook**:
     - **Payload URL:** `https://<ten-mien-ngrok>/github-webhook/` *(bắt buộc có dấu gạch chéo `/` ở cuối)*.
     - **Content type:** `application/json`.
     - **Events:** Chọn **Let me select individual events** > Tick chọn **Pull requests** (hoặc tick cả **Pushes** và **Pull requests** để bắt trọn vẹn sự kiện khi PR được **Merged** vào nhánh `develop`).
  3. Bấm **Add webhook**.
  > **Lưu ý:** Bạn cần bấm **Build Now** thủ công 1 lần đầu tiên để Jenkins nạp `triggers { githubPush() }` từ `Jenkinsfile`. Từ các lần sau, khi Pull Request được Merged vào nhánh `develop`, Webhook sẽ tự động kích hoạt Pipeline 100%.

---

## 3. Các Lệnh Quản Trị Cần Biết
```bash
# Khởi động lại Jenkins
docker compose -f ci/jenkins/quick-setup/docker-compose.jenkins.yml restart

# Dừng Jenkins (vẫn giữ lại lịch sử build)
docker compose -f ci/jenkins/quick-setup/docker-compose.jenkins.yml down

# Dừng và xóa toàn bộ dữ liệu để làm mới từ đầu
docker compose -f ci/jenkins/quick-setup/docker-compose.jenkins.yml down -v
```
