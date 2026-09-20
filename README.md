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

Frontend bắt buộc đăng nhập Auth0. Thiết lập `VITE_AUTH0_DOMAIN`,
`VITE_AUTH0_CLIENT_ID` và `VITE_AUTH0_AUDIENCE` trong `.env` trước khi chạy.
Upload file dùng presigned URL do API cấp để gửi trực tiếp lên Cloudflare R2.

Khi chạy local, thêm `http://localhost:5173` vào Allowed Callback URLs, Allowed
Logout URLs và Allowed Web Origins của Auth0 Application.
