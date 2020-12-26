pipeline {
    agent {
        kubernetes {
            yamlFile 'jenkins-agent.yaml'
            defaultContainer 'jenkins-agent'
            label 'jenkins-build-api'
        }
    }
    environment {
        IMAGE_NAME = 'hub.docker.com/iskprinter/api'
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
                sh 'docker build . --target test'
            }
        }
        stage('Package') {
            steps {
                sh 'docker build . --target package -t "${IMAGE_NAME}:${TAG}"'
            }
        }
        stage('Deploy') {
            steps {
                sh 'docker push "${IMAGE_NAME}:${TAG}"'
            }
        }
    }
}
