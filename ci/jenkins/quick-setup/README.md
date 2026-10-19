# Jenkins Quick Setup (Tự động 100%)

Thư mục này chứa toàn bộ cấu hình **Zero-touch Jenkins as Code (JCasC)** giúp khởi chạy Jenkins tự động hoàn toàn chỉ với 1 câu lệnh mà không cần cấu hình bằng tay trên web UI.

### Tính năng tự động:
1. **Cài đặt sẵn toàn bộ plugins**: `workflow-aggregator`, `git`, `github`, `docker-workflow`, `htmlpublisher`, `allure-jenkins-plugin`, `junit`, `pipeline-stage-view`, `configuration-as-code`, `job-dsl`.
2. **Cài đặt sẵn Allure Commandline 2.30.0**: Sẵn sàng hiển thị Allure Dashboard cho Selenium E2E Test.
3. **Tự tạo tài khoản Admin**: `admin` / `adminpassword123`.
4. **Tự cấu hình CSP**: Để xem JMeter Performance Dashboard.
5. **Tự động tạo Job Pipeline**: Job `DAFL-Pipeline` trỏ sẵn vào `Jenkinsfile` trên nhánh `develop`.

---

### Hướng dẫn chạy:

1. Di chuyển vào thư mục này:
   ```bash
   cd ci/jenkins/quick-setup
   ```

2. Khởi động (nếu trước đó đã chạy bản cũ, nên xóa volume trước bằng lệnh `docker compose -f docker-compose.jenkins.yml down -v`):
   ```bash
   docker compose -f docker-compose.jenkins.yml up -d --build
   ```

3. Mở trình duyệt: `http://localhost:8080`
   * Đăng nhập: `admin` / `adminpassword123`.
   * Job `DAFL-Pipeline` đã có sẵn, chỉ cần bấm **Build Now**.
