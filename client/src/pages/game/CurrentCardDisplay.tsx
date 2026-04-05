import { AnimatePresence, motion } from 'framer-motion';
import type { ActiveTurn, CardResultPayload, PlayerTimeline } from '../../game.types';
import { TurnTimer } from './TurnTimer';

interface Props {
    turn: ActiveTurn | null;
    myPlayerId?: string;
    timelines: PlayerTimeline[];
    lastCardResult: CardResultPayload | null;
    activeCardId: number | null;
    onRulesClick?: () => void;
}

export function CurrentCardDisplay({ turn, myPlayerId, timelines, lastCardResult, activeCardId, onRulesClick }: Props) {
    const isMyTurn = turn?.currentGuesserId === myPlayerId;
    const activePlayer = turn ? timelines.find((t) => t.playerId === turn.activePlayerId) : null;

    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
                padding: '0.75rem 1.5rem',
                borderBottom: '1px solid var(--border)',
                flexWrap: 'wrap',
            }}
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                <span className='label-editorial' style={{ marginBottom: 0 }}>
                    Current Card
                </span>
                {turn && activePlayer && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Drawn by <span style={{ fontWeight: 600, color: 'var(--text)' }}>{activePlayer.username}</span>
                    </span>
                )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                {/* Card result toast */}
                <AnimatePresence>
                    {lastCardResult && lastCardResult.cardId === activeCardId && (
                        <motion.div
                            initial={{ opacity: 0, x: 16 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 16 }}
                            transition={{ duration: 0.2 }}
                            className={lastCardResult.correct ? 'alert-editorial-success' : 'alert-editorial-error'}
                            style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.625rem' }}
                        >
                            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text)' }}>
                                {lastCardResult.correct ? `${lastCardResult.guesserUsername} got it` : `${lastCardResult.guesserUsername} was incorrect`}
                            </span>
                            <span
                                style={{
                                    fontSize: '0.8125rem',
                                    fontFamily: '"JetBrains Mono", "Courier New", Courier, monospace',
                                    fontWeight: 700,
                                    letterSpacing: '-0.02em',
                                    color: lastCardResult.correct ? '#6dbf7e' : '#e05c5c',
                                    flexShrink: 0,
                                }}
                            >
                                {lastCardResult.year}
                            </span>
                        </motion.div>
                    )}
                </AnimatePresence>

                {turn && isMyTurn && <TurnTimer timerStartedAt={turn.timerStartedAt} />}

                {onRulesClick && (
                    <button
                        onClick={onRulesClick}
                        title='How to play'
                        style={{
                            width: '1.75rem',
                            height: '1.75rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'transparent',
                            border: '1px solid var(--border)',
                            color: 'var(--text-muted)',
                            fontFamily: 'Syne, sans-serif',
                            fontWeight: 700,
                            fontSize: '0.8125rem',
                            cursor: 'pointer',
                            transition: 'color 0.15s, border-color 0.15s',
                            borderRadius: 0,
                            flexShrink: 0,
                        }}
                        onMouseEnter={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent)';
                            (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent)';
                        }}
                        onMouseLeave={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)';
                            (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)';
                        }}
                    >
                        ?
                    </button>
                )}
            </div>
        </div>
    );
}
