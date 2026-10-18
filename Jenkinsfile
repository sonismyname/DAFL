pipeline {
    agent any

    options {
        // Chống 2 build chạy song song đụng container
        disableConcurrentBuilds()
        timeout(time: 30, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '10'))
    }

    triggers {
        githubPush()
    }

    environment {
        REPO_URL        = 'https://github.com/sonismyname/DAFL.git'
        TARGET_BRANCH   = 'develop'
        WORKTREE_DIR    = 'build-worktree'
        PROJECT_NAME    = 'dafl'
        DOCKER_NETWORK  = 'dafl_dafl-network'

        // Ngưỡng Quality Gate hiệu năng (Stage 5)
        MAX_ERROR_RATE  = '2.0'      // Tỷ lệ lỗi tối đa: 2%
        MAX_AVG_RT_MS   = '1000.0'   // Response Time trung bình tối đa: 1000ms
    }

    stages {
        stage('Stage 1: Checkout') {
            steps {
                echo "=== Stage 1: Lấy mã nguồn mới nhất từ GitHub (${TARGET_BRANCH}) ==="
                git branch: TARGET_BRANCH, url: REPO_URL

                echo "=== Khởi tạo Git Worktree tách biệt để Build & Test ==="
                sh """
                    git worktree remove --force ${WORKTREE_DIR} 2>/dev/null || true
                    rm -rf ${WORKTREE_DIR} || true
                    git worktree prune || true

                    git fetch origin ${TARGET_BRANCH}
                    git worktree add --force --detach ${WORKTREE_DIR} origin/${TARGET_BRANCH}

                    # Nạp file .env chứa PayOS API Keys thật từ máy chủ vào worktree
                    if [ -f /var/repo/DAFL/.env ]; then
                        cp /var/repo/DAFL/.env ${WORKTREE_DIR}/.env
                        echo "✅ Đã nạp file .env từ /var/repo/DAFL vào ${WORKTREE_DIR}"
                    elif [ -f .env ]; then
                        cp .env ${WORKTREE_DIR}/.env
                        echo "✅ Đã nạp file .env từ workspace vào ${WORKTREE_DIR}"
                    fi

                    echo "Danh sách worktrees hiện tại:"
                    git worktree list
                """
            }
        }

        stage('Build & Prepare Test Environment') {
            steps {
                echo "=== Build và khởi chạy SUT (System Under Test) trên Docker ==="
                dir(env.WORKTREE_DIR) {
                    sh """
                        # Build container backend và frontend phiên bản mới nhất
                        docker compose -p ${PROJECT_NAME} -f docker-compose.yml build backend frontend

                        # Chạy toàn bộ services (Postgres, Kafka, Backend, Frontend)
                        docker compose -p ${PROJECT_NAME} -f docker-compose.yml up -d

                        # Chờ SUT sẵn sàng
                        echo "Chờ Backend và Frontend khởi động trong 10 giây..."
                        sleep 10
                    """
                }
            }
        }

        stage('Stage 2: Functional Regression') {
            steps {
                echo "=== Stage 2: Chạy Maven Selenium Headless (RAM Limit: 1.2GB) ==="
                dir("${env.WORKTREE_DIR}/tests/functional-selenium") {
                    sh """
                        # Dọn dẹp kết quả test cũ
                        rm -rf target/surefire-reports target/allure-results || true

                        # Chạy container Maven + Chrome Headless chia sẻ volume với dafl-jenkins
                        docker run --rm \
                            --name dafl-selenium-runner \
                            --network ${DOCKER_NETWORK} \
                            --volumes-from dafl-jenkins \
                            -w \$(pwd) \
                            --memory=1.2g \
                            --cpus=1.5 \
                            -e APP_URL="http://dafl-frontend:80" \
                            markhobson/maven-chrome:jdk-17 \
                            mvn clean test -DsuiteXmlFile=testng.xml || true
                    """
                }
            }
        }

        stage('Stage 3: Functional Quality Gate') {
            steps {
                echo "=== Stage 3: Kiểm tra kết quả Functional Tests (Abort nếu Fail) ==="
                dir("${env.WORKTREE_DIR}/tests/functional-selenium") {
                    script {
                        def reportDir = "target/surefire-reports"
                        if (!fileExists(reportDir)) {
                            error("❌ [Functional Quality Gate FAILED] Không tìm thấy thư mục báo cáo test Surefire!")
                        }

                        // Kiểm tra lỗi trong các file XML báo cáo của Surefire
                        def hasFailures = sh(
                            script: "grep -rnE 'failures=\"[1-9][0-9]*\"|errors=\"[1-9][0-9]*\"' ${reportDir}/*.xml 2>/dev/null || true",
                            returnStdout: true
                        ).trim()

                        if (hasFailures) {
                            echo "Chi tiết lỗi kiểm thử:"
                            echo hasFailures
                            error("❌ [Functional Quality Gate FAILED] Phát hiện Test Case thất bại! Dừng Pipeline ngay lập tức.")
                        } else {
                            echo "✅ [Functional Quality Gate PASSED] Toàn bộ test case Selenium Headless đều vượt qua thành công!"
                        }
                    }
                }
            }
        }

        stage('Stage 4: Performance Test') {
            steps {
                echo "=== Stage 4: Gọi JMeter Non-GUI (RAM Limit: 768MB, Heap: 512MB) ==="
                dir("${env.WORKTREE_DIR}/tests/performance-jmeter") {
                    sh """
                        # Chuẩn bị thư mục kết quả
                        rm -rf results && mkdir -p results

                        # Chạy JMeter CLI Non-GUI chia sẻ volume với dafl-jenkins
                        docker run --rm \
                            --name dafl-jmeter-runner \
                            --network ${DOCKER_NETWORK} \
                            --volumes-from dafl-jenkins \
                            -w \$(pwd) \
                            --memory=768m \
                            --cpus=1.0 \
                            -e JVM_XMS=256 -e JVM_XMX=512 -e JVM_XMN=128 \
                            justb4/jmeter:5.5 \
                            -n -t dafl-loadtest.jmx \
                            -Jtarget_host=dafl-backend \
                            -Jtarget_port=8080 \
                            -l results/result.jtl \
                            -e -o results/dashboard
                    """
                }
            }
        }

        stage('Stage 5: Performance Quality Gate') {
            steps {
                echo "=== Stage 5: Kiểm tra Response Time và Error Rate từ .jtl ==="
                dir("${env.WORKTREE_DIR}/tests/performance-jmeter") {
                    sh """
                        chmod +x check_performance_gate.sh
                        ./check_performance_gate.sh results/result.jtl ${MAX_ERROR_RATE} ${MAX_AVG_RT_MS}
                    """
                }
            }
        }

        stage('Stage 6: Publish Artifacts') {
            steps {
                echo "=== Stage 6: Đẩy Allure Report và JMeter HTML Dashboard lên giao diện Jenkins ==="

                // 1. Publish JMeter HTML Report Dashboard
                publishHTML([
                    allowMissing: true,
                    alwaysLinkToLastBuild: true,
                    keepAll: true,
                    reportDir: "${env.WORKTREE_DIR}/tests/performance-jmeter/results/dashboard",
                    reportFiles: 'index.html',
                    reportName: 'JMeter Performance Dashboard',
                    reportTitles: 'JMeter Dashboard Report'
                ])

                // 2. Publish Allure Test Report (Nếu có Allure Plugin và Allure Commandline)
                script {
                    def allureDir = "${env.WORKTREE_DIR}/tests/functional-selenium/target/allure-results"
                    if (fileExists(allureDir)) {
                        try {
                            allure([
                                includeProperties: false,
                                jdk: '',
                                properties: [],
                                reportBuildPolicy: 'ALWAYS',
                                results: [[path: allureDir]]
                            ])
                        } catch (Throwable err) {
                            echo "Allure Report warning: Chưa cấu hình Allure Commandline trong Jenkins Tools. Chi tiết: ${err}"
                        }
                    }
                }

                // 3. Lưu trữ file .jtl và Surefire XML làm Artifact
                archiveArtifacts artifacts: "${env.WORKTREE_DIR}/tests/performance-jmeter/results/*.jtl, ${env.WORKTREE_DIR}/tests/functional-selenium/target/surefire-reports/*.xml", allowEmptyArchive: true
            }
        }

        stage('Deploy Production') {
            steps {
                echo "=== Tất cả các Test & Quality Gate đã PASSED! Tiến hành cập nhật Container ==="
                dir(env.WORKTREE_DIR) {
                    sh """
                        # 1. Dừng và gỡ bỏ container backend/frontend cũ
                        docker compose -p ${PROJECT_NAME} -f docker-compose.yml stop backend frontend || true
                        docker compose -p ${PROJECT_NAME} -f docker-compose.yml rm -f backend frontend || true

                        # 2. Khởi tạo container mới từ image vừa build và pass test
                        docker compose -p ${PROJECT_NAME} -f docker-compose.yml up -d --remove-orphans

                        # 3. Dọn dẹp layer dangling
                        docker image prune -f
                    """
                }
            }
        }

        stage('Verify Status') {
            steps {
                echo "=== Kiểm tra trạng thái các Container sau khi Deploy ==="
                sh "docker compose -p ${PROJECT_NAME} ps"
            }
        }
    }

    post {
        always {
            echo "=== Dọn dẹp Git Worktree và Test Runners ==="
            sh """
                docker rm -f dafl-selenium-runner dafl-jmeter-runner 2>/dev/null || true
                git worktree remove --force ${WORKTREE_DIR} 2>/dev/null || true
                rm -rf ${WORKTREE_DIR} || true
                git worktree prune || true
            """
        }
        success {
            echo "=========================================================="
            echo "🎉 Pipeline thành công: Functional & Performance Quality Gates PASSED!"
            echo "👉 Frontend : http://localhost:3000"
            echo "👉 Backend  : http://localhost:5000"
            echo "=========================================================="
        }
        failure {
            echo "❌ Pipeline thất bại do không vượt qua Quality Gate hoặc lỗi Build/Deploy!"
        }
    }
}
