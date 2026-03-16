import { useEffect } from 'react';
import { socket } from './socket';
import { CreateRoom } from './components/CreateRoom';
import { JoinRoom } from './components/JoinRoom';
import { Button } from './components/Button';
import { useNavigate, useSearchParams } from 'react-router';
import { useLocalStorage } from './hooks/useLocalStorage';
import type { RoomStateResponse } from './room.types';

function App() {
    const [searchParams, setSearchParams] = useSearchParams();

    const [, setRoomState] = useLocalStorage('roomState', {});

    const navigate = useNavigate();
    const screen = searchParams.get('screen');
    const roomCodeFromUrl = searchParams.get('join')?.trim().toUpperCase() ?? '';
    const showCreateRoom = screen === 'create';
    const showJoinRoom = screen === 'join' || Boolean(roomCodeFromUrl);

    const onClickCreateRoom = () => {
        setSearchParams({ screen: 'create' });
    };

    const onClickJoinRoom = () => {
        setSearchParams(roomCodeFromUrl ? { screen: 'join', join: roomCodeFromUrl } : { screen: 'join' });
    };

    const onClickBack = () => {
        setSearchParams({});
    };

    const showButtons = !showCreateRoom && !showJoinRoom;

    useEffect(() => {
        if (!socket.connected) {
            socket.connect();
        }

        const onRoomState = (e: RoomStateResponse) => {
            setRoomState(e ?? {});
            if (e?.roomId) {
                navigate(`/room/${e.roomId}`);
            }
        };

        socket.on('room:state', onRoomState);

        return () => {
            socket.off('room:state', onRoomState);
        };
    }, []);

    return (
        <div className='mt-28'>
            <h1 className='text-6xl'>Timelines</h1>
            <div className='flex justify-center'>
                {showButtons && (
                    <div className='flex gap-3 mt-28'>
                        <Button onClick={onClickCreateRoom}>Create Room</Button>
                        <Button onClick={onClickJoinRoom}>Join Room</Button>
                    </div>
                )}
                {showCreateRoom && <CreateRoom onBack={onClickBack} />}
                {showJoinRoom && <JoinRoom initialRoomCode={roomCodeFromUrl} onBack={onClickBack} />}
            </div>
        </div>
    );
}

export default App;
