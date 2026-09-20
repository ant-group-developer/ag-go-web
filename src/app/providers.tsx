import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App as AntApp, ConfigProvider, theme as antdTheme } from 'antd';
import viVN from 'antd/locale/vi_VN';
import type { PropsWithChildren, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Auth0AppProvider } from '../auth/auth0-provider';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

const theme = {
  token: {
    colorPrimary: '#1677ff',
    borderRadius: 8,
  },
};

const CustomRequiredMark = ({ label, required }: { label: ReactNode; required: boolean }) => {
  const { token } = antdTheme.useToken();

  return (
    <>
      {label}
      {required ? (
        <span
          style={{
            color: token.colorError,
            marginInlineStart: token.marginXXS,
          }}
        >
          *
        </span>
      ) : null}
    </>
  );
};

export function AppProviders({ children }: PropsWithChildren) {
  const { t } = useTranslation();

  return (
    <Auth0AppProvider>
      <QueryClientProvider client={queryClient}>
        <ConfigProvider
          locale={viVN}
          theme={theme}
          form={{
            validateMessages: {
              required: t('required'),
              types: {
                email: t('types.email'),
                number: t('types.number'),
              },
              number: {
                range: t('number.range'),
              },
              string: {
                range: t('string.range'),
                min: t('string.min'),
                max: t('string.max'),
              },
            },
            requiredMark: (label, info) => (
              <CustomRequiredMark label={label} required={Boolean(info.required)} />
            ),
          }}
        >
          <AntApp>{children}</AntApp>
        </ConfigProvider>
      </QueryClientProvider>
    </Auth0AppProvider>
  );
}
