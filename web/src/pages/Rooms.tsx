import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, DoorOpen, Users, ArrowRight, Home, AlertCircle } from 'lucide-react'
import { apiRequest } from '../lib/api'
import { AppShell } from '../layout/AppShell'
import { AnimatedPage } from '../ui/AnimatedPage'
import { PageHeader } from '../ui/PageHeader'
import { Card, CardContent } from '../ui/Card'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'

interface RoomItem {
  id: string
  name: string
  currency: string
  membershipStatus: string
  membershipRole: string
}

export default function Rooms() {
  const navigate = useNavigate()
  const [rooms, setRooms] = useState<RoomItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [roomName, setRoomName] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [inviteCode, setInviteCode] = useState('')

  const loadRooms = async () => {
    try {
      const data = await apiRequest<{ rooms: RoomItem[] }>('/rooms')
      setRooms(data.rooms)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load rooms')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRooms()
  }, [])

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    try {
      await apiRequest('/rooms', {
        method: 'POST',
        body: JSON.stringify({ name: roomName, currency }),
      })
      setRoomName('')
      setCurrency('USD')
      setShowCreateModal(false)
      await loadRooms()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create room')
    }
  }

  const handleJoin = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    try {
      const data = await apiRequest<{ roomId: string }>('/invites/' + inviteCode + '/accept', {
        method: 'POST',
      })
      setInviteCode('')
      setShowJoinModal(false)
      navigate(`/rooms/${data.roomId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join room')
    }
  }

  return (
    <AppShell>
      <AnimatedPage>
        <PageHeader
          title="My Rooms"
          description="Manage your shared living spaces and track expenses together"
          actions={
            <>
              <Button
                variant="secondary"
                onClick={() => setShowJoinModal(true)}
              >
                <DoorOpen className="h-4 w-4" />
                Join Room
              </Button>
              <Button
                variant="primary"
                onClick={() => setShowCreateModal(true)}
              >
                <Plus className="h-4 w-4" />
                Create Room
              </Button>
            </>
          }
        />

        {/* Error Alert */}
        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-xl bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

          {/* Content */}
          {loading ? (
            <Card className="border-border/50">
              <CardContent className="py-16 text-center">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/30 border-t-primary mx-auto" />
                <p className="mt-6 text-sm text-muted-foreground font-medium">Loading rooms...</p>
              </CardContent>
            </Card>
          ) : rooms.length === 0 ? (
            <Card className="border-border/50">
              <CardContent className="py-20 text-center">
                <div className="mx-auto w-fit rounded-2xl bg-muted/50 p-5 mb-8">
                  <Home className="h-14 w-14 text-muted-foreground" />
                </div>
                <h3 className="text-2xl font-semibold mb-3">No rooms yet</h3>
                <p className="text-base text-muted-foreground max-w-md mx-auto mb-8 leading-relaxed">
                  Get started by creating a new room or joining an existing one with an invite code.
                </p>
                <div className="flex gap-3 justify-center">
                  <Button variant="secondary" onClick={() => setShowJoinModal(true)}>
                    <DoorOpen className="h-4 w-4" />
                    Join Room
                  </Button>
                  <Button variant="primary" onClick={() => setShowCreateModal(true)}>
                    <Plus className="h-4 w-4" />
                    Create Room
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {rooms.map((room) => (
                <Card key={room.id} className="group transition-all duration-200 hover:shadow-lg hover:border-primary/20">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-5">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xl font-semibold truncate group-hover:text-primary transition-colors">
                          {room.name}
                        </h3>
                      </div>
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors flex-shrink-0">
                        <Users className="h-6 w-6 text-primary" />
                      </div>
                    </div>
                    
                    <div className="space-y-3 mb-5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Currency</span>
                        <span className="font-semibold">{room.currency}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Role</span>
                        <span className="font-semibold capitalize">{room.membershipRole}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Status</span>
                        <span className="inline-flex items-center rounded-full bg-success/15 px-2.5 py-1 text-xs font-semibold text-success capitalize">
                          {room.membershipStatus}
                        </span>
                      </div>
                    </div>
                    
                    <Link to={`/rooms/${room.id}`}>
                      <Button variant="secondary" className="w-full group-hover:bg-primary group-hover:text-primary-foreground">
                        Open Room
                        <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Create Room Modal */}
          <Modal
            isOpen={showCreateModal}
            onClose={() => {
              setShowCreateModal(false)
              setError(null)
            }}
            title="Create Room"
          >
            <form className="space-y-5" onSubmit={handleCreate}>
              <Input
                label="Room name"
                value={roomName}
                onChange={(event) => setRoomName(event.target.value)}
                placeholder="My Apartment"
                required
                autoFocus
              />
              
              <Input
                label="Currency"
                value={currency}
                onChange={(event) => setCurrency(event.target.value.toUpperCase())}
                placeholder="USD"
                maxLength={3}
                required
              />
              
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowCreateModal(false)
                    setError(null)
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" className="flex-1">
                  Create
                </Button>
              </div>
            </form>
          </Modal>

          {/* Join Room Modal */}
          <Modal
            isOpen={showJoinModal}
            onClose={() => {
              setShowJoinModal(false)
              setError(null)
            }}
            title="Join Room"
          >
            <form className="space-y-5" onSubmit={handleJoin}>
              <Input
                label="Invite code"
                value={inviteCode}
                onChange={(event) => setInviteCode(event.target.value)}
                placeholder="abc123"
                required
                autoFocus
              />
              
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowJoinModal(false)
                    setError(null)
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" className="flex-1">
                  Join
                </Button>
              </div>
            </form>
          </Modal>
        </AnimatedPage>
      </AppShell>
    )
  }

