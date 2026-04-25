import { Toaster, toast as sonnerToast } from 'sonner';

export function ToastProvider() {
  return (
    <Toaster
      position="top-center"
      toastOptions={{
        style: {
          background: '#1a1a2e',
          border: '1px solid rgba(124, 58, 237, 0.3)',
          color: '#e2e8f0',
          fontFamily: 'system-ui, sans-serif',
          fontSize: '14px',
          borderRadius: '12px',
          padding: '12px 16px',
        },
        className: 'tgp-toast',
      }}
      gap={8}
    />
  );
}

export const toast = {
  success: (msg: string) => sonnerToast.success(msg, {
    style: {
      background: '#1a1a2e',
      border: '1px solid rgba(34, 197, 94, 0.35)',
      color: '#86efac',
    },
  }),
  error: (msg: string) => sonnerToast.error(msg, {
    style: {
      background: '#1a1a2e',
      border: '1px solid rgba(239, 68, 68, 0.35)',
      color: '#fca5a5',
    },
  }),
  info: (msg: string) => sonnerToast(msg, {
    style: {
      background: '#1a1a2e',
      border: '1px solid rgba(124, 58, 237, 0.3)',
      color: '#c4b5fd',
    },
  }),
  trophy: (msg: string) => sonnerToast(msg, {
    duration: 5000,
    style: {
      background: 'linear-gradient(135deg, #1a1a2e, #1e1a30)',
      border: '1px solid rgba(167, 139, 250, 0.5)',
      color: '#f0e6ff',
      fontWeight: '600',
    },
  }),
};
