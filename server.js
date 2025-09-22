const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, { cors: { origin: '*' } });

app.use(express.static('public'));

const users = new Map();

io.on('connection', (socket) => {
  socket.on('join', (name) => {
    users.set(socket.id, name);
    io.emit('users', Array.from(users.values()));
    io.emit('system', `${name} er nu online`);
  });

  socket.on('message', (msg) => {
    const name = users.get(socket.id);
    if (!name) return;
    io.emit('message', { name, text: msg, time: new Date().toISOString() });
  });

  socket.on('typing', (isTyping) => {
    const name = users.get(socket.id);
    socket.broadcast.emit('typing', { name, isTyping });
  });

  socket.on('disconnect', () => {
    const name = users.get(socket.id);
    if (name) {
      users.delete(socket.id);
      io.emit('users', Array.from(users.values()));
      io.emit('system', `${name} gik offline`);
    }
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`Server kører på http://localhost:${PORT}`));
