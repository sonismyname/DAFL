pipeline {
    agent any

    options {
        timeout(time: 20, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '10'))
    }

    stages {
        stage('Checkout Code') {
            steps {
                echo 'Checking out code from repository...'
                checkout scm
            }
        }

        stage('Verify Docker Environment') {
            steps {
                echo '=== Verifying Docker Host Connection ==='
                sh 'docker version'
                sh 'docker compose version'
            }
        }

        stage('Build Backend') {
            steps {
                echo '=== Building Backend Image (.NET 8) ==='
                sh 'docker compose -f docker-compose.yml build backend'
            }
        }

        stage('Build Frontend') {
            steps {
                echo '=== Building Frontend Image (Vite React) ==='
                sh 'docker compose -f docker-compose.yml build frontend'
            }
        }

        stage('Deploy Services') {
            steps {
                echo '=== Deploying Updated Containers on Localhost ==='
                sh 'docker compose -f docker-compose.yml up -d'
            }
        }

        stage('Health Check') {
            steps {
                echo '=== Checking Running Services Status ==='
                sh 'docker compose -f docker-compose.yml ps'
            }
        }
    }

    post {
        success {
            echo '=================================================='
            echo '🎉 CI/CD Pipeline Build & Deploy Thành Công!'
            echo '👉 Frontend: http://localhost:3000'
            echo '👉 Backend API: http://localhost:5000'
            echo '=================================================='
        }
        failure {
            echo '❌ Pipeline thất bại! Vui lòng kiểm tra Console Output log.'
        }
    }
}
