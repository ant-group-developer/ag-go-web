import { Link } from 'react-router-dom';
import { usePublicSettings } from '../../settings/hooks/use-settings';
import { LegalContact, LegalLayout } from '../components/legal-layout';
import { useLegalContext, useLegalLanguage, type LegalLanguage } from '../hooks/use-legal';
import { LEGAL_PATHS } from '../legal-routes';

const GOOGLE_USER_DATA_POLICY_URL =
  'https://developers.google.com/terms/api-services-user-data-policy';

type Feature = { title: string; description: string };

const FEATURES: Record<LegalLanguage, Feature[]> = {
  en: [
    {
      title: 'Projects & media',
      description:
        'Organize photos and videos into projects with folders, categories, tags and locations.',
    },
    {
      title: 'Upload or import',
      description:
        'Upload files from your computer, or import files and folders you pick from Google Drive.',
    },
    {
      title: 'Watermark rendering',
      description:
        'Generate watermarked renditions in multiple sizes using configurable render profiles.',
    },
    {
      title: 'Review & evaluation',
      description: 'Evaluate each file and track the review status of every project.',
    },
    {
      title: 'Folder-level permissions',
      description:
        'Access is granted per folder, so members only see the projects they are allowed to.',
    },
    {
      title: 'Download',
      description: 'Authorized members download originals or renditions individually or in bulk.',
    },
  ],
  vi: [
    {
      title: 'Project & media',
      description: 'Sắp xếp ảnh, video vào project theo thư mục, danh mục, tag và địa điểm.',
    },
    {
      title: 'Tải lên hoặc nhập',
      description: 'Tải file từ máy tính, hoặc nhập file và thư mục bạn chọn từ Google Drive.',
    },
    {
      title: 'Render watermark',
      description: 'Tạo bản có watermark với nhiều kích thước theo profile render cấu hình sẵn.',
    },
    {
      title: 'Đánh giá',
      description: 'Đánh giá từng file và theo dõi trạng thái duyệt của mỗi project.',
    },
    {
      title: 'Phân quyền theo thư mục',
      description: 'Quyền được cấp theo thư mục, thành viên chỉ thấy các project được phép.',
    },
    {
      title: 'Tải xuống',
      description: 'Thành viên có quyền tải file gốc hoặc bản render, từng file hoặc hàng loạt.',
    },
  ],
};

export function AboutPage() {
  const [language, setLanguage] = useLegalLanguage();
  const { context } = useLegalContext();
  const settings = usePublicSettings();
  const { siteName } = context;
  const vi = language === 'vi';
  const description =
    settings.data?.siteDescription?.trim() ||
    (vi ? 'Không gian làm việc media nội bộ.' : 'An internal media workspace.');

  return (
    <LegalLayout
      title={siteName}
      subtitle={description}
      language={language}
      onLanguageChange={setLanguage}
    >
      <p>
        {vi
          ? `${siteName} giúp đội ngũ của tổ chức tập trung, quản lý và phân phối ảnh, video cho các dự án truyền thông. Ứng dụng chỉ dành cho thành viên nội bộ được quản trị viên cấp tài khoản.`
          : `${siteName} helps our organization's teams collect, manage and deliver photos and videos for media projects. The application is for internal members who have been given an account by an administrator.`}
      </p>

      <div className="legal-cta">
        <a href="/" className="legal-cta-primary">
          {vi ? 'Đăng nhập' : 'Sign in'}
        </a>
        <Link to={`${LEGAL_PATHS.privacy}?lang=${language}`}>
          {vi ? 'Chính sách quyền riêng tư' : 'Privacy Policy'}
        </Link>
        <Link to={`${LEGAL_PATHS.terms}?lang=${language}`}>
          {vi ? 'Điều khoản sử dụng' : 'Terms of Service'}
        </Link>
      </div>

      <h2>{vi ? 'Tính năng chính' : 'What you can do'}</h2>
      <div className="legal-features">
        {FEATURES[language].map((feature) => (
          <div key={feature.title} className="legal-feature">
            <h3>{feature.title}</h3>
            <p>{feature.description}</p>
          </div>
        ))}
      </div>

      <h2>{vi ? 'Cách chúng tôi dùng Google Drive' : 'How we use Google Drive'}</h2>
      {vi ? (
        <>
          <p>
            Kết nối Google Drive là tùy chọn. Khi bạn kết nối, {siteName} yêu cầu quyền chỉ đọc (
            <code>drive.readonly</code>) để bạn chọn file hoặc thư mục bằng Google Picker và sao
            chép chúng vào một project. Chúng tôi:
          </p>
          <ul>
            <li>chỉ đọc các file và thư mục bạn chủ động chọn;</li>
            <li>không tạo, sửa hay xóa bất cứ thứ gì trong Google Drive của bạn;</li>
            <li>
              không dùng dữ liệu Google cho quảng cáo, không bán và không dùng để huấn luyện AI;
            </li>
            <li>xóa token truy cập ngay khi bạn ngắt kết nối Google Drive.</li>
          </ul>
        </>
      ) : (
        <>
          <p>
            Connecting Google Drive is optional. When you connect it, {siteName} requests read-only
            access (<code>drive.readonly</code>) so you can pick files or folders with the Google
            Picker and copy them into a project. We:
          </p>
          <ul>
            <li>read only the files and folders you explicitly select;</li>
            <li>never create, modify or delete anything in your Google Drive;</li>
            <li>
              never use Google data for advertising, never sell it and never use it to train AI
              models;
            </li>
            <li>delete the stored access token as soon as you disconnect Google Drive.</li>
          </ul>
        </>
      )}
      <p>
        {vi ? (
          <>
            Việc {siteName} sử dụng và chuyển giao cho ứng dụng khác thông tin nhận từ Google API
            tuân thủ{' '}
            <a href={GOOGLE_USER_DATA_POLICY_URL} target="_blank" rel="noreferrer">
              Chính sách dữ liệu người dùng của Google API Services
            </a>
            , bao gồm các yêu cầu Limited Use. Chi tiết xem tại{' '}
            <Link to={`${LEGAL_PATHS.privacy}?lang=vi`}>Chính sách quyền riêng tư</Link>.
          </>
        ) : (
          <>
            {siteName}’s use and transfer to any other app of information received from Google APIs
            will adhere to the{' '}
            <a href={GOOGLE_USER_DATA_POLICY_URL} target="_blank" rel="noreferrer">
              Google API Services User Data Policy
            </a>
            , including the Limited Use requirements. See our{' '}
            <Link to={`${LEGAL_PATHS.privacy}?lang=en`}>Privacy Policy</Link> for details.
          </>
        )}
      </p>

      <h2>{vi ? 'Liên hệ' : 'Contact'}</h2>
      <LegalContact context={context} language={language} />
    </LegalLayout>
  );
}
