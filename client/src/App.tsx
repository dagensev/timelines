import { useEffect, useState } from 'react';
import { socket } from './socket';
import { CreateRoom } from './components/CreateRoom';
import { Button } from './components/Button';
import { useNavigate } from 'react-router';
import { useLocalStorage } from './hooks/useLocalStorage';

type RoomStateResponse = {
    roomId: string;
    hostSocketId: string;
    players: { username: string }[];
} | null;

function App() {
    const [isConnected, setIsConnected] = useState(socket.connected);
    const [showCreateRoom, setShowCreateRoom] = useState<boolean>(false);
    const [showJoinRoom, setShowJoinRoom] = useState<boolean>(false);

    const [, setRoomState] = useLocalStorage('roomState', {});

    const navigate = useNavigate();

    const onClickCreateRoom = () => {
        setShowCreateRoom(true);
        setShowJoinRoom(false);
    };

    const onClickJoinRoom = () => {
        setShowJoinRoom(true);
        setShowCreateRoom(false);
    };

    const showButtons = !showCreateRoom && !showJoinRoom;

    useEffect(() => {
        function onConnect() {
            setIsConnected(true);
        }

        function onDisconnect() {
            setIsConnected(false);
        }

        const onRoomState = (e: RoomStateResponse) => {
            setRoomState(e ?? {});
            navigate(`/room/${e?.roomId}`);
        };

        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);
        socket.on('room:state', onRoomState);

        return () => {
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
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
                {showCreateRoom && <CreateRoom />}
            </div>
        </div>
    );
}

export default App;
