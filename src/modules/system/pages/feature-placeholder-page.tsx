import { Card, Result } from 'antd';

type FeaturePlaceholderPageProps = {
  title: string;
  description: string;
};

export function FeaturePlaceholderPage({ title, description }: FeaturePlaceholderPageProps) {
  return (
    <Card>
      <Result status="info" title={title} subTitle={description} />
    </Card>
  );
}
