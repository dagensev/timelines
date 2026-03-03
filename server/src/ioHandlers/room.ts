const roomHandler = (io, socket) => {
    const createRoom = (payload) => {
        // ...
    };

    socket.on('room:create', createRoom);
};

export default roomHandler;
