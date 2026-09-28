import { Button, Skeleton, Typography, theme as antdTheme } from 'antd';
import { ArrowRight, LifeBuoy, Mail, ShieldCheck } from 'lucide-react';
import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { LEGAL_PATHS } from '../modules/legal/legal-routes';
import type { WebSettings } from '../modules/settings/api/settings';
import { usePublicSettings } from '../modules/settings/hooks/use-settings';
import { LanguageSwitch } from '../shared/components/language-switch';

const { Title, Text } = Typography;

const DEFAULT_BACKGROUND_IMAGE = '/images/background-login-16x9.jpg';

type LoginScreenProps = {
  onLogin: () => void;
};

/**
 * Pre-auth landing screen. Branding (name, logo, description, accent colour, support links)
 * comes from the public web settings so it stays in sync with the admin settings page.
 */
export function LoginScreen({ onLogin }: LoginScreenProps) {
  const { t } = useTranslation();
  const { token } = antdTheme.useToken();
  const settings = usePublicSettings();

  const brand = settings.data;
  const isBrandLoading = settings.isLoading;
  const siteName = brand?.siteName?.trim() || t('app.title');
  const description = brand?.siteDescription?.trim() || t('auth.tagline');
  const accent = brand?.primaryColor?.trim() || token.colorPrimary;
  const backgroundImage = brand?.loginBackgroundUrl?.trim() || DEFAULT_BACKGROUND_IMAGE;
  const accentStyle = { '--login-accent': accent } as CSSProperties;
  const hasSupport = Boolean(brand?.supportEmail || brand?.supportUrl);

  return (
    <div className="login-screen" style={accentStyle}>
      <div className="login-backdrop" style={{ backgroundImage: `url("${backgroundImage}")` }} />
      <div className="login-overlay" />
      <LanguageSwitch className="login-language" />

      <div className="login-layout">
        <section className="login-hero">
          <BrandMark brand={brand} siteName={siteName} loading={isBrandLoading} size={64} />

          <div className="login-hero-copy">
            {isBrandLoading ? (
              <Skeleton
                active
                title={{ width: 240 }}
                paragraph={{ rows: 2, width: ['80%', '60%'] }}
              />
            ) : (
              <>
                <Title className="login-hero-title">{siteName}</Title>
                <Text className="login-hero-description">{description}</Text>
              </>
            )}
          </div>

          <ul className="login-hero-points">
            <li>
              <ShieldCheck size={18} strokeWidth={2} />
              <span>{t('auth.pointSecure')}</span>
            </li>
            <li>
              <LifeBuoy size={18} strokeWidth={2} />
              <span>{t('auth.pointInternal')}</span>
            </li>
          </ul>
        </section>

        <section className="login-card" aria-labelledby="login-card-title">
          <div className="login-card-brand">
            <BrandMark brand={brand} siteName={siteName} loading={isBrandLoading} size={44} />
            {isBrandLoading ? (
              <Skeleton.Input active size="small" style={{ width: 140 }} />
            ) : (
              <span className="login-card-brand-name">{siteName}</span>
            )}
          </div>

          <Title level={3} id="login-card-title" className="login-card-title">
            {t('auth.welcome')}
          </Title>
          <Text className="login-card-subtitle">{t('auth.loginPrompt')}</Text>

          <Button
            type="primary"
            size="large"
            block
            className="login-button"
            onClick={onLogin}
            icon={<ArrowRight size={18} strokeWidth={2.25} />}
            iconPosition="end"
          >
            {t('auth.login')}
          </Button>

          <Text className="login-card-note">
            <ShieldCheck size={14} strokeWidth={2} />
            {t('auth.secureNote')}
          </Text>

          {hasSupport ? (
            <div className="login-card-support">
              <span>{t('auth.needHelp')}</span>
              {brand?.supportEmail ? (
                <a href={`mailto:${brand.supportEmail}`}>
                  <Mail size={14} strokeWidth={2} />
                  {brand.supportEmail}
                </a>
              ) : null}
              {brand?.supportUrl ? (
                <a href={brand.supportUrl} target="_blank" rel="noreferrer">
                  <LifeBuoy size={14} strokeWidth={2} />
                  {t('auth.supportCenter')}
                </a>
              ) : null}
            </div>
          ) : null}
        </section>
      </div>

      <footer className="login-footer">
        <span>
          © {new Date().getFullYear()} {siteName}
        </span>
        <nav className="login-footer-links">
          <Link to={LEGAL_PATHS.about}>{t('auth.about')}</Link>
          <Link to={LEGAL_PATHS.privacy}>{t('auth.privacy')}</Link>
          <Link to={LEGAL_PATHS.terms}>{t('auth.terms')}</Link>
        </nav>
      </footer>
    </div>
  );
}

type BrandMarkProps = {
  brand: WebSettings | undefined;
  siteName: string;
  loading: boolean;
  size: number;
};

/** Site logo when configured; otherwise a monogram built from the site name. */
function BrandMark({ brand, siteName, loading, size }: BrandMarkProps) {
  if (loading) {
    return <Skeleton.Avatar active shape="square" size={size} />;
  }

  if (brand?.logoUrl) {
    return (
      <img
        className="login-logo"
        src={brand.logoUrl}
        alt={siteName}
        style={{ height: size, maxWidth: size * 3 }}
      />
    );
  }

  return (
    <span
      className="login-monogram"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }}
      aria-hidden
    >
      {toMonogram(siteName)}
    </span>
  );
}

function toMonogram(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  const initials = words.length >= 2 ? words[0][0] + words[1][0] : name.slice(0, 2);
  return initials.toUpperCase();
}
