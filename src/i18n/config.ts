import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  vi: {
    translation: {
      app: {
        title: 'AG Go',
        phase: 'Giai đoạn 0',
      },
      menu: {
        dashboard: 'Tổng quan',
        health: 'Trạng thái API',
        folders: 'Thư mục',
        projects: 'Dự án',
        catalogs: 'Danh mục',
      },
      home: {
        title: 'Không gian làm việc AG Go',
        description:
          'Frontend shell đã sẵn sàng. Các module nghiệp vụ sẽ được triển khai theo kế hoạch.',
        repositories: 'Repository',
        repositoriesValue: 'ag-go-web + ag-go-api',
        ui: 'Giao diện',
        uiValue: 'Ant Design Pro + React Router',
        serverState: 'Server state',
        serverStateValue: 'TanStack Query',
      },
      health: {
        title: 'Trạng thái API',
        loading: 'Đang kiểm tra API...',
        unavailable: 'Không kết nối được ag-go-api',
        status: 'Trạng thái',
        service: 'Service',
        timestamp: 'Thời điểm',
        uptime: 'Thời gian hoạt động',
        seconds: 'giây',
      },
      folders: {
        title: 'Cây thư mục',
        empty: 'Chưa có thư mục nào hoặc bạn chưa được cấp quyền.',
        name: 'Tên thư mục',
        depth: 'Độ sâu',
        path: 'Đường dẫn',
      },
      projects: {
        title: 'Dự án',
        empty: 'Chưa có dự án hoặc bạn chưa được cấp quyền.',
        name: 'Tên dự án',
        folder: 'Folder ID',
        evaluationStatus: 'Trạng thái đánh giá',
      },
      catalogs: {
        title: 'Danh mục',
        categories: 'Categories',
        countries: 'Countries',
        provinces: 'Provinces',
        tags: 'Tags',
      },
      media: {
        title: 'Media của dự án',
        uploadTitle: 'Tải media lên',
        upload: 'Tải lên',
        fileRequired: 'Hãy chọn một file',
        attachTitle: 'Gắn media',
        attach: 'Gắn',
        backToProjects: 'Quay lại dự án',
        empty: 'Dự án chưa có media.',
        invalidProject: 'Project không hợp lệ.',
        assetTypeRequired: 'Chọn loại media',
        filenameRequired: 'Nhập tên file',
        mimeTypeRequired: 'Nhập MIME type',
        fileSizeRequired: 'Nhập kích thước file',
        filename: 'Tên file',
        mimeType: 'MIME type',
        fileSize: 'Dung lượng (bytes)',
        caption: 'Caption',
        type: 'Loại',
        size: 'Dung lượng',
        status: 'Trạng thái xử lý',
        order: 'Thứ tự',
        actions: 'Thao tác',
        image: 'Ảnh',
        video: 'Video',
        remove: 'Xóa',
        removeConfirm: 'Xóa media này khỏi dự án?',
      },
    },
  },
} as const;

void i18n.use(initReactI18next).init({
  resources,
  lng: 'vi',
  fallbackLng: 'vi',
  supportedLngs: ['vi'],
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
