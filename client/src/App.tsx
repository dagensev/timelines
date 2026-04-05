import { useEffect } from 'react';
import { socket } from './socket';
import { CreateRoom } from './components/CreateRoom';
import { JoinRoom } from './components/JoinRoom';
import { Footer } from './components/Footer';
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
        <div className='hero-bg min-h-screen flex flex-col'>
            <main className='flex-1 flex flex-col items-center justify-center px-6 text-center py-16'>

                {showButtons && (
                    <>
                        <p style={{
                            fontFamily: 'Plus Jakarta Sans, sans-serif',
                            fontSize: '0.6875rem',
                            letterSpacing: '0.22em',
                            textTransform: 'uppercase',
                            color: 'var(--text-muted)',
                            marginBottom: '1.75rem',
                        }}>
                            A multiplayer card game
                        </p>

                        <h1 style={{
                            fontFamily: 'Syne, sans-serif',
                            fontWeight: 800,
                            fontSize: 'clamp(4.5rem, 14vw, 10rem)',
                            lineHeight: 0.88,
                            letterSpacing: '-0.04em',
                            color: 'var(--text)',
                            marginBottom: '2.25rem',
                        }}>
                            TIME<br />LINES
                        </h1>

                        <p style={{
                            fontFamily: 'Plus Jakarta Sans, sans-serif',
                            fontSize: '1rem',
                            color: 'var(--text-muted)',
                            maxWidth: '28rem',
                            marginBottom: '3.5rem',
                            lineHeight: 1.7,
                        }}>
                            Place historical events in chronological order before your opponents do.
                            First to 10 cards wins.
                        </p>

                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                            <button className='btn-editorial-accent' onClick={onClickCreateRoom}>
                                Create Room
                            </button>
                            <button className='btn-editorial' onClick={onClickJoinRoom}>
                                Join Room
                            </button>
                        </div>
                    </>
                )}

                {showCreateRoom && <CreateRoom onBack={onClickBack} />}
                {showJoinRoom && <JoinRoom initialRoomCode={roomCodeFromUrl} onBack={onClickBack} />}

            </main>

            <Footer />
        </div>
    );
}

export default App;
