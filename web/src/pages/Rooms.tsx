import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, DoorOpen, Users, ArrowRight, Home, AlertCircle } from 'lucide-react'
import { apiRequest } from '../lib/api'
import { AppShell } from '../layout/AppShell'
import { AnimatedPage } from '../ui/AnimatedPage'
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
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">My Rooms</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Manage your shared living spaces
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={() => setShowJoinModal(true)}
              >
                <DoorOpen className="h-4 w-4 mr-2" />
                Join Room
              </Button>
              <Button
                variant="primary"
                onClick={() => setShowCreateModal(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Room
              </Button>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="flex items-start gap-3 rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Content */}
          {loading ? (
            <Card>
              <CardContent className="py-12 text-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/30 border-t-primary mx-auto" />
                <p className="mt-4 text-sm text-muted-foreground">Loading rooms...</p>
              </CardContent>
            </Card>
          ) : rooms.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <div className="mx-auto w-fit rounded-full bg-muted p-4 mb-6">
                  <Home className="h-12 w-12 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-2">No rooms yet</h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6">
                  Get started by creating a new room or joining an existing one with an invite code.
                </p>
                <div className="flex gap-3 justify-center">
                  <Button variant="secondary" onClick={() => setShowJoinModal(true)}>
                    Join Room
                  </Button>
                  <Button variant="primary" onClick={() => setShowCreateModal(true)}>
                    Create Room
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {rooms.map((room) => (
                <Card key={room.id} className="transition-shadow hover:shadow-md">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold">
                          {room.name}
                        </h3>
                      </div>
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                        <Users className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Currency</span>
                        <span className="font-medium">{room.currency}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Role</span>
                        <span className="font-medium capitalize">{room.membershipRole}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Status</span>
                        <span className="inline-flex items-center rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success capitalize">
                          {room.membershipStatus}
                        </span>
                      </div>
                    </div>
                    
                    <Link to={`/rooms/${room.id}`}>
                      <Button variant="ghost" className="w-full">
                        Open Room
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Create Room Modal */}
        <Modal
          isOpen={showCreateModal}
          onClose={() => {
            setShowCreateModal(false)
            setError(null)
          }}
          title="Create Room"
        >
          <form className="space-y-4" onSubmit={handleCreate}>
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
            
            <div className="flex gap-3 pt-2">
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
          <form className="space-y-4" onSubmit={handleJoin}>
            <Input
              label="Invite code"
              value={inviteCode}
              onChange={(event) => setInviteCode(event.target.value)}
              placeholder="abc123"
              required
              autoFocus
            />
            
            <div className="flex gap-3 pt-2">
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

