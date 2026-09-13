import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface PagePlaceholderProps {
  title: string;
  description: string;
}

/**
 * Foundation-only screen shell. Each page is replaced by its real
 * implementation in the corresponding feature milestone (see docs/ROADMAP.md).
 */
export const PagePlaceholder = ({ title, description }: PagePlaceholderProps): JSX.Element => (
  <section className="flex flex-col gap-6">
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>

    <Card>
      <CardHeader>
        <CardTitle>Not implemented yet</CardTitle>
        <CardDescription>
          This screen is part of the CyberPingo foundation. Data will come from the REST API once
          the matching backend module is available.
        </CardDescription>
      </CardHeader>
    </Card>
  </section>
);
