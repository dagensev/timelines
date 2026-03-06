import { useState } from 'react';
import { Input } from './Input';
import { Button } from './Button';
import { Alert } from './Alert';
import { socket } from '../socket';
import { useLocalStorage } from '../hooks/useLocalStorage';

export const CreateRoom = () => {
    const [username, setUsername] = useState<string>('');
    const [error, setError] = useState<string>('');

    const [, setLocalStorageUsername] = useLocalStorage('username', '');

    const canCreateRoom: boolean = username.trim().length > 0;

    const createRoom = (): void => {
        socket.emit('room:create', { username: username.trim() }, (res: { ok: boolean; error: string }) => {
            if (!res?.ok) {
                setError(res?.error || 'Failed to create room');
                return;
            }
            setLocalStorageUsername(username);
        });
    };

    return (
        <div className='w-full mt-3'>
            {error && <Alert type='error' text={error} />}
            <div className='flex flex-col gap-5'>
                <Input label='Enter a username' placeholder='Username' autoFocus value={username} onChange={setUsername} inputClassName='w-full' />
                <Button disabled={!canCreateRoom} onClick={createRoom}>
                    Create Room
                </Button>
            </div>
        </div>
    );
};
