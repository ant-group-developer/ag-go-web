import { Link } from 'react-router-dom';
import { LegalContact, LegalLayout } from '../components/legal-layout';
import {
  useLegalContext,
  useLegalLanguage,
  type LegalContext,
  type LegalLanguage,
} from '../hooks/use-legal';
import { LEGAL_EFFECTIVE_DATE, LEGAL_PATHS } from '../legal-routes';

const GOOGLE_TERMS_URL = 'https://policies.google.com/terms';

export function TermsPage() {
  const [language, setLanguage] = useLegalLanguage();
  const { context } = useLegalContext();
  const vi = language === 'vi';

  return (
    <LegalLayout
      title={vi ? 'Điều khoản sử dụng' : 'Terms of Service'}
      subtitle={`${vi ? 'Cập nhật lần cuối' : 'Last updated'}: ${LEGAL_EFFECTIVE_DATE}`}
      language={language}
      onLanguageChange={setLanguage}
    >
      {vi ? (
        <TermsVi context={context} language={language} />
      ) : (
        <TermsEn context={context} language={language} />
      )}
    </LegalLayout>
  );
}

type ContentProps = { context: LegalContext; language: LegalLanguage };

function TermsEn({ context, language }: ContentProps) {
  const { siteName, origin } = context;

  return (
    <>
      <p>
        These Terms of Service (“Terms”) govern your access to and use of {siteName}, available at{' '}
        <a href={origin}>{origin}</a> (the “Service”). By signing in or using the Service you agree
        to these Terms. If you do not agree, do not use the Service.
      </p>

      <h2>1. The Service</h2>
      <p>
        {siteName} is an internal media workspace that lets authorized members of our organization
        manage projects and media files: uploading files from a computer, importing files and
        folders from Google Drive, organizing them with folders, categories and tags, evaluating
        them, rendering watermarked versions and downloading originals or renditions.
      </p>

      <h2>2. Eligibility and accounts</h2>
      <ul>
        <li>
          The Service is available only to people who have been granted an account by an
          administrator of our organization.
        </li>
        <li>
          You are responsible for keeping your sign-in credentials secure and for all activity that
          occurs under your account. Tell an administrator immediately if you suspect unauthorized
          use.
        </li>
        <li>
          Administrators may change your roles and folder permissions, or suspend or remove your
          access, at any time.
        </li>
      </ul>

      <h2>3. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>
          Upload or import content that you do not have the right to use, or that is unlawful,
          infringing, harmful or contains malware.
        </li>
        <li>
          Access, or attempt to access, projects, folders or data that you have not been granted
          permission to.
        </li>
        <li>
          Interfere with, overload, reverse engineer or bypass the security measures of the Service.
        </li>
        <li>Share downloaded content outside the purposes permitted by our organization.</li>
      </ul>

      <h2>4. Google Drive integration</h2>
      <ul>
        <li>
          Connecting Google Drive is optional. When you connect it, you authorize {siteName} to
          read, with read-only access, the files and folders you select in the Google Picker so they
          can be copied into a project.
        </li>
        <li>
          {siteName} never modifies or deletes files in your Google Drive. Imported files are
          independent copies; later changes in Google Drive are not synchronized.
        </li>
        <li>
          Your use of Google Drive remains subject to{' '}
          <a href={GOOGLE_TERMS_URL} target="_blank" rel="noreferrer">
            Google’s Terms of Service
          </a>
          . You can disconnect Google Drive at any time from within {siteName} or from your Google
          Account settings.
        </li>
        <li>
          How we handle data received from Google is described in our{' '}
          <Link to={`${LEGAL_PATHS.privacy}?lang=en`}>Privacy Policy</Link>.
        </li>
      </ul>

      <h2>5. Content and ownership</h2>
      <ul>
        <li>
          Content you upload or import remains owned by you or by our organization, as determined by
          your employment or engagement agreement. You grant {siteName} the permissions needed to
          store, process, render and display that content to authorized users in order to provide
          the Service.
        </li>
        <li>
          You are responsible for ensuring you have the necessary rights to the content you upload
          or import.
        </li>
        <li>
          The {siteName} software, design and branding are owned by our organization and may not be
          copied or reused without permission.
        </li>
      </ul>

      <h2>6. Availability and changes</h2>
      <p>
        We work to keep the Service available and reliable but do not guarantee uninterrupted
        operation. We may change, suspend or discontinue features at any time, including for
        maintenance or security reasons.
      </p>

      <h2>7. Disclaimer and limitation of liability</h2>
      <p>
        The Service is provided “as is” and “as available”, without warranties of any kind. To the
        maximum extent permitted by law, we are not liable for indirect, incidental or consequential
        damages, or for loss of data, arising from your use of the Service. Keep your own copies of
        important files.
      </p>

      <h2>8. Termination</h2>
      <p>
        Your access ends when your account is removed or your relationship with our organization
        ends. We may suspend access immediately if you breach these Terms. Sections that by their
        nature should survive termination will continue to apply.
      </p>

      <h2>9. Changes to these Terms</h2>
      <p>
        We may update these Terms from time to time. The “Last updated” date above shows the latest
        version. Continued use of the Service after a change means you accept the updated Terms.
      </p>

      <h2>10. Governing law</h2>
      <p>These Terms are governed by the laws of Vietnam.</p>

      <h2>11. Contact</h2>
      <LegalContact context={context} language={language} />
    </>
  );
}

function TermsVi({ context, language }: ContentProps) {
  const { siteName, origin } = context;

  return (
    <>
      <p>
        Điều khoản sử dụng này (“Điều khoản”) điều chỉnh việc bạn truy cập và sử dụng {siteName} tại{' '}
        <a href={origin}>{origin}</a> (“Dịch vụ”). Khi đăng nhập hoặc sử dụng Dịch vụ, bạn đồng ý
        với các Điều khoản này. Nếu không đồng ý, vui lòng không sử dụng Dịch vụ.
      </p>

      <h2>1. Dịch vụ</h2>
      <p>
        {siteName} là không gian làm việc media nội bộ, cho phép thành viên được cấp quyền trong tổ
        chức quản lý project và file media: tải file từ máy tính, nhập file và thư mục từ Google
        Drive, sắp xếp theo thư mục, danh mục, tag, đánh giá, render bản có watermark và tải xuống
        file gốc hoặc bản render.
      </p>

      <h2>2. Điều kiện sử dụng và tài khoản</h2>
      <ul>
        <li>Dịch vụ chỉ dành cho người được quản trị viên của tổ chức cấp tài khoản.</li>
        <li>
          Bạn chịu trách nhiệm bảo mật thông tin đăng nhập và mọi hoạt động dưới tài khoản của mình.
          Hãy báo ngay cho quản trị viên nếu nghi ngờ tài khoản bị sử dụng trái phép.
        </li>
        <li>
          Quản trị viên có thể thay đổi vai trò, quyền thư mục, tạm khóa hoặc thu hồi quyền truy cập
          của bạn bất kỳ lúc nào.
        </li>
      </ul>

      <h2>3. Quy tắc sử dụng</h2>
      <p>Bạn đồng ý không:</p>
      <ul>
        <li>
          Tải lên hoặc nhập nội dung bạn không có quyền sử dụng, hoặc nội dung vi phạm pháp luật,
          xâm phạm quyền, gây hại hay chứa mã độc.
        </li>
        <li>Truy cập hoặc cố truy cập project, thư mục hay dữ liệu bạn không được cấp quyền.</li>
        <li>Can thiệp, gây quá tải, dịch ngược hoặc vượt qua các biện pháp bảo mật của Dịch vụ.</li>
        <li>Chia sẻ nội dung đã tải xuống ngoài mục đích được tổ chức cho phép.</li>
      </ul>

      <h2>4. Tích hợp Google Drive</h2>
      <ul>
        <li>
          Kết nối Google Drive là tùy chọn. Khi kết nối, bạn cho phép {siteName} đọc (chỉ đọc) các
          file và thư mục bạn chọn trong Google Picker để sao chép vào project.
        </li>
        <li>
          {siteName} không bao giờ sửa hay xóa file trong Google Drive của bạn. File đã nhập là bản
          sao độc lập; thay đổi sau đó trên Google Drive không được đồng bộ.
        </li>
        <li>
          Việc sử dụng Google Drive vẫn tuân theo{' '}
          <a href={GOOGLE_TERMS_URL} target="_blank" rel="noreferrer">
            Điều khoản dịch vụ của Google
          </a>
          . Bạn có thể ngắt kết nối Google Drive bất kỳ lúc nào trong {siteName} hoặc trong phần cài
          đặt tài khoản Google.
        </li>
        <li>
          Cách chúng tôi xử lý dữ liệu nhận từ Google được mô tả trong{' '}
          <Link to={`${LEGAL_PATHS.privacy}?lang=vi`}>Chính sách quyền riêng tư</Link>.
        </li>
      </ul>

      <h2>5. Nội dung và quyền sở hữu</h2>
      <ul>
        <li>
          Nội dung bạn tải lên hoặc nhập thuộc sở hữu của bạn hoặc của tổ chức, theo thỏa thuận lao
          động/hợp tác của bạn. Bạn cấp cho {siteName} các quyền cần thiết để lưu trữ, xử lý, render
          và hiển thị nội dung cho người dùng có quyền nhằm cung cấp Dịch vụ.
        </li>
        <li>Bạn chịu trách nhiệm đảm bảo có đủ quyền đối với nội dung tải lên hoặc nhập.</li>
        <li>
          Phần mềm, thiết kế và thương hiệu {siteName} thuộc sở hữu của tổ chức và không được sao
          chép hay sử dụng lại khi chưa được phép.
        </li>
      </ul>

      <h2>6. Tính sẵn sàng và thay đổi</h2>
      <p>
        Chúng tôi nỗ lực duy trì Dịch vụ ổn định nhưng không đảm bảo hoạt động liên tục. Chúng tôi
        có thể thay đổi, tạm dừng hoặc ngừng tính năng bất kỳ lúc nào, kể cả vì lý do bảo trì hoặc
        bảo mật.
      </p>

      <h2>7. Miễn trừ và giới hạn trách nhiệm</h2>
      <p>
        Dịch vụ được cung cấp “nguyên trạng” và “tùy khả năng sẵn có”, không kèm bất kỳ bảo đảm nào.
        Trong phạm vi pháp luật cho phép, chúng tôi không chịu trách nhiệm cho các thiệt hại gián
        tiếp, ngẫu nhiên, hệ quả hoặc mất mát dữ liệu phát sinh từ việc sử dụng Dịch vụ. Hãy tự lưu
        bản sao các file quan trọng.
      </p>

      <h2>8. Chấm dứt</h2>
      <p>
        Quyền truy cập của bạn chấm dứt khi tài khoản bị xóa hoặc khi bạn không còn quan hệ với tổ
        chức. Chúng tôi có thể tạm khóa ngay nếu bạn vi phạm Điều khoản. Các điều khoản mà theo bản
        chất cần tiếp tục hiệu lực sẽ vẫn được áp dụng.
      </p>

      <h2>9. Thay đổi Điều khoản</h2>
      <p>
        Chúng tôi có thể cập nhật Điều khoản này. Ngày “Cập nhật lần cuối” ở trên cho biết phiên bản
        mới nhất. Việc tiếp tục sử dụng Dịch vụ sau khi thay đổi đồng nghĩa với việc bạn chấp nhận
        Điều khoản mới.
      </p>

      <h2>10. Luật áp dụng</h2>
      <p>Điều khoản này được điều chỉnh bởi pháp luật Việt Nam.</p>

      <h2>11. Liên hệ</h2>
      <LegalContact context={context} language={language} />
    </>
  );
}
