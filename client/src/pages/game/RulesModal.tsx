import { motion } from 'framer-motion';

interface Props {
    onClose: () => void;
}

const rules = [
    {
        num: '01',
        title: 'The Goal',
        body: 'Be the first player to correctly place 10 historical events on your timeline.',
    },
    {
        num: '02',
        title: 'Each Turn',
        body: 'A card is drawn showing a historical event — the year is hidden. Players take turns guessing where it falls chronologically.',
    },
    {
        num: '03',
        title: 'Guess Order',
        body: 'All players guess before the active player. The active player always goes last.',
    },
    {
        num: '04',
        title: 'Placing a Card',
        body: 'Drag the card to the correct spot on your timeline — before or after your existing events.',
    },
    {
        num: '05',
        title: 'The Timer',
        body: "45 seconds to place your guess. Time runs out = wrong answer, next player's turn.",
    },
    {
        num: '06',
        title: 'Right & Wrong',
        body: 'First correct placement wins the card. If everyone is wrong, the card is discarded.',
    },
];

export function RulesModal({ onClose }: Props) {
    return (
        <motion.div
            className='fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm'
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
        >
            <motion.div
                onClick={(e) => e.stopPropagation()}
                initial={{ scale: 0.94, opacity: 0, y: 16 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.94, opacity: 0, y: 16 }}
                transition={{ type: 'spring', stiffness: 300, damping: 28, delay: 0.05 }}
                style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    width: '100%',
                    maxWidth: '36rem',
                    margin: '1rem',
                    maxHeight: '95vh',
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
                {/* Header */}
                <div
                    style={{
                        padding: '2rem 2rem 1.5rem',
                        borderBottom: '1px solid var(--border)',
                    }}
                >
                    <p
                        style={{
                            fontFamily: 'Plus Jakarta Sans, sans-serif',
                            fontSize: '0.6875rem',
                            fontWeight: 600,
                            letterSpacing: '0.12em',
                            textTransform: 'uppercase',
                            color: 'var(--accent)',
                            marginBottom: '0.4rem',
                        }}
                    >
                        Timelines
                    </p>
                    <h2
                        style={{
                            fontFamily: 'Syne, sans-serif',
                            fontWeight: 800,
                            fontSize: '1.75rem',
                            letterSpacing: '-0.03em',
                            color: 'var(--text)',
                            margin: 0,
                        }}
                    >
                        How to Play
                    </h2>
                </div>

                {/* Rules list */}
                <div style={{ padding: '0.5rem 0' }}>
                    {rules.map((rule, i) => (
                        <div
                            key={rule.num}
                            style={{
                                display: 'flex',
                                gap: '1.25rem',
                                alignItems: 'flex-start',
                                padding: '1.1rem 2rem',
                                borderBottom: i < rules.length - 1 ? '1px solid var(--border)' : 'none',
                            }}
                        >
                            <span
                                style={{
                                    fontFamily: 'Syne, sans-serif',
                                    fontWeight: 700,
                                    fontSize: '0.75rem',
                                    letterSpacing: '0.04em',
                                    color: 'var(--accent)',
                                    flexShrink: 0,
                                    marginTop: '0.1rem',
                                    width: '1.75rem',
                                }}
                            >
                                {rule.num}
                            </span>
                            <div>
                                <p
                                    style={{
                                        fontFamily: 'Syne, sans-serif',
                                        fontWeight: 700,
                                        fontSize: '0.9375rem',
                                        lineHeight: 1.4,
                                        color: 'var(--text)',
                                        margin: '0 0 0.25rem',
                                    }}
                                >
                                    {rule.title}
                                </p>
                                <p
                                    style={{
                                        fontFamily: 'Plus Jakarta Sans, sans-serif',
                                        fontSize: '0.875rem',
                                        color: 'var(--text-muted)',
                                        lineHeight: 1.6,
                                        margin: 0,
                                    }}
                                >
                                    {rule.body}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div
                    style={{
                        padding: '1.5rem 2rem',
                        borderTop: '1px solid var(--border)',
                        display: 'flex',
                        justifyContent: 'flex-end',
                    }}
                >
                    <button className='btn-editorial-accent' onClick={onClose}>
                        Got it
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}
