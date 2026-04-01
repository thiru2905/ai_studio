'use client'
import { Permission } from '@/types'
import { useAppStore } from '@/store'
import { ShieldCheck, ShieldX, Clock } from 'lucide-react'

export function PermissionCard({ permission }: { permission: Permission }) {
  const { grantPermission, denyPermission } = useAppStore()

  const grant = () => {
    grantPermission(permission.id)
    window.dispatchEvent(new CustomEvent('forge:permission-granted', { detail: { permId: permission.id } }))
  }
  const deny = () => {
    denyPermission(permission.id)
    window.dispatchEvent(new CustomEvent('forge:permission-denied', { detail: { permId: permission.id } }))
  }

  const isPending = permission.status === 'pending'
  const isGranted = permission.status === 'granted'

  return (
    <div
      className="ml-8 mt-1 mb-3 rounded-xl p-3 animate-slide-up"
      style={{
        background: isPending ? 'rgba(245,158,11,0.05)' : isGranted ? 'rgba(16,185,129,0.05)' : 'rgba(239,68,68,0.05)',
        border: `1px solid ${isPending ? 'rgba(245,158,11,0.2)' : isGranted ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
      }}
    >
      <div className="flex items-start gap-2.5">
        <div style={{ color: isPending ? '#f59e0b' : isGranted ? '#10b981' : '#ef4444', marginTop: 1 }}>
          {isPending ? <Clock size={13} /> : isGranted ? <ShieldCheck size={13} /> : <ShieldX size={13} />}
        </div>
        <div className="flex-1">
          <p className="text-xs font-semibold mb-0.5" style={{ color: 'var(--text-primary)' }}>
            {isPending ? 'Permission required' : isGranted ? 'Allowed' : 'Denied'}
          </p>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{permission.description}</p>
          {isPending && (
            <div className="flex gap-2 mt-2.5">
              <button onClick={grant}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(16,185,129,0.18)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(16,185,129,0.1)')}
              >
                <ShieldCheck size={11} /> Allow
              </button>
              <button onClick={deny}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.18)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.1)')}
              >
                <ShieldX size={11} /> Deny
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
