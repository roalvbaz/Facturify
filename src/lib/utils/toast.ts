import React from "react";
import { toast } from "sonner";
import type { ExternalToast } from "sonner";

interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastOptions extends ExternalToast {
  action?: ToastAction;
  duration?: number;
  onClick?: (event: React.MouseEvent<HTMLElement>) => void;
}

/**
 * Utilidad centralizada para manejar notificaciones Toast en Facturify.
 */
export const showToast = {
  promise: async <T>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: (data: T) => string | React.ReactNode;
      error: (err: any) => string;
    },
    options?: ToastOptions
  ) => {
    return toast.promise(promise, {
      loading: messages.loading,
      success: messages.success,
      error: messages.error,
      duration: options?.duration ?? 3000,
      ...options,
    });
  },

  success: (message: string, description?: string, options?: ToastOptions) => {
    let id: string | number;
    id = toast.success(message, {
      description,
      duration: options?.duration ?? 3000,
      ...options,
      onClick: (e: React.MouseEvent<HTMLElement>) => {
        options?.onClick?.(e);
        toast.dismiss(id);
      },
    } as ExternalToast);
    return id;
  },

  error: (message: string, description?: string, options?: ToastOptions) => {
    let id: string | number;
    id = toast.error(message, {
      description,
      duration: options?.duration ?? 8000,
      ...options,
      onClick: (e: React.MouseEvent<HTMLElement>) => {
        options?.onClick?.(e);
        toast.dismiss(id);
      },
    } as ExternalToast);
    return id;
  },

  info: (message: string, options?: ToastOptions) => {
    let id: string | number;
    id = toast.info(message, {
      duration: options?.duration ?? 3000,
      ...options,
      onClick: (e: React.MouseEvent<HTMLElement>) => {
        options?.onClick?.(e);
        toast.dismiss(id);
      },
    } as ExternalToast);
    return id;
  },
};