import { useParams } from 'react-router-dom';

import { PagePlaceholder } from '@/components/layout/PagePlaceholder';

const LessonPage = (): JSX.Element => {
  const { lessonId } = useParams<{ lessonId: string }>();

  return (
    <PagePlaceholder
      title="Lesson"
      description={`Lesson content and quiz for lesson ${lessonId ?? 'unknown'}.`}
    />
  );
};

export default LessonPage;
