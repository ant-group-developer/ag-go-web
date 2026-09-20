import { PageContainer } from '@ant-design/pro-components';
import { Result } from 'antd';

type FeaturePlaceholderPageProps = {
  title: string;
  description: string;
};

export function FeaturePlaceholderPage({ title, description }: FeaturePlaceholderPageProps) {
  return (
    <PageContainer title={title}>
      <Result status="info" title={title} subTitle={description} />
    </PageContainer>
  );
}
