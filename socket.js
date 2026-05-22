const socketio = require('socket.io');

let io;

module.exports = {
    init: (server) => {
        io = socketio(server, {
            cors: {
                origin: "*",
                methods: ["GET", "POST"]
            }
        });

        io.on('connection', (socket) => {
            console.log('⚡ New Socket Connection:', socket.id);

            socket.on('join', (userId) => {
                socket.join(userId);
                console.log(`👤 User ${userId} joined their notification room`);
            });

            socket.on('join_admins', () => {
                socket.join('admins');
                console.log('🛡️ Admin joined the secure broadcast room');
            });

            socket.on('disconnect', () => {
                console.log('🔥 Socket Disconnected');
            });
        });

        return io;
    },
    getIO: () => {
        if (!io) {
            console.warn("Socket.io not initialized!");
        }
        return io;
    },
    sendNotification: (userId, data) => {
        if (io) {
            io.to(userId.toString()).emit('notification', data);
        }
    },
    emitToAdmins: (data) => {
        if (io) {
            io.to('admins').emit('admin_notification', data);
        }
    }
};