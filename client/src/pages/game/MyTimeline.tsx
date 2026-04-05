import { AnimatePresence } from 'framer-motion';
import type { CardResultPayload, TimelineCard } from '../../game.types';
import { PlacementZone } from './PlacementZone';
import { TimelineCard as TimelineCardComponent } from './TimelineCard';

interface Props {
    cards: TimelineCard[];
    isMyTurn: boolean;
    isDragging: boolean;
    hoveredZone: number | null;
    lastCardResult: CardResultPayload | null;
    onPlace: (position: number) => void;
    onRegisterZone: (position: number, el: HTMLElement | null) => void;
}

export function MyTimeline({ cards, isMyTurn, isDragging, hoveredZone, lastCardResult, onPlace, onRegisterZone }: Props) {
    return (
        <div className='space-y-2'>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h3 className='label-editorial' style={{ marginBottom: 0 }}>Your Timeline</h3>
                <span className='badge-editorial'>{cards.length} cards</span>
                {isMyTurn && !isDragging && (
                    <span className='badge-editorial-accent'>Your turn — drag the card here</span>
                )}
            </div>

            <div className='overflow-x-auto pb-2'>
                <div className='flex items-stretch gap-1 py-1' style={{ minWidth: 'max-content', minHeight: '336px' }}>
                    <AnimatePresence mode='popLayout'>
                        {cards.length === 0 ? (
                            <PlacementZone
                                key='zone-0'
                                position={0}
                                isMyTurn={isMyTurn}
                                isDragging={isDragging}
                                isHovered={hoveredZone === 0}
                                onRegister={(el) => onRegisterZone(0, el)}
                                onClick={onPlace}
                            />
                        ) : (
                            <>
                                <PlacementZone
                                    key='zone-0'
                                    position={0}
                                    isMyTurn={isMyTurn}
                                    isDragging={isDragging}
                                    isHovered={hoveredZone === 0}
                                    onRegister={(el) => onRegisterZone(0, el)}
                                    onClick={onPlace}
                                />
                                {cards.map((card, idx) => (
                                    <>
                                        <TimelineCardComponent
                                            key={`card-${card.id}`}
                                            title={card.title}
                                            description={card.description}
                                            year={card.year}
                                            revealed={lastCardResult?.cardId === card.id && lastCardResult?.correct}
                                            compact
                                        />
                                        <PlacementZone
                                            key={`zone-${idx + 1}`}
                                            position={idx + 1}
                                            isMyTurn={isMyTurn}
                                            isDragging={isDragging}
                                            isHovered={hoveredZone === idx + 1}
                                            onRegister={(el) => onRegisterZone(idx + 1, el)}
                                            onClick={onPlace}
                                        />
                                    </>
                                ))}
                            </>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
