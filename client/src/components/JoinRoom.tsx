import { useEffect, useState } from 'react';
import { Alert } from './Alert';
import { Button } from './Button';
import { Input } from './Input';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { getOrCreatePlayerId } from '../playerId';
import { clearPendingRoomCode, getPendingRoomCode, setStoredRoomPassword } from '../roomSession';
import { socket } from '../socket';

interface Props {
    initialRoomCode?: string;
    onBack: () => void;
}

export const JoinRoom = ({ initialRoomCode = '', onBack }: Props) => {
    const [roomId, setRoomId] = useState(initialRoomCode);
    const [username, setUsername] = useLocalStorage('username', '');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        setRoomId(initialRoomCode);
    }, [initialRoomCode]);

    useEffect(() => {
        if (initialRoomCode) {
            clearPendingRoomCode();
            return;
        }

        const pendingRoomCode = getPendingRoomCode();
        if (pendingRoomCode) {
            setRoomId(pendingRoomCode);
            clearPendingRoomCode();
        }
    }, [initialRoomCode]);

    const canJoinRoom = roomId.trim().length > 0 && username.trim().length > 0;

    const joinRoom = () => {
        const normalizedRoomId = roomId.trim().toUpperCase();
        const normalizedUsername = username.trim();
        const normalizedPassword = password.trim();

        socket.emit(
            'room:join',
            {
                roomId: normalizedRoomId,
                username: normalizedUsername,
                password: normalizedPassword,
                playerId: getOrCreatePlayerId(),
            },
            (response: { ok: boolean; error?: string }) => {
                if (!response.ok) {
                    setError(response.error ?? 'Failed to join room');
                    return;
                }

                setUsername(normalizedUsername);
                setStoredRoomPassword(normalizedPassword);
                clearPendingRoomCode();
                setError('');
            },
        );
    };

    return (
        <div className='w-full max-w-sm mx-auto mt-6'>
            {error && <Alert type='error' text={error} className='mb-6' />}
            <div className='flex flex-col gap-6'>
                <Input
                    label='Room code'
                    placeholder='Enter room code'
                    autoFocus
                    value={roomId}
                    onChange={(value) => {
                        setRoomId(value.toUpperCase());
                        setError('');
                    }}
                    inputClassName='uppercase'
                />
                <Input
                    label='Username'
                    placeholder='Enter a username'
                    value={username}
                    onChange={(value) => {
                        setUsername(value);
                        setError('');
                    }}
                />
                <Input
                    label='Room password (optional)'
                    placeholder='Leave blank if none'
                    type='password'
                    value={password}
                    onChange={(value) => {
                        setPassword(value);
                        setError('');
                    }}
                />
                <Button className='btn-editorial-accent' disabled={!canJoinRoom} onClick={joinRoom}>
                    Join Room
                </Button>
                <Button className='btn-editorial-ghost' onClick={onBack}>
                    Back
                </Button>
            </div>
        </div>
    );
};
