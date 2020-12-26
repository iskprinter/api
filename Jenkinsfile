pipeline {

    agent {
        kubernetes {
            yamlFile 'jenkins-agent.yaml'
            defaultContainer 'jenkins-agent'
            label 'jenkins-build-api'
        }
    }
    
    stages {
        stage('Deploy') {
            steps {
                echo 'Hello world!'
            }
        }
    }

}
