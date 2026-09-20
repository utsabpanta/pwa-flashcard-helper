import { useCallback, useEffect, useRef, useState } from 'react';

type SetValue<T> = (value: T | ((prev: T) => T)) => void;

let instanceCounter = 0;

/**
 * State synchronized with localStorage. Functional updates always see the
 * latest value (so several updates in a row never overwrite each other), and
 * every hook instance using the same key stays in sync, across tabs too.
 */
export function useLocalStorage<T>(key: string, initialValue: T): [T, SetValue<T>] {
  const read = useCallback((): T => {
    try {
      const item = localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const [storedValue, setStoredValue] = useState<T>(read);
  const valueRef = useRef(storedValue);
  const instanceId = useRef(0);
  if (instanceId.current === 0) instanceId.current = ++instanceCounter;

  const setValue: SetValue<T> = useCallback(
    (value) => {
      const next = value instanceof Function ? value(valueRef.current) : value;
      valueRef.current = next;
      setStoredValue(next);
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch (error) {
        console.error(error);
      }
      window.dispatchEvent(new CustomEvent('local-storage', { detail: { key, source: instanceId.current } }));
    },
    [key]
  );

  useEffect(() => {
    const sync = (e: Event) => {
      if (e instanceof StorageEvent) {
        if (e.key !== key) return;
      } else {
        const detail = (e as CustomEvent<{ key: string; source: number }>).detail;
        if (detail.key !== key || detail.source === instanceId.current) return;
      }
      const next = read();
      valueRef.current = next;
      setStoredValue(next);
    };
    window.addEventListener('storage', sync);
    window.addEventListener('local-storage', sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('local-storage', sync);
    };
  }, [key, read]);

  return [storedValue, setValue];
}
