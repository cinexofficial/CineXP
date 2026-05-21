'use client'

import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { VscRefresh, VscTrash, VscDatabase, VscCheck, VscWarning, VscSignOut } from 'react-icons/vsc'
import { useToast } from '@/components/admin/Toast'

export default function SettingsPage() {
  const { showToast } = useToast()
  const [dbStats, setDbStats] = useState<any>(null)
  const [appConfig, setAppConfig] = useState<any>(null)
  const [loadingAction, setLoadingAction] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [confirmLogoutAll, setConfirmLogoutAll] = useState(false)

  // Fetch DB stats and config
  useEffect(() => {
    fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'db_stats' }),
    })
      .then(r => r.json())
      .then(data => setDbStats(data.stats))
      .catch(() => {})

    fetch('/api/admin/settings', { method: 'GET' })
      .then(r => r.json())
      .then(data => setAppConfig(data.config))
      .catch(() => {})
  }, [])

  const executeAction = async (action: string) => {
    setLoadingAction(action)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const data = await res.json()

      if (res.ok) {
        showToast(data.message || 'Action completed', 'success')
        // Refresh stats
        if (action.startsWith('delete') || action.startsWith('reset')) {
          const statsRes = await fetch('/api/admin/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'db_stats' }),
          })
          const statsData = await statsRes.json()
          setDbStats(statsData.stats)
        }
      } else {
        showToast(data.error || 'Action failed', 'error')
      }
    } catch {
      showToast('Network error', 'error')
    } finally {
      setLoadingAction(null)
      setConfirmDelete(null)
    }
  }

  const handleLogout = async () => {
    await fetch('/api/admin/auth', { method: 'DELETE' })
    window.location.href = '/admin-login'
  }

  const handleLogoutAllDevices = async () => {
    setLoadingAction('logout_all')
    try {
      const res = await fetch('/api/admin/auth', { method: 'PUT' })
      const data = await res.json()
      if (res.ok) {
        showToast(data.message || 'All sessions revoked', 'success')
        // Redirect to login after a short delay
        setTimeout(() => {
          window.location.href = '/admin-login'
        }, 1500)
      } else {
        showToast('Failed to revoke sessions', 'error')
      }
    } catch {
      showToast('Network error', 'error')
    } finally {
      setLoadingAction(null)
      setConfirmLogoutAll(false)
    }
  }



  return (
    <>
      <div className="admin-page-header">
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Settings
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ delay: 0.1 }}
        >
          Cache management, monetization, site info, and danger zone
        </motion.p>
      </div>


      {/* Cache Management */}
      <motion.div
        className="admin-section-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <h2>🔄 Cache Management</h2>
        <p style={{ fontSize: '0.85rem', opacity: 0.5, marginBottom: '1.25rem' }}>
          Clear server-side caches to force pages to re-fetch fresh data.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            className="admin-btn admin-btn-secondary"
            onClick={() => executeAction('revalidate_home')}
            disabled={loadingAction !== null}
          >
            <VscRefresh size={14} className={loadingAction === 'revalidate_home' ? 'spin' : ''} />
            {loadingAction === 'revalidate_home' ? 'Clearing...' : 'Clear Home Cache'}
          </button>
          <button
            className="admin-btn admin-btn-secondary"
            onClick={() => executeAction('revalidate_all')}
            disabled={loadingAction !== null}
          >
            <VscRefresh size={14} className={loadingAction === 'revalidate_all' ? 'spin' : ''} />
            {loadingAction === 'revalidate_all' ? 'Clearing...' : 'Clear All Caches'}
          </button>
        </div>

        {/* Browser Cache Section */}
        <div style={{
          marginTop: '1.5rem',
          paddingTop: '1.25rem',
          borderTop: '1px solid var(--admin-border)',
        }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            🌐 Browser Cache (All Users)
          </h3>
          <p style={{ fontSize: '0.82rem', opacity: 0.5, marginBottom: '1rem' }}>
            Clears watch history, watchlist, playback progress &amp; all locally cached data for every user on their next visit.
          </p>
          {confirmDelete === 'bust_browser_cache' ? (
            <button
              className="admin-btn"
              onClick={() => executeAction('bust_browser_cache')}
              disabled={loadingAction !== null}
              style={{
                background: 'linear-gradient(135deg, #f97316, #ea580c)',
                border: 'none',
                color: 'white',
                animation: 'pulse-danger 1.5s ease-in-out infinite',
              }}
            >
              <VscWarning size={14} />
              {loadingAction === 'bust_browser_cache' ? 'Deploying...' : 'Confirm: Clear All Browsers'}
            </button>
          ) : (
            <button
              className="admin-btn"
              onClick={() => setConfirmDelete('bust_browser_cache')}
              disabled={loadingAction !== null}
              style={{
                background: 'linear-gradient(135deg, #f97316, #ea580c)',
                border: 'none',
                color: 'white',
              }}
            >
              <VscTrash size={14} />
              Clear All Users&apos; Browser Cache
            </button>
          )}
          <p style={{ fontSize: '0.72rem', opacity: 0.35, marginTop: '0.6rem' }}>
            This increments a global version counter. When any user&apos;s browser detects the new version, it will automatically wipe their locally stored data.
          </p>
        </div>
      </motion.div>

      {/* Site Info */}
      <motion.div
        className="admin-section-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <h2>📊 Database Status</h2>
        <div className="admin-db-status-grid">
          {[
            { label: 'Media Posts', value: dbStats?.mediaCount ?? '—', icon: <VscDatabase /> },
            { label: 'Download Links', value: dbStats?.downloadCount ?? '—', icon: <VscDatabase /> },
            { label: 'Home Sections', value: dbStats?.sectionCount ?? '—', icon: <VscDatabase /> },
            { label: 'Section Items', value: dbStats?.itemCount ?? '—', icon: <VscDatabase /> },
          ].map((item, i) => (
            <div key={i} style={{
              padding: '1rem',
              background: 'rgba(255,255,255,0.03)',
              borderRadius: '10px',
              border: '1px solid var(--admin-border)',
            }}>
              <div style={{ fontSize: '0.72rem', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>
                {item.label}
              </div>
              <div style={{ fontSize: '1.3rem', fontWeight: 700 }}>{item.value}</div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: '1.25rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <VscCheck style={{ color: 'var(--admin-success)' }} />
            <span style={{ fontSize: '0.82rem', opacity: 0.7 }}>PostgreSQL Connected</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <VscCheck style={{ color: 'var(--admin-success)' }} />
            <span style={{ fontSize: '0.82rem', opacity: 0.7 }}>TMDB API: ••••••••ebc</span>
          </div>
        </div>
      </motion.div>

      {/* Session & Security */}
      <motion.div
        className="admin-section-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h2>🔐 Session & Security</h2>
        <p style={{ fontSize: '0.85rem', opacity: 0.5, marginBottom: '1.25rem' }}>
          Admin sessions expire after 3 hours. All sessions are tracked server-side and can be revoked.
        </p>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
          gap: '0.75rem', 
          marginBottom: '1.25rem' 
        }}>
          <div style={{
            padding: '0.85rem 1rem',
            background: 'rgba(157, 0, 255, 0.06)',
            borderRadius: '10px',
            border: '1px solid rgba(157, 0, 255, 0.15)',
          }}>
            <div style={{ fontSize: '0.7rem', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.3rem' }}>
              Session Expiry
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--accent)' }}>3 Hours</div>
          </div>
          <div style={{
            padding: '0.85rem 1rem',
            background: 'rgba(16, 185, 129, 0.06)',
            borderRadius: '10px',
            border: '1px solid rgba(16, 185, 129, 0.15)',
          }}>
            <div style={{ fontSize: '0.7rem', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.3rem' }}>
              Protection
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--admin-success)' }}>Server-Side</div>
          </div>
          <div style={{
            padding: '0.85rem 1rem',
            background: 'rgba(59, 130, 246, 0.06)',
            borderRadius: '10px',
            border: '1px solid rgba(59, 130, 246, 0.15)',
          }}>
            <div style={{ fontSize: '0.7rem', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.3rem' }}>
              Rate Limiting
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--admin-info)' }}>5 / 15min</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button className="admin-btn admin-btn-secondary" onClick={handleLogout}>
            <VscSignOut size={14} />
            Logout (This Device)
          </button>

          {confirmLogoutAll ? (
            <button
              className="admin-btn admin-btn-danger"
              onClick={handleLogoutAllDevices}
              disabled={loadingAction === 'logout_all'}
              style={{ animation: 'pulse-danger 1.5s ease-in-out infinite' }}
            >
              <VscWarning size={14} />
              {loadingAction === 'logout_all' ? 'Revoking All Sessions...' : 'Confirm: Logout All Devices'}
            </button>
          ) : (
            <button
              className="admin-btn admin-btn-danger"
              onClick={() => setConfirmLogoutAll(true)}
            >
              <VscSignOut size={14} />
              Logout From All Devices
            </button>
          )}
        </div>

        <p style={{ fontSize: '0.75rem', opacity: 0.35, marginTop: '0.85rem' }}>
          &ldquo;Logout From All Devices&rdquo; will immediately revoke all active sessions. You will be redirected to the login page.
        </p>
      </motion.div>

      {/* Danger Zone */}
      <motion.div
        className="admin-section-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        style={{ borderColor: 'rgba(239, 68, 68, 0.2)' }}
      >
        <h2 style={{ color: 'var(--admin-danger)' }}>
          <VscWarning style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />
          Danger Zone
        </h2>
        <p style={{ fontSize: '0.85rem', opacity: 0.5, marginBottom: '1.25rem' }}>
          These actions are irreversible. Double-click to confirm.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {confirmDelete === 'reset_home_layout' ? (
            <button
              className="admin-btn admin-btn-danger"
              onClick={() => executeAction('reset_home_layout')}
              disabled={loadingAction !== null}
            >
              <VscTrash size={14} />
              {loadingAction === 'reset_home_layout' ? 'Resetting...' : 'Click again to confirm'}
            </button>
          ) : (
            <button
              className="admin-btn admin-btn-danger"
              onClick={() => setConfirmDelete('reset_home_layout')}
            >
              Reset Home Layout
            </button>
          )}

          {confirmDelete === 'delete_all_downloads' ? (
            <button
              className="admin-btn admin-btn-danger"
              onClick={() => executeAction('delete_all_downloads')}
              disabled={loadingAction !== null}
            >
              <VscTrash size={14} />
              {loadingAction === 'delete_all_downloads' ? 'Deleting...' : 'Click again to confirm'}
            </button>
          ) : (
            <button
              className="admin-btn admin-btn-danger"
              onClick={() => setConfirmDelete('delete_all_downloads')}
            >
              Delete All Download Links
            </button>
          )}
        </div>
      </motion.div>

      <style>{`
        @keyframes pulse-danger {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
          50% { box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); }
        }
      `}</style>
    </>
  )
}
