import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Users, AlertTriangle, Package, Copy, Check } from 'lucide-react'
import { apiRequest } from '../lib/api'
import { AppShell } from '../layout/AppShell'
import { AnimatedPage } from '../ui/AnimatedPage'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Badge } from '../ui/Badge'
import { LoadingState } from '../ui/LoadingSpinner'
import { EmptyState } from '../ui/EmptyState'
import { RoomTabs } from '../components/RoomTabs'

interface Member {
  id: string
  userId: string
  displayName: string
  email: string
  role: string
  status: string
  inviterConfirmed: number
  inviteeConfirmed: number
}

interface RoomDetail {
  id: string
  name: string
  currency: string
  ownerUserId: string
}

interface Alerts {
  lowStock: Array<{ itemId: string; name: string; currentAmount: number; threshold: number }>
  expiringSoon: Array<{ itemId: string; name: string; expiryDate: string; daysLeft: number }>
}

export default function Dashboard() {
  const { roomId } = useParams()
  const [room, setRoom] = useState<RoomDetail | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [me, setMe] = useState<{ id: string } | null>(null)
  const [alerts, setAlerts] = useState<Alerts | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [inviteCode, setInviteCode] = useState<string | null>(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [expiresInDays, setExpiresInDays] = useState('')
  const [copied, setCopied] = useState(false)

  const loadRoom = async () => {
    if (!roomId) return
    try {
      const [roomData, meData, alertsData] = await Promise.all([
        apiRequest<{ room: RoomDetail; members: Member[] }>(`/rooms/${roomId}`),
        apiRequest<{ user: { id: string } }>('/me'),
        apiRequest<Alerts>(`/rooms/${roomId}/inventory/alerts`),
      ])
      setRoom(roomData.room)
      setMembers(roomData.members)
      setMe(meData.user)
      setAlerts(alertsData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load room')
    }
  }

  useEffect(() => {
    loadRoom()
  }, [roomId])

  const handleInvite = async (event: FormEvent) => {
    event.preventDefault()
    if (!roomId) return
    setError(null)
    try {
      const body: { inviteeEmail?: string; expiresInDays?: number } = {}
      if (inviteEmail) body.inviteeEmail = inviteEmail
      if (expiresInDays) body.expiresInDays = Number(expiresInDays)
      const data = await apiRequest<{ invite: { code: string } }>(`/rooms/${roomId}/invites`, {
        method: 'POST',
        body: JSON.stringify(body),
      })
      setInviteCode(data.invite.code)
      setInviteEmail('')
      setExpiresInDays('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create invite')
    }
  }

  const handleConfirm = async (memberId: string, side: 'inviter' | 'invitee', confirm: boolean) => {
    if (!roomId) return
    setError(null)
    try {
      await apiRequest(`/rooms/${roomId}/members/${memberId}/confirm`, {
        method: 'POST',
        body: JSON.stringify({ side, confirm }),
      })
      await loadRoom()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update membership')
    }
  }

  const copyInviteCode = () => {
    if (inviteCode) {
      navigator.clipboard.writeText(inviteCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const currentMember = members.find((member) => member.userId === me?.id)
  const isAdmin = currentMember?.role === 'owner' || currentMember?.role === 'admin'

  if (!room) {
    return (
      <AppShell>
        <AnimatedPage>
          <LoadingState message="Loading room..." />
        </AnimatedPage>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <AnimatedPage>
        <div className="space-y-6">
          {/* Room Header */}
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{room.name}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Currency: {room.currency} · {members.length} {members.length === 1 ? 'member' : 'members'}
            </p>
          </div>

          {/* Room Tabs */}
          {roomId && <RoomTabs roomId={roomId} />}

          {error && (
            <div className="flex items-start gap-3 rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Inventory Alerts */}
          {alerts && (alerts.lowStock.length > 0 || alerts.expiringSoon.length > 0) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                  Inventory Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {alerts.lowStock.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="destructive">Low Stock</Badge>
                        <span className="text-sm text-muted-foreground">{alerts.lowStock.length} items</span>
                      </div>
                      <ul className="space-y-2">
                        {alerts.lowStock.map((item) => (
                          <li key={item.itemId} className="text-sm flex items-center justify-between py-2 border-b border-border last:border-0">
                            <span className="font-medium">{item.name}</span>
                            <span className="text-muted-foreground">
                              {item.currentAmount} / {item.threshold}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {alerts.expiringSoon.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="warning">Expiring Soon</Badge>
                        <span className="text-sm text-muted-foreground">{alerts.expiringSoon.length} items</span>
                      </div>
                      <ul className="space-y-2">
                        {alerts.expiringSoon.map((item) => (
                          <li key={item.itemId} className="text-sm flex items-center justify-between py-2 border-b border-border last:border-0">
                            <span className="font-medium">{item.name}</span>
                            <span className="text-muted-foreground">
                              {item.daysLeft} {item.daysLeft === 1 ? 'day' : 'days'} left
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <Link to={`/rooms/${roomId}/inventory`}>
                    <Button variant="ghost" className="w-full">
                      <Package className="h-4 w-4 mr-2" />
                      View Inventory
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Create Invite (Admin Only) */}
          {isAdmin && (
            <Card>
              <CardHeader>
                <CardTitle>Invite Members</CardTitle>
              </CardHeader>
              <CardContent>
                <form className="space-y-4" onSubmit={handleInvite}>
                  <Input
                    label="Invitee email (optional)"
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="friend@example.com"
                  />
                  
                  <Input
                    label="Expires in days (optional)"
                    type="number"
                    min={1}
                    max={30}
                    value={expiresInDays}
                    onChange={(e) => setExpiresInDays(e.target.value)}
                    placeholder="7"
                  />
                  
                  <Button type="submit" variant="primary">
                    Generate Invite Code
                  </Button>

                  {inviteCode && (
                    <div className="flex items-center gap-2 p-3 bg-success/10 border border-success/20 rounded-lg">
                      <code className="flex-1 text-sm font-mono text-success">{inviteCode}</code>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={copyInviteCode}
                      >
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  )}
                </form>
              </CardContent>
            </Card>
          )}

          {/* Members List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Members ({members.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {members.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="No members yet"
                  description="This room doesn't have any members."
                />
              ) : (
                <ul className="space-y-3">
                  {members.map((member) => {
                    const pendingActions: JSX.Element[] = []
                    if (member.status === 'pending' && member.userId === me?.id && member.inviteeConfirmed === 0) {
                      pendingActions.push(
                        <Button
                          key="confirm"
                          variant="primary"
                          size="sm"
                          onClick={() => handleConfirm(member.id, 'invitee', true)}
                        >
                          Confirm Membership
                        </Button>
                      )
                    }
                    if (member.status === 'pending' && isAdmin && member.inviterConfirmed === 0) {
                      pendingActions.push(
                        <Button
                          key="approve"
                          variant="primary"
                          size="sm"
                          onClick={() => handleConfirm(member.id, 'inviter', true)}
                        >
                          Approve
                        </Button>
                      )
                      pendingActions.push(
                        <Button
                          key="reject"
                          variant="secondary"
                          size="sm"
                          onClick={() => handleConfirm(member.id, 'inviter', false)}
                        >
                          Reject
                        </Button>
                      )
                    }

                    return (
                      <li
                        key={member.id}
                        className="flex flex-col gap-3 p-4 rounded-lg border border-border hover:bg-card-hover transition-colors sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{member.displayName}</p>
                            <Badge variant={member.status === 'active' ? 'success' : 'secondary'}>
                              {member.status}
                            </Badge>
                            {member.role !== 'member' && (
                              <Badge variant="default">{member.role}</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{member.email}</p>
                        </div>
                        {pendingActions.length > 0 && (
                          <div className="flex gap-2">
                            {pendingActions}
                          </div>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </AnimatedPage>
    </AppShell>
  )
}
