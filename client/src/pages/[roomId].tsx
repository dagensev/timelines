import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Alert } from '../components/Alert';
import { Button } from '../components/Button';
import { ClickToCopyButton } from '../components/ClickToCopyButton';
import { CopyRoomUrlButton } from '../components/CopyRoomUrlButton';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { getOrCreatePlayerId } from '../playerId';
import type { RoomActionCallbackResponse, RoomStateResponse } from '../room.types';
import { clearPendingRoomCode, clearStoredRoomPassword, getStoredRoomPassword, setPendingRoomCode } from '../roomSession';
import { socket } from '../socket';

export default function Room() {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const [roomState, setRoomState, removeRoomState] = useLocalStorage<RoomStateResponse | Record<string, never>>('roomState', {});
    const [username, , removeUsername] = useLocalStorage('username', '');
    const [error, setError] = useState('');
    const activeRoomState = roomState && 'roomId' in roomState ? roomState : null;

    const resetRoomSession = () => {
        removeRoomState();
        removeUsername();
        clearStoredRoomPassword();
        clearPendingRoomCode();
    };

    useEffect(() => {
        if (!socket.connected) {
            socket.connect();
        }

        const onRoomState = (nextRoomState: RoomStateResponse) => {
            if (!nextRoomState || nextRoomState.roomId !== roomId) {
                return;
            }

            setRoomState(nextRoomState);
            setError('');
        };

        socket.on('room:state', onRoomState);

        return () => {
            socket.off('room:state', onRoomState);
        };
    }, [roomId, setRoomState]);

    useEffect(() => {
        if (!roomId) {
            return;
        }

        if (activeRoomState?.roomId && activeRoomState.roomId !== roomId) {
            setPendingRoomCode(roomId);

            socket.emit('room:leave', { roomId: activeRoomState.roomId, playerId: getOrCreatePlayerId() }, () => {
                resetRoomSession();
                socket.disconnect();
                navigate(`/?join=${roomId}`, { replace: true });
            });
            return;
        }

        if (!activeRoomState?.roomId) {
            setPendingRoomCode(roomId);
            navigate(`/?join=${roomId}`, { replace: true });
            return;
        }
    }, [activeRoomState?.roomId, navigate, removeRoomState, roomId]);

    useEffect(() => {
        if (!roomId || !username.trim()) {
            return;
        }

        const rejoinRoom = () => {
            socket.emit(
                'room:join',
                {
                    roomId,
                    username: username.trim(),
                    password: getStoredRoomPassword(),
                    playerId: getOrCreatePlayerId(),
                },
                (response: { ok: boolean; error?: string }) => {
                    if (!response.ok) {
                        setError(response.error ?? 'Failed to rejoin room');
                    }
                },
            );
        };

        if (socket.connected && activeRoomState?.roomId === roomId) {
            rejoinRoom();
        }

        socket.on('connect', rejoinRoom);

        return () => {
            socket.off('connect', rejoinRoom);
        };
    }, [activeRoomState?.roomId, roomId, username]);

    const players = activeRoomState?.players ?? [];
    const isHost = activeRoomState?.hostPlayerId === getOrCreatePlayerId();
    const canStartGame = isHost && players.length >= 2 && !activeRoomState?.hasStarted;

    const leaveRoom = () => {
        if (!roomId) {
            resetRoomSession();
            socket.disconnect();
            navigate('/');
            return;
        }

        socket.emit('room:leave', { roomId, playerId: getOrCreatePlayerId() }, (response: RoomActionCallbackResponse) => {
            if (!response.ok) {
                setError(response.error);
                return;
            }

            resetRoomSession();
            socket.disconnect();
            navigate('/');
        });
    };

    const startRoom = () => {
        if (!roomId) return;

        socket.emit('room:start', { roomId }, (response: RoomActionCallbackResponse) => {
            if (!response.ok) {
                setError(response.error);
                return;
            }

            setError('');
        });
    };

    return (
        <div className='mt-8 space-y-6'>
            <div className='flex items-start justify-between gap-6'>
                <div className='space-y-3'>
                    <h1 className='text-4xl'>Timelines Room</h1>
                    <div className='flex items-center gap-3 text-2xl'>
                        <span className='opacity-75'>Room Code</span>
                        <ClickToCopyButton displayValue={roomId ?? ''} value={roomId ?? ''} />
                        {roomId && <CopyRoomUrlButton roomId={roomId} />}
                    </div>
                    <p className='opacity-75'>
                        {activeRoomState?.hasStarted
                            ? 'The game has started.'
                            : 'Start the game once everyone has joined.'}
                    </p>
                </div>

                <Button className='btn-outline' onClick={leaveRoom}>
                    Leave Room
                </Button>
            </div>

            {error && <Alert type='error' text={error} />}

            <div className='card bg-base-200 shadow-sm'>
                <div className='card-body gap-4'>
                    <div className='flex items-center justify-between gap-4'>
                        <div>
                            <h2 className='card-title'>Players</h2>
                            <p className='opacity-75'>{players.length} player{players.length === 1 ? '' : 's'} in the room</p>
                        </div>
                        {isHost ? (
                            <Button disabled={!canStartGame} onClick={startRoom}>
                                {activeRoomState?.hasStarted ? 'Game Started' : 'Start Game'}
                            </Button>
                        ) : (
                            <div className='text-sm opacity-75'>Waiting for the host to start the game</div>
                        )}
                    </div>

                    <div className='space-y-3'>
                        {players.map((player, index) => (
                            <div key={`${player.username}-${index}`} className='flex items-center justify-between rounded-box bg-base-100 px-4 py-3'>
                                <span className='font-medium'>{player.username}</span>
                                {player.username === activeRoomState?.hostUsername && <span className='badge badge-outline'>Host</span>}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
