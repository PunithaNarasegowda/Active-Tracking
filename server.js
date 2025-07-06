const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const geolib = require('geolib');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

let clients = {}; // socket.id -> { lat, lon }

io.on('connection', (socket) => {
    console.log(`🔌 Connected: ${socket.id}`);

    socket.on('sendLocation', (data) => {
        clients[socket.id] = data;

        for (let [id, coords] of Object.entries(clients)) {
            if (id !== socket.id) {
                const dist = geolib.getDistance(data, coords); // in meters
                if (dist <= 100) {
                    io.to(id).emit('proximityAlert', { from: socket.id, distance: dist });
                    socket.emit('proximityAlert', { from: id, distance: dist });
                }
            }
        }

        io.emit('locationUpdate', { id: socket.id, ...data });
    });

    socket.on('disconnect', () => {
        console.log(`❌ Disconnected: ${socket.id}`);
        delete clients[socket.id];
        io.emit('removeMarker', socket.id);
    });
});

server.listen(3000, () => {
    console.log('🚀 Server running on http://localhost:3000');
});
