import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import type { ActiveTurn, CardResultPayload, PlayerTimeline } from '../../game.types';
import { CompactTurnTimer } from './TurnTimer';

interface Props {
    timelines: PlayerTimeline[];
    turn: ActiveTurn | null;
    myPlayerId: string;
    winner: string | null;
    lastCardResult: CardResultPayload | null;
}

const CORRECT_EMOJIS = ['🎉', '✨', '🌟', '🔥', '💫', '🎊', '⭐', '👑', '🙌', '💥'];
const WRONG_EMOJIS = ['💀', '😬', '❌', '😵', '🫠', '😤', '🙃', '💔', '😅', '🤦'];

interface OverlayState {
    cx: number;
    cy: number;
    result: CardResultPayload;
    key: string;
}

function SidebarResultOverlay({ cx, cy, result }: { cx: number; cy: number; result: CardResultPayload }) {
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        const t = setTimeout(() => setVisible(false), 2400);
        return () => clearTimeout(t);
    }, []);

    const isCorrect = result.correct;
    const emojis = isCorrect ? CORRECT_EMOJIS : WRONG_EMOJIS;
    const color = isCorrect ? '#6dbf7e' : '#e05c5c';
    const count = 8;

    return (
        <AnimatePresence>
            {visible && (
                <>
                    {/* Emoji particles */}
                    {Array.from({ length: count }).map((_, i) => {
                        const angle = (i / count) * 360 + (Math.random() * 24 - 12);
                        const distance = 70 + Math.random() * 50;
                        const rad = (angle * Math.PI) / 180;
                        const tx = Math.cos(rad) * distance;
                        const ty = Math.sin(rad) * distance;
                        const emoji = emojis[i % emojis.length];
                        const delay = 0.04 + i * 0.03;
                        const size = 1 + Math.random() * 0.4;

                        return (
                            <motion.span
                                key={i}
                                style={{
                                    position: 'fixed',
                                    left: cx,
                                    top: cy,
                                    fontSize: `${size}rem`,
                                    lineHeight: 1,
                                    pointerEvents: 'none',
                                    userSelect: 'none',
                                    zIndex: 200,
                                    marginLeft: '-0.5em',
                                    marginTop: '-0.5em',
                                    display: 'block',
                                }}
                                initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
                                animate={{
                                    x: tx,
                                    y: ty,
                                    opacity: [0, 1, 1, 0],
                                    scale: [0, 1.3, 1, 0.5],
                                }}
                                exit={{ opacity: 0 }}
                                transition={{
                                    duration: 1.0,
                                    delay,
                                    ease: 'easeOut',
                                    times: [0, 0.15, 0.55, 1],
                                }}
                            >
                                {emoji}
                            </motion.span>
                        );
                    })}

                    {/* Small verdict popup — plain div handles centering so Framer Motion's transform isn't overridden */}
                    <div style={{ position: 'fixed', left: cx, top: cy, transform: 'translate(-50%, -50%)', zIndex: 201, pointerEvents: 'none' }}>
                        <motion.div
                            style={{
                                background: color,
                                color: '#0f0f0f',
                                fontFamily: 'Syne, sans-serif',
                                fontWeight: 800,
                                fontSize: '0.7rem',
                                letterSpacing: '0.12em',
                                textTransform: 'uppercase',
                                padding: '0.3rem 0.75rem',
                                whiteSpace: 'nowrap',
                            }}
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0, transition: { duration: 0.2 } }}
                            transition={{ type: 'spring', stiffness: 500, damping: 28, delay: 0.05 }}
                        >
                            {isCorrect ? 'Correct' : 'Incorrect'}
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
}

export function PlayerSidebar({ timelines, turn, myPlayerId, winner, lastCardResult }: Props) {
    const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
    const [overlay, setOverlay] = useState<OverlayState | null>(null);

    useEffect(() => {
        if (!lastCardResult || lastCardResult.guesserPlayerId === myPlayerId) {
            return;
        }
        const el = cardRefs.current.get(lastCardResult.guesserPlayerId);
        if (el) {
            const rect = el.getBoundingClientRect();
            setOverlay({
                cx: rect.left + rect.width / 2,
                cy: rect.top + rect.height / 2,
                result: lastCardResult,
                key: `${lastCardResult.cardId}-${lastCardResult.guesserPlayerId}`,
            });
        }
    }, [lastCardResult, myPlayerId]);

    return (
        <>
            <aside className='w-56 shrink-0 flex flex-col' style={{ background: 'var(--surface)', borderRight: '1px solid var(--border)' }}>
                <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)' }}>
                    <h2 className='label-editorial' style={{ marginBottom: 0 }}>
                        Players
                    </h2>
                </div>
                <div className='flex-1 overflow-y-auto p-3 space-y-2'>
                    {timelines.map((tl) => {
                        const isMe = tl.playerId === myPlayerId;
                        const isGuesser = turn?.currentGuesserId === tl.playerId;
                        const isActive = turn?.activePlayerId === tl.playerId;
                        const isWinner = winner === tl.playerId;

                        const cardBg = isWinner ? 'rgba(245,200,66,0.08)' : isGuesser ? 'rgba(232,213,163,0.06)' : 'var(--surface-2)';

                        const cardBorder = isWinner ? '1px solid var(--accent-bright)' : isGuesser ? '1px solid var(--accent)' : '1px solid var(--border)';

                        return (
                            <div
                                key={tl.playerId}
                                ref={(el) => {
                                    if (el) cardRefs.current.set(tl.playerId, el);
                                    else cardRefs.current.delete(tl.playerId);
                                }}
                                style={{
                                    padding: '0.75rem',
                                    background: cardBg,
                                    border: cardBorder,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.5rem',
                                    transition: 'border-color 0.2s, background 0.2s',
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                    <span
                                        style={{
                                            fontFamily: 'Plus Jakarta Sans, sans-serif',
                                            fontWeight: 500,
                                            fontSize: '0.8125rem',
                                            color: isMe ? 'var(--accent)' : 'var(--text)',
                                        }}
                                    >
                                        {tl.username}
                                        {isMe && ' (you)'}
                                    </span>
                                    {!tl.isConnected && (
                                        <span
                                            style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#e05c5c', flexShrink: 0 }}
                                            title='Disconnected'
                                        />
                                    )}
                                    {isGuesser && !isMe && turn && <CompactTurnTimer timerStartedAt={turn.timerStartedAt} />}
                                </div>

                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                                    <span className='badge-editorial'>{tl.cards.length} / 10</span>
                                    {isWinner && <span className='badge-editorial-accent'>Winner!</span>}
                                    {isGuesser && !isWinner && <span className='badge-editorial-accent'>Guessing</span>}
                                    {isActive && !isGuesser && !isWinner && <span className='badge-editorial'>Drew</span>}
                                </div>

                                <div style={{ width: '100%', height: '3px', background: 'var(--border)' }}>
                                    <div
                                        style={{
                                            height: '100%',
                                            width: `${(tl.cards.length / 10) * 100}%`,
                                            background: 'var(--accent)',
                                            transition: 'width 0.3s ease',
                                        }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </aside>

            {/* Fixed-position overlay rendered outside sidebar so it isn't clipped */}
            {overlay && <SidebarResultOverlay key={overlay.key} cx={overlay.cx} cy={overlay.cy} result={overlay.result} />}
        </>
    );
}
