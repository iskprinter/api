# iskprinter/api
https://iskprinter.com/api

Suggests market deals in Eve Online.

![Build Status](https://iskprinter.com/jenkins/buildStatus/icon?job=api%2Fmain)
![Coverage](https://img.shields.io/badge/dynamic/json?label=coverage&query=%24.results.elements%5B%3F%28%40.name%20%3D%3D%20%27Conditional%27%29%5D.ratio&suffix=%20branch%25&url=https%3A%2F%2Fiskprinter.com%2Fjenkins%2Fjob%2Fapi%2Fjob%2Fmain%2FlastBuild%2Fcoverage%2Fresult%2Fapi%2Fjson%3Fdepth%3D1)

## How to develop locally

1. Export the relevant environment variables into the shell.
    ```
    export CLIENT_ID='<client-id>'
    export CLIENT_SECRET='<client-secret>'
    export DB_URL='mongodb://localhost:27017'
    ```

2. You have 2 options. Either build a docker container and run it
    ```
    docker build . -t api
    docker run --rm -it \
        -e "FRONTEND_URLS=${FRONTEND_URLS}" \
        -e "CLIENT_ID=${CLIENT_ID}" \
        -e "CLIENT_SECRET=${CLIENT_SECRET}" \
        -p 3000:3000 \
        api
    ```
    
    Or, run the `dev-server.sh` script.
    ```
    ./dev-server.sh
    ```
    This will:
    * Forward port 27017 of the database service the local kubernetes cluster to localhost:27017
    * Activate webpack continuous compilation
    * Serve the backend in continuous development mode

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
