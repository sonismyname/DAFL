# Hướng dẫn triển khai CI/CD (Dành cho Agent)

Tài liệu này chứa các hướng dẫn chi tiết theo từng bước để xây dựng hệ thống CI/CD cho dự án Monorepo bao gồm Backend (.NET 8) và Frontend (ReactJS). Vui lòng thực hiện tuần tự từ Phase 1 đến Phase 5.

---

## Phase 1: Dockerize Ứng dụng (System Under Test)
Mục tiêu: Đóng gói BE, FE và Database thành các container độc lập và chạy thử bằng Docker Compose.

### 1.1. Backend Dockerfile (.NET 8)
Tạo file `Dockerfile` trong thư mục gốc của Backend (ví dụ: `./backend/Dockerfile`):

```dockerfile
# Build Stage
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /app
COPY *.csproj ./
RUN dotnet restore
COPY . ./
RUN dotnet publish -c Release -o out

# Runtime Stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app/out .
ENTRYPOINT ["dotnet", "YourBackendApp.dll"]
```
*(Agent lưu ý: Thay thế `YourBackendApp.dll` bằng tên file dll thực tế của dự án).*

### 1.2. Frontend Dockerfile (ReactJS)
Tạo file `Dockerfile` trong thư mục gốc của Frontend (ví dụ: `./frontend/Dockerfile`):

```dockerfile
# Build Stage
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Serve Stage (Nginx)
FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### 1.3. Cấu hình App Docker Compose
Tạo file `docker-compose.app.yml` ở thư mục gốc của cả dự án:

```yaml
version: '3.8'
services:
  database:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: 123
      POSTGRES_DB: appdb
    ports:
      - "5432:5432"

  backend:
    build:
      context: ./backend
    ports:
      - "5000:80"
    depends_on:
      - database

  frontend:
    build:
      context: ./frontend
    ports:
      - "3000:80"
    depends_on:
      - backend
```
**Action:** Chạy lệnh `docker compose -f docker-compose.app.yml up -d` để xác nhận ứng dụng hoạt động.

---

## Phase 2: Đẩy Code lên GitHub
Mục tiêu: Đưa source code lên Git kèm theo file ignore chuẩn.

**Action list:**
1. Tạo file `.gitignore` ở thư mục gốc. Đảm bảo có các quy tắc bỏ qua thư mục `bin/`, `obj/` của .NET và `node_modules/` của React.
2. Khởi tạo Git:
   ```bash
   git init
   git add .
   git commit -m "Init project with Docker files"
   git branch -M main
   git remote add origin <URL_GITHUB_REPO_CỦA_BẠN>
   git push -u origin main
   ```

---

## Phase 3: Dựng hạ tầng Jenkins
Mục tiêu: Chạy Jenkins Server bằng Docker, kẹp cấu hình RAM và cấp quyền gọi lệnh Docker.

### 3.1. Cấu hình Jenkins Docker Compose
Tạo một thư mục riêng biệt cho CI/CD (ví dụ `~/cicd_infra`) và tạo file `docker-compose.jenkins.yml`:

```yaml
version: '3.8'
services:
  jenkins:
    image: jenkins/jenkins:lts
    user: root # Bắt buộc để dùng docker.sock
    ports:
      - "8080:8080"
      - "50000:50000"
    volumes:
      - jenkins_data:/var/jenkins_home
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      - JAVA_OPTS=-Xmx768m -Xms256m
    deploy:
      resources:
        limits:
          memory: 1.5G

volumes:
  jenkins_data:
```
**Action:** Chạy `docker compose -f docker-compose.jenkins.yml up -d`. Lấy password khởi tạo qua lệnh `docker logs <jenkins_container_id>`.

### 3.2. Cài đặt Plugin trên Jenkins
Đăng nhập Jenkins UI, vào Manage Jenkins > Plugins và cài đặt:
1. Docker Pipeline
2. NodeJS Plugin
3. SonarQube Scanner

---

## Phase 4: Thiết lập SonarCloud
Mục tiêu: Đấu nối SonarCloud với Jenkins để phân tích tĩnh.

**Action list:**
1. Lên [SonarCloud](https://sonarcloud.io/), tạo dự án từ GitHub Repo.
2. Lấy **Project Key**, **Organization Key**, và tạo **Security Token**.
3. Vào Jenkins > Manage Jenkins > Credentials > System > Global credentials -> Add Credentials. Chọn Secret Text, dán Token vào, đặt ID là `sonar-token`.
4. Vào Jenkins > Manage Jenkins > System -> Tìm "SonarQube servers", Add SonarQube:
   - Name: `SonarCloud`
   - URL: `https://sonarcloud.io`
   - Token: Chọn `sonar-token`.

---

## Phase 5: Viết Jenkinsfile & Kích hoạt Tự động
Mục tiêu: Viết kịch bản Pipeline và kích hoạt webhook.

### 5.1. File Jenkinsfile
Tạo `Jenkinsfile` ở thư mục gốc của project (để đẩy lên Git):

```groovy
pipeline {
    agent any

    environment {
        // Biến môi trường cho Sonar
        SONAR_PROJECT_KEY = 'YOUR_PROJECT_KEY'
        SONAR_ORG = 'YOUR_ORGANIZATION_KEY'
    }

    stages {
        stage('Checkout Code') {
            steps {
                checkout scm
            }
        }

        stage('Build & SonarCloud Analysis (Backend)') {
            steps {
                dir('backend') {
                    withSonarQubeEnv('SonarCloud') {
                        sh '''
                        dotnet tool install --global dotnet-sonarscanner || true
                        export PATH="$PATH:/root/.dotnet/tools"
                        
                        dotnet sonarscanner begin /k:"${SONAR_PROJECT_KEY}" /o:"${SONAR_ORG}" /d:sonar.host.url="https://sonarcloud.io" /d:sonar.token="$SONAR_AUTH_TOKEN"
                        dotnet build
                        dotnet sonarscanner end /d:sonar.token="$SONAR_AUTH_TOKEN"
                        '''
                    }
                }
            }
        }

        stage('Quality Gate') {
            steps {
                timeout(time: 1, unit: 'HOURS') {
                    waitForQualityGate abortPipeline: true
                }
            }
        }

        stage('Build & Deploy App (Docker Compose)') {
            steps {
                // Xóa app cũ và chạy app mới
                sh '''
                docker compose -f docker-compose.app.yml down
                docker compose -f docker-compose.app.yml up -d --build
                '''
            }
        }
    }
}
```
*(Agent lưu ý: Cập nhật `YOUR_PROJECT_KEY` và `YOUR_ORGANIZATION_KEY` theo thực tế).*

### 5.2. Cấu hình kích hoạt
1. Trong Jenkins, tạo Job mới loại **Multibranch Pipeline**. Trỏ đến repo GitHub của dự án.
2. Trên GitHub Repo > Settings > Webhooks > Add Webhook.
   - Payload URL: `http://<IP_JENKINS_CỦA_BẠN>:8080/github-webhook/` (Dùng ngrok nếu đang chạy local).
   - Content type: `application/json`
   - Chọn "Just the push event".

**Hoàn tất:** Khi code được push lên, Jenkins sẽ tự động chạy Pipeline theo file Jenkinsfile.