import { useEffect, useState } from 'react';
import { Input } from './Input';
import { Button } from './Button';
import { Alert } from './Alert';
import { socket } from '../socket';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { getOrCreatePlayerId } from '../playerId';
import { setStoredRoomPassword } from '../roomSession';
import type { CardSet } from '../game.types';

interface Props {
    onBack: () => void;
}

export const CreateRoom = ({ onBack }: Props) => {
    const [username, setUsername] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [error, setError] = useState<string>('');
    const [cardSets, setCardSets] = useState<CardSet[]>([]);
    const [cardSetId, setCardSetId] = useState<number | undefined>(undefined);
    const [cardSetsLoading, setCardSetsLoading] = useState(true);

    const [, setLocalStorageUsername] = useLocalStorage('username', '');

    useEffect(() => {
        fetch('/api/card-sets')
            .then((r) => r.json())
            .then((sets: CardSet[]) => {
                setCardSets(sets);
                if (sets.length > 0) setCardSetId(sets[0].id);
            })
            .catch(() => setError('Failed to load card sets'))
            .finally(() => setCardSetsLoading(false));
    }, []);

    const canCreateRoom: boolean = username.trim().length > 0 && cardSetId !== undefined;

    const createRoom = (): void => {
        const normalizedUsername = username.trim();
        const normalizedPassword = password.trim();

        socket.emit('room:create', { playerId: getOrCreatePlayerId(), username: normalizedUsername, password: normalizedPassword, cardSetId }, (res: { ok: boolean; error: string }) => {
            if (!res?.ok) {
                setError(res?.error || 'Failed to create room');
                return;
            }
            setLocalStorageUsername(normalizedUsername);
            setStoredRoomPassword(normalizedPassword);
            setError('');
        });
    };

    return (
        <div className='w-full max-w-sm mx-auto mt-6'>
            {error && <Alert type='error' text={error} className='mb-6' />}
            <div className='flex flex-col gap-6'>
                <Input
                    label='Username'
                    placeholder='Enter a username'
                    autoFocus
                    value={username}
                    onChange={(value) => {
                        setUsername(value);
                        setError('');
                    }}
                />
                <Input
                    label='Room password (optional)'
                    placeholder='Leave blank for no password'
                    type='password'
                    value={password}
                    onChange={(value) => {
                        setPassword(value);
                        setError('');
                    }}
                />

                <div>
                    <label className='label-editorial'>Card Set</label>
                    {cardSetsLoading ? (
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Loading card sets…</div>
                    ) : cardSets.length === 0 ? (
                        <div style={{ fontSize: '0.875rem', color: '#e05c5c' }}>No card sets found. Import cards into the database first.</div>
                    ) : (
                        <select
                            className='select-editorial'
                            value={cardSetId}
                            onChange={(e) => setCardSetId(Number(e.target.value))}
                        >
                            {cardSets.map((set) => (
                                <option key={set.id} value={set.id}>
                                    {set.name}{set.description ? ` — ${set.description}` : ''}
                                </option>
                            ))}
                        </select>
                    )}
                </div>

                <Button className='btn-editorial-accent' disabled={!canCreateRoom} onClick={createRoom}>
                    Create Room
                </Button>
                <Button className='btn-editorial-ghost' onClick={onBack}>
                    Back
                </Button>
            </div>
        </div>
    );
};
