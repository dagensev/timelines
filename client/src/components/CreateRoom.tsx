import { useState } from 'react';
import { Input } from './Input';
import { Button } from './Button';
import { Alert } from './Alert';
import { socket } from '../socket';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { getOrCreatePlayerId } from '../playerId';
import { setStoredRoomPassword } from '../roomSession';

interface Props {
    onBack: () => void;
}

export const CreateRoom = ({ onBack }: Props) => {
    const [username, setUsername] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [error, setError] = useState<string>('');

    const [, setLocalStorageUsername] = useLocalStorage('username', '');

    const canCreateRoom: boolean = username.trim().length > 0;

    const createRoom = (): void => {
        const normalizedUsername = username.trim();
        const normalizedPassword = password.trim();

        socket.emit('room:create', { playerId: getOrCreatePlayerId(), username: normalizedUsername, password: normalizedPassword }, (res: { ok: boolean; error: string }) => {
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
        <div className='w-full mt-3'>
            {error && <Alert type='error' text={error} />}
            <div className='flex flex-col gap-5'>
                <Input
                    label='Enter a username'
                    placeholder='Username'
                    autoFocus
                    value={username}
                    onChange={(value) => {
                        setUsername(value);
                        setError('');
                    }}
                    inputClassName='w-full'
                />
                <Input
                    label='Enter room password (optional)'
                    placeholder='Password'
                    type='password'
                    value={password}
                    onChange={(value) => {
                        setPassword(value);
                        setError('');
                    }}
                    inputClassName='w-full'
                />
                <Button disabled={!canCreateRoom} onClick={createRoom}>
                    Create Room
                </Button>
                <Button className='btn-outline' onClick={onBack}>
                    Back
                </Button>
            </div>
        </div>
    );
};
