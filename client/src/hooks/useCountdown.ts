import { useEffect, useState } from 'react';

export function useCountdown(startedAt: number | null, durationMs: number): number {
    const [remaining, setRemaining] = useState(durationMs);

    useEffect(() => {
        if (startedAt === null) {
            setRemaining(durationMs);
            return;
        }

        const tick = () => {
            const elapsed = Date.now() - startedAt;
            setRemaining(Math.max(0, durationMs - elapsed));
        };

        tick();
        const id = setInterval(tick, 250);
        return () => clearInterval(id);
    }, [startedAt, durationMs]);

    return Math.ceil(remaining / 1000);
}
