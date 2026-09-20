import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface ToastItem {
  id: number;
  message: string;
  action?: { label: string; onClick: () => void };
  tone?: 'default' | 'error';
}

type ShowToast = (message: string, opts?: Omit<ToastItem, 'id' | 'message'>) => void;

const ToastContext = createContext<ShowToast>(() => {});

export const useToast = () => useContext(ToastContext);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const show: ShowToast = useCallback(
    (message, opts) => {
      const id = ++nextId.current;
      setToasts((t) => [...t.slice(-2), { id, message, ...opts }]);
      setTimeout(() => dismiss(id), opts?.action ? 5000 : 2800);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="toast-region" role="status" aria-live="polite">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              className={`toast ${t.tone === 'error' ? 'toast-error' : ''}`}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.18 }}
            >
              <span>{t.message}</span>
              {t.action && (
                <button
                  className="toast-action"
                  onClick={() => {
                    t.action!.onClick();
                    dismiss(t.id);
                  }}
                >
                  {t.action.label}
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};
