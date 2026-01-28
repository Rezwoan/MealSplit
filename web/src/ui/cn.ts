/**
 * Simple className merger utility
 * Merges multiple class names and handles conditional classes
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}
