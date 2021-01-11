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
                    docker build . --target test -t "${IMAGE_NAME}:${TAG}-coverage"
                    id=$(docker create "${IMAGE_NAME}:${TAG}-coverage")
                    docker cp "${id}:/app/coverage" ./coverage
                    docker rm "$id"
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
