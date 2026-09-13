import { Link } from 'react-router-dom';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const RegisterPage = (): JSX.Element => (
  <div className="flex min-h-screen items-center justify-center p-6">
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Create your account</CardTitle>
        <CardDescription>
          Registration is wired to <code>POST /api/v1/auth/register</code> and ships with the
          authentication milestone (V1.1).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Already registered?{' '}
          <Link className="text-primary hover:underline" to="/login">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  </div>
);

export default RegisterPage;
