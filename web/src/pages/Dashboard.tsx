import { FormEvent, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { apiRequest } from '../lib/api'

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

export default function Dashboard() {
  const { roomId } = useParams()
  const [room, setRoom] = useState<RoomDetail | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [me, setMe] = useState<{ id: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [inviteCode, setInviteCode] = useState<string | null>(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [expiresInDays, setExpiresInDays] = useState('')

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

  const currentMember = members.find((member) => member.userId === me?.id)
  const isAdmin = currentMember?.role === 'owner' || currentMember?.role === 'admin'

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-neutral-900 p-6 shadow">
        <h1 className="text-2xl font-semibold text-white">Room</h1>
        {room ? (
          <p className="mt-2 text-sm text-neutral-400">
            {room.name} · {room.currency}
          </p>
        ) : null}
        {roomId ? (
          <div className="mt-4 flex flex-wrap gap-3 text-sm text-neutral-400">
            <Link className="hover:text-white" to={`/rooms/${roomId}`}>
              Dashboard
            </Link>
            <Link className="hover:text-white" to={`/rooms/${roomId}/purchases`}>
              Purchases
            </Link>
            <Link className="hover:text-white" to={`/rooms/${roomId}/balances`}>
              Balances
            </Link>
            <Link className="hover:text-white" to={`/rooms/${roomId}/break-periods`}>
              Breaks
            </Link>
          </div>
        ) : null}
        {error ? <p className="mt-2 text-sm text-red-400">{error}</p> : null}
      </div>

      {isAdmin ? (
        <div className="rounded-xl bg-neutral-900 p-6 shadow">
          <h2 className="text-lg font-semibold text-white">Create Invite</h2>
          <form className="mt-4 space-y-3" onSubmit={handleInvite}>
            <div>
              <label className="text-sm text-neutral-300" htmlFor="inviteEmail">
                Invitee email (optional)
              </label>
              <input
                id="inviteEmail"
                className="mt-1 w-full rounded-lg border border-neutral-800 bg-black px-3 py-2 text-sm text-white"
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
              />
            </div>
            <div>
              <label className="text-sm text-neutral-300" htmlFor="expiresInDays">
                Expires in days (optional)
              </label>
              <input
                id="expiresInDays"
                type="number"
                min={1}
                max={30}
                className="mt-1 w-full rounded-lg border border-neutral-800 bg-black px-3 py-2 text-sm text-white"
                value={expiresInDays}
                onChange={(event) => setExpiresInDays(event.target.value)}
              />
            </div>
            <button
              type="submit"
              className="rounded-lg bg-emerald-400 px-4 py-2 text-sm font-semibold text-black hover:bg-emerald-300"
            >
              Generate invite
            </button>
            {inviteCode ? (
              <p className="mt-2 text-sm text-emerald-300">Invite code: {inviteCode}</p>
            ) : null}
          </form>
        </div>
      ) : null}

      <div className="rounded-xl bg-neutral-900 p-6 shadow">
        <h2 className="text-lg font-semibold text-white">Members</h2>
        <ul className="mt-4 space-y-3">
          {members.map((member) => {
            const pendingActions: JSX.Element[] = []
            if (member.status === 'pending' && member.userId === me?.id && member.inviteeConfirmed === 0) {
              pendingActions.push(
                <button
                  key="confirm"
                  className="rounded-lg bg-emerald-400 px-3 py-1 text-xs font-semibold text-black"
                  onClick={() => handleConfirm(member.id, 'invitee', true)}
                >
                  Confirm I’m a roommate
                </button>,
              )
            }
            if (member.status === 'pending' && isAdmin && member.inviterConfirmed === 0) {
              pendingActions.push(
                <button
                  key="approve"
                  className="rounded-lg bg-emerald-400 px-3 py-1 text-xs font-semibold text-black"
                  onClick={() => handleConfirm(member.id, 'inviter', true)}
                >
                  Approve
                </button>,
              )
              pendingActions.push(
                <button
                  key="reject"
                  className="rounded-lg border border-neutral-700 px-3 py-1 text-xs font-semibold text-white"
                  onClick={() => handleConfirm(member.id, 'inviter', false)}
                >
                  Reject
                </button>,
              )
            }

            return (
              <li
                key={member.id}
                className="flex flex-col gap-2 rounded-lg border border-neutral-800 bg-black px-4 py-3 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="text-sm font-semibold text-white">{member.displayName}</p>
                  <p className="text-xs text-neutral-500">
                    {member.email} · {member.role} · {member.status}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">{pendingActions}</div>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
