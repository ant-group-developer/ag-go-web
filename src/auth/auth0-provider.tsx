import { Auth0Provider, useAuth0 } from '@auth0/auth0-react';
import { Alert, Button, Flex, Spin, Typography } from 'antd';
import type { PropsWithChildren } from 'react';
import { useEffect } from 'react';
import { clearAccessTokenGetter, setAccessTokenGetter } from './auth-client';

const { Title, Text } = Typography;

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
      <Flex
        align="center"
        justify="center"
        style={{
          position: 'fixed',
          inset: 0,
          backgroundImage: 'url(/images/background-login-16x9.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <Flex
          vertical
          align="center"
          style={{
            position: 'relative',
            zIndex: 1,
            width: 400,
            padding: '30px 20px',
            borderRadius: 16,
            background: 'rgba(255, 255, 255, 0.10)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.22)',
            boxShadow: '0 8px 40px rgba(0, 0, 0, 0.35)',
          }}
        >
          <Title
            level={2}
            style={{
              margin: '0 0 8px',
              color: '#000',
              letterSpacing: '-0.5px',
              textAlign: 'center',
            }}
          >
            AG Go V2
          </Title>

          <Text
            style={{
              display: 'block',
              marginBottom: 20,
              fontSize: 14,
              color: 'rgba(0, 0, 0, 0.7)',
              lineHeight: 1.6,
              textAlign: 'center',
            }}
          >
            Vui lòng đăng nhập bằng tài khoản Auth0 để tiếp tục.
          </Text>

          <Button
            type="primary"
            size="large"
            block
            onClick={() => void loginWithRedirect()}
            style={{
              height: 48,
              fontSize: 15,
              fontWeight: 600,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #1677ff 0%, #635DFF 100%)',
              border: 'none',
              boxShadow: '0 4px 16px rgba(22, 119, 255, 0.40)',
              letterSpacing: '0.3px',
            }}
          >
            Đăng nhập
          </Button>
        </Flex>
      </Flex>
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
        style={{
          maxWidth: 640,
          margin: '15vh auto',
        }}
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
