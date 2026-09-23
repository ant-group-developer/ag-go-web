# AG Go Web

Frontend của AG Go, xây dựng bằng React 19, TypeScript, Vite, Ant Design và
TanStack Query. Repository này là một Git repository độc lập.

## Chức năng hiện có

- Auth0 login, route guard và tự động gắn Bearer token khi gọi API.
- Dashboard, project list/detail, media upload/preview, đánh giá và audit.
- Folder, category, country, province, tag và import dữ liệu catalog.
- Google Drive connection/import từ trang project.
- Render profile/batch, thống kê, system settings và system logs theo quyền.
- Layout Ant Design Pro (`ProLayout`, `layout="mix"`), i18next với locale mặc
  định tiếng Việt.

## Yêu cầu

- Node.js 22
- Yarn 1.22.22
- AG Go API đang chạy và có thể truy cập từ browser
- Auth0 Application đã cấu hình cho môi trường đang dùng

## Chạy local

```bash
cp .env.example .env
yarn install
yarn dev
```

Vite mặc định phục vụ ứng dụng tại `http://localhost:5173`. Để chạy với API
local, giữ cấu hình sau trong `.env`:

```dotenv
VITE_API_BASE_URL=http://localhost:3000/api
```

Ứng dụng yêu cầu Auth0. Trong Auth0 Application, thêm
`http://localhost:5173` vào Allowed Callback URLs, Allowed Logout URLs và
Allowed Web Origins.

## Cấu hình môi trường

| Biến | Bắt buộc | Mô tả |
|---|---:|---|
| `VITE_API_BASE_URL` | Có | Base URL của AG Go API, gồm cả prefix `/api`. |
| `VITE_AUTH0_DOMAIN` | Có | Auth0 tenant domain. |
| `VITE_AUTH0_CLIENT_ID` | Có | Client ID của Auth0 Single-Page Application. |
| `VITE_AUTH0_AUDIENCE` | Có | API identifier đã cấu hình trong Auth0. |
| `VITE_GOOGLE_PICKER_CLIENT_ID` | Khi dùng Drive | OAuth client ID cho Google Picker. |
| `VITE_GOOGLE_PICKER_APP_ID` | Khi dùng Drive | Google Cloud project number/App ID. |
| `VITE_GOOGLE_PICKER_API_KEY` | Khi dùng Drive | API key được phép dùng Google Picker API. |
| `WEB_PORT` | Không | Port host khi chạy Docker, mặc định `5173`. |
| `WEB_MEMORY_LIMIT`, `WEB_CPUS` | Không | Giới hạn tài nguyên Docker. |

Các biến `VITE_*` là cấu hình public được nhúng vào bundle frontend. Không đặt
secret, API key server-side hay thông tin nhạy cảm trong chúng.

## Docker

Docker image được build tĩnh và phục vụ bằng Nginx. Các biến `VITE_*` được đọc
ở thời điểm build, vì vậy thay đổi `.env` cần build lại image:

```bash
cp .env.example .env
docker compose up --build -d
```

Ứng dụng được publish tại `http://localhost:5173` theo mặc định.

```bash
docker compose logs -f web
docker compose down
```

Compose hiện truyền các biến API/Auth0 vào build. Nếu dùng Google Picker trong
image Docker, bổ sung ba biến `VITE_GOOGLE_PICKER_*` tương ứng vào Docker build
arguments trước khi build image.

## Lệnh thường dùng

```bash
yarn build
yarn preview
yarn typecheck
yarn lint
yarn format:check
yarn test
```

## CI/CD

Các workflow trong `.github/workflows` kiểm tra format, typecheck, lint, test,
build và Docker image cho nhánh `main` và `dev`. Push vào `dev` kích hoạt deploy
development; push vào `main` kích hoạt deploy production.

Deploy dùng các secret `VPS_SSH_KEY_DEV`, `VPS_HOST_DEV`, `VPS_USER_DEV`
(tùy chọn `VPS_PORT_DEV`, `VPS_APP_PATH_DEV`) cho development và
`VPS_SSH_KEY`, `VPS_HOST`, `VPS_USER` (tùy chọn `VPS_PORT`, `VPS_APP_PATH`)
cho production. Thông báo Telegram dùng `TELEGRAM_CHAT_ID` và
`TELEGRAM_TOKEN`.
