import { useParams } from 'react-router-dom';

import { PagePlaceholder } from '@/components/layout/PagePlaceholder';

const ChallengePage = (): JSX.Element => {
  const { challengeId } = useParams<{ challengeId: string }>();

  return (
    <PagePlaceholder
      title="Challenge"
      description={`Guided practice for challenge ${challengeId ?? 'unknown'}.`}
    />
  );
};

export default ChallengePage;
