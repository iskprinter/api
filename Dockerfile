FROM node:20-bookworm AS install
WORKDIR /app
COPY ./package.json ./package-lock.json ./
RUN npm ci
COPY . ./

FROM install AS test
RUN npm test

FROM test AS build
RUN npm run build

FROM node:20-alpine3.18 AS package
WORKDIR /app
COPY --from=build /app/dist/* ./
EXPOSE 3000
CMD ["node", "app.js", "--enable-source-maps"]
