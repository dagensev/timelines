import { motion } from 'framer-motion';

interface Props {
    position: number;
    isMyTurn: boolean;
    isDragging: boolean;
    isHovered: boolean;
    onRegister: (el: HTMLElement | null) => void;
    onClick: (position: number) => void;
}

export function PlacementZone({ position, isMyTurn, isDragging, isHovered, onRegister, onClick }: Props) {
    if (!isMyTurn) {
        return <div className='w-2 flex-shrink-0' />;
    }

    // Visual state
    const width   = isDragging ? (isHovered ? '4rem' : '2.5rem') : '1rem';
    const border  = isHovered
        ? '2px solid var(--accent)'
        : isDragging
        ? '2px dashed rgba(232,213,163,0.25)'
        : '2px dashed rgba(232,213,163,0.15)';
    const bg      = isHovered ? 'rgba(232,213,163,0.1)' : 'transparent';
    const shadow  = isHovered ? '0 0 20px rgba(232,213,163,0.25), inset 0 0 20px rgba(232,213,163,0.05)' : 'none';

    return (
        <motion.button
            ref={onRegister}
            className='flex-shrink-0 flex items-center justify-center cursor-pointer h-full'
            style={{
                minHeight: '560px',
                border,
                background: bg,
                boxShadow: shadow,
                borderRadius: 0,
                padding: 0,
            }}
            animate={{ width }}
            transition={{ duration: 0.15 }}
            onClick={() => onClick(position)}
            title={`Place here (position ${position})`}
        >
            <motion.span
                style={{ color: 'var(--accent)', fontWeight: 700, fontSize: '1.25rem' }}
                animate={{ opacity: isHovered ? 1 : isDragging ? 0.4 : 0 }}
                transition={{ duration: 0.1 }}
            >
                +
            </motion.span>
        </motion.button>
    );
}
