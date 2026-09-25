import { useSearchParams } from 'react-router-dom';
import { usePublicSettings } from '../../settings/hooks/use-settings';

export type LegalLanguage = 'en' | 'vi';

/** Values interpolated into the legal copy so it follows the admin branding settings. */
export type LegalContext = {
  siteName: string;
  contactEmail: string | null;
  supportUrl: string | null;
  origin: string;
};

/**
 * Reviewers (e.g. Google OAuth verification) usually browse in English, while internal users
 * read Vietnamese: `?lang=` wins, otherwise the browser language decides.
 */
export function useLegalLanguage(): [LegalLanguage, (language: LegalLanguage) => void] {
  const [searchParams, setSearchParams] = useSearchParams();
  const param = searchParams.get('lang');
  const language: LegalLanguage =
    param === 'en' || param === 'vi'
      ? param
      : navigator.language.toLowerCase().startsWith('vi')
        ? 'vi'
        : 'en';

  const setLanguage = (next: LegalLanguage) => {
    setSearchParams(
      (current) => {
        current.set('lang', next);
        return current;
      },
      { replace: true },
    );
  };

  return [language, setLanguage];
}

export function useLegalContext(): { context: LegalContext; isLoading: boolean } {
  const settings = usePublicSettings();
  const brand = settings.data;

  return {
    isLoading: settings.isLoading,
    context: {
      siteName: brand?.siteName?.trim() || 'AG Go',
      contactEmail: brand?.supportEmail?.trim() || null,
      supportUrl: brand?.supportUrl?.trim() || null,
      origin: window.location.origin,
    },
  };
}
