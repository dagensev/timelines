const PLAYER_ID_KEY = 'playerId';

export const getOrCreatePlayerId = () => {
    const existingPlayerId = window.localStorage.getItem(PLAYER_ID_KEY);
    if (existingPlayerId) {
        return existingPlayerId;
    }

    const nextPlayerId = crypto.randomUUID();
    window.localStorage.setItem(PLAYER_ID_KEY, nextPlayerId);
    return nextPlayerId;
};
