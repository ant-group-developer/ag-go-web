FROM node:22-bookworm-slim AS build

WORKDIR /app
ENV COREPACK_HOME=/tmp/corepack

RUN corepack enable && corepack prepare yarn@1.22.22 --activate

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY . .

ARG VITE_API_BASE_URL=http://localhost:3000/api
ARG VITE_AUTH0_DOMAIN=replace-with-auth0-domain
ARG VITE_AUTH0_CLIENT_ID=replace-with-auth0-application-client-id
ARG VITE_AUTH0_AUDIENCE=https://replace-with-api-identifier/

ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_AUTH0_DOMAIN=${VITE_AUTH0_DOMAIN}
ENV VITE_AUTH0_CLIENT_ID=${VITE_AUTH0_CLIENT_ID}
ENV VITE_AUTH0_AUDIENCE=${VITE_AUTH0_AUDIENCE}

RUN yarn build

FROM nginx:1.27-alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
