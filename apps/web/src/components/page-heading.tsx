import { Skeleton } from '@/components/ui/skeleton';

interface PageHeadingProps {
  title: string;
  description?: string;
}

function PageHeadingRoot({ title, description }: PageHeadingProps) {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {description && <p className="text-muted-foreground">{description}</p>}
    </>
  );
}

// h-8 and h-6 are the line heights of the text-2xl title and of one line of body text.
function PageHeadingSkeleton({ hasDescription = true }: { hasDescription?: boolean }) {
  return (
    <>
      <Skeleton className="h-8 w-48" />
      {hasDescription && <Skeleton className="h-6 w-full max-w-md" />}
    </>
  );
}

export const PageHeading = Object.assign(PageHeadingRoot, { Skeleton: PageHeadingSkeleton });
