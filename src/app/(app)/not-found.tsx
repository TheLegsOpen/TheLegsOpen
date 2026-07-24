import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Container } from "@/components/shared/container";

export default function NotFound() {
  return (
    <Container className="flex min-h-[60vh] flex-col items-center justify-center gap-6 py-24 text-center">
      <span className="font-display font-bold text-display-xl text-primary">404</span>
      <h1 className="font-display font-bold text-display-sm">This page has left the course</h1>
      <p className="max-w-md text-muted-foreground">
        The page you&rsquo;re looking for doesn&rsquo;t exist, or has moved. Try the homepage, or head to the
        latest news.
      </p>
      <div className="flex gap-3">
        <Button asChild>
          <Link href="/">Back to homepage</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/latest">Latest news</Link>
        </Button>
      </div>
    </Container>
  );
}
