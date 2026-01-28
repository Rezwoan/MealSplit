import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Calendar, Plus, AlertTriangle } from 'lucide-react'
import { apiRequest } from '../lib/api'
import { AppShell } from '../layout/AppShell'
import { AnimatedPage } from '../ui/AnimatedPage'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Badge } from '../ui/Badge'
import { LoadingState } from '../ui/LoadingSpinner'
import { EmptyState } from '../ui/EmptyState'
import { RoomTabs } from '../components/RoomTabs'

interface BreakPeriod {
  id: string
  userId: string
  startDate: string
  endDate: string
  mode: string
}

interface Member {
  userId: string
  displayName: string
  role: string
}

export default function BreakPeriods() {
  const { roomId } = useParams()
  const [breaks, setBreaks] = useState<BreakPeriod[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [selectedUserId, setSelectedUserId] = useState('')
  const [currentUserId, setCurrentUserId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [roomName, setRoomName] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = async () => {
    if (!roomId) return
    setLoading(true)
    try {
      const [breakData, roomData, meData] = await Promise.all([
        apiRequest<{ breakPeriods: BreakPeriod[] }>(`/rooms/${roomId}/break-periods`),
        apiRequest<{ room: { name: string }; members: Member[] }>(`/rooms/${roomId}`),
        apiRequest<{ user: { id: string } }>('/me'),
      ])
      setBreaks(breakData.breakPeriods)
      setMembers(roomData.members)
      setRoomName(roomData.room.name)
      setCurrentUserId(meData.user.id)
      if (!selectedUserId) {
        setSelectedUserId(meData.user.id)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load break periods')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [roomId])

  const isAdmin = members.some(
    (member) => member.userId === currentUserId && (member.role === 'owner' || member.role === 'admin'),
  )
  const isOwnSelection = selectedUserId === currentUserId

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!roomId) return
    setError(null)
    try {
      await apiRequest(`/rooms/${roomId}/break-periods`, {
        method: 'POST',
        body: JSON.stringify({
          userId: selectedUserId,
          startDate,
          endDate,
        }),
      })
      setStartDate('')
      setEndDate('')
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create break period')
    }
  }

  return (
    <AppShell>
      <AnimatedPage>
        <div className="space-y-6">
          {/* Room Header */}
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{roomName || 'Room'}</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage member break periods</p>
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
            <LoadingState message="Loading break periods..." />
          ) : (
            <>
              {/* Add Break Period Form */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="h-5 w-5" />
                    Add Break Period
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form className="space-y-4" onSubmit={handleSubmit}>
                    <Select
                      label="Member"
                      value={selectedUserId}
                      onChange={(e) => setSelectedUserId(e.target.value)}
                      required
                    >
                      {members.map((member) => (
                        <option key={member.userId} value={member.userId}>
                          {member.displayName} ({member.role})
                        </option>
                      ))}
                    </Select>

                    {!isAdmin && !isOwnSelection && (
                      <div className="flex items-start gap-2 rounded-lg bg-warning/10 border border-warning/20 p-3 text-sm text-warning">
                        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                        <span>Only admins can set break periods for other members.</span>
                      </div>
                    )}

                    <Input
                      label="Start date"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                    />

                    <Input
                      label="End date"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      required
                    />

                    <Button 
                      type="submit" 
                      variant="primary" 
                      className="w-full"
                      disabled={!isAdmin && !isOwnSelection}
                    >
                      Save Break Period
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Break Periods List */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Break Periods ({breaks.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {breaks.length === 0 ? (
                    <EmptyState
                      icon={Calendar}
                      title="No break periods"
                      description="Add break periods to exclude members from cost sharing during specific date ranges."
                    />
                  ) : (
                    <ul className="space-y-3">
                      {breaks.map((bp) => {
                        const member = members.find((m) => m.userId === bp.userId)
                        return (
                          <li
                            key={bp.id}
                            className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-card-hover transition-colors"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-medium">
                                  {member?.displayName ?? bp.userId}
                                </p>
                                {member && member.role !== 'member' && (
                                  <Badge variant="default">{member.role}</Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                                <Calendar className="h-3.5 w-3.5" />
                                <span>{new Date(bp.startDate).toLocaleDateString()}</span>
                                <span>→</span>
                                <span>{new Date(bp.endDate).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </li>
                        )
                      })}
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
