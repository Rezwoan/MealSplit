import { Home, ShoppingCart, Scale, Calendar, Package } from 'lucide-react'
import { Tabs } from '../ui/Tabs'

interface RoomTabsProps {
  roomId: string
}

export function RoomTabs({ roomId }: RoomTabsProps) {
  const items = [
    {
      label: 'Dashboard',
      href: `/rooms/${roomId}`,
      icon: <Home className="h-4 w-4" />,
    },
    {
      label: 'Purchases',
      href: `/rooms/${roomId}/purchases`,
      icon: <ShoppingCart className="h-4 w-4" />,
    },
    {
      label: 'Balances',
      href: `/rooms/${roomId}/balances`,
      icon: <Scale className="h-4 w-4" />,
    },
    {
      label: 'Breaks',
      href: `/rooms/${roomId}/breaks`,
      icon: <Calendar className="h-4 w-4" />,
    },
    {
      label: 'Inventory',
      href: `/rooms/${roomId}/inventory`,
      icon: <Package className="h-4 w-4" />,
    },
  ]
  
  return <Tabs items={items} />
}
