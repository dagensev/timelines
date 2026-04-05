import type { ActiveTurn, PlayerTimeline } from '../../game.types';

interface Props {
    timelines: PlayerTimeline[];
    turn: ActiveTurn | null;
    myPlayerId: string;
    winner: string | null;
}

export function PlayerSidebar({ timelines, turn, myPlayerId, winner }: Props) {
    return (
        <aside
            className='w-56 flex-shrink-0 flex flex-col'
            style={{ background: 'var(--surface)', borderRight: '1px solid var(--border)' }}
        >
            <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)' }}>
                <h2 className='label-editorial' style={{ marginBottom: 0 }}>Players</h2>
            </div>
            <div className='flex-1 overflow-y-auto p-3 space-y-2'>
                {timelines.map((tl) => {
                    const isMe = tl.playerId === myPlayerId;
                    const isGuesser = turn?.currentGuesserId === tl.playerId;
                    const isActive = turn?.activePlayerId === tl.playerId;
                    const isWinner = winner === tl.playerId;

                    const cardBg = isWinner
                        ? 'rgba(245,200,66,0.08)'
                        : isGuesser
                        ? 'rgba(232,213,163,0.06)'
                        : 'var(--surface-2)';

                    const cardBorder = isWinner
                        ? '1px solid var(--accent-bright)'
                        : isGuesser
                        ? '1px solid var(--accent)'
                        : '1px solid var(--border)';

                    return (
                        <div
                            key={tl.playerId}
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
                                <span style={{
                                    fontFamily: 'Plus Jakarta Sans, sans-serif',
                                    fontWeight: 500,
                                    fontSize: '0.8125rem',
                                    color: isMe ? 'var(--accent)' : 'var(--text)',
                                }}>
                                    {tl.username}{isMe && ' (you)'}
                                </span>
                                {!tl.isConnected && (
                                    <span
                                        style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#e05c5c', flexShrink: 0 }}
                                        title='Disconnected'
                                    />
                                )}
                            </div>

                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                                <span className='badge-editorial'>{tl.cards.length} / 10</span>
                                {isWinner && <span className='badge-editorial-accent'>Winner!</span>}
                                {isGuesser && !isWinner && <span className='badge-editorial-accent'>Guessing</span>}
                                {isActive && !isGuesser && !isWinner && <span className='badge-editorial'>Drew</span>}
                            </div>

                            <div style={{ width: '100%', height: '3px', background: 'var(--border)' }}>
                                <div style={{
                                    height: '100%',
                                    width: `${(tl.cards.length / 10) * 100}%`,
                                    background: 'var(--accent)',
                                    transition: 'width 0.3s ease',
                                }} />
                            </div>
                        </div>
                    );
                })}
            </div>
        </aside>
    );
}
