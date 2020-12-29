# iskprinter/api
https://iskprinter.com/api

Suggests market deals in Eve Online.

![Build Status](https://iskprinter.com/jenkins/buildStatus/icon?job=api%2Fmain)

## How to develop locally

Activate webpack continuous compilation and serve the backend in development mode.
```
./dev-server.sh
```

Port-forward the MongoDB database to localhost.
```
kubectl --context docker-desktop -n isk-printer port-forward svc/isk-printer-database 27017:27017
```

Then, in a separate shell, start the server.
```
export CLIENT_ID='<client-id>'
export CLIENT_SECRET='<client-secret>'
export DB_URL='mongodb://localhost:27017'
npm --prefix backend/express run serve
```

## How to build the image

To build the image and push it:
```
tag=$(git rev-parse --verify --short HEAD)
docker build . -t "hub.docker.com/iskprinter/api:${tag}"
docker push "hub.docker.com/iskprinter/api:${tag}"
```
