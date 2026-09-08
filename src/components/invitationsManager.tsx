'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  addInvitationsAction,
  resendInvitationAction,
  copyInvitationLinkAction,
  type InviteLineResult,
} from '@/actions/invitation.actions';

interface InvitationRow {
  id: string;
  email: string;
  status: string;
  created_at: string | Date | null;
  expires_at: string | Date | null;
  responded_at: string | Date | null;
}

const STATUS_LABEL: Record<string, string> = {
  ENVIADA: 'Enviada',
  REGISTRADA: 'Registrada',
  CANCELADA: 'Cancelada',
};

const STATUS_COLOR: Record<string, { bg: string; color: string }> = {
  ENVIADA: { bg: 'rgba(14,165,233,0.12)', color: '#0284c7' },
  REGISTRADA: { bg: 'rgba(5,150,105,0.12)', color: '#047857' },
  CANCELADA: { bg: 'rgba(100,116,139,0.12)', color: '#475569' },
};

function formatDate(value: string | Date | null): string {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

export default function InvitationsManager({
  invitations,
  isAdmin,
}: {
  invitations: InvitationRow[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [emailsText, setEmailsText] = useState('');
  const [isPending, startTransition] = useTransition();
  const [notice, setNotice] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);
  const [results, setResults] = useState<InviteLineResult[] | null>(null);

  if (!isAdmin) return null;

  const handleAdd = () => {
    setNotice(null);
    setResults(null);
    startTransition(async () => {
      const res = await addInvitationsAction(emailsText);
      if (!res.success) {
        setNotice({ type: 'error', text: res.error || 'No se pudo enviar la invitación.' });
        return;
      }
      setResults(res.results || []);
      const okCount = (res.results || []).filter((r) => r.status === 'ok').length;
      setNotice({
        type: 'success',
        text: `Invitaciones procesadas: ${okCount} enviada(s).`,
      });
      setEmailsText('');
      router.refresh();
    });
  };

  const handleResend = (id: string) => {
    setNotice(null);
    startTransition(async () => {
      const res = await resendInvitationAction(id);
      setNotice({
        type: res.success ? 'success' : 'error',
        text: res.success
          ? res.emailSent
            ? 'Correo de registro reenviado.'
            : 'Invitación renovada (el correo no se pudo enviar).'
          : res.error || 'No se pudo reenviar.',
      });
      router.refresh();
    });
  };

  const handleCopy = async (id: string) => {
    setNotice(null);
    const res = await copyInvitationLinkAction(id);
    if (!res.success || !res.link) {
      setNotice({ type: 'error', text: res.error || 'No se pudo copiar el enlace.' });
      return;
    }
    try {
      await navigator.clipboard.writeText(res.link);
      setNotice({ type: 'info', text: 'Enlace de registro copiado. Pégalo en tu respuesta al correo.' });
    } catch {
      // Sin permisos de portapapeles: mostramos el enlace directamente
      setNotice({ type: 'info', text: `Enlace: ${res.link}` });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Alta de invitaciones */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-color)', margin: '0 0 4px 0' }}>
          Enviar invitaciones
        </h3>
        <p style={{ margin: '0 0 1rem 0', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
          Escribe los correos de las personas que te han pedido la app (uno por línea). Recibirán
          un email con su enlace personal para crear su perfil.
        </p>

        <textarea
          value={emailsText}
          onChange={(e) => setEmailsText(e.target.value)}
          rows={4}
          placeholder={'correo1@empresa.es\ncorreo2@empresa.com'}
          className="form-control"
          style={{ width: '100%', resize: 'vertical', fontFamily: 'inherit' }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
          <button
            type="button"
            disabled={isPending || !emailsText.trim()}
            onClick={handleAdd}
            className="btn btn-primary"
            style={{
              padding: '0.65rem 1.4rem',
              fontSize: '0.9rem',
              fontWeight: 700,
              opacity: isPending || !emailsText.trim() ? 0.6 : 1,
              cursor: isPending || !emailsText.trim() ? 'not-allowed' : 'pointer',
            }}
          >
            {isPending ? 'Enviando...' : 'Enviar invitaciones'}
          </button>

          {notice && (
            <span
              style={{
                fontSize: '0.8rem',
                fontWeight: 600,
                color:
                  notice.type === 'success'
                    ? '#047857'
                    : notice.type === 'error'
                      ? '#b91c1c'
                      : '#475569',
              }}
            >
              {notice.text}
            </span>
          )}
        </div>

        {results && results.length > 0 && (
          <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
            {results.map((r, i) => (
              <div
                key={`${r.email}-${i}`}
                style={{
                  fontSize: '0.8rem',
                  padding: '0.3rem 0',
                  color:
                    r.status === 'ok'
                      ? '#047857'
                      : r.status === 'invalid'
                        ? '#b45309'
                        : '#b91c1c',
                }}
              >
                <strong>{r.email}</strong> — {r.message}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Listado de invitaciones */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-color)', margin: '0 0 1rem 0' }}>
          Historial ({invitations.length})
        </h3>

        {invitations.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
            Todavía no has enviado ninguna invitación.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {invitations.map((inv) => {
              const badge = STATUS_COLOR[inv.status] || STATUS_COLOR.CANCELADA;
              return (
                <div
                  key={inv.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    padding: '0.85rem 1rem',
                    borderRadius: '10px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-color)',
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <strong style={{ fontSize: '0.9rem', color: 'var(--text-color)', wordBreak: 'break-all' }}>
                      {inv.email}
                    </strong>
                    <div style={{ marginTop: '3px', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          padding: '3px 9px',
                          borderRadius: '999px',
                          backgroundColor: badge.bg,
                          color: badge.color,
                        }}
                      >
                        {STATUS_LABEL[inv.status] || inv.status}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Enviada: {formatDate(inv.created_at)}
                      </span>
                      {inv.responded_at && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Registrada el: {formatDate(inv.responded_at)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                    <button
                      type="button"
                      onClick={() => handleCopy(inv.id)}
                      disabled={isPending}
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        padding: '0.45rem 0.85rem',
                        cursor: isPending ? 'not-allowed' : 'pointer',
                        backgroundColor: 'transparent',
                        color: '#0284c7',
                        border: '1px solid #38bdf8',
                        borderRadius: '8px',
                        opacity: isPending ? 0.5 : 1,
                      }}
                    >
                      Copiar enlace
                    </button>
                    <button
                      type="button"
                      onClick={() => handleResend(inv.id)}
                      disabled={isPending || inv.status === 'REGISTRADA'}
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        padding: '0.45rem 0.85rem',
                        cursor: isPending || inv.status === 'REGISTRADA' ? 'not-allowed' : 'pointer',
                        backgroundColor: 'transparent',
                        color: '#047857',
                        border: '1px solid #34d399',
                        borderRadius: '8px',
                        opacity: isPending || inv.status === 'REGISTRADA' ? 0.5 : 1,
                      }}
                    >
                      Reenviar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}