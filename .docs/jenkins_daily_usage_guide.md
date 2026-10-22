# Hướng Dẫn Dùng Jenkins Hằng Ngày

> Tài liệu này dành cho máy **đã cài xong Docker và đã dựng Jenkins một lần**. Chỉ có 2 việc:
> 1. **Bật / tắt Jenkins** để chạy kiểm thử tự động toàn bộ dự án.
> 2. **Chạy thử nhanh một tính năng** bằng `run-e2e-ui.bat` (xem Chrome tự bấm trên màn hình).
>
> Cài đặt lần đầu: xem [jenkins_quick_setup_guide.md](./jenkins_quick_setup_guide.md).

---

## Phần A. Bật Jenkins và chạy kiểm thử toàn bộ

### Bước 1. Bật Jenkins

Mở terminal, gõ lần lượt:

```bash
cd ci/jenkins/quick-setup
docker compose -f docker-compose.jenkins.yml up -d
```

> ⚠️ **Phải gõ đủ `-f docker-compose.jenkins.yml`.** Nếu gõ thiếu, Docker sẽ bật nhầm cả ứng dụng (Postgres, Kafka, Backend, Frontend) thay vì Jenkins.

Đợi khoảng 20 giây rồi mở trình duyệt: **http://localhost:8080**

- Tài khoản: `admin`
- Mật khẩu: `adminpassword123`

### Bước 2. Chạy kiểm thử

1. Bấm vào job **`DAFL-Pipeline`**.
2. Bấm **Build Now** (menu bên trái).
3. Bấm vào số lượt build vừa xuất hiện (ví dụ `#1`) → **Console Output** để xem tiến trình.

Chờ đến khi build có dấu ✅ xanh (thành công) hoặc ❌ đỏ (có lỗi).

### Bước 3. Xem kết quả

Vào trang của lượt build, bấm:

| Muốn xem | Bấm vào |
|---|---|
| Test nào đạt / không đạt | **Test Result** hoặc **Allure Report** |
| Biểu đồ kiểm thử tải | **JMeter Performance Dashboard** |

### Bước 4. Tắt Jenkins khi dùng xong

```bash
docker compose -f docker-compose.jenkins.yml down
```

Lịch sử build vẫn được giữ lại. Lần sau chỉ cần làm lại Bước 1.

> ⚠️ **Hai điều cần nhớ khi dùng Jenkins**
> - Jenkins kiểm thử code **đã đẩy lên GitHub, nhánh `develop`**, không phải code đang sửa trên máy bạn. Muốn kiểm thử thay đổi mới, phải push và merge vào `develop` trước.
> - Khi build chạy, **ứng dụng đang chạy trên máy bạn sẽ bị thay bằng bản mới** (cổng 3000 và 5000). Đừng build khi đang dùng ứng dụng cho việc khác.
> - Tắt Jenkins **không** tắt ứng dụng. Muốn tắt ứng dụng: ở thư mục gốc repo gõ `docker compose down`.

### Trước khi bật Jenkins, kiểm tra nhanh

- Docker đang chạy: gõ `docker info` không báo lỗi.
- Có file `.env` ở thư mục gốc repo. Chưa có thì gõ: `cp .env.example .env`
- Cổng `8080` đang trống (không có chương trình khác dùng).

---

## Phần B. Chạy thử nhanh MỘT tính năng bằng `run-e2e-ui.bat`

Dùng khi bạn **không muốn chạy cả Jenkins**, chỉ muốn thử một tính năng (ví dụ trang chủ, giỏ hàng) và **tận mắt thấy Chrome tự mở lên rồi tự bấm**.

File nằm ở: `tests/functional-selenium/run-e2e-ui.bat`

### Cần chuẩn bị (làm một lần)

1. Cài **Java 17** và **Google Chrome**.
2. Có **Maven**. Script tìm Maven ở `tests\functional-selenium\.tools\apache-maven\bin\mvn.cmd`. Thư mục `bin` này **không có sẵn trong repo**, nên nếu chạy script mà báo:

   ```
   [ERROR] Khong tim thay Maven tai: ...
   ```

   thì tải Apache Maven (https://maven.apache.org/download.cgi, bản "Binary zip"), giải nén, rồi **chép thư mục `bin`** trong đó vào `tests\functional-selenium\.tools\apache-maven\`.
3. Lần chạy đầu cần **Internet** (tải thư viện và ChromeDriver).

### Mỗi lần chạy

**Bước 1. Bật ứng dụng** (ở thư mục gốc repo):

```bash
docker compose up -d
```

Mở thử http://localhost:3000 trong trình duyệt, thấy trang DAFL Store là được.

**Bước 2. Chạy test** (trên Windows, mở `cmd` hoặc PowerShell):

```bat
cd tests\functional-selenium
run-e2e-ui.bat HomePageTest
```

Chrome sẽ tự mở và tự thao tác. Chờ đến khi hiện `[DONE] Hoan tat kiem thu E2E!` rồi bấm phím bất kỳ để đóng.

### Chọn tính năng muốn chạy

Thay `HomePageTest` ở lệnh trên bằng tên trong cột giữa:

| Tính năng | Tên để gõ |
|---|---|
| Trang chủ, thanh tìm kiếm, nút đổi sáng/tối | `HomePageTest` |
| Danh sách sản phẩm, mở giỏ hàng | `CatalogAndCartTest` |
| Hộp thoại đăng nhập / đăng ký | `AuthModalTest` |
| Mua hàng từ đầu đến cuối (tìm → thêm giỏ → thanh toán giả lập) | `CheckoutE2ETest` |

Ví dụ khác:

```bat
run-e2e-ui.bat AuthModalTest                  :: chạy một tính năng
run-e2e-ui.bat "HomePageTest,AuthModalTest"   :: chạy hai tính năng
run-e2e-ui.bat                                :: không gõ gì = chạy tất cả
```

### Đọc kết quả

Nhìn các dòng cuối trong cửa sổ lệnh, tìm dòng có dạng:

```
Tests run: 2, Failures: 0, Errors: 0, Skipped: 0
```

- `Failures: 0, Errors: 0` → **tất cả đạt** ✅
- Số khác 0 → **có test lỗi** ❌

> ⚠️ Dòng `BUILD SUCCESS` **không** có nghĩa là test đạt (dự án cố ý để Maven luôn báo thành công). Hãy xem dòng `Tests run` ở trên.

Chi tiết lỗi nằm trong thư mục `tests\functional-selenium\target\surefire-reports\`.

### Dùng Linux / macOS?

Không có file `.bat`, nhưng chạy được bằng Maven đã cài trên máy:

```bash
cd tests/functional-selenium
mvn test -Dtest=HomePageTest -DsuiteXmlFile= -Dheadless=false -Dapp.url=http://localhost:3000
```

Đổi `HomePageTest` thành tên tính năng khác trong bảng ở trên. Máy không có màn hình (ví dụ SSH)? Đổi `-Dheadless=false` thành `-Dheadless=true`.

> 💡 Test `CheckoutE2ETest` cần backend ở chế độ demo PayOS. Cứ để nguyên các dòng `your_payos_*_here` trong `.env` là đúng chế độ này.

---

## Phần C. Gặp lỗi thì làm gì

| Lỗi | Cách xử lý |
|---|---|
| `port is already allocated` (cổng 8080) | Có chương trình khác đang dùng cổng 8080. Tắt nó đi rồi bật lại Jenkins |
| Bật Jenkins mà thấy Postgres/Kafka/Backend chạy theo | Bạn quên `-f docker-compose.jenkins.yml`. Gõ `docker compose down` ở thư mục gốc repo để tắt |
| `The container name "/dafl-jenkins" is already in use` | Gõ `docker rm -f dafl-jenkins` rồi bật lại. Dữ liệu không mất |
| Mở http://localhost:8080 chưa được | Đợi thêm 1–2 phút. Vẫn không được: gõ `docker logs --tail 100 dafl-jenkins` để xem lỗi |
| Build lỗi "Backend không sẵn sàng" | Cổng 3000, 5000 hoặc 5432 đang bị chương trình khác chiếm. Gõ `docker ps` để kiểm tra |
| `run-e2e-ui.bat` báo `Khong tim thay Maven` | Làm theo mục "Cần chuẩn bị" ở Phần B |
| Test báo `TimeoutException` hoặc không thấy phần tử | Ứng dụng chưa chạy. Mở http://localhost:3000 kiểm tra trước |
| `No tests were executed` | Gõ sai tên tính năng. Tên phân biệt hoa/thường, dùng đúng như bảng ở Phần B |

---

## Phần D. Lưu ý an toàn

- **Chỉ dùng trên máy cá nhân.** Jenkins ở đây có quyền rất cao trên máy bạn. Không mở cổng 8080 ra Internet.
- **Nên đổi mật khẩu admin** (mặc định `adminpassword123` ai cũng biết). Khi bật Jenkins gõ:
  `JENKINS_ADMIN_PASSWORD='mat-khau-cua-ban' docker compose -f docker-compose.jenkins.yml up -d`
  *(mỗi lần bật đều phải gõ lại như vậy)*
- **Đừng chạy cùng lúc hai bộ Jenkins** (`ci/jenkins/` và `ci/jenkins/quick-setup/`), vì chúng dùng chung cổng 8080 và tên container. Chỉ chọn một bộ.
- **Muốn Jenkins tự chạy khi có code mới** (webhook): xem [jenkins_quick_setup_guide.md](./jenkins_quick_setup_guide.md).
