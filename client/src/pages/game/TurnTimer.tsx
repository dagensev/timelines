import { motion } from 'framer-motion';
import { useCountdown } from '../../hooks/useCountdown';

interface Props {
    timerStartedAt: number;
}

const SIZE = 56;
const STROKE = 4;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const COMPACT_SIZE = 15;
const COMPACT_STROKE = 2;
const COMPACT_RADIUS = (COMPACT_SIZE - COMPACT_STROKE) / 2;
const COMPACT_CIRCUMFERENCE = 2 * Math.PI * COMPACT_RADIUS;

export function CompactTurnTimer({ timerStartedAt }: Props) {
    const seconds = useCountdown(timerStartedAt, 45_000);
    const pct = seconds / 45;
    const dashOffset = COMPACT_CIRCUMFERENCE * (1 - pct);
    const color = seconds > 20 ? 'var(--accent)' : seconds > 10 ? 'var(--accent-bright)' : '#e05c5c';
    const isLow = seconds <= 10;

    return (
        <motion.div
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            animate={isLow ? { scale: [1, 1.08, 1] } : { scale: 1 }}
            transition={isLow ? { repeat: Infinity, duration: 0.5 } : {}}
        >
            <svg width={COMPACT_SIZE} height={COMPACT_SIZE} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
                <circle
                    cx={COMPACT_SIZE / 2}
                    cy={COMPACT_SIZE / 2}
                    r={COMPACT_RADIUS}
                    fill='none'
                    stroke='var(--border)'
                    strokeWidth={COMPACT_STROKE}
                />
                <circle
                    cx={COMPACT_SIZE / 2}
                    cy={COMPACT_SIZE / 2}
                    r={COMPACT_RADIUS}
                    fill='none'
                    stroke={color}
                    strokeWidth={COMPACT_STROKE}
                    strokeDasharray={COMPACT_CIRCUMFERENCE}
                    strokeDashoffset={dashOffset}
                    strokeLinecap='butt'
                    style={{ transition: 'stroke-dashoffset 0.5s linear, stroke 0.3s' }}
                />
            </svg>
            <span style={{ fontSize: '0.6875rem', fontWeight: 500, color, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                {seconds > 0 ? `${seconds}s` : "Time's up!"}
            </span>
        </motion.div>
    );
}

export function TurnTimer({ timerStartedAt }: Props) {
    const seconds = useCountdown(timerStartedAt, 45_000);
    const pct = seconds / 45;
    const dashOffset = CIRCUMFERENCE * (1 - pct);

    const color = seconds > 20 ? 'var(--accent)' : seconds > 10 ? 'var(--accent-bright)' : '#e05c5c';
    const isLow = seconds <= 10;

    return (
        <motion.div
            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}
            animate={isLow ? { scale: [1, 1.06, 1] } : { scale: 1 }}
            transition={isLow ? { repeat: Infinity, duration: 0.5 } : {}}
        >
            <svg width={SIZE} height={SIZE} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
                {/* Track */}
                <circle
                    cx={SIZE / 2}
                    cy={SIZE / 2}
                    r={RADIUS}
                    fill='none'
                    stroke='var(--border)'
                    strokeWidth={STROKE}
                />
                {/* Progress */}
                <circle
                    cx={SIZE / 2}
                    cy={SIZE / 2}
                    r={RADIUS}
                    fill='none'
                    stroke={color}
                    strokeWidth={STROKE}
                    strokeDasharray={CIRCUMFERENCE}
                    strokeDashoffset={dashOffset}
                    strokeLinecap='butt'
                    style={{ transition: 'stroke-dashoffset 0.5s linear, stroke 0.3s' }}
                />
                {/* Label — counter-rotate so text stays upright */}
                <text
                    x={SIZE / 2}
                    y={SIZE / 2}
                    textAnchor='middle'
                    dominantBaseline='central'
                    style={{
                        transform: `rotate(90deg)`,
                        transformOrigin: `${SIZE / 2}px ${SIZE / 2}px`,
                        fontFamily: 'Plus Jakarta Sans, sans-serif',
                        fontSize: '13px',
                        fontWeight: 700,
                        fill: color,
                    }}
                >
                    {seconds}
                </text>
            </svg>
            <span style={{ fontSize: '0.875rem', fontWeight: 500, color, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                {seconds > 0 ? `${seconds}s remaining` : "Time's up!"}
            </span>
        </motion.div>
    );
}
