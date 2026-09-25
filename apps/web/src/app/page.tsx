import Link from 'next/link';
import { ApiStatus } from '@/components/api-status';
import { Button } from '@/components/ui/button';
import { LOGIN_PATH } from '@/lib/routes';

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Cadence</h1>
      <p className="max-w-md text-muted-foreground">
        Face-recognition check-in and AI-built training plans for your gym.
      </p>
      <Button asChild>
        <Link href={LOGIN_PATH}>Sign in</Link>
      </Button>
      <ApiStatus />
    </main>
  );
}
