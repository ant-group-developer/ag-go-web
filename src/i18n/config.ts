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
