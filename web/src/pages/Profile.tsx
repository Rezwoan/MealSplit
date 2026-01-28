import { useState, useEffect } from 'react'
import { User, Palette, BarChart3 } from 'lucide-react'
import { AppShell } from '../layout/AppShell'
import { AnimatedPage } from '../ui/AnimatedPage'
import { PageHeader } from '../ui/PageHeader'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { LoadingState } from '../ui/LoadingSpinner'
import { ErrorState } from '../ui/ErrorState'
import { apiRequest, ApiRequestError } from '../lib/api'
import { formatCents } from '../lib/money'

interface UserProfile {
  id: string
  email: string
  displayName: string
  preferences: {
    themeMode: 'light' | 'dark' | 'amoled'
    accentColor: string
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
  { name: 'Blue', color: '#3B82F6' },
  { name: 'Purple', color: '#A855F7' },
  { name: 'Pink', color: '#EC4899' },
  { name: 'Red', color: '#EF4444' },
  { name: 'Orange', color: '#F97316' },
  { name: 'Amber', color: '#F59E0B' },
  { name: 'Green', color: '#10B981' },
  { name: 'Cyan', color: '#06B6D4' },
]

export default function Profile() {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [stats, setStats] = useState<UserStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<ApiRequestError | null>(null)

  // Profile form state
  const [displayName, setDisplayName] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)

  // Preferences state
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'amoled'>('dark')
  const [accentColor, setAccentColor] = useState('#3B82F6')
  const [preferencesSaving, setPreferencesSaving] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [userData, statsData] = await Promise.all([
        apiRequest<{ user: UserProfile }>('/me'),
        apiRequest<{ stats: UserStats }>('/me/stats'),
      ])
      setUser(userData.user)
      setStats(statsData.stats)
      setDisplayName(userData.user.displayName)
      setThemeMode(userData.user.preferences.themeMode)
      setAccentColor(userData.user.preferences.accentColor)
      
      // Apply theme immediately
      applyTheme(userData.user.preferences.themeMode, userData.user.preferences.accentColor)
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err)
      } else {
        setError(new ApiRequestError({
          status: 0,
          message: err instanceof Error ? err.message : 'Failed to load profile',
        }))
      }
    } finally {
      setLoading(false)
    }
  }

  function hexToRgb(hex: string): string {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    if (!result) return '59 130 246'
    return `${parseInt(result[1], 16)} ${parseInt(result[2], 16)} ${parseInt(result[3], 16)}`
  }

  const applyTheme = (mode: string, color: string) => {
    document.documentElement.setAttribute('data-theme', mode)
    document.documentElement.style.setProperty('--accent', hexToRgb(color))
    
    // Save to localStorage for fast boot
    localStorage.setItem('theme', mode)
    localStorage.setItem('accentColor', color)
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
        }),
      })
      setUser({ ...user, ...response.user })
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err)
      } else {
        setError(new ApiRequestError({
          status: 0,
          message: err instanceof Error ? err.message : 'Failed to update profile',
        }))
      }
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
          accentColor,
        }),
      })
      applyTheme(themeMode, accentColor)
      if (user) {
        setUser({
          ...user,
          preferences: { themeMode, accentColor },
        })
      }
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err)
      } else {
        setError(new ApiRequestError({
          status: 0,
          message: err instanceof Error ? err.message : 'Failed to update preferences',
        }))
      }
    } finally {
      setPreferencesSaving(false)
    }
  }

  if (loading) {
    return (
      <AppShell>
        <AnimatedPage>
          <LoadingState message="Loading profile..." />
        </AnimatedPage>
      </AppShell>
    )
  }

  if (error) {
    return (
      <AppShell>
        <AnimatedPage>
          <ErrorState
            title="Failed to Load Profile"
            message={error.message}
            code={error.code}
            details={error.details}
            migrationHints={error.migrationHints}
            onRetry={loadData}
          />
        </AnimatedPage>
      </AppShell>
    )
  }

  if (!user || !stats) {
    return (
      <AppShell>
        <AnimatedPage>
          <ErrorState
            title="Profile Not Found"
            message="Unable to load your profile data"
            onRetry={loadData}
          />
        </AnimatedPage>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <AnimatedPage>
        <PageHeader
          title="Profile & Settings"
          description="Manage your account, customize your experience, and view your activity"
        />

        {/* Profile & Stats Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column: Profile + Preferences */}
          <div className="lg:col-span-2 space-y-6">
            {/* Profile Section */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <User className="h-5 w-5 text-primary" />
                  Profile Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form
                  className="space-y-5"
                  onSubmit={(e) => {
                    e.preventDefault()
                    handleSaveProfile()
                  }}
                >
                  <div className="space-y-4">
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
                  </div>
                  <Button type="submit" variant="primary" loading={profileSaving}>
                    Save Profile
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Theme & Appearance */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Palette className="h-5 w-5 text-primary" />
                  Theme & Appearance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Theme Mode */}
                  <div>
                    <label className="block text-sm font-medium mb-3">Theme Mode</label>
                    <div className="grid grid-cols-3 gap-3">
                      <Button
                        type="button"
                        variant={themeMode === 'light' ? 'primary' : 'secondary'}
                        onClick={() => setThemeMode('light')}
                      >
                        Light
                      </Button>
                      <Button
                        type="button"
                        variant={themeMode === 'dark' ? 'primary' : 'secondary'}
                        onClick={() => setThemeMode('dark')}
                      >
                        Dark
                      </Button>
                      <Button
                        type="button"
                        variant={themeMode === 'amoled' ? 'primary' : 'secondary'}
                        onClick={() => setThemeMode('amoled')}
                      >
                        AMOLED
                      </Button>
                    </div>
                  </div>

                  {/* Accent Color */}
                  <div>
                    <label className="block text-sm font-medium mb-3">Accent Color</label>
                    <div className="grid grid-cols-4 gap-3">
                      {ACCENT_PRESETS.map((preset) => (
                        <button
                          key={preset.color}
                          type="button"
                          onClick={() => setAccentColor(preset.color)}
                          className={`h-12 rounded-xl border-2 transition-all ${
                            accentColor === preset.color
                              ? 'border-foreground ring-2 ring-primary/30 scale-105'
                              : 'border-border hover:border-foreground/50 hover:scale-105'
                          }`}
                          style={{ backgroundColor: preset.color }}
                          title={preset.name}
                        >
                          <span className="sr-only">{preset.name}</span>
                        </button>
                      ))}
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
          </div>

          {/* Right Column: Stats */}
          <div className="space-y-6">
            {stats && (
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <BarChart3 className="h-5 w-5 text-primary" />
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
        </div>
      </AnimatedPage>
    </AppShell>
  )
}
