FROM node:16-alpine3.14 AS install
WORKDIR /app
COPY ./package.json ./package-lock.json ./
RUN npm ci
COPY . ./

FROM install AS test
RUN npm test

FROM install AS build
RUN npm run build

FROM node:16-alpine3.14 AS package
WORKDIR /app
COPY --from=build /app/dist/* ./
EXPOSE 3000
CMD ["node", "app.js"]
