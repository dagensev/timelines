import { useState } from 'react';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';

const Home: React.FC = () => {
    const [username, setUsername] = useState('');

    return (
        <div className='flex justify-center items-center mt-72'>
            <div className='flex items-center gap-3'>
                <Input label='Enter a username' placeholder='Username' autoFocus value={username} onChange={setUsername} />
                <Button text='Submit' className='mt-7' />
            </div>
        </div>
    );
};

export default Home;
