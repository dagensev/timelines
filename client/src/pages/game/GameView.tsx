import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useRef, useState } from 'react';
import type { CardResultPayload, PublicGameState } from '../../game.types';
import type { RoomStateResponse } from '../../room.types';
import { socket } from '../../socket';
import { CurrentCardDisplay } from './CurrentCardDisplay';
import { DraggableCard } from './DraggableCard';
import { MyTimeline } from './MyTimeline';
import { OpponentsGrid } from './OpponentsGrid';
import { PlayerSidebar } from './PlayerSidebar';
import { WinnerScreen } from './WinnerScreen';

interface Props {
    gameState: PublicGameState;
    lastCardResult: CardResultPayload | null;
    roomState: RoomStateResponse;
    myPlayerId: string;
}

export function GameView({ gameState, lastCardResult, roomState, myPlayerId }: Props) {
    const { activeCard, timelines, turn, winner, winnerUsername } = gameState;

    const myTimeline = timelines.find((t) => t.playerId === myPlayerId);
    const isMyTurn = turn?.currentGuesserId === myPlayerId;

    // ── Drag-and-drop state ────────────────────────────────────────────
    const [isDragging, setIsDragging] = useState(false);
    const [hoveredZone, setHoveredZone] = useState<number | null>(null);
    const zoneRefs = useRef<Map<number, HTMLElement>>(new Map());
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const registerZone = useCallback((position: number, el: HTMLElement | null) => {
        if (el) {
            zoneRefs.current.set(position, el);
        } else {
            zoneRefs.current.delete(position);
        }
    }, []);

    const checkHover = useCallback((point: { x: number; y: number }) => {
        for (const [pos, el] of zoneRefs.current) {
            const r = el.getBoundingClientRect();
            if (point.x >= r.left && point.x <= r.right && point.y >= r.top && point.y <= r.bottom) {
                setHoveredZone(pos);
                return;
            }
        }
        setHoveredZone(null);
    }, []);

    // ── Card placement ─────────────────────────────────────────────────
    const handlePlace = useCallback((position: number) => {
        if (!turn || !activeCard) return;
        socket.emit('game:place-card', {
            roomId: roomState!.roomId,
            playerId: myPlayerId,
            position,
            cardId: activeCard.id,
        });
    }, [turn, activeCard, roomState, myPlayerId]);

    const lockScroll = useCallback(() => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.style.pointerEvents = 'none';
            scrollContainerRef.current.style.overflowY = 'hidden';
        }
    }, []);

    const unlockScroll = useCallback(() => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.style.pointerEvents = '';
            scrollContainerRef.current.style.overflowY = 'auto';
        }
    }, []);

    const handleDragStart = useCallback(() => {
        setIsDragging(true);
    }, []);

    const handleDragEnd = useCallback(() => {
        unlockScroll();
        setIsDragging(false);
        if (hoveredZone !== null) {
            handlePlace(hoveredZone);
        }
        setHoveredZone(null);
    }, [hoveredZone, handlePlace, unlockScroll]);

    return (
        <div className='flex h-screen overflow-hidden' style={{ background: 'var(--bg)' }}>
            <PlayerSidebar
                timelines={timelines}
                turn={turn}
                myPlayerId={myPlayerId}
                winner={winner}
            />

            <div className='flex-1 flex flex-col min-w-0'>

                {/* ── Card stage (fixed height, no overflow clip) ──────── */}
                <div
                    style={{
                        flexShrink: 0,
                        borderBottom: '1px solid var(--border)',
                        display: 'flex',
                        flexDirection: 'column',
                        touchAction: 'none',
                    }}
                    onPointerDownCapture={isMyTurn ? lockScroll : undefined}
                    onPointerUpCapture={unlockScroll}
                    onPointerCancelCapture={unlockScroll}
                >
                    {/* Header bar */}
                    <CurrentCardDisplay
                        turn={turn}
                        myPlayerId={myPlayerId}
                        timelines={timelines}
                        lastCardResult={lastCardResult}
                        activeCardId={activeCard?.id ?? null}
                    />

                    {/* Card + instruction */}
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        padding: '1.5rem 1.5rem 1.25rem',
                        gap: '1rem',
                        minHeight: '380px',
                        justifyContent: 'center',
                    }}>
                        <AnimatePresence mode='wait'>
                            {activeCard ? (
                                <motion.div
                                    key={activeCard.id}
                                    initial={{ opacity: 0, y: 16 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -16 }}
                                    transition={{ duration: 0.3 }}
                                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}
                                >
                                    <DraggableCard
                                        card={activeCard}
                                        isMyTurn={isMyTurn}
                                        onDragStart={handleDragStart}
                                        onDrag={checkHover}
                                        onDragEnd={handleDragEnd}
                                    />

                                    <p style={{
                                        fontFamily: 'Plus Jakarta Sans, sans-serif',
                                        fontSize: '0.8125rem',
                                        fontWeight: 500,
                                        color: isMyTurn ? 'var(--accent)' : 'var(--text-muted)',
                                        letterSpacing: '0.03em',
                                    }}>
                                        {isMyTurn
                                            ? 'Drag the card to a spot in your timeline ↓'
                                            : `Waiting for ${timelines.find(t => t.playerId === turn?.currentGuesserId)?.username ?? '…'} to place the card`}
                                    </p>
                                </motion.div>
                            ) : (
                                <motion.p
                                    key='waiting'
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontStyle: 'italic' }}
                                >
                                    Drawing next card…
                                </motion.p>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* ── Scrollable timeline + opponents ─────────────────── */}
                <div ref={scrollContainerRef} style={{ flex: 1, overflowY: 'auto', padding: '1rem 1rem 2rem' }} className='space-y-6'>
                    {myTimeline && (
                        <MyTimeline
                            cards={myTimeline.cards}
                            isMyTurn={isMyTurn}
                            isDragging={isDragging}
                            hoveredZone={hoveredZone}
                            lastCardResult={lastCardResult}
                            onPlace={handlePlace}
                            onRegisterZone={registerZone}
                        />
                    )}

                    <OpponentsGrid
                        timelines={timelines}
                        myPlayerId={myPlayerId}
                        turn={turn}
                    />
                </div>
            </div>

            {winner && winnerUsername && (
                <WinnerScreen
                    winnerUsername={winnerUsername}
                    isMe={winner === myPlayerId}
                />
            )}
        </div>
    );
}
