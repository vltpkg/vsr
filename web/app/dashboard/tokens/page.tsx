import { TokenList } from '@/components/token-list'

export default function TokensPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Tokens</h1>
        <p className="text-muted-foreground text-sm">
          Personal access tokens (api-keys). Used as{' '}
          <code className="font-mono">Authorization: Bearer …</code> from
          the npm CLI and other automation.
        </p>
      </header>
      <TokenList />
    </div>
  )
}
