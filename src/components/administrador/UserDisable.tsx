import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import ConfirmModal from '../shared/ConfirmModal';

export default function UserDisable() {
  const [userId, setUserId] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleDisable = async () => {
    setBusy(true);
    const { error: disableError } = await supabase.auth.admin.updateUserById(userId, {
      ban_duration: '24 hours',
    });

    setBusy(false);

    if (disableError) {
      setError('Error al deshabilitar la cuenta.');
      return;
    }

    setShowConfirm(false);
    setSuccess(true);
    setUserId('');
    setUserEmail('');
    setTimeout(() => setSuccess(false), 3000);
  };

  return (
    <div className="bg-white rounded-xl border border-border shadow-sm p-5 max-w-lg">
      <h3 className="text-sm font-semibold text-text-1 mb-4 flex items-center gap-2">
        <span>🔒</span> Deshabilitar Cuenta de Usuario
      </h3>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-text-2 mb-1.5">ID del usuario</label>
          <input
            type="text"
            value={userId}
            onChange={(e) => { setUserId(e.target.value); setError(null); }}
            placeholder="UUID del usuario"
            className="w-full px-3 py-2 border border-border-mid rounded-lg text-sm outline-none focus:border-indigo transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-2 mb-1.5">Correo electrónico</label>
          <input
            type="email"
            value={userEmail}
            onChange={(e) => setUserEmail(e.target.value)}
            placeholder="usuario@urp.edu.pe"
            className="w-full px-3 py-2 border border-border-mid rounded-lg text-sm outline-none focus:border-indigo transition-colors"
          />
        </div>

        {error && <div className="text-xs text-red flex items-center gap-1.5">⚠️ {error}</div>}
        {success && <div className="text-xs text-green flex items-center gap-1.5">✅ Cuenta deshabilitada correctamente. Los datos no se eliminan (RN-027).</div>}

        <button
          onClick={() => setShowConfirm(true)}
          disabled={!userId || busy}
          className="w-full py-2.5 bg-red text-white rounded-lg text-sm font-medium hover:bg-red/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
        >
          {busy ? <span className="animate-pulse">Procesando...</span> : <>⛔ Deshabilitar Cuenta</>}
        </button>
      </div>

      <ConfirmModal
        open={showConfirm}
        title="Deshabilitar Cuenta"
        message={`¿Estás seguro de deshabilitar la cuenta de ${userEmail || userId}? Los datos académicos asociados se conservarán (RN-027).`}
        variant="danger"
        confirmLabel="Deshabilitar"
        onConfirm={handleDisable}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  );
}
