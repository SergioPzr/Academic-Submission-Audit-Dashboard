import { supabase } from './supabase';

export const authService = {
  /**
   * Log an authentication event to the audit logs.
   */
  async logAuthEvent(
    email: string,
    success: boolean,
    userId?: string,
    details?: string
  ) {
    try {
      const { error } = await supabase.from('logs_auditoria').insert({
        id_usuario: userId || null,
        email_usuario: email,
        tipo_operacion: success ? 'LOGIN_SUCCESS' : 'LOGIN_FAILED',
        tabla_afectada: 'usuarios',
        metadata: {
          timestamp: new Date().toISOString(),
          detalles: details || (success ? 'Inicio de sesión exitoso' : 'Intento fallido de inicio de sesión')
        }
      });
      if (error) {
        console.error('Error writing audit log:', error);
      }
    } catch (err) {
      console.error('Unexpected error writing audit log:', err);
    }
  }
};
