import { useState } from 'react';

/**
 * Custom React hook to manage state synchronized with localStorage.
 *
 * @template T - The type of the value being stored.
 * @param {string} key - The key under which the value is stored in localStorage.
 * @param {T} initialValue - The initial value to use if no value exists in localStorage.
 * @returns {[T, (value: T | ((prevValue: T) => T)) => void]} - Returns the current state and a function to update it.
 */
export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setValue = (value: T) => {
    try {
      setStoredValue(value);
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(error);
    }
  };

  return [storedValue, setValue];
}
