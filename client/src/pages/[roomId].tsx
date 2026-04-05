import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Alert } from '../components/Alert';
import { Button } from '../components/Button';
import { ClickToCopyButton } from '../components/ClickToCopyButton';
import { CopyRoomUrlButton } from '../components/CopyRoomUrlButton';
import { Footer } from '../components/Footer';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useGameState } from '../hooks/useGameState';
import { getOrCreatePlayerId } from '../playerId';
import type { RoomActionCallbackResponse, RoomStateResponse } from '../room.types';
import { clearPendingRoomCode, clearStoredRoomPassword, getStoredRoomPassword, setPendingRoomCode } from '../roomSession';
import { socket } from '../socket';
import { GameView } from './game/GameView';

export default function Room() {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const [roomState, setRoomState, removeRoomState] = useLocalStorage<RoomStateResponse | Record<string, never>>('roomState', {});
    const [username, , removeUsername] = useLocalStorage('username', '');
    const [error, setError] = useState('');
    const activeRoomState = roomState && 'roomId' in roomState ? roomState : null;
    const myPlayerId = getOrCreatePlayerId();

    const { gameState, lastCardResult } = useGameState(socket);

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
    const isHost = activeRoomState?.hostPlayerId === myPlayerId;
    const canStartGame = isHost && players.length >= 2 && !activeRoomState?.hasStarted;

    const leaveRoom = () => {
        if (!roomId) {
            resetRoomSession();
            socket.disconnect();
            navigate('/');
            return;
        }

        socket.emit('room:leave', { roomId, playerId: myPlayerId }, (response: RoomActionCallbackResponse) => {
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

    if ((gameState || activeRoomState?.hasStarted) && gameState && activeRoomState) {
        return (
            <GameView
                gameState={gameState}
                lastCardResult={lastCardResult}
                roomState={activeRoomState as RoomStateResponse}
                myPlayerId={myPlayerId}
            />
        );
    }

    return (
        <div className='hero-bg min-h-screen flex flex-col'>
            <main className='flex-1 max-w-2xl mx-auto w-full px-6 py-12 space-y-8'>

                {/* Header */}
                <div className='flex items-start justify-between gap-6'>
                    <div className='space-y-3'>
                        <p style={{
                            fontFamily: 'Plus Jakarta Sans, sans-serif',
                            fontSize: '0.6875rem',
                            letterSpacing: '0.2em',
                            textTransform: 'uppercase',
                            color: 'var(--text-muted)',
                        }}>
                            Game Lobby
                        </p>
                        <h1 style={{
                            fontFamily: 'Syne, sans-serif',
                            fontWeight: 800,
                            fontSize: 'clamp(2rem, 6vw, 3.5rem)',
                            lineHeight: 0.95,
                            letterSpacing: '-0.03em',
                            color: 'var(--text)',
                        }}>
                            Timelines
                        </h1>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                            <span style={{
                                fontFamily: '"JetBrains Mono", "Courier New", monospace',
                                fontWeight: 700,
                                fontSize: '1.375rem',
                                letterSpacing: '0.12em',
                                color: 'var(--accent)',
                            }}>
                                {roomId}
                            </span>
                            <ClickToCopyButton displayValue={roomId ?? ''} value={roomId ?? ''} />
                            {roomId && <CopyRoomUrlButton roomId={roomId} />}
                        </div>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                            {activeRoomState?.hasStarted
                                ? 'The game has started.'
                                : 'Share the room code to invite players.'}
                        </p>
                    </div>

                    <Button className='btn-editorial-ghost' onClick={leaveRoom}>
                        Leave
                    </Button>
                </div>

                {error && <Alert type='error' text={error} />}

                {/* Players panel */}
                <div className='surface-panel space-y-4'>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                        <div>
                            <h2 style={{
                                fontFamily: 'Syne, sans-serif',
                                fontWeight: 700,
                                fontSize: '1rem',
                                letterSpacing: '-0.01em',
                                color: 'var(--text)',
                                marginBottom: '0.25rem',
                            }}>
                                Players
                            </h2>
                            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                                {players.length} / 8 players
                            </p>
                        </div>
                        {isHost ? (
                            <Button className='btn-editorial-accent' disabled={!canStartGame} onClick={startRoom}>
                                {activeRoomState?.hasStarted ? 'Game Started' : 'Start Game'}
                            </Button>
                        ) : (
                            <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                                Waiting for host to start
                            </span>
                        )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {players.map((player, index) => (
                            <div
                                key={`${player.username}-${index}`}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '0.75rem 1rem',
                                    background: 'var(--surface-2)',
                                    borderLeft: player.username === activeRoomState?.hostUsername
                                        ? '2px solid var(--accent)'
                                        : '2px solid transparent',
                                }}
                            >
                                <span style={{
                                    fontFamily: 'Plus Jakarta Sans, sans-serif',
                                    fontWeight: 500,
                                    fontSize: '0.9375rem',
                                    color: 'var(--text)',
                                }}>
                                    {player.username}
                                </span>
                                {player.username === activeRoomState?.hostUsername && (
                                    <span className='badge-editorial-accent'>Host</span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

            </main>

            <Footer />
        </div>
    );
}
