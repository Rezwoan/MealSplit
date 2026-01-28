import { useState, useEffect, useMemo } from 'react'
import { User, Palette, BarChart3 } from 'lucide-react'
import { AppShell } from '../layout/AppShell'
import { AnimatedPage } from '../ui/AnimatedPage'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { LoadingState } from '../ui/LoadingSpinner'
import { apiRequest } from '../lib/api'
import { formatCents } from '../lib/money'

interface UserProfile {
  id: string
  email: string
  displayName: string
  avatarUrl: string | null
  bio: string | null
  preferences: {
    themeMode: 'light' | 'dark' | 'amoled'
    accentHue: number
  }
}

interface UserStats {
  roomsCount: number
  purchasesCount: number
  totalPaidCents: number
  totalShareCents: number
  netCents: number
  last30Days: {
    purchasesCount: number
    totalPaidCents: number
  }
}

const ACCENT_PRESETS = [
  { name: 'Cyan', hue: 190 },
  { name: 'Blue', hue: 220 },
  { name: 'Purple', hue: 270 },
  { name: 'Pink', hue: 330 },
  { name: 'Red', hue: 0 },
  { name: 'Orange', hue: 30 },
  { name: 'Yellow', hue: 60 },
  { name: 'Green', hue: 140 },
]

export default function Profile() {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [stats, setStats] = useState<UserStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Profile form state
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)

  // Preferences state
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'amoled'>('dark')
  const [accentHue, setAccentHue] = useState(190)
  const [preferencesSaving, setPreferencesSaving] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [userData, statsData] = await Promise.all([
        apiRequest<{ user: UserProfile }>('/me'),
        apiRequest<{ stats: UserStats }>('/me/stats'),
      ])
      setUser(userData.user)
      setStats(statsData.stats)
      setDisplayName(userData.user.displayName)
      setBio(userData.user.bio || '')
      setThemeMode(userData.user.preferences.themeMode)
      setAccentHue(userData.user.preferences.accentHue)
      
      // Apply theme immediately
      applyTheme(userData.user.preferences.themeMode, userData.user.preferences.accentHue)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  const applyTheme = (mode: string, hue: number) => {
    document.documentElement.setAttribute('data-theme', mode)
    document.documentElement.style.setProperty('--accent-hue', hue.toString())
    
    // Save to localStorage for fast boot
    localStorage.setItem('theme', mode)
    localStorage.setItem('accentHue', hue.toString())
  }

  const handleSaveProfile = async () => {
    if (!user) return
    setProfileSaving(true)
    setError(null)
    try {
      const response = await apiRequest<{ user: UserProfile }>('/me', {
        method: 'PATCH',
        body: JSON.stringify({
          displayName,
          bio: bio || undefined,
        }),
      })
      setUser({ ...user, ...response.user })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile')
    } finally {
      setProfileSaving(false)
    }
  }

  const handleSavePreferences = async () => {
    setPreferencesSaving(true)
    setError(null)
    try {
      await apiRequest('/me/preferences', {
        method: 'PATCH',
        body: JSON.stringify({
          themeMode,
          accentHue,
        }),
      })
      applyTheme(themeMode, accentHue)
      if (user) {
        setUser({
          ...user,
          preferences: { themeMode, accentHue },
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update preferences')
    } finally {
      setPreferencesSaving(false)
    }
  }

  const accentColor = useMemo(() => {
    return `hsl(${accentHue}, 70%, 50%)`
  }, [accentHue])

  if (loading) {
    return (
      <AppShell>
        <AnimatedPage>
          <LoadingState message="Loading profile..." />
        </AnimatedPage>
      </AppShell>
    )
  }

  if (!user) {
    return (
      <AppShell>
        <AnimatedPage>
          <p className="text-center text-muted-foreground">Failed to load profile</p>
        </AnimatedPage>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <AnimatedPage>
        <div className="space-y-6 max-w-4xl mx-auto">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Profile & Settings</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your account, preferences, and view your stats
            </p>
          </div>

          {error && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Profile Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault()
                  handleSaveProfile()
                }}
              >
                <Input
                  label="Display Name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  maxLength={100}
                />
                <Input
                  label="Email"
                  value={user.email}
                  disabled
                  className="opacity-60"
                />
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Bio <span className="text-muted-foreground">(optional)</span>
                  </label>
                  <textarea
                    className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground resize-none"
                    rows={3}
                    maxLength={280}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell others about yourself..."
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {bio.length}/280 characters
                  </p>
                </div>
                <Button type="submit" variant="primary" disabled={profileSaving}>
                  {profileSaving ? 'Saving...' : 'Save Profile'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Theme & Appearance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Theme & Appearance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Theme Mode */}
                <div>
                  <label className="block text-sm font-medium mb-3">Theme Mode</label>
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant={themeMode === 'light' ? 'primary' : 'secondary'}
                      onClick={() => setThemeMode('light')}
                      className="flex-1"
                    >
                      Light
                    </Button>
                    <Button
                      type="button"
                      variant={themeMode === 'dark' ? 'primary' : 'secondary'}
                      onClick={() => setThemeMode('dark')}
                      className="flex-1"
                    >
                      Dark
                    </Button>
                    <Button
                      type="button"
                      variant={themeMode === 'amoled' ? 'primary' : 'secondary'}
                      onClick={() => setThemeMode('amoled')}
                      className="flex-1"
                    >
                      AMOLED
                    </Button>
                  </div>
                </div>

                {/* Accent Color */}
                <div>
                  <label className="block text-sm font-medium mb-3">Accent Color</label>
                  <div className="grid grid-cols-4 gap-3 mb-4">
                    {ACCENT_PRESETS.map((preset) => (
                      <button
                        key={preset.hue}
                        type="button"
                        onClick={() => setAccentHue(preset.hue)}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          accentHue === preset.hue
                            ? 'border-foreground scale-105'
                            : 'border-border hover:border-foreground/50'
                        }`}
                        style={{ backgroundColor: `hsl(${preset.hue}, 70%, 50%)` }}
                        title={preset.name}
                      >
                        <span className="sr-only">{preset.name}</span>
                      </button>
                    ))}
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-2">
                      Custom Hue (0-360)
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="360"
                      value={accentHue}
                      onChange={(e) => setAccentHue(parseInt(e.target.value))}
                      className="w-full"
                      style={{
                        background: `linear-gradient(to right, 
                          hsl(0, 70%, 50%), 
                          hsl(60, 70%, 50%), 
                          hsl(120, 70%, 50%), 
                          hsl(180, 70%, 50%), 
                          hsl(240, 70%, 50%), 
                          hsl(300, 70%, 50%), 
                          hsl(360, 70%, 50%))`,
                      }}
                    />
                    <div className="flex items-center gap-3 mt-2">
                      <div
                        className="w-12 h-12 rounded-lg border border-border"
                        style={{ backgroundColor: accentColor }}
                      />
                      <span className="text-sm font-mono">{accentHue}°</span>
                    </div>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="primary"
                  onClick={handleSavePreferences}
                  disabled={preferencesSaving}
                  className="w-full"
                >
                  {preferencesSaving ? 'Saving...' : 'Save Preferences'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Stats Section */}
          {stats && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Your Statistics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-3">
                      Overall
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <span className="text-sm">Active Rooms</span>
                        <span className="font-semibold">{stats.roomsCount}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <span className="text-sm">Total Purchases</span>
                        <span className="font-semibold">{stats.purchasesCount}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <span className="text-sm">Total Paid</span>
                        <span className="font-semibold">
                          {formatCents('USD', stats.totalPaidCents)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <span className="text-sm">Total Share</span>
                        <span className="font-semibold">
                          {formatCents('USD', stats.totalShareCents)}
                        </span>
                      </div>
                      <div
                        className={`flex items-center justify-between p-3 rounded-lg ${
                          stats.netCents >= 0
                            ? 'bg-green-500/10 border border-green-500/20'
                            : 'bg-red-500/10 border border-red-500/20'
                        }`}
                      >
                        <span className="text-sm font-medium">Net Balance</span>
                        <span
                          className={`font-bold ${
                            stats.netCents >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {formatCents('USD', stats.netCents)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-3">
                      Last 30 Days
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <span className="text-sm">Purchases</span>
                        <span className="font-semibold">
                          {stats.last30Days.purchasesCount}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <span className="text-sm">Total Paid</span>
                        <span className="font-semibold">
                          {formatCents('USD', stats.last30Days.totalPaidCents)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </AnimatedPage>
    </AppShell>
  )
}
