pipeline {
    agent {
        kubernetes {
            yamlFile 'jenkins-agent.yaml'
            defaultContainer 'docker-git'
        }
    }
    environment{
        IMAGE_NAME = 'docker.io/iskprinter/api'
        TAG = sh(returnStdout: true, script: 'git rev-parse --verify --short HEAD').trim()
    }
    stages {
        stage('Install') {
            steps {
                sh 'docker build . --target install'
            }
        }
        stage('Build') {
            steps {
                sh 'docker build . --target build'
            }
        }
        stage('Test') {
            steps {
                sh '''
                    docker build . --target test
                    DOCKER_BUILDKIT=1 docker build . -o ./coverage --target coverage
                    chown -R 1000:1000 ./coverage
                '''
                publishCoverage(
                    adapters: [coberturaAdapter('coverage/cobertura-coverage.xml')],
                    failNoReports: true
                )
            }
        }
        stage('Package') {
            steps {
                sh 'docker build . --target package -t "${IMAGE_NAME}:${TAG}"'
            }
        }
        stage('Publish') {
            when { branch 'main' }
            environment {
                DOCKERHUB_CREDS = credentials('dockerhub-username-and-token')
            }
            steps {
                sh '''
                    docker login "-u=${DOCKERHUB_CREDS_USR}" "-p=${DOCKERHUB_CREDS_PSW}"
                    docker push "${IMAGE_NAME}:${TAG}"
                '''
            }
        }
    }
}
