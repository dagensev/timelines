import { Link } from 'react-router';
import { Button } from './components/Button';

function App() {
    return (
        <div className='mt-28'>
            <h1 className='text-6xl'>Timelines</h1>
            <div className='flex justify-center mt-28'>
                <Link to='/login'>
                    <Button text='Play' />
                </Link>
            </div>
        </div>
    );
}

export default App;
