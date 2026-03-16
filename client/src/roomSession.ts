const ROOM_PASSWORD_KEY = 'roomPassword';
const PENDING_ROOM_CODE_KEY = 'pendingRoomCode';

export const getStoredRoomPassword = () => {
    return window.localStorage.getItem(ROOM_PASSWORD_KEY) ?? '';
};

export const setStoredRoomPassword = (password: string) => {
    window.localStorage.setItem(ROOM_PASSWORD_KEY, password);
};

export const clearStoredRoomPassword = () => {
    window.localStorage.removeItem(ROOM_PASSWORD_KEY);
};

export const setPendingRoomCode = (roomId: string) => {
    window.localStorage.setItem(PENDING_ROOM_CODE_KEY, roomId);
};

export const getPendingRoomCode = () => {
    return window.localStorage.getItem(PENDING_ROOM_CODE_KEY) ?? '';
};

export const clearPendingRoomCode = () => {
    window.localStorage.removeItem(PENDING_ROOM_CODE_KEY);
};
