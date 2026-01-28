import { AlertCircle, RefreshCw, Database } from 'lucide-react'
import { Button } from './Button'

interface ErrorStateProps {
  title?: string
  message: string
  code?: string
  details?: string
  migrationHints?: string[]
  onRetry?: () => void
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  code,
  details,
  migrationHints,
  onRetry,
}: ErrorStateProps) {
  const isSchemaError = code === 'DB_SCHEMA_MISMATCH'
  const isNetworkError = code === 'NETWORK_ERROR'

  return (
    <div className="flex min-h-[400px] items-center justify-center p-8">
      <div className="w-full max-w-md text-center">
        <div className="mb-4 flex justify-center">
          {isSchemaError ? (
            <Database className="h-16 w-16 text-amber-500" />
          ) : (
            <AlertCircle className="h-16 w-16 text-red-500" />
          )}
        </div>

        <h2 className="mb-2 text-xl font-semibold text-foreground">{title}</h2>
        
        <p className="mb-4 text-sm text-muted-foreground">{message}</p>

        {details && (
          <div className="mb-4 rounded-lg border border-border bg-muted p-3 text-left text-sm">
            <p className="font-mono text-xs text-muted-foreground">{details}</p>
          </div>
        )}

        {isSchemaError && migrationHints && migrationHints.length > 0 && (
          <div className="mb-4 rounded-lg border border-amber-500/50 bg-amber-50 p-4 text-left dark:bg-amber-900/20">
            <p className="mb-2 font-semibold text-amber-900 dark:text-amber-200">
              Backend Needs Migration
            </p>
            <p className="mb-2 text-sm text-amber-800 dark:text-amber-300">
              The database schema is outdated. Apply these migrations:
            </p>
            <ul className="list-inside list-disc space-y-1 text-xs text-amber-700 dark:text-amber-400">
              {migrationHints.map((hint) => (
                <li key={hint}>{hint}</li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-amber-600 dark:text-amber-500">
              Run in API folder: <code className="rounded bg-amber-100 px-1 dark:bg-amber-900">npm run db:bootstrap</code>
            </p>
          </div>
        )}

        {isNetworkError && (
          <div className="mb-4 rounded-lg border border-red-500/50 bg-red-50 p-4 text-left dark:bg-red-900/20">
            <p className="mb-2 font-semibold text-red-900 dark:text-red-200">
              Cannot Connect to API
            </p>
            <p className="text-sm text-red-800 dark:text-red-300">
              The backend server is not responding. Make sure it's running on port 3001.
            </p>
          </div>
        )}

        {code && !isSchemaError && !isNetworkError && (
          <p className="mb-4 text-xs text-muted-foreground">
            Error code: <code className="rounded bg-muted px-1">{code}</code>
          </p>
        )}

        {onRetry && (
          <Button onClick={onRetry} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
        )}
      </div>
    </div>
  )
}
