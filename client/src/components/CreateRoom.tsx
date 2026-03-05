import { useState } from 'react';
import { Input } from './Input';
import { Button } from './Button';
// import { Alert } from './Alert';
// import { socket } from '../socket';

export const CreateRoom = () => {
    const [username, setUsername] = useState<string>('');

    const canCreateRoom: boolean = username.trim().length > 0;

    // const createRoom = (): void => {
    //     socket.emit('room:create', { username: username.trim() }, (res) => {
    //         if (!res?.ok) {
    //             onStatus?.(res?.error || 'Failed to create room');
    //             return;
    //         }
    //     });
    // };

    return (
        <div className='w-full mt-3'>
            {/* <Alert type='error' text='Error' /> */}
            <div className='flex flex-col gap-5'>
                <Input label='Enter a username' placeholder='Username' autoFocus value={username} onChange={setUsername} inputClassName='w-full' />
                <Button text='Create Room' disabled={!canCreateRoom} />
            </div>
        </div>
    );
};
