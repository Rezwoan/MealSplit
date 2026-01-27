import { FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiRequest } from '../lib/api'

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
      navigate(`/rooms/${data.roomId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join room')
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-neutral-900 p-6 shadow">
        <h1 className="text-2xl font-semibold text-white">Rooms</h1>
        {error ? <p className="mt-2 text-sm text-red-400">{error}</p> : null}
        {loading ? (
          <p className="mt-4 text-sm text-neutral-400">Loading rooms…</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {rooms.length === 0 ? (
              <li className="text-sm text-neutral-400">No rooms yet.</li>
            ) : (
              rooms.map((room) => (
                <li
                  key={room.id}
                  className="flex items-center justify-between rounded-lg border border-neutral-800 bg-black px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-white">{room.name}</p>
                    <p className="text-xs text-neutral-500">
                      {room.currency} · {room.membershipRole} · {room.membershipStatus}
                    </p>
                  </div>
                  <Link
                    className="text-sm text-emerald-300 hover:text-emerald-200"
                    to={`/rooms/${room.id}`}
                  >
                    Open
                  </Link>
                </li>
              ))
            )}
          </ul>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl bg-neutral-900 p-6 shadow">
          <h2 className="text-lg font-semibold text-white">Create Room</h2>
          <form className="mt-4 space-y-3" onSubmit={handleCreate}>
            <div>
              <label className="text-sm text-neutral-300" htmlFor="roomName">
                Room name
              </label>
              <input
                id="roomName"
                className="mt-1 w-full rounded-lg border border-neutral-800 bg-black px-3 py-2 text-sm text-white"
                value={roomName}
                onChange={(event) => setRoomName(event.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-sm text-neutral-300" htmlFor="currency">
                Currency
              </label>
              <input
                id="currency"
                className="mt-1 w-full rounded-lg border border-neutral-800 bg-black px-3 py-2 text-sm text-white"
                value={currency}
                onChange={(event) => setCurrency(event.target.value.toUpperCase())}
                required
              />
            </div>
            <button
              type="submit"
              className="rounded-lg bg-emerald-400 px-4 py-2 text-sm font-semibold text-black hover:bg-emerald-300"
            >
              Create room
            </button>
          </form>
        </div>

        <div className="rounded-xl bg-neutral-900 p-6 shadow">
          <h2 className="text-lg font-semibold text-white">Join Room</h2>
          <form className="mt-4 space-y-3" onSubmit={handleJoin}>
            <div>
              <label className="text-sm text-neutral-300" htmlFor="inviteCode">
                Invite code
              </label>
              <input
                id="inviteCode"
                className="mt-1 w-full rounded-lg border border-neutral-800 bg-black px-3 py-2 text-sm text-white"
                value={inviteCode}
                onChange={(event) => setInviteCode(event.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              className="rounded-lg border border-neutral-700 px-4 py-2 text-sm font-semibold text-white hover:border-neutral-500"
            >
              Join room
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
