import { useEffect, useRef, useState } from 'react';

/**
 * Hook for debounced auto-save functionality
 * @param {string} value - Current value to save
 * @param {string} savedValue - Last saved value from server
 * @param {Function} saveFn - Async function that saves the value
 * @param {number} delay - Debounce delay in milliseconds (default: 1500)
 * @returns {object} Save status: { isSaving, lastSaved, error, retry }
 */
export function useDebouncedAutoSave(value, savedValue, saveFn, delay = 1500) {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(false);
  const [error, setError] = useState(null);
  const timeoutRef = useRef(null);
  const saveInProgressRef = useRef(false);
  const pendingValueRef = useRef(null);

  // Keep track of latest values for cleanup
  const valueRef = useRef(value);
  const savedValueRef = useRef(savedValue);
  const saveFnRef = useRef(saveFn);

  useEffect(() => {
    valueRef.current = value;
    savedValueRef.current = savedValue;
    saveFnRef.current = saveFn;
  }, [value, savedValue, saveFn]);

  // Clear last saved indicator after 2 seconds
  useEffect(() => {
    if (lastSaved) {
      const timer = setTimeout(() => {
        setLastSaved(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [lastSaved]);

  // Perform the actual save
  const performSave = async (valueToSave) => {
    // Don't save if value hasn't changed
    if (valueToSave === savedValue) {
      saveInProgressRef.current = false;
      pendingValueRef.current = null;
      return;
    }

    // Check if already saving
    if (saveInProgressRef.current) {
      // Queue this value to be saved next
      pendingValueRef.current = valueToSave;
      return;
    }

    setIsSaving(true);
    setError(null);
    saveInProgressRef.current = true;

    try {
      await saveFn(valueToSave);
      setLastSaved(true);
      setError(null);
    } catch (err) {
      console.error('Auto-save failed:', err);
      setError(err);
      setLastSaved(false);
    } finally {
      setIsSaving(false);
      saveInProgressRef.current = false;

      // If there's a pending value, save it now
      if (pendingValueRef.current !== null) {
        const nextValue = pendingValueRef.current;
        pendingValueRef.current = null;
        // Small delay to avoid immediate re-trigger
        setTimeout(() => performSave(nextValue), 100);
      }
    }
  };

  // Debounce effect: wait for user to stop typing
  useEffect(() => {
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Only trigger save if value is different from saved value
    if (value !== savedValue && value !== undefined && savedValue !== undefined) {
      // Set new timeout
      timeoutRef.current = setTimeout(() => {
        performSave(value);
      }, delay);
    }

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, savedValue, delay]);

  // Retry function for manual retry on error
  const retry = () => {
    if (value !== savedValue && !saveInProgressRef.current) {
      performSave(value);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Check if there are unsaved changes on unmount
      const currentValue = valueRef.current;
      const currentSavedValue = savedValueRef.current;
      
      if (currentValue !== currentSavedValue && currentValue !== undefined && currentSavedValue !== undefined) {
        // Save immediately
        saveFnRef.current(currentValue).catch(err => {
          console.error('Error saving on unmount:', err);
        });
      }
    };
  }, []);

  // Force immediate save (bypasses debounce)
  const forceSave = () => {
    // Clear any pending timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    // Immediately save if there are changes
    if (value !== savedValue && value !== undefined && savedValue !== undefined) {
      performSave(value);
    }
  };

  return {
    isSaving,
    lastSaved,
    error,
    retry,
    forceSave,
  };
}

