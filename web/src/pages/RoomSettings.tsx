import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Users,
  UserCheck,
  UserX,
  LogOut,
  Copy,
  Check,
  AlertCircle,
} from 'lucide-react'
import { apiRequest } from '../lib/api'
import { AppShell } from '../layout/AppShell'
import { AnimatedPage } from '../ui/AnimatedPage'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { LoadingState } from '../ui/LoadingSpinner'
import { RoomTabs } from '../components/RoomTabs'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'

interface Member {
  id: string
  userId: string
  displayName: string
  email: string
  role: 'owner' | 'admin' | 'member'
  status: 'pending' | 'active' | 'rejected' | 'left'
  inviterConfirmed: number
  inviteeConfirmed: number
  accentHue: number | null
  themeMode: string | null
}

interface RoomDetail {
  id: string
  name: string
  currency: string
  ownerUserId: string
}

export default function RoomSettings() {
  const { roomId } = useParams()
  const navigate = useNavigate()
  const [room, setRoom] = useState<RoomDetail | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [me, setMe] = useState<{ id: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [inviteCode, setInviteCode] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const loadRoom = async () => {
    if (!roomId) return
    try {
      const [roomData, meData] = await Promise.all([
        apiRequest<{ room: RoomDetail; members: Member[] }>(`/rooms/${roomId}`),
        apiRequest<{ user: { id: string } }>('/me'),
      ])
      setRoom(roomData.room)
      setMembers(roomData.members)
      setMe(meData.user)
      setError(null)
    } catch (err: any) {
      setError(err.message || 'Failed to load room')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRoom()
  }, [roomId])

  const myMembership = members.find((m) => m.userId === me?.id)
  const isOwner = myMembership?.role === 'owner'
  const isAdmin = myMembership?.role === 'owner' || myMembership?.role === 'admin'
  const activeMembers = members.filter((m) => m.status === 'active')
  const roomFull = activeMembers.length >= 4

  const createInvite = async () => {
    if (!roomId) return
    try {
      const data = await apiRequest<{ invite: { code: string } }>(`/rooms/${roomId}/invites`, {
        method: 'POST',
        body: JSON.stringify({}),
      })
      setInviteCode(data.invite.code)
      setError(null)
    } catch (err: any) {
      setError(err.message || 'Failed to create invite')
    }
  }

  const confirmMember = async (memberId: string, side: 'inviter' | 'invitee') => {
    if (!roomId) return
    try {
      await apiRequest(`/rooms/${roomId}/members/${memberId}/confirm`, {
        method: 'POST',
        body: JSON.stringify({ side, confirm: true }),
      })
      await loadRoom()
      setError(null)
    } catch (err: any) {
      setError(err.message || 'Failed to confirm member')
    }
  }

  const rejectMember = async (memberId: string) => {
    if (!roomId || !confirm('Reject this membership request?')) return
    try {
      await apiRequest(`/rooms/${roomId}/members/${memberId}/reject`, {
        method: 'POST',
      })
      await loadRoom()
      setError(null)
    } catch (err: any) {
      setError(err.message || 'Failed to reject member')
    }
  }

  const removeMember = async (memberId: string) => {
    if (!roomId || !confirm('Remove this member from the room?')) return
    try {
      await apiRequest(`/rooms/${roomId}/members/${memberId}`, {
        method: 'DELETE',
      })
      await loadRoom()
      setError(null)
    } catch (err: any) {
      setError(err.message || 'Failed to remove member')
    }
  }

  const changeRole = async (memberId: string, role: 'admin' | 'member') => {
    if (!roomId) return
    try {
      await apiRequest(`/rooms/${roomId}/members/${memberId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      })
      await loadRoom()
      setError(null)
    } catch (err: any) {
      setError(err.message || 'Failed to change role')
    }
  }

  const leaveRoom = async () => {
    if (
      !roomId ||
      !confirm('Are you sure you want to leave this room? You will lose access to all data.')
    )
      return
    try {
      await apiRequest(`/rooms/${roomId}/leave`, {
        method: 'POST',
      })
      navigate('/rooms')
    } catch (err: any) {
      setError(err.message || 'Failed to leave room')
    }
  }

  const copyInviteLink = () => {
    if (!inviteCode) return
    const url = `${window.location.origin}/invite/${inviteCode}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const hueToHsl = (hue: number | null): string => {
    if (hue === null) return 'hsl(190, 70%, 50%)'
    return `hsl(${hue}, 70%, 50%)`
  }

  const getRoleBadge = (role: string) => {
    if (role === 'owner') return <Badge variant="success">Owner</Badge>
    if (role === 'admin') return <Badge variant="secondary">Admin</Badge>
    return <Badge>Member</Badge>
  }

  const getStatusBadge = (status: string) => {
    if (status === 'active') return <Badge variant="success">Active</Badge>
    if (status === 'pending') return <Badge variant="secondary">Pending</Badge>
    if (status === 'rejected') return <Badge>Rejected</Badge>
    return <Badge>Left</Badge>
  }

  const getPendingText = (member: Member) => {
    const inviterConfirmed = member.inviterConfirmed === 1
    const inviteeConfirmed = member.inviteeConfirmed === 1
    if (!inviterConfirmed && !inviteeConfirmed) return 'Waiting for both confirmations'
    if (!inviterConfirmed) return 'Waiting for inviter confirmation'
    if (!inviteeConfirmed) return 'Waiting for invitee confirmation'
    return 'Confirmed, processing...'
  }

  if (loading) {
    return (
      <AppShell>
        <LoadingState />
      </AppShell>
    )
  }

  if (!room || !myMembership) {
    return (
      <AppShell>
        <AnimatedPage>
          <div className="p-4 text-center text-red-500">Room not found or access denied</div>
        </AnimatedPage>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <AnimatedPage>
        <div className="mx-auto max-w-4xl p-4">
          <h1 className="mb-4 text-2xl font-bold">{room.name} - Settings</h1>
          <RoomTabs roomId={roomId!} />

          {error && (
            <Card className="mb-4 border-red-500 bg-red-50 dark:bg-red-900/20">
              <CardContent className="flex items-center gap-2 p-4 text-red-700 dark:text-red-300">
                <AlertCircle className="h-5 w-5" />
                {error}
              </CardContent>
            </Card>
          )}

          {/* Room Info */}
          <Card className="mb-4">
            <CardHeader>
              <CardTitle>Room Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div>
                  <span className="font-semibold">Name:</span> {room.name}
                </div>
                <div>
                  <span className="font-semibold">Currency:</span> {room.currency}
                </div>
                <div>
                  <span className="font-semibold">Active Members:</span> {activeMembers.length}/4
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Members */}
          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Members
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {members
                  .filter((m) => m.status !== 'left' && m.status !== 'rejected')
                  .map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="h-10 w-10 rounded-full"
                          style={{ backgroundColor: hueToHsl(member.accentHue) }}
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{member.displayName}</span>
                            {getRoleBadge(member.role)}
                            {getStatusBadge(member.status)}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {member.email}
                          </div>
                          {member.status === 'pending' && (
                            <div className="mt-1 text-xs text-gray-500">
                              {getPendingText(member)}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Pending actions */}
                        {member.status === 'pending' && isAdmin && (
                          <>
                            {member.inviterConfirmed === 0 && (
                              <Button
                                size="sm"
                                onClick={() => confirmMember(member.id, 'inviter')}
                              >
                                <UserCheck className="h-4 w-4" />
                                Approve
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => rejectMember(member.id)}
                            >
                              <UserX className="h-4 w-4" />
                              Reject
                            </Button>
                          </>
                        )}

                        {/* Confirm own membership */}
                        {member.status === 'pending' &&
                          member.userId === me?.id &&
                          member.inviteeConfirmed === 0 && (
                            <Button size="sm" onClick={() => confirmMember(member.id, 'invitee')}>
                              <UserCheck className="h-4 w-4" />
                              Confirm
                            </Button>
                          )}

                        {/* Role management (owner only) */}
                        {member.status === 'active' &&
                          isOwner &&
                          member.role !== 'owner' &&
                          member.userId !== me?.id && (
                            <Select
                              value={member.role}
                              onChange={(e) =>
                                changeRole(member.id, e.target.value as 'admin' | 'member')
                              }
                            >
                              <option value="admin">Admin</option>
                              <option value="member">Member</option>
                            </Select>
                          )}

                        {/* Remove member (admin only) */}
                        {member.status === 'active' &&
                          isAdmin &&
                          member.role !== 'owner' &&
                          member.userId !== me?.id && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => removeMember(member.id)}
                            >
                              <UserX className="h-4 w-4" />
                              Remove
                            </Button>
                          )}
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          {/* Invites */}
          {isAdmin && (
            <Card className="mb-4">
              <CardHeader>
                <CardTitle>Invite New Members</CardTitle>
              </CardHeader>
              <CardContent>
                {roomFull ? (
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                    <AlertCircle className="h-5 w-5" />
                    Room is full (max 4 active members). Remove a member before inviting more.
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Button onClick={createInvite} disabled={!!inviteCode}>
                      Create Invite Code
                    </Button>
                    {inviteCode && (
                      <div className="space-y-2">
                        <Input
                          readOnly
                          value={`${window.location.origin}/invite/${inviteCode}`}
                        />
                        <Button variant="secondary" onClick={copyInviteLink}>
                          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          {copied ? 'Copied!' : 'Copy Link'}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Danger Zone */}
          {!isOwner && (
            <Card className="mb-4 border-red-500">
              <CardHeader>
                <CardTitle className="text-red-600 dark:text-red-400">Danger Zone</CardTitle>
              </CardHeader>
              <CardContent>
                <Button variant="secondary" onClick={leaveRoom}>
                  <LogOut className="h-4 w-4" />
                  Leave Room
                </Button>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  You will lose access to all room data and cannot rejoin without a new invite.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </AnimatedPage>
    </AppShell>
  )
}
