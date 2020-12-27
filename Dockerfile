FROM node:14.9.0-alpine3.12 AS install
WORKDIR /app
COPY ./package.json ./package-lock.json ./
RUN npm ci

FROM install as build
COPY . ./
RUN npm run build

FROM build AS test
RUN npm test

FROM test as package
WORKDIR /app
COPY --from=test /app/dist/* ./
EXPOSE 3000
CMD ["node", "app.js"]
