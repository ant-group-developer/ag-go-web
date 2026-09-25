import { Segmented, Skeleton } from 'antd';
import type { CSSProperties, PropsWithChildren, ReactNode } from 'react';
import { useEffect } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { usePublicSettings } from '../../settings/hooks/use-settings';
import { useLegalContext, type LegalContext, type LegalLanguage } from '../hooks/use-legal';
import { LEGAL_PATHS } from '../legal-routes';

const NAV_LABELS: Record<
  LegalLanguage,
  Record<'about' | 'privacy' | 'terms' | 'signIn', string>
> = {
  en: { about: 'About', privacy: 'Privacy Policy', terms: 'Terms of Service', signIn: 'Sign in' },
  vi: {
    about: 'Giới thiệu',
    privacy: 'Chính sách quyền riêng tư',
    terms: 'Điều khoản sử dụng',
    signIn: 'Đăng nhập',
  },
};

type LegalLayoutProps = PropsWithChildren<{
  title: string;
  subtitle?: ReactNode;
  language: LegalLanguage;
  onLanguageChange: (language: LegalLanguage) => void;
}>;

export function LegalLayout({
  title,
  subtitle,
  language,
  onLanguageChange,
  children,
}: LegalLayoutProps) {
  const settings = usePublicSettings();
  const brand = settings.data;
  const { context, isLoading } = useLegalContext();
  const labels = NAV_LABELS[language];
  const accentStyle = {
    '--legal-accent': brand?.primaryColor?.trim() || '#1677ff',
  } as CSSProperties;
  const withLang = (path: string) => `${path}?lang=${language}`;

  useEffect(() => {
    document.title = title === context.siteName ? title : `${title} · ${context.siteName}`;
    document.documentElement.lang = language;
  }, [context.siteName, language, title]);

  return (
    <div className="legal-page" style={accentStyle}>
      <header className="legal-header">
        <div className="legal-header-inner">
          <Link to={withLang(LEGAL_PATHS.about)} className="legal-brand">
            {isLoading ? (
              <Skeleton.Avatar active shape="square" size={32} />
            ) : brand?.logoUrl ? (
              <img src={brand.logoUrl} alt="" className="legal-brand-logo" />
            ) : null}
            <span>{context.siteName}</span>
          </Link>

          <nav className="legal-nav" aria-label={context.siteName}>
            <NavLink to={withLang(LEGAL_PATHS.about)}>{labels.about}</NavLink>
            <NavLink to={withLang(LEGAL_PATHS.privacy)}>{labels.privacy}</NavLink>
            <NavLink to={withLang(LEGAL_PATHS.terms)}>{labels.terms}</NavLink>
          </nav>

          <div className="legal-header-actions">
            <Segmented<LegalLanguage>
              size="small"
              value={language}
              onChange={onLanguageChange}
              options={[
                { label: 'EN', value: 'en' },
                { label: 'VI', value: 'vi' },
              ]}
            />
            <a href="/" className="legal-signin">
              {labels.signIn}
            </a>
          </div>
        </div>
      </header>

      <main className="legal-main">
        <article className="legal-article">
          <h1 className="legal-title">{title}</h1>
          {subtitle ? <p className="legal-subtitle">{subtitle}</p> : null}
          <div className="legal-prose">{children}</div>
        </article>
      </main>

      <footer className="legal-footer">
        <span>
          © {new Date().getFullYear()} {context.siteName}
        </span>
        <Link to={withLang(LEGAL_PATHS.about)}>{labels.about}</Link>
        <Link to={withLang(LEGAL_PATHS.privacy)}>{labels.privacy}</Link>
        <Link to={withLang(LEGAL_PATHS.terms)}>{labels.terms}</Link>
        {context.contactEmail ? (
          <a href={`mailto:${context.contactEmail}`}>{context.contactEmail}</a>
        ) : null}
      </footer>
    </div>
  );
}

/** Contact line used by every legal page; degrades gracefully when no support email is set. */
export function LegalContact({
  context,
  language,
}: {
  context: LegalContext;
  language: LegalLanguage;
}) {
  const { contactEmail, supportUrl } = context;
  const vi = language === 'vi';

  return (
    <ul>
      {contactEmail ? (
        <li>
          Email: <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
        </li>
      ) : null}
      {supportUrl ? (
        <li>
          {vi ? 'Trang hỗ trợ' : 'Support page'}:{' '}
          <a href={supportUrl} target="_blank" rel="noreferrer">
            {supportUrl}
          </a>
        </li>
      ) : null}
      {!contactEmail && !supportUrl ? (
        <li>
          {vi
            ? 'Liên hệ quản trị viên hệ thống của tổ chức bạn.'
            : "Contact your organization's system administrator."}
        </li>
      ) : null}
    </ul>
  );
}
