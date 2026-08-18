import { toast } from "sonner";

/**
 * Utilidad centralizada para manejar notificaciones Toast en Facturify.
 */
export const showToast = {
  // Toast para operaciones con promesas (como emitir factura)
  promise: async <T>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: (data: T) => string | React.ReactNode;
      error: (err: any) => string;
    }
  ) => {
    return toast.promise(promise, {
      loading: messages.loading,
      success: messages.success,
      error: messages.error,
    });
  },

  // Toast simple de éxito (ej. estado cambiado, copiado, etc.)
  success: (message: string, description?: string) => {
    toast.success(message, {
      description,
    });
  },

  // Toast simple de error
  error: (message: string, description?: string) => {
    toast.error(message, {
      description,
    });
  },

  // Toast de información o aviso neutro
  info: (message: string) => {
    toast.info(message);
  },
};