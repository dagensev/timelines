import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { CardResultPayload } from '../../game.types';

interface Props {
    result: CardResultPayload;
}

const CORRECT_EMOJIS = ['🎉', '✨', '🌟', '🔥', '💫', '🎊', '⭐', '👑', '🙌', '💥'];
const WRONG_EMOJIS = ['💀', '😬', '❌', '😵', '🫠', '😤', '🙃', '💔', '😅', '🤦'];

function EmojiParticles({ correct }: { correct: boolean }) {
    const emojis = correct ? CORRECT_EMOJIS : WRONG_EMOJIS;
    const count = 10;

    return (
        <>
            {Array.from({ length: count }).map((_, i) => {
                const angle = (i / count) * 360 + (Math.random() * 20 - 10);
                const distance = 130 + Math.random() * 70;
                const rad = (angle * Math.PI) / 180;
                const tx = Math.cos(rad) * distance;
                const ty = Math.sin(rad) * distance;
                const emoji = emojis[i % emojis.length];
                const delay = 0.05 + i * 0.025;
                const size = 1.2 + Math.random() * 0.6;

                return (
                    <motion.span
                        key={i}
                        style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            fontSize: `${size}rem`,
                            lineHeight: 1,
                            pointerEvents: 'none',
                            userSelect: 'none',
                            marginLeft: '-0.5em',
                            marginTop: '-0.5em',
                            display: 'block',
                        }}
                        initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
                        animate={{
                            x: tx,
                            y: ty,
                            opacity: [0, 1, 1, 0],
                            scale: [0, 1.4, 1, 0.6],
                        }}
                        transition={{
                            duration: 1.1,
                            delay,
                            ease: 'easeOut',
                            times: [0, 0.15, 0.55, 1],
                        }}
                    >
                        {emoji}
                    </motion.span>
                );
            })}
        </>
    );
}

export function ResultAnnouncement({ result }: Props) {
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        const t = setTimeout(() => setVisible(false), 2800);
        return () => clearTimeout(t);
    }, []);

    const isCorrect = result.correct;
    const color = isCorrect ? '#6dbf7e' : '#e05c5c';
    const glowRgb = isCorrect ? '109,191,126' : '224,92,92';

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 100,
                        pointerEvents: 'none',
                    }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, transition: { duration: 0.25 } }}
                    transition={{ duration: 0.1 }}
                >
                    <motion.div
                        style={{
                            position: 'relative',
                            overflow: 'visible',
                            background: 'var(--surface)',
                            border: `3px solid ${color}`,
                            boxShadow: `0 0 60px rgba(${glowRgb}, 0.35), 0 32px 80px rgba(0,0,0,0.85)`,
                            padding: '2.25rem 3rem',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '0.4rem',
                            textAlign: 'center',
                            minWidth: '18rem',
                        }}
                        initial={{ scale: 0.55, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 1.08, opacity: 0, transition: { duration: 0.25, ease: 'easeOut' } }}
                        transition={{ type: 'spring', stiffness: 520, damping: 30 }}
                    >
                        <EmojiParticles correct={isCorrect} />

                        {/* Verdict */}
                        <span
                            style={{
                                fontFamily: 'Syne, sans-serif',
                                fontWeight: 800,
                                fontSize: '0.7rem',
                                letterSpacing: '0.18em',
                                color,
                                textTransform: 'uppercase',
                                lineHeight: 1,
                            }}
                        >
                            {isCorrect ? 'Correct' : 'Incorrect'}
                        </span>

                        {/* Year — the big reveal */}
                        <span
                            style={{
                                fontFamily: '"JetBrains Mono", "Courier New", Courier, monospace',
                                fontWeight: 700,
                                fontSize: '5rem',
                                letterSpacing: '-0.02em',
                                color: 'var(--text)',
                                lineHeight: 0.9,
                                marginTop: '0.1rem',
                                marginBottom: '0.1rem',
                            }}
                        >
                            {result.year}
                        </span>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
