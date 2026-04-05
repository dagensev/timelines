import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

interface Props {
    title: string;
    description: string;
    year?: number; // undefined = hidden (current card being guessed)
    revealed?: boolean; // triggers 3D flip from hidden → year reveal
    compact?: boolean;
    scale?: number; // override scale (default: compact ? 0.6 : 1)
}

export function TimelineCard({ title, description, year, revealed = false, compact = false, scale: scaleProp }: Props) {
    const isHidden = year === undefined;
    const showYear = !isHidden;

    const s = scaleProp ?? (compact ? 0.6 : 1);

    const width        = Math.round(400 * s);
    const height       = Math.round(560 * s);
    const outerPad     = Math.round(14 * s);
    const outerRadius  = Math.round(30 * s);
    const innerRadius  = Math.round(18 * s);

    const footerHeight  = Math.round(height * 0.33);
    const innerHeight   = height - outerPad - footerHeight;

    const brandSize    = Math.round(30 * s);
    const brandGap     = Math.round(58 * s);
    const descSize     = Math.round(20 * s);
    const yearSize     = Math.round(110 * s);
    const innerPadTop  = Math.round(70 * s);
    const innerPadSide = Math.round(24 * s);

    // 3D flip animation when revealed transitions false → true
    const prevRevealedRef = useRef(false);
    const [isFlipping, setIsFlipping] = useState(false);

    useEffect(() => {
        if (revealed && !prevRevealedRef.current) {
            setIsFlipping(true);
            const t = setTimeout(() => setIsFlipping(false), 600);
            return () => clearTimeout(t);
        }
        prevRevealedRef.current = revealed;
    }, [revealed]);

    return (
        <div style={{ perspective: '1000px', flexShrink: 0 }}>
            <motion.div
                layout
                className='select-none flex flex-col'
                style={{
                    width,
                    height,
                    borderRadius: outerRadius,
                    background: '#1a1a1a',
                    border: '1.5px solid #2a2a2a',
                    paddingTop: outerPad,
                    paddingLeft: outerPad,
                    paddingRight: outerPad,
                    paddingBottom: 0,
                    boxShadow: '0 4px 24px rgba(0,0,0,0.6)',
                    overflow: 'hidden',
                    transformStyle: 'preserve-3d',
                }}
                initial={{ opacity: 0, x: 40 }}
                animate={
                    isFlipping
                        ? { opacity: 1, x: 0, rotateY: [0, 90, 90, 0] }
                        : { opacity: 1, x: 0, rotateY: 0 }
                }
                exit={{ opacity: 0, x: -40 }}
                transition={
                    isFlipping
                        ? { duration: 0.55, times: [0, 0.45, 0.55, 1], ease: 'easeInOut' }
                        : { duration: 0.3 }
                }
            >
                {/* Inner parchment panel */}
                <div
                    style={{
                        height: innerHeight,
                        flexShrink: 0,
                        borderRadius: innerRadius,
                        background: '#e8e0d0',
                        border: '1px solid #c8bfb0',
                        paddingTop: innerPadTop,
                        paddingLeft: innerPadSide,
                        paddingRight: innerPadSide,
                        paddingBottom: innerPadSide,
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                    }}
                >
                    <p
                        style={{
                            fontFamily: 'Syne, sans-serif',
                            fontSize: brandSize,
                            fontWeight: 700,
                            color: '#1a1a1a',
                            textAlign: 'center',
                            marginBottom: brandGap,
                            flexShrink: 0,
                            lineHeight: 1,
                        }}
                    >
                        Timelines
                    </p>
                    <p
                        style={{
                            fontFamily: '"JetBrains Mono", "Courier New", Courier, monospace',
                            fontSize: descSize,
                            fontWeight: 400,
                            color: '#2a2420',
                            lineHeight: 1.5,
                            overflow: 'hidden',
                            display: '-webkit-box',
                            WebkitLineClamp: compact ? 4 : 5,
                            WebkitBoxOrient: 'vertical',
                        }}
                    >
                        {description || title}
                    </p>
                </div>

                {/* Footer — year */}
                <div
                    style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <AnimatePresence mode='wait'>
                        {showYear ? (
                            <motion.span
                                key='year'
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                transition={{ duration: 0.25 }}
                                style={{
                                    fontFamily: '"JetBrains Mono", "Courier New", Courier, monospace',
                                    fontSize: yearSize,
                                    fontWeight: 700,
                                    color: '#f0ede6',
                                    letterSpacing: '-0.02em',
                                    lineHeight: 1,
                                }}
                            >
                                {year}
                            </motion.span>
                        ) : (
                            <motion.span
                                key='hidden'
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                style={{
                                    fontFamily: '"JetBrains Mono", "Courier New", Courier, monospace',
                                    fontSize: yearSize,
                                    fontWeight: 700,
                                    color: '#3a3a3a',
                                    letterSpacing: '-0.02em',
                                    lineHeight: 1,
                                }}
                            >
                                ????
                            </motion.span>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
}
