import { Auth0Provider, useAuth0 } from '@auth0/auth0-react';
import { Alert, Button, Card, Spin, Typography } from 'antd';
import type { PropsWithChildren } from 'react';
import { useEffect } from 'react';
import { clearAccessTokenGetter, setAccessTokenGetter } from './auth-client';

const domain = import.meta.env.VITE_AUTH0_DOMAIN;
const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID;
const audience = import.meta.env.VITE_AUTH0_AUDIENCE;

function TokenBridge({ children }: PropsWithChildren) {
  const { getAccessTokenSilently } = useAuth0();

  useEffect(() => {
    setAccessTokenGetter(async () => {
      const token = await getAccessTokenSilently();
      if (!token) {
        throw new Error('Auth0 did not return an access token');
      }
      return token;
    });
    return clearAccessTokenGetter;
  }, [getAccessTokenSilently]);

  return children;
}

function AuthenticatedApp({ children }: PropsWithChildren) {
  const { isLoading, isAuthenticated, loginWithRedirect } = useAuth0();

  if (isLoading) {
    return <Spin fullscreen tip="Đang xác thực..." />;
  }

  if (!isAuthenticated) {
    return (
      <Card style={{ maxWidth: 480, margin: '15vh auto' }}>
        <Typography.Title level={3}>Đăng nhập AG Go</Typography.Title>
        <Typography.Paragraph>
          Vui lòng đăng nhập bằng tài khoản Auth0 để tiếp tục.
        </Typography.Paragraph>
        <Button type="primary" onClick={() => void loginWithRedirect()}>
          Đăng nhập
        </Button>
      </Card>
    );
  }

  return <>{children}</>;
}

export function Auth0AppProvider({ children }: PropsWithChildren) {
  if (!domain || !clientId || !audience) {
    return (
      <Alert
        type="error"
        showIcon
        message="Thiếu cấu hình Auth0"
        description="Cần thiết lập VITE_AUTH0_DOMAIN, VITE_AUTH0_CLIENT_ID và VITE_AUTH0_AUDIENCE."
        style={{ maxWidth: 640, margin: '15vh auto' }}
      />
    );
  }

  return (
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      cacheLocation="localstorage"
      useRefreshTokens
      authorizationParams={{
        audience,
        redirect_uri: window.location.origin,
      }}
    >
      <TokenBridge>
        <AuthenticatedApp>{children}</AuthenticatedApp>
      </TokenBridge>
    </Auth0Provider>
  );
}
