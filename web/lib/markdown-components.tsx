import type { ComponentPropsWithoutRef } from 'react'
import Link from 'next/link'

import { cn } from '@/lib/utils'

type ClassNameProps = { className?: string }

/** Shared element mapping for markdown docs under `/docs`. */
export const markdownComponents = {
  h1: ({
    className,
    ...props
  }: ComponentPropsWithoutRef<'h1'> & ClassNameProps) => (
    <h1
      className={cn(
        'scroll-m-20 text-3xl font-semibold tracking-tight first:mt-0',
        className,
      )}
      {...props}
    />
  ),
  h2: ({
    className,
    ...props
  }: ComponentPropsWithoutRef<'h2'> & ClassNameProps) => (
    <h2
      className={cn(
        'scroll-m-20 mt-10 border-b pb-2 text-2xl font-semibold tracking-tight first:mt-0',
        className,
      )}
      {...props}
    />
  ),
  h3: ({
    className,
    ...props
  }: ComponentPropsWithoutRef<'h3'> & ClassNameProps) => (
    <h3
      className={cn(
        'scroll-m-20 mt-8 text-xl font-semibold tracking-tight',
        className,
      )}
      {...props}
    />
  ),
  h4: ({
    className,
    ...props
  }: ComponentPropsWithoutRef<'h4'> & ClassNameProps) => (
    <h4
      className={cn(
        'scroll-m-20 mt-6 text-lg font-semibold tracking-tight',
        className,
      )}
      {...props}
    />
  ),
  p: ({
    className,
    ...props
  }: ComponentPropsWithoutRef<'p'> & ClassNameProps) => (
    <p
      className={cn(
        'text-muted-foreground leading-7 [&:not(:first-child)]:mt-4',
        className,
      )}
      {...props}
    />
  ),
  a: ({
    className,
    href,
    ...props
  }: ComponentPropsWithoutRef<'a'> & ClassNameProps) => {
    const classes = cn(
      'text-foreground font-medium underline underline-offset-4 hover:text-foreground/80',
      className,
    )
    if (href?.startsWith('/')) {
      return (
        <Link href={href} className={classes} {...props} />
      )
    }
    return (
      <a
        href={href}
        className={classes}
        target={href?.startsWith('http') ? '_blank' : undefined}
        rel={href?.startsWith('http') ? 'noreferrer' : undefined}
        {...props}
      />
    )
  },
  ul: ({
    className,
    ...props
  }: ComponentPropsWithoutRef<'ul'> & ClassNameProps) => (
    <ul
      className={cn(
        'text-muted-foreground my-4 ml-6 list-disc [&>li]:mt-2',
        className,
      )}
      {...props}
    />
  ),
  ol: ({
    className,
    ...props
  }: ComponentPropsWithoutRef<'ol'> & ClassNameProps) => (
    <ol
      className={cn(
        'text-muted-foreground my-4 ml-6 list-decimal [&>li]:mt-2',
        className,
      )}
      {...props}
    />
  ),
  li: ({
    className,
    ...props
  }: ComponentPropsWithoutRef<'li'> & ClassNameProps) => (
    <li className={cn('leading-7', className)} {...props} />
  ),
  blockquote: ({
    className,
    ...props
  }: ComponentPropsWithoutRef<'blockquote'> & ClassNameProps) => (
    <blockquote
      className={cn(
        'border-primary/20 text-muted-foreground mt-4 border-l-4 pl-4 italic',
        className,
      )}
      {...props}
    />
  ),
  hr: ({
    className,
    ...props
  }: ComponentPropsWithoutRef<'hr'> & ClassNameProps) => (
    <hr className={cn('my-8 border-border', className)} {...props} />
  ),
  table: ({
    className,
    ...props
  }: ComponentPropsWithoutRef<'table'> & ClassNameProps) => (
    <div className="my-6 w-full overflow-x-auto">
      <table
        className={cn('w-full border-collapse text-sm', className)}
        {...props}
      />
    </div>
  ),
  thead: ({
    className,
    ...props
  }: ComponentPropsWithoutRef<'thead'> & ClassNameProps) => (
    <thead className={cn('border-b', className)} {...props} />
  ),
  tbody: ({
    className,
    ...props
  }: ComponentPropsWithoutRef<'tbody'> & ClassNameProps) => (
    <tbody
      className={cn('[&_tr:last-child]:border-0', className)}
      {...props}
    />
  ),
  tr: ({
    className,
    ...props
  }: ComponentPropsWithoutRef<'tr'> & ClassNameProps) => (
    <tr
      className={cn(
        'border-b transition-colors even:bg-muted/40',
        className,
      )}
      {...props}
    />
  ),
  th: ({
    className,
    ...props
  }: ComponentPropsWithoutRef<'th'> & ClassNameProps) => (
    <th
      className={cn(
        'text-foreground h-10 px-3 text-left align-middle font-medium whitespace-nowrap',
        className,
      )}
      {...props}
    />
  ),
  td: ({
    className,
    ...props
  }: ComponentPropsWithoutRef<'td'> & ClassNameProps) => (
    <td
      className={cn(
        'text-muted-foreground px-3 py-2 align-middle whitespace-nowrap',
        className,
      )}
      {...props}
    />
  ),
  code: ({
    className,
    ...props
  }: ComponentPropsWithoutRef<'code'> & ClassNameProps) => (
    <code
      className={cn(
        'bg-muted relative rounded px-[0.3rem] py-[0.15rem] font-mono text-[0.875em]',
        className,
      )}
      {...props}
    />
  ),
  pre: ({
    className,
    ...props
  }: ComponentPropsWithoutRef<'pre'> & ClassNameProps) => (
    <pre
      className={cn(
        'bg-muted mb-4 overflow-x-auto rounded-lg p-4 font-mono text-sm leading-relaxed',
        className,
      )}
      {...props}
    />
  ),
}
