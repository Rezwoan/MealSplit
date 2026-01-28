import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { cn } from './cn'

interface TabItem {
  label: string
  href: string
  icon?: ReactNode
}

interface TabsProps {
  items: TabItem[]
}

export function Tabs({ items }: TabsProps) {
  const location = useLocation()
  
  return (
    <div className="border-b border-border">
      <nav className="-mb-px flex space-x-6">
        {items.map((item) => {
          const isActive = location.pathname === item.href
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'flex items-center gap-2 border-b-2 px-1 py-3 text-sm font-medium transition-colors',
                isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
              )}
            >
              {item.icon}
              {item.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
