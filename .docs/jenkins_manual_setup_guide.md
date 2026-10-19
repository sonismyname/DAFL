# Hướng Dẫn Các Bước Cấu Hình Jenkins CI/CD Thủ Công (Manual Setup)

> **Mục tiêu:** Hướng dẫn chi tiết từng thao tác cấu hình bằng tay trên giao diện Jenkins Web UI và dòng lệnh để triển khai hệ thống CI/CD cho dự án DAFL.

---

## 1. Yêu Cầu Chuẩn Bị
- Máy đã cài đặt và đang chạy **Docker Desktop**.
- Các cổng `8080`, `3000`, `5000` đang khả dụng.

---

## 2. Các Bước Triển Khai Thủ Công

### Bước 1: Tạo file cấu hình môi trường `.env`
Tại thư mục gốc dự án, tạo file `.env` từ file mẫu `.env.example`:
```bash
cp .env.example .env
```
*(Trên Windows PowerShell có thể gõ `cp .env.example .env` hoặc `Copy-Item .env.example .env`)*.

---

### Bước 2: Khởi động Container Jenkins
1. Mở Terminal và di chuyển vào thư mục Jenkins:
   ```bash
   cd ci/jenkins
   ```
2. Chạy lệnh dựng và khởi động container:
   ```bash
   docker compose -f docker-compose.jenkins.yml up -d --build
   ```

---

### Bước 3: Đăng nhập vào Jenkins
Container Jenkins của DAFL đã được cấu hình tự động bỏ qua màn hình Setup Wizard (`runSetupWizard=false`) và tự khởi tạo sẵn tài khoản quản trị viên thông qua script khởi tạo ([basic_security.groovy](file:///d:/DAFL/ci/jenkins/init.groovy.d/basic_security.groovy)):

1. Mở trình duyệt Web tại địa chỉ: **[http://localhost:8080](http://localhost:8080)**
2. Đăng nhập trực tiếp bằng thông tin tài khoản mặc định:
   - **Tên đăng nhập (Username):** `admin`
   - **Mật khẩu (Password):** `adminpassword123`

> **Lưu ý:** Trường hợp bạn triển khai Jenkins từ image gốc chưa tích hợp script `init.groovy.d`, bạn sẽ cần lấy mật khẩu khởi tạo bằng lệnh `docker exec -it dafl-jenkins cat /var/jenkins_home/secrets/initialAdminPassword` để mở khóa và làm theo hướng dẫn Setup Wizard.

---

### Bước 4: Cài đặt các Plugin Cần Thiết
1. Từ trang chủ, vào menu: **Manage Jenkins** > **Plugins**.
2. Chọn tab **Available plugins**.
3. Tìm kiếm và tích chọn lần lượt các plugin sau:
   - `Pipeline` (hoặc `workflow-aggregator`)
   - `Git`
   - `GitHub`
   - `Docker Pipeline`
   - `HTML Publisher` (để xem báo cáo JMeter)
   - `Allure` (để xem báo cáo kiểm thử Selenium)
   - `JUnit` (để thu thập kết quả test XML)
   - `Pipeline: Stage View` (hiển thị biểu đồ tiến độ stage)
4. Bấm nút **Install** và tích vào ô **Restart Jenkins when installation is complete** để hoàn tất nạp plugin.

---

### Bước 5: Cấu hình Công cụ Allure Commandline
1. Vào menu: **Manage Jenkins** > **Tools**.
2. Cuộn xuống mục **Allure Commandline installations**.
3. Bấm **Add Allure Commandline**:
   - **Name:** Nhập chính xác chữ `allure` (chữ thường).
   - Tick chọn **Install automatically**.
   - Chọn Version: `2.30.0` (từ Maven Central).
4. Nhấn **Save** ở cuối trang.

---

### Bước 6: Cấu hình CSP để Xem Báo Cáo JMeter (Tránh lỗi màn hình trắng)
Jenkins mặc định chặn JavaScript trong báo cáo HTML. Bạn cần mở chính sách CSP như sau:
1. Vào menu: **Manage Jenkins** > **Script Console**.
2. Dán đoạn lệnh sau vào ô nhập và bấm **Run**:
   ```groovy
   System.setProperty("hudson.model.DirectoryBrowserSupport.CSP", "default-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' 'unsafe-eval';")
   ```
3. Màn hình trả về kết quả thành công.

---

### Bước 7: Tạo và Cấu hình Job Pipeline
1. Từ Dashboard chính, bấm **New Item**.
2. Nhập tên: **`DAFL-Pipeline`** > Chọn kiểu **Pipeline** > Bấm **OK**.
3. Tại phần cấu hình Job:
   - **Mục General:**
     - Tick chọn **Discard old builds** > Nhập Max # of builds to keep: `10`.
     - Tick chọn **Do not allow concurrent builds**.
   - **Mục Build Triggers:**
     - Tick chọn **GitHub hook trigger for GITScm polling**.
   - **Mục Pipeline:**
     - **Definition:** Chọn **Pipeline script from SCM**.
     - **SCM:** Chọn **Git**.
     - **Repository URL:** Nhập `https://github.com/sonismyname/DAFL.git`
     - **Branch Specifier:** Nhập `*/develop`
     - **Script Path:** Nhập `Jenkinsfile`
     - Tick chọn **Lightweight checkout**.
4. Nhấn **Save** để lưu Job.

---

### Bước 8: Chạy Thử Nghiệm Pipeline & Xem Báo Cáo
1. Vào trang Job **`DAFL-Pipeline`** vừa tạo.
2. Bấm nút **Build Now** ở menu bên trái.
3. Bấm vào mã lượt build đang chạy (ví dụ `#1`) > Chọn **Console Output** để theo dõi chi tiết.
4. Khi Pipeline chạy thành công (màu xanh lá):
   - Bấm vào **Test Result** để xem kết quả kiểm thử chức năng.
   - Bấm vào **Allure Report** để xem giao diện kiểm thử giao diện tự động.
   - Bấm vào **JMeter Performance Dashboard** để xem biểu đồ đo tải hiệu năng API.

---

### Bước 9 (Tùy chọn): Kết nối GitHub Webhook Tự Động (Khai báo trong Jenkinsfile)
Trong file `Jenkinsfile`, đoạn mã sau đã được viết sẵn để kích hoạt tự động:
```groovy
triggers {
    githubPush()
}
```
- **Cơ chế hoạt động:** Chỉ thị `githubPush()` yêu cầu Jenkins mở cổng đón nhận tín hiệu Webhook từ GitHub tại đường dẫn `/github-webhook/`. Khi có commit mới được đẩy lên nhánh `develop` (`TARGET_BRANCH = 'develop'`), Jenkins sẽ tự động kích hoạt Pipeline.
- **Các bước thiết lập trên GitHub:**
  1. Mở cổng Jenkins ra internet bằng ngrok: `ngrok http 8080`.
  2. Vào GitHub Repo > **Settings** > **Webhooks** > **Add webhook**:
     - **Payload URL:** `https://<ten-mien-ngrok>/github-webhook/` *(bắt buộc có dấu gạch chéo `/` ở cuối)*.
     - **Content type:** `application/json`.
     - **Events:** Chọn **Let me select individual events** > Tick chọn **Pull requests** (hoặc tick cả **Pushes** và **Pull requests** để bắt trọn vẹn sự kiện khi PR được **Merged** vào nhánh `develop`).
  3. Bấm **Add webhook**.
  > **Lưu ý:** Lần đầu tiên sau khi tạo Job, bạn **bắt buộc phải bấm "Build Now" thủ công 1 lần** để Jenkins nạp đoạn mã `triggers { githubPush() }` từ `Jenkinsfile`. Từ các lần sau, khi Pull Request được Merged vào nhánh `develop`, Pipeline sẽ tự động chạy 100%.
