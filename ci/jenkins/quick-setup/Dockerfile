FROM jenkins/jenkins:lts
USER 0:0

# Cài đặt Docker CLI và Docker Compose Plugin
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        ca-certificates \
        curl \
        gnupg && \
    install -m 0755 -d /etc/apt/keyrings && \
    curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg && \
    chmod a+r /etc/apt/keyrings/docker.gpg && \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian $(. /etc/os-release && echo "$VERSION_CODENAME") stable" > /etc/apt/sources.list.d/docker.list && \
    apt-get update && \
    apt-get install -y --no-install-recommends \
        docker-ce-cli \
        docker-compose-plugin && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Cài đặt tự động toàn bộ plugins cần thiết cho Pipeline & Configuration as Code
RUN jenkins-plugin-cli --plugins \
    configuration-as-code \
    job-dsl \
    workflow-aggregator \
    git \
    github \
    docker-workflow \
    htmlpublisher \
    allure-jenkins-plugin \
    junit \
    pipeline-stage-view

# Cài đặt Allure Commandline binary trực tiếp vào container
ARG ALLURE_VERSION=2.30.0
RUN curl -fsSL https://github.com/allure-framework/allure2/releases/download/${ALLURE_VERSION}/allure-${ALLURE_VERSION}.tgz | tar -xz -C /opt/ && \
    ln -s /opt/allure-${ALLURE_VERSION}/bin/allure /usr/bin/allure

# Chạy dưới quyền root để truy cập /var/run/docker.sock từ Docker Desktop
USER 0:0
