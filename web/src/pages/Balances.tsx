import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Wallet, ArrowRight, AlertTriangle } from 'lucide-react'
import { apiRequest } from '../lib/api'
import { formatCents } from '../lib/money'
import { AppShell } from '../layout/AppShell'
import { AnimatedPage } from '../ui/AnimatedPage'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { LoadingState } from '../ui/LoadingSpinner'
import { EmptyState } from '../ui/EmptyState'
import { RoomTabs } from '../components/RoomTabs'

interface BalanceMember {
  userId: string
  displayName: string
  paidCents: number
  shareCents: number
  netCents: number
}

interface Transfer {
  fromUserId: string
  toUserId: string
  amountCents: number
}

export default function Balances() {
  const { roomId } = useParams()
  const [members, setMembers] = useState<BalanceMember[]>([])
  const [memberMap, setMemberMap] = useState<Record<string, string>>({})
  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [currency, setCurrency] = useState('USD')
  const [roomName, setRoomName] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadBalances = async () => {
    if (!roomId) return
    setLoading(true)
    try {
      const [balanceData, roomData] = await Promise.all([
        apiRequest<{
          currency: string
          members: BalanceMember[]
          suggestedTransfers: Transfer[]
        }>(`/rooms/${roomId}/balances`),
        apiRequest<{ room: { name: string } }>(`/rooms/${roomId}`),
      ])
      setCurrency(balanceData.currency)
      setMembers(balanceData.members)
      setTransfers(balanceData.suggestedTransfers)
      setRoomName(roomData.room.name)
      const map: Record<string, string> = {}
      balanceData.members.forEach((member) => {
        map[member.userId] = member.displayName
      })
      setMemberMap(map)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load balances')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBalances()
  }, [roomId])

  return (
    <AppShell>
      <AnimatedPage>
        <div className="space-y-6">
          {/* Room Header */}
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{roomName || 'Room'}</h1>
            <p className="text-sm text-muted-foreground mt-1">View member balances and suggested transfers</p>
          </div>

          {/* Room Tabs */}
          {roomId && <RoomTabs roomId={roomId} />}

          {error && (
            <div className="flex items-start gap-3 rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <LoadingState message="Loading balances..." />
          ) : (
            <>
              {/* Member Balances */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wallet className="h-5 w-5" />
                    Member Balances ({members.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {members.length === 0 ? (
                    <EmptyState
                      icon={Wallet}
                      title="No balances yet"
                      description="Add some purchases to see member balances."
                    />
                  ) : (
                    <ul className="space-y-3">
                      {members.map((member) => (
                        <li
                          key={member.userId}
                          className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-card-hover transition-colors"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{member.displayName}</p>
                              <Badge variant={member.netCents >= 0 ? 'success' : 'destructive'}>
                                {member.netCents >= 0 ? 'Owed' : 'Owes'}
                              </Badge>
                            </div>
                            <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
                              <span>Paid: {formatCents(currency, member.paidCents)}</span>
                              <span>·</span>
                              <span>Share: {formatCents(currency, member.shareCents)}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`text-lg font-semibold ${member.netCents >= 0 ? 'text-success' : 'text-destructive'}`}>
                              {member.netCents >= 0 ? '+' : ''}{formatCents(currency, member.netCents)}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>

              {/* Suggested Transfers */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ArrowRight className="h-5 w-5" />
                    Suggested Transfers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {transfers.length === 0 ? (
                    <EmptyState
                      icon={ArrowRight}
                      title="All settled up!"
                      description="No transfers needed. Everyone is balanced."
                    />
                  ) : (
                    <ul className="space-y-3">
                      {transfers.map((transfer) => (
                        <li
                          key={`${transfer.fromUserId}-${transfer.toUserId}`}
                          className="flex items-center gap-3 p-4 rounded-lg border border-border hover:bg-card-hover transition-colors"
                        >
                          <div className="flex-1 flex items-center gap-3">
                            <span className="font-medium">
                              {memberMap[transfer.fromUserId] ?? transfer.fromUserId}
                            </span>
                            <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="font-medium">
                              {memberMap[transfer.toUserId] ?? transfer.toUserId}
                            </span>
                          </div>
                          <span className="text-lg font-semibold text-primary">
                            {formatCents(currency, transfer.amountCents)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </AnimatedPage>
    </AppShell>
  )
}
