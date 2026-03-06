import { useCallback, useState } from 'react';

type SetValueAction<T> = T | ((prev: T) => T);

type UseLocalStorageReturn<T> = readonly [value: T, setValue: (action: SetValueAction<T>) => void, remove: () => void];

export const useLocalStorage = <T,>(key: string, initialValue: T): UseLocalStorageReturn<T> => {
    const readValue = (): T => {
        try {
            const item = window.localStorage.getItem(key);
            return item !== null ? (JSON.parse(item) as T) : initialValue;
        } catch {
            return initialValue;
        }
    };

    const [value, setValue] = useState<T>(readValue);

    const setStoredValue = useCallback(
        (action: SetValueAction<T>) => {
            setValue((current) => {
                const next = typeof action === 'function' ? (action as (prev: T) => T)(current) : action;

                try {
                    window.localStorage.setItem(key, JSON.stringify(next));
                } catch {}

                return next;
            });
        },
        [key],
    );

    const remove = useCallback(() => {
        try {
            window.localStorage.removeItem(key);
        } catch {}
        setValue(initialValue);
    }, [key, initialValue]);

    return [value, setStoredValue, remove] as const;
};
