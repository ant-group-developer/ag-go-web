# ag-go-web

Frontend repository của AG Go.

Xem tài liệu triển khai tại `../docs/06-frontend-plan.md` và contract chung tại
`../docs/05-api-contract.md`.

Package manager: Yarn `1.22.22`.

UI shell: Ant Design Pro `ProLayout` với `layout="mix"`. i18n dùng i18next,
locale mặc định là tiếng Việt (`vi`).

```bash
yarn install
yarn dev
```

Chạy frontend bằng Docker:

```bash
cp .env.example .env
docker compose up --build -d
```

Frontend được publish ở `http://localhost:5173`. Các biến `VITE_*` được truyền
vào lúc build image, vì vậy cần build lại image sau khi thay đổi `.env`.
Khi chạy cùng API Compose, đặt `VITE_API_BASE_URL=http://localhost:3000/api`.

Giới hạn frontend mặc định là `1 CPU` và `512 MB RAM`, có thể thay đổi bằng
`WEB_CPUS` và `WEB_MEMORY_LIMIT` trong `.env`.

CI/CD nằm trong `.github/workflows`:

- `ci.yml`: kiểm tra format, typecheck, lint, test, build và Docker image cho
  `main`/`dev`.
- `deploy.dev.yml`: deploy khi push vào `dev`.
- `deploy.prod.yml`: deploy khi push vào `main`.
- `notify.yml`: gửi trạng thái workflow qua Telegram.

Các workflow deploy dùng cùng nhóm secret SSH như API:
`VPS_SSH_KEY_DEV`, `VPS_HOST_DEV`, `VPS_USER_DEV`, tùy chọn `VPS_PORT_DEV` và
`VPS_APP_PATH_DEV`; production dùng `VPS_SSH_KEY`, `VPS_HOST`, `VPS_USER`,
`VPS_PORT`, `VPS_APP_PATH`. Notification dùng `TELEGRAM_CHAT_ID` và
`TELEGRAM_TOKEN`.

Frontend bắt buộc đăng nhập Auth0. Thiết lập `VITE_AUTH0_DOMAIN`,
`VITE_AUTH0_CLIENT_ID` và `VITE_AUTH0_AUDIENCE` trong `.env` trước khi chạy.
Upload file dùng presigned URL do API cấp để gửi trực tiếp lên Cloudflare R2.

Khi chạy local, thêm `http://localhost:5173` vào Allowed Callback URLs, Allowed
Logout URLs và Allowed Web Origins của Auth0 Application.
