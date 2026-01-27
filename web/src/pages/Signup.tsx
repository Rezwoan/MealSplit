import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiRequest } from '../lib/api'
import { setToken } from '../lib/auth'

interface SignupResponse {
  token: string
}

export default function Signup() {
  const navigate = useNavigate()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const data = await apiRequest<SignupResponse>('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ displayName, email, password }),
      })
      setToken(data.token)
      navigate('/rooms')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-md rounded-xl bg-neutral-900 p-6 shadow">
      <h1 className="text-2xl font-semibold text-white">Create account</h1>
      <p className="mt-2 text-sm text-neutral-400">
        Start using MealSplit in minutes.
      </p>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="text-sm text-neutral-300" htmlFor="displayName">
            Display name
          </label>
          <input
            id="displayName"
            type="text"
            className="mt-1 w-full rounded-lg border border-neutral-800 bg-black px-3 py-2 text-sm text-white"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            required
          />
        </div>
        <div>
          <label className="text-sm text-neutral-300" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            className="mt-1 w-full rounded-lg border border-neutral-800 bg-black px-3 py-2 text-sm text-white"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>
        <div>
          <label className="text-sm text-neutral-300" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            className="mt-1 w-full rounded-lg border border-neutral-800 bg-black px-3 py-2 text-sm text-white"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
+            minLength={8}
          />
        </div>
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-emerald-400 px-4 py-2 text-sm font-semibold text-black hover:bg-emerald-300 disabled:opacity-60"
        >
          {loading ? 'Creating…' : 'Create account'}
        </button>
      </form>

      <p className="mt-4 text-sm text-neutral-400">
        Already have an account?{' '}
        <Link className="text-emerald-300 hover:text-emerald-200" to="/login">
          Sign in
        </Link>
      </p>
    </div>
  )
}
