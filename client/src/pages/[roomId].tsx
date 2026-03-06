import { useParams } from 'react-router';
import { ClickToCopyButton } from '../components/ClickToCopyButton';

export default function Room() {
    const { roomId } = useParams();

    return (
        <div className='mt-6'>
            <h1 className='text-4xl flex justify-center'>Timelines</h1>
            <div className='mt-2'>
                <h2 className='text-4xl flex items-center gap-2'>
                    <div>Room Code:</div>
                    <ClickToCopyButton displayValue={roomId ?? ''} value={roomId ?? ''} />
                </h2>
                <div className='opacity-75 mt-2'>Start the game when everyone has joined</div>
            </div>
        </div>
    );
}
