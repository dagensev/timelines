import { AnimatePresence } from 'framer-motion';
import type { PlayerTimeline } from '../../game.types';
import { TimelineCard } from './TimelineCard';

interface Props {
    timeline: PlayerTimeline;
    isCurrentGuesser: boolean;
    isActivePlayer: boolean;
}

export function OpponentTimeline({ timeline, isCurrentGuesser, isActivePlayer }: Props) {
    return (
        <div className='space-y-1'>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{
                    fontFamily: 'Plus Jakarta Sans, sans-serif',
                    fontWeight: 500,
                    fontSize: '0.8125rem',
                    color: 'var(--text)',
                }}>
                    {timeline.username}
                </span>
                <span className='badge-editorial'>{timeline.cards.length} cards</span>
                {isCurrentGuesser && <span className='badge-editorial-accent'>Guessing…</span>}
                {isActivePlayer && !isCurrentGuesser && <span className='badge-editorial'>Drew card</span>}
                {!timeline.isConnected && (
                    <span style={{ fontSize: '0.625rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#e05c5c', border: '1px solid #e05c5c', padding: '0.2em 0.6em' }}>
                        Disconnected
                    </span>
                )}
            </div>

            <div className='overflow-x-auto pb-1'>
                <div className='flex items-stretch gap-1 py-1' style={{ minWidth: 'max-content', minHeight: '336px' }}>
                    <AnimatePresence mode='popLayout'>
                        {timeline.cards.length === 0 ? (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', display: 'flex', alignItems: 'center', padding: '0 0.5rem' }}>
                                No cards yet
                            </div>
                        ) : (
                            timeline.cards.map((card) => (
                                <TimelineCard
                                    key={`card-${card.id}`}
                                    title={card.title}
                                    description={card.description}
                                    year={card.year}
                                    compact
                                />
                            ))
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
