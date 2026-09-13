import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const pillars = [
  {
    title: 'Progressive lessons',
    description: 'Short, structured modules covering networking, Linux and security fundamentals.',
  },
  {
    title: 'Hands-on challenges',
    description: 'Practice in safe, isolated exercises designed for learning, never for attacking.',
  },
  {
    title: 'Real progression',
    description: 'XP, levels and badges are computed by the backend, so progress is always earned.',
  },
];

const LandingPage = (): JSX.Element => (
  <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30">
    <section className="container flex flex-col items-center gap-6 py-24 text-center">
      <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
        Learn cybersecurity, one lesson at a time
      </h1>
      <p className="max-w-2xl text-muted-foreground">
        CyberPingo turns cybersecurity into a progressive, gamified learning path: bite-sized
        lessons, guided practice and measurable progress.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button asChild size="lg">
          <Link to="/register">Get started</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link to="/courses">Browse courses</Link>
        </Button>
      </div>
    </section>

    <section className="container grid gap-6 pb-24 md:grid-cols-3">
      {pillars.map((pillar) => (
        <Card key={pillar.title}>
          <CardHeader>
            <CardTitle>{pillar.title}</CardTitle>
            <CardDescription>{pillar.description}</CardDescription>
          </CardHeader>
          <CardContent />
        </Card>
      ))}
    </section>
  </div>
);

export default LandingPage;
