import { useState } from 'react';
import { Input } from './Input';
import { Button } from './Button';

export const CreateRoom = () => {
    const [username, setUsername] = useState('');

    return (
        <div className='flex flex-col w-full gap-5 mt-12'>
            <Input label='Enter a username' placeholder='Username' autoFocus value={username} onChange={setUsername} inputClassName='w-full' />
            <Button text='Create Room' />
        </div>
    );
};
