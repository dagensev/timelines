import { motion, useAnimate, useMotionValue } from 'framer-motion';
import { useState } from 'react';
import { TimelineCard } from './TimelineCard';

interface Props {
    card: { id: number; title: string; description: string };
    isMyTurn: boolean;
    onDragStart: () => void;
    onDrag: (point: { x: number; y: number }) => void;
    onDragEnd: () => void;
}

export function DraggableCard({ card, isMyTurn, onDragStart, onDrag, onDragEnd }: Props) {
    const [dragging, setDragging] = useState(false);
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const [scope, animate] = useAnimate();

    const snapBack = () =>
        animate(scope.current, { x: 0, y: 0 }, { type: 'spring', stiffness: 420, damping: 32, mass: 1 });

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <div style={{ position: 'relative', display: 'inline-flex' }}>
                {/* Pulsing hint ring */}
                {isMyTurn && !dragging && (
                    <motion.div
                        style={{
                            position: 'absolute',
                            inset: '-6px',
                            borderRadius: '36px',
                            border: '2px solid var(--accent)',
                            pointerEvents: 'none',
                            zIndex: 0,
                        }}
                        animate={{ opacity: [0.6, 0.15, 0.6], scale: [1, 1.015, 1] }}
                        transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                    />
                )}

                <motion.div
                    ref={scope}
                    drag={isMyTurn}
                    dragDirectionLock={false}
                    dragMomentum={false}
                    dragElastic={0}
                    dragConstraints={{ top: -9999, bottom: 9999, left: -9999, right: 9999 }}
                    style={{
                        x,
                        y,
                        cursor: isMyTurn ? (dragging ? 'grabbing' : 'grab') : 'default',
                        position: 'relative',
                        zIndex: dragging ? 200 : 1,
                        touchAction: 'none',
                        userSelect: 'none',
                        WebkitUserSelect: 'none',
                    }}
                    whileHover={isMyTurn && !dragging ? { scale: 1.02 } : {}}
                    whileDrag={{
                        scale: 1.06,
                        rotate: 2,
                        boxShadow: '0 28px 80px rgba(0,0,0,0.85)',
                        zIndex: 200,
                        cursor: 'grabbing',
                    }}
                    onPointerDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        // Capture the pointer immediately so all subsequent move/up events
                        // route here regardless of which element the pointer is over.
                        // This prevents the scroll container from ever claiming the gesture.
                        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                    }}
                    onDragStart={() => {
                        setDragging(true);
                        onDragStart();
                    }}
                    onDrag={(_, info) => {
                        onDrag(info.point);
                    }}
                    onDragEnd={() => {
                        setDragging(false);
                        onDragEnd();
                        snapBack();
                    }}
                >
                    <TimelineCard
                        title={card.title}
                        description={card.description}
                        year={undefined}
                        scale={0.75}
                    />
                </motion.div>
            </div>
        </div>
    );
}
