import { useParams } from 'react-router-dom';

import { PagePlaceholder } from '@/components/layout/PagePlaceholder';

const CoursePage = (): JSX.Element => {
  const { courseId } = useParams<{ courseId: string }>();

  return (
    <PagePlaceholder
      title="Course"
      description={`Lessons and progression for course ${courseId ?? 'unknown'}.`}
    />
  );
};

export default CoursePage;
