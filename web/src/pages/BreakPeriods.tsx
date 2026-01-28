import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { apiRequest } from '../lib/api'

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
  const [error, setError] = useState<string | null>(null)

  const loadData = async () => {
    if (!roomId) return
    try {
      const [breakData, roomData, meData] = await Promise.all([
        apiRequest<{ breakPeriods: BreakPeriod[] }>(`/rooms/${roomId}/break-periods`),
        apiRequest<{ members: Member[] }>(`/rooms/${roomId}`),
        apiRequest<{ user: { id: string } }>('/me'),
      ])
      setBreaks(breakData.breakPeriods)
      setMembers(roomData.members)
      setCurrentUserId(meData.user.id)
      if (!selectedUserId) {
        setSelectedUserId(meData.user.id)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load break periods')
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
    <div className="space-y-6">
      <div className="rounded-xl bg-neutral-900 p-6 shadow">
        <h1 className="text-2xl font-semibold text-white">Break periods</h1>
        {error ? <p className="mt-2 text-sm text-red-400">{error}</p> : null}
        <ul className="mt-4 space-y-3">
          {breaks.length === 0 ? (
            <li className="text-sm text-neutral-400">No break periods.</li>
          ) : (
            breaks.map((bp) => (
              <li
                key={bp.id}
                className="rounded-lg border border-neutral-800 bg-black px-4 py-3 text-sm text-neutral-200"
              >
                <span className="font-semibold text-white">
                  {members.find((member) => member.userId === bp.userId)?.displayName ?? bp.userId}
                </span>{' '}
                · {bp.startDate} → {bp.endDate}
              </li>
            ))
          )}
        </ul>
      </div>

      <div className="rounded-xl bg-neutral-900 p-6 shadow">
        <h2 className="text-lg font-semibold text-white">Add break period</h2>
        <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
          <div>
            <label className="text-sm text-neutral-300" htmlFor="userId">
              Member
            </label>
            <select
              id="userId"
              className="mt-1 w-full rounded-lg border border-neutral-800 bg-black px-3 py-2 text-sm text-white"
              value={selectedUserId}
              onChange={(event) => setSelectedUserId(event.target.value)}
            >
              {members.map((member) => (
                <option key={member.userId} value={member.userId}>
                  {member.displayName} ({member.role})
                </option>
              ))}
            </select>
          </div>
          {!isAdmin && !isOwnSelection ? (
            <p className="text-xs text-neutral-500">Only admins can set breaks for others.</p>
          ) : null}
          <div>
            <label className="text-sm text-neutral-300" htmlFor="startDate">
              Start date
            </label>
            <input
              id="startDate"
              type="date"
              className="mt-1 w-full rounded-lg border border-neutral-800 bg-black px-3 py-2 text-sm text-white"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-sm text-neutral-300" htmlFor="endDate">
              End date
            </label>
            <input
              id="endDate"
              type="date"
              className="mt-1 w-full rounded-lg border border-neutral-800 bg-black px-3 py-2 text-sm text-white"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-emerald-400 px-4 py-2 text-sm font-semibold text-black hover:bg-emerald-300"
          >
            Save break period
          </button>
        </form>
      </div>
    </div>
  )
}
