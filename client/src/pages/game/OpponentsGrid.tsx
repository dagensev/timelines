import type { ActiveTurn, PlayerTimeline } from '../../game.types';
import { OpponentTimeline } from './OpponentTimeline';

interface Props {
    timelines: PlayerTimeline[];
    myPlayerId: string;
    turn: ActiveTurn | null;
}

export function OpponentsGrid({ timelines, myPlayerId, turn }: Props) {
    const opponents = timelines.filter((t) => t.playerId !== myPlayerId);

    if (opponents.length === 0) return null;

    return (
        <div className='space-y-3'>
            <h3 className='font-semibold text-sm opacity-70 uppercase tracking-wide'>Opponents</h3>
            <div className='space-y-4'>
                {opponents.map((tl) => (
                    <OpponentTimeline
                        key={tl.playerId}
                        timeline={tl}
                        isCurrentGuesser={turn?.currentGuesserId === tl.playerId}
                        isActivePlayer={turn?.activePlayerId === tl.playerId}
                    />
                ))}
            </div>
        </div>
    );
}
