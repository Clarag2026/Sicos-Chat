const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');

const io = new Server(server);

const path = require('path');

// 🔥 PUERTO CORRECTO PARA DEPLOY
const PORT = process.env.PORT || 4000;

// configuración
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// carpeta uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// rutas
app.use('/', require('./routes/cliente'));
app.use('/empleado', require('./routes/empleado'));

// hacer io global
app.set('io', io);

// 🔥 SOCKETS
io.on("connection", (socket) => {

    socket.on("joinChat", (room) => {
        socket.join("chat_" + room);
    });

    socket.on("joinAllChats", (chats) => {
        chats.forEach(id => {
            socket.join("chat_" + id);
        });
    });

});

// 🔥 SERVIDOR
server.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
});