import { cn } from '@/lib/utils'

export type PublisherInfo = {
  username?: string
  email?: string
  name?: string
  avatarUrl?: string
}

type Props = {
  publisher?: PublisherInfo
  className?: string
}

function displayName(publisher: PublisherInfo): string {
  return (
    publisher.username ??
    publisher.name ??
    publisher.email ??
    'Unknown'
  )
}

function initials(publisher: PublisherInfo): string {
  const label = displayName(publisher)
  const parts = label.split(/[\s@._-]+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return label.slice(0, 2).toUpperCase()
}

export function PublisherAvatar({ publisher, className }: Props) {
  if (!publisher) {
    return <span className="text-muted-foreground text-xs">—</span>
  }

  const name = displayName(publisher)

  return (
    <span className={cn('inline-flex h-5 max-w-full items-center gap-2', className)}>
      {publisher.avatarUrl ?
        <img
          src={publisher.avatarUrl}
          alt=""
          width={20}
          height={20}
          className="size-5 shrink-0 rounded-full bg-muted"
        />
      : <span
          aria-hidden
          className="bg-muted text-muted-foreground inline-flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-medium"
        >
          {initials(publisher)}
        </span>
      }
      <span className="truncate font-sans text-xs">{name}</span>
    </span>
  )
}
