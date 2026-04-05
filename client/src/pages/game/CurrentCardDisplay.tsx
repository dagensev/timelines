import { AnimatePresence, motion } from 'framer-motion';
import type { ActiveTurn, CardResultPayload, PlayerTimeline } from '../../game.types';
import { TurnTimer } from './TurnTimer';

interface Props {
    turn: ActiveTurn | null;
    myPlayerId?: string;
    timelines: PlayerTimeline[];
    lastCardResult: CardResultPayload | null;
    activeCardId: number | null;
}

export function CurrentCardDisplay({ turn, timelines, lastCardResult, activeCardId }: Props) {
    const activePlayer = turn ? timelines.find((t) => t.playerId === turn.activePlayerId) : null;

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            padding: '0.75rem 1.5rem',
            borderBottom: '1px solid var(--border)',
            flexWrap: 'wrap',
        }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                <span className='label-editorial' style={{ marginBottom: 0 }}>Current Card</span>
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
                            initial={{ opacity: 0, x: 12 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 12 }}
                            transition={{ duration: 0.2 }}
                            className={lastCardResult.correct ? 'alert-editorial-success' : 'alert-editorial-error'}
                            style={{ padding: '0.4rem 0.75rem' }}
                        >
                            <span style={{ fontSize: '0.8125rem' }}>
                                {lastCardResult.correct
                                    ? `✓ ${lastCardResult.guesserUsername} got it! ${lastCardResult.year}`
                                    : `✗ ${lastCardResult.guesserUsername} was wrong. ${lastCardResult.year}`}
                            </span>
                        </motion.div>
                    )}
                </AnimatePresence>

                {turn && <TurnTimer timerStartedAt={turn.timerStartedAt} />}
            </div>
        </div>
    );
}
