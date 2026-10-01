import Link from 'next/link';
import { Brand } from '@/components/brand';
import { KitBar } from '@/components/kit-bar';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { LOGIN_PATH } from '@/lib/routes';

export function PublicHeader() {
  return (
    <KitBar>
      <Link href="/" className="rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
        <Brand />
      </Link>
      <div className="ml-auto flex items-center gap-1 sm:gap-2">
        <ThemeToggle />
        <Button asChild variant="ghost" className="text-kit-foreground hover:bg-white/10">
          <Link href={LOGIN_PATH}>Sign in</Link>
        </Button>
        <Button asChild variant="tape">
          <Link href="/signup">Join</Link>
        </Button>
      </div>
    </KitBar>
  );
}
