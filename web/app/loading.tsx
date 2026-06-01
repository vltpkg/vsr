import { Loader2 } from 'lucide-react'

import {
  Card,
  CardContent,
  CardHeader,
} from '@/components/ui/card'

export default function HomeLoading() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <div className="bg-muted h-9 w-32 animate-pulse rounded-md" />
        <div className="bg-muted h-4 w-2/3 max-w-xl animate-pulse rounded-md" />
      </header>

      <Card>
        <CardHeader className="flex flex-row items-center gap-3">
          <Loader2
            className="text-muted-foreground size-4 animate-spin"
            aria-hidden
          />
          <span className="text-muted-foreground text-sm">
            Searching configured registries…
          </span>
        </CardHeader>
        <CardContent className="space-y-2 pb-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="bg-muted/60 h-12 w-full animate-pulse rounded-md"
            />
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
