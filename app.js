const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');

const io = new Server(server);

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// rutas
app.use('/', require('./routes/cliente'));
app.use('/empleado', require('./routes/empleado'));

// hacer io global
app.set('io', io);

// 🔥 SOCKETS CORREGIDO BIEN
io.on("connection", (socket) => {

    socket.on("joinChat", (room) => {
        socket.join("chat_" + room);
    });

    // 🔥 ESTE ES EL FIX IMPORTANTE
    socket.on("joinAllChats", (chats) => {
        chats.forEach(id => {
            socket.join("chat_" + id);
        });
    });

});

server.listen(4000, () => {
    console.log("Servidor en http://localhost:4000");
});