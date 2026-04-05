import { motion } from 'framer-motion';

interface Props {
    winnerUsername: string;
    isMe: boolean;
    onPlayAgain?: () => void;
}

const confettiColors = ['#e8d5a3', '#f5c842', '#f0ede6', '#888880', '#e05c5c', '#6dbf7e'];

function Confetti() {
    return (
        <div className='pointer-events-none absolute inset-0 overflow-hidden'>
            {Array.from({ length: 30 }).map((_, i) => (
                <motion.div
                    key={i}
                    className='absolute w-3 h-3'
                    style={{
                        background: confettiColors[i % confettiColors.length],
                        left: `${Math.random() * 100}%`,
                        top: '-12px',
                    }}
                    animate={{
                        y: ['0vh', '110vh'],
                        rotate: [0, 360 * (Math.random() > 0.5 ? 1 : -1)],
                        opacity: [1, 1, 0],
                    }}
                    transition={{
                        duration: 2 + Math.random() * 2,
                        delay: Math.random() * 1.5,
                        ease: 'easeIn',
                        repeat: Infinity,
                        repeatDelay: Math.random() * 3,
                    }}
                />
            ))}
        </div>
    );
}

export function WinnerScreen({ winnerUsername, isMe, onPlayAgain }: Props) {
    return (
        <motion.div
            className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm'
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
        >
            <Confetti />

            <motion.div
                style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    padding: '2.5rem',
                    width: '100%',
                    maxWidth: '28rem',
                    margin: '0 1rem',
                    position: 'relative',
                    zIndex: 10,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '1.25rem',
                    textAlign: 'center',
                }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.2 }}
            >
                <motion.div
                    style={{ fontSize: '3.5rem', lineHeight: 1 }}
                    animate={{ rotate: [0, 15, -15, 10, -10, 0] }}
                    transition={{ duration: 0.8, delay: 0.5 }}
                >
                    🏆
                </motion.div>

                <h2 style={{
                    fontFamily: 'Syne, sans-serif',
                    fontWeight: 800,
                    fontSize: '2rem',
                    letterSpacing: '-0.03em',
                    color: 'var(--text)',
                }}>
                    {isMe ? 'You Win!' : `${winnerUsername} Wins!`}
                </h2>

                <p style={{ fontSize: '0.9375rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                    {isMe
                        ? 'You built a timeline of 10 cards. Excellent history knowledge!'
                        : `${winnerUsername} built a timeline of 10 cards first.`}
                </p>

                {onPlayAgain && (
                    <button className='btn-editorial-accent' onClick={onPlayAgain} style={{ marginTop: '0.5rem' }}>
                        Play Again
                    </button>
                )}
            </motion.div>
        </motion.div>
    );
}
