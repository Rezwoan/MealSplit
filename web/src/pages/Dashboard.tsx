import { useParams } from 'react-router-dom'

export default function Dashboard() {
  const { roomId } = useParams()

  return (
    <div className="rounded-xl bg-neutral-900 p-6 shadow">
      <h1 className="text-2xl font-semibold text-white">Room Dashboard</h1>
      <p className="mt-2 text-sm text-neutral-400">
        Placeholder dashboard for room {roomId}.
      </p>
    </div>
  )
}
