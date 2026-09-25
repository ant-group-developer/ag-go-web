import { Link } from 'react-router-dom';
import { LegalContact, LegalLayout } from '../components/legal-layout';
import {
  useLegalContext,
  useLegalLanguage,
  type LegalContext,
  type LegalLanguage,
} from '../hooks/use-legal';
import { LEGAL_EFFECTIVE_DATE, LEGAL_PATHS } from '../legal-routes';

const GOOGLE_USER_DATA_POLICY_URL =
  'https://developers.google.com/terms/api-services-user-data-policy';
const GOOGLE_PERMISSIONS_URL = 'https://myaccount.google.com/permissions';

export function PrivacyPage() {
  const [language, setLanguage] = useLegalLanguage();
  const { context } = useLegalContext();
  const vi = language === 'vi';

  return (
    <LegalLayout
      title={vi ? 'Chính sách quyền riêng tư' : 'Privacy Policy'}
      subtitle={`${vi ? 'Cập nhật lần cuối' : 'Last updated'}: ${LEGAL_EFFECTIVE_DATE}`}
      language={language}
      onLanguageChange={setLanguage}
    >
      {vi ? (
        <PrivacyVi context={context} language={language} />
      ) : (
        <PrivacyEn context={context} language={language} />
      )}
    </LegalLayout>
  );
}

type ContentProps = { context: LegalContext; language: LegalLanguage };

function PrivacyEn({ context, language }: ContentProps) {
  const { siteName, origin } = context;

  return (
    <>
      <p>
        This Privacy Policy explains how {siteName} (“{siteName}”, “we”, “us”), available at{' '}
        <a href={origin}>{origin}</a>, collects, uses, stores and shares information when you use
        the application, including information received from Google APIs when you connect your
        Google Drive account.
      </p>
      <p>
        {siteName} is an internal media workspace. Access is limited to members of our organization
        who have been granted an account by an administrator.
      </p>

      <h2>1. Information we collect</h2>
      <h3>1.1 Account information</h3>
      <p>
        When you sign in, our authentication provider (Auth0) shares your name, email address,
        profile picture and a unique user identifier with us. We use this to identify you, show your
        profile in the app and apply the roles and folder permissions assigned to you.
      </p>
      <h3>1.2 Content you upload or import</h3>
      <p>
        We store the media files you upload from your computer or import from Google Drive, together
        with the project information you enter (titles, descriptions, categories, tags, locations,
        evaluations and similar metadata).
      </p>
      <h3>1.3 Information received from Google</h3>
      <p>
        Connecting Google Drive is optional. If you choose to connect it, you are asked to grant the
        following permissions (OAuth scopes):
      </p>
      <ul>
        <li>
          <code>openid</code>, <code>email</code>, <code>profile</code> — to identify the Google
          account you connected. We store only the Google account’s unique identifier so we can link
          the connection to your {siteName} account.
        </li>
        <li>
          <code>https://www.googleapis.com/auth/drive.readonly</code> — to read the files and
          folders you explicitly select in the Google Picker so they can be imported.
        </li>
      </ul>
      <p>When you start an import, we access only the items you selected and we read:</p>
      <ul>
        <li>
          File metadata: file ID, name, MIME type, size, file extension, modification time and
          revision ID.
        </li>
        <li>
          For a selected folder, the list of files inside it (including sub-folders) so the whole
          folder can be imported.
        </li>
        <li>The content of those files, which is copied into the {siteName} project you chose.</li>
      </ul>
      <p>
        {siteName} never creates, modifies or deletes anything in your Google Drive, does not scan
        files you did not select, and does not keep your Drive in sync. Each import is a one-time
        copy started by you.
      </p>
      <h3>1.4 Technical and usage information</h3>
      <p>
        Our servers keep operational logs (such as request time, IP address, action performed and
        error details) and an audit trail of changes made to projects, to keep the service secure
        and to troubleshoot problems. Your browser stores your sign-in session in local storage; we
        do not use advertising or third-party tracking cookies.
      </p>

      <h2>2. How we use information</h2>
      <ul>
        <li>To authenticate you and enforce role-based and folder-level access control.</li>
        <li>
          To import the Google Drive files you selected into your project, and to show the status of
          each import.
        </li>
        <li>
          To store, preview, organize, evaluate and render (for example, apply watermarks to) media
          in your projects, and to let authorized members download them.
        </li>
        <li>To operate, secure, monitor and improve the reliability of the service.</li>
      </ul>

      <h2>3. Google API Services — Limited Use disclosure</h2>
      <p>
        {siteName}’s use and transfer to any other app of information received from Google APIs will
        adhere to the{' '}
        <a href={GOOGLE_USER_DATA_POLICY_URL} target="_blank" rel="noreferrer">
          Google API Services User Data Policy
        </a>
        , including the Limited Use requirements. In particular:
      </p>
      <ul>
        <li>
          We use Google user data only to provide and improve the user-facing Google Drive import
          feature described above.
        </li>
        <li>
          We do not transfer Google user data to others except as necessary to provide that feature,
          to comply with applicable law, or as part of a merger, acquisition or sale of assets with
          notice to users.
        </li>
        <li>
          We do not use Google user data for serving advertisements, including retargeting,
          personalized or interest-based advertising.
        </li>
        <li>We do not sell Google user data.</li>
        <li>
          We do not use Google user data to develop, improve or train generalized or
          non-personalized artificial intelligence or machine learning models.
        </li>
        <li>
          Our staff do not read Google user data unless you have given affirmative consent for
          specific data, it is necessary for security purposes (such as investigating abuse), it is
          required to comply with applicable law, or the data is aggregated and anonymized for
          internal operations.
        </li>
      </ul>

      <h2>4. How we share information</h2>
      <p>We do not sell personal information. We share information only:</p>
      <ul>
        <li>
          With members of our organization who are authorized, through folder permissions, to access
          the project containing the content.
        </li>
        <li>
          With service providers that process data on our behalf to run the service: Auth0
          (authentication), Cloudflare R2 (file storage) and our hosting and database providers.
          They may use the data only to provide their services to us.
        </li>
        <li>When required by law, or to protect the rights, safety and security of users.</li>
      </ul>

      <h2>5. Storage and security</h2>
      <ul>
        <li>All traffic between your browser, our servers and Google is encrypted with HTTPS.</li>
        <li>
          Google OAuth refresh tokens are encrypted at the application level before being stored and
          are never sent to the browser. Short-lived access tokens are provided to your browser only
          to open the Google Picker.
        </li>
        <li>
          Access to projects and files is restricted by role-based permissions and folder-level
          access grants, and changes are recorded in an audit log.
        </li>
      </ul>

      <h2>6. Retention and deletion</h2>
      <ul>
        <li>
          Google OAuth tokens are kept only while Google Drive is connected. When you disconnect
          Google Drive in {siteName}, we revoke the grant at Google and delete the stored refresh
          token immediately.
        </li>
        <li>
          Files copied from Google Drive become part of the {siteName} project and are kept until
          they, or the project, are deleted by an authorized user. Deleting a file in Google Drive
          does not delete the copy in {siteName}.
        </li>
        <li>
          Operational logs are kept for a limited period needed for security and troubleshooting.
        </li>
        <li>
          You can ask us to delete your personal data or the files you imported at any time using
          the contact details below; we will respond within 30 days.
        </li>
      </ul>

      <h2>7. Your choices</h2>
      <ul>
        <li>You can use {siteName} without connecting Google Drive.</li>
        <li>You can disconnect Google Drive at any time from the Google Drive import panel.</li>
        <li>
          You can also revoke {siteName}’s access from your Google Account at{' '}
          <a href={GOOGLE_PERMISSIONS_URL} target="_blank" rel="noreferrer">
            {GOOGLE_PERMISSIONS_URL}
          </a>
          .
        </li>
        <li>You can request access to, correction of or deletion of your personal data.</li>
      </ul>

      <h2>8. Children</h2>
      <p>
        {siteName} is a workplace tool and is not directed to children. We do not knowingly collect
        information from anyone under the age of 16.
      </p>

      <h2>9. Changes to this policy</h2>
      <p>
        We may update this policy from time to time. The “Last updated” date at the top shows when
        it was last changed. Material changes will be announced inside the application.
      </p>

      <h2>10. Contact us</h2>
      <p>For questions about this policy or requests about your data, contact us:</p>
      <LegalContact context={context} language={language} />
      <p>
        See also our <Link to={`${LEGAL_PATHS.terms}?lang=en`}>Terms of Service</Link>.
      </p>
    </>
  );
}

function PrivacyVi({ context, language }: ContentProps) {
  const { siteName, origin } = context;

  return (
    <>
      <p>
        Chính sách này giải thích cách {siteName} (“{siteName}”, “chúng tôi”), truy cập tại{' '}
        <a href={origin}>{origin}</a>, thu thập, sử dụng, lưu trữ và chia sẻ thông tin khi bạn sử
        dụng ứng dụng, bao gồm thông tin nhận được từ Google API khi bạn kết nối tài khoản Google
        Drive.
      </p>
      <p>
        {siteName} là không gian làm việc media nội bộ. Chỉ thành viên của tổ chức được quản trị
        viên cấp tài khoản mới có thể truy cập.
      </p>

      <h2>1. Thông tin chúng tôi thu thập</h2>
      <h3>1.1 Thông tin tài khoản</h3>
      <p>
        Khi bạn đăng nhập, nhà cung cấp xác thực (Auth0) chia sẻ với chúng tôi tên, email, ảnh đại
        diện và mã định danh người dùng. Chúng tôi dùng các thông tin này để nhận diện bạn, hiển thị
        hồ sơ và áp dụng vai trò, quyền thư mục được cấp cho bạn.
      </p>
      <h3>1.2 Nội dung bạn tải lên hoặc nhập</h3>
      <p>
        Chúng tôi lưu các file media bạn tải lên từ máy tính hoặc nhập từ Google Drive, cùng thông
        tin project bạn nhập (tiêu đề, mô tả, danh mục, tag, địa điểm, đánh giá và metadata tương
        tự).
      </p>
      <h3>1.3 Thông tin nhận từ Google</h3>
      <p>
        Việc kết nối Google Drive là tùy chọn. Nếu bạn chọn kết nối, bạn sẽ được yêu cầu cấp các
        quyền (OAuth scope) sau:
      </p>
      <ul>
        <li>
          <code>openid</code>, <code>email</code>, <code>profile</code> — để xác định tài khoản
          Google đã kết nối. Chúng tôi chỉ lưu mã định danh duy nhất của tài khoản Google để liên
          kết kết nối với tài khoản {siteName} của bạn.
        </li>
        <li>
          <code>https://www.googleapis.com/auth/drive.readonly</code> — để đọc các file và thư mục
          bạn chủ động chọn trong Google Picker nhằm nhập chúng vào hệ thống.
        </li>
      </ul>
      <p>Khi bạn bắt đầu một lượt nhập, chúng tôi chỉ truy cập các mục bạn đã chọn và đọc:</p>
      <ul>
        <li>
          Metadata của file: ID, tên, loại MIME, dung lượng, phần mở rộng, thời gian sửa đổi và ID
          phiên bản.
        </li>
        <li>
          Với thư mục được chọn: danh sách file bên trong (kể cả thư mục con) để nhập toàn bộ thư
          mục.
        </li>
        <li>Nội dung các file đó, được sao chép vào project {siteName} mà bạn chọn.</li>
      </ul>
      <p>
        {siteName} không bao giờ tạo, sửa hay xóa bất kỳ nội dung nào trong Google Drive của bạn,
        không quét các file bạn không chọn và không đồng bộ Drive. Mỗi lượt nhập là một bản sao một
        lần do chính bạn khởi tạo.
      </p>
      <h3>1.4 Thông tin kỹ thuật và sử dụng</h3>
      <p>
        Máy chủ lưu log vận hành (thời gian yêu cầu, địa chỉ IP, thao tác và chi tiết lỗi) và nhật
        ký thay đổi (audit log) của project để bảo mật và xử lý sự cố. Trình duyệt lưu phiên đăng
        nhập trong local storage; chúng tôi không dùng cookie quảng cáo hay theo dõi của bên thứ ba.
      </p>

      <h2>2. Cách chúng tôi sử dụng thông tin</h2>
      <ul>
        <li>Xác thực bạn và áp dụng phân quyền theo vai trò và theo thư mục.</li>
        <li>Nhập các file Google Drive bạn đã chọn vào project và hiển thị trạng thái nhập.</li>
        <li>
          Lưu trữ, xem trước, sắp xếp, đánh giá, render (ví dụ gắn watermark) media trong project và
          cho phép thành viên có quyền tải xuống.
        </li>
        <li>Vận hành, bảo mật, giám sát và nâng cao độ ổn định của dịch vụ.</li>
      </ul>

      <h2>3. Google API Services — Cam kết sử dụng giới hạn (Limited Use)</h2>
      <p>
        Việc {siteName} sử dụng và chuyển giao cho ứng dụng khác bất kỳ thông tin nào nhận được từ
        Google API sẽ tuân thủ{' '}
        <a href={GOOGLE_USER_DATA_POLICY_URL} target="_blank" rel="noreferrer">
          Chính sách dữ liệu người dùng của Google API Services
        </a>
        , bao gồm các yêu cầu Limited Use. Cụ thể:
      </p>
      <ul>
        <li>
          Chúng tôi chỉ dùng dữ liệu Google để cung cấp và cải thiện tính năng nhập từ Google Drive
          mà người dùng sử dụng trực tiếp.
        </li>
        <li>
          Không chuyển giao dữ liệu Google cho bên khác, trừ khi cần thiết để cung cấp tính năng
          trên, để tuân thủ pháp luật, hoặc trong trường hợp sáp nhập, mua bán tài sản có thông báo
          cho người dùng.
        </li>
        <li>Không dùng dữ liệu Google để hiển thị quảng cáo, kể cả quảng cáo nhắm mục tiêu.</li>
        <li>Không bán dữ liệu Google.</li>
        <li>
          Không dùng dữ liệu Google để phát triển, cải thiện hoặc huấn luyện các mô hình trí tuệ
          nhân tạo / học máy tổng quát.
        </li>
        <li>
          Nhân sự của chúng tôi không đọc dữ liệu Google, trừ khi bạn đồng ý rõ ràng với dữ liệu cụ
          thể, cần thiết vì mục đích bảo mật (ví dụ điều tra lạm dụng), theo yêu cầu pháp luật, hoặc
          dữ liệu đã được tổng hợp và ẩn danh cho vận hành nội bộ.
        </li>
      </ul>

      <h2>4. Chia sẻ thông tin</h2>
      <p>Chúng tôi không bán thông tin cá nhân. Chúng tôi chỉ chia sẻ thông tin:</p>
      <ul>
        <li>Với thành viên trong tổ chức được cấp quyền truy cập thư mục chứa project.</li>
        <li>
          Với các nhà cung cấp dịch vụ xử lý dữ liệu thay mặt chúng tôi: Auth0 (xác thực),
          Cloudflare R2 (lưu trữ file), nhà cung cấp hosting và cơ sở dữ liệu. Họ chỉ được dùng dữ
          liệu để cung cấp dịch vụ cho chúng tôi.
        </li>
        <li>Khi pháp luật yêu cầu, hoặc để bảo vệ quyền, an toàn và bảo mật của người dùng.</li>
      </ul>

      <h2>5. Lưu trữ và bảo mật</h2>
      <ul>
        <li>Mọi kết nối giữa trình duyệt, máy chủ và Google đều được mã hóa bằng HTTPS.</li>
        <li>
          Refresh token Google OAuth được mã hóa ở tầng ứng dụng trước khi lưu và không bao giờ gửi
          về trình duyệt. Access token ngắn hạn chỉ được cấp cho trình duyệt để mở Google Picker.
        </li>
        <li>
          Quyền truy cập project và file được giới hạn bằng phân quyền theo vai trò và theo thư mục;
          các thay đổi được ghi vào audit log.
        </li>
      </ul>

      <h2>6. Thời gian lưu giữ và xóa dữ liệu</h2>
      <ul>
        <li>
          Token Google OAuth chỉ được giữ khi Google Drive còn kết nối. Khi bạn ngắt kết nối trong{' '}
          {siteName}, chúng tôi thu hồi quyền phía Google và xóa ngay refresh token đã lưu.
        </li>
        <li>
          File sao chép từ Google Drive trở thành một phần của project và được giữ cho đến khi file
          hoặc project bị người có quyền xóa. Xóa file trên Google Drive không xóa bản sao trong{' '}
          {siteName}.
        </li>
        <li>Log vận hành được giữ trong thời gian cần thiết cho bảo mật và xử lý sự cố.</li>
        <li>
          Bạn có thể yêu cầu xóa dữ liệu cá nhân hoặc các file đã nhập bất kỳ lúc nào qua thông tin
          liên hệ bên dưới; chúng tôi sẽ phản hồi trong vòng 30 ngày.
        </li>
      </ul>

      <h2>7. Lựa chọn của bạn</h2>
      <ul>
        <li>Bạn có thể dùng {siteName} mà không cần kết nối Google Drive.</li>
        <li>Bạn có thể ngắt kết nối Google Drive bất kỳ lúc nào tại khu vực nhập Google Drive.</li>
        <li>
          Bạn cũng có thể thu hồi quyền của {siteName} trong tài khoản Google tại{' '}
          <a href={GOOGLE_PERMISSIONS_URL} target="_blank" rel="noreferrer">
            {GOOGLE_PERMISSIONS_URL}
          </a>
          .
        </li>
        <li>Bạn có thể yêu cầu truy cập, chỉnh sửa hoặc xóa dữ liệu cá nhân của mình.</li>
      </ul>

      <h2>8. Trẻ em</h2>
      <p>
        {siteName} là công cụ dành cho công việc, không hướng tới trẻ em. Chúng tôi không chủ ý thu
        thập thông tin của người dưới 16 tuổi.
      </p>

      <h2>9. Thay đổi chính sách</h2>
      <p>
        Chúng tôi có thể cập nhật chính sách này. Ngày “Cập nhật lần cuối” ở đầu trang cho biết lần
        thay đổi gần nhất. Các thay đổi quan trọng sẽ được thông báo trong ứng dụng.
      </p>

      <h2>10. Liên hệ</h2>
      <p>Mọi câu hỏi về chính sách hoặc yêu cầu liên quan đến dữ liệu, vui lòng liên hệ:</p>
      <LegalContact context={context} language={language} />
      <p>
        Xem thêm <Link to={`${LEGAL_PATHS.terms}?lang=vi`}>Điều khoản sử dụng</Link>.
      </p>
    </>
  );
}
