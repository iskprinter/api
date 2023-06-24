# iskprinter/api
https://iskprinter.com/api

Suggests market trades in Eve Online.

![Build Status](https://iskprinter.com/jenkins/buildStatus/icon?job=api%2Fmain)
![Coverage](https://img.shields.io/badge/dynamic/json?label=coverage&query=%24.results.elements%5B%3F%28%40.name%20%3D%3D%20%27Conditional%27%29%5D.ratio&suffix=%20branch%25&url=https%3A%2F%2Fiskprinter.com%2Fjenkins%2Fjob%2Fapi%2Fjob%2Fmain%2FlastBuild%2Fcoverage%2Fresult%2Fapi%2Fjson%3Fdepth%3D1)

## How to develop locally

1. Export the relevant environment variables into the shell.
    ```
    export CLIENT_ID='<client-id>'
    export CLIENT_SECRET='<client-secret>'
    export JWT_PUBLIC_KEY_PATH='<path-to-jwt-public-key>'
    export JWT_PRIVATE_KEY_PATH='<path-to-jwt-private-key>'
    ```

1. Start a MongoDB container.
    ```
    docker start mongodb 2>/dev/null \
        || docker run \
            -d \
            --name mongodb \
            -p 127.0.0.1:27017:27017 \
            -v mongodb:/data/db \
            mongo:5
    ```

1. Start a Kafka container. This is based on https://github.com/confluentinc/cp-all-in-one/blob/master/cp-all-in-one-kraft/docker-compose.yml.
    ```
    docker start kafka 2>/dev/null \
        || docker run \
            -e KAFKA_BROKER_ID=1 \
            -e KAFKA_LISTENER_SECURITY_PROTOCOL_MAP=CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT,PLAINTEXT_HOST:PLAINTEXT \
            -e KAFKA_ADVERTISED_LISTENERS=PLAINTEXT://broker:29092,PLAINTEXT_HOST://localhost:9092 \
            -e KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR=1 \
            -e KAFKA_GROUP_INITIAL_REBALANCE_DELAY_MS=0 \
            -e KAFKA_TRANSACTION_STATE_LOG_MIN_ISR=1 \
            -e KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR=1 \
            -e KAFKA_JMX_PORT=9101 \
            -e KAFKA_JMX_HOSTNAME=localhost \
            -e KAFKA_PROCESS_ROLES=broker,controller \
            -e KAFKA_NODE_ID=1 \
            -e 'KAFKA_CONTROLLER_QUORUM_VOTERS=1@broker:29093' \
            -e KAFKA_LISTENERS=PLAINTEXT://broker:29092,CONTROLLER://broker:29093,PLAINTEXT_HOST://0.0.0.0:9092 \
            -e KAFKA_INTER_BROKER_LISTENER_NAME=PLAINTEXT \
            -e KAFKA_CONTROLLER_LISTENER_NAMES=CONTROLLER \
            -e KAFKA_LOG_DIRS=/tmp/kraft-combined-logs \
            -d \
            -h broker \
            --name kafka \
            -p 127.0.0.1:9091:9091 \
            -p 127.0.0.1:9092:9092 \
            -v kafka:/var/lib/kafka/data \
            confluentinc/cp-kafka:7.3.3 \
            bash -c 'sed -i "/KAFKA_ZOOKEEPER_CONNECT/d" /etc/confluent/docker/configure && sed -i "s/cub zk-ready/echo ignore zk-ready/" /etc/confluent/docker/ensure && echo "kafka-storage format --ignore-formatted --cluster-id=$(kafka-storage random-uuid) -c /etc/kafka/kafka.properties" >>/etc/confluent/docker/ensure && /etc/confluent/docker/run'
    ```

1. Start the dev server.
    ```
    npm start
    ```
    This will:
    * Activate continuous webpack compilation
    * Serve the webpack output using nodemon

## How to build the image

To build the image and push it:
```
tag=$(git rev-parse --verify --short HEAD)
docker build . -t "docker.io/iskprinter/api:${tag}"
docker push "docker.io/iskprinter/api:${tag}"
```

## Configuration

The following environment variables are supported.

| Name | Description | Required | Default |
| --- | --- | --- | --- |
| FRONTEND_URLS | A comma-delimited string of frontend URLS. Used to set the CORS header. | false | None |
