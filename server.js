const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http, { cors: { origin: "*" } });

app.use(express.static("public"));

// Sæt din egen admin-kode her
const ADMIN_CODE = "hemmeligkode";

// Gemmer brugere: socket.id -> {name, isAdmin, muted}
const users = new Map();

io.on("connection", (socket) => {
  // Når en ny bruger joiner
  socket.on("join", (name) => {
    users.set(socket.id, { name, isAdmin: false, muted: false });
    io.emit("users", Array.from(users.values()).map(u => u.name));
    io.emit("system", `${name} er nu online`);


    socket.on("image", (imageData) => {
  const user = users.get(socket.id);
  if (!user) return;

  // Tjek mute (kan ikke sende billeder hvis muted)
  if (user.muted && !user.isAdmin) {
    socket.emit("system", "❌ Du er muted og kan ikke sende billeder.");
    return;
  }

  io.emit("image", { name: user.name, image: imageData, time: new Date().toISOString() });
});

  });

  // Admin login
  socket.on("admin:login", (code) => {
    if (code === ADMIN_CODE && users.has(socket.id)) {
      users.get(socket.id).isAdmin = true;
      socket.emit("system", "✅ Du er nu admin!");
    } else {
      socket.emit("system", "❌ Forkert kode.");
    }
  });

  // Når en besked modtages
  socket.on("message", (msg) => {
    const user = users.get(socket.id);
    if (!user) return;

    // Hvis muted → kan ikke skrive (medmindre admin)
    if (user.muted && !user.isAdmin) {
      socket.emit("system", "❌ Du er muted og kan ikke skrive.");
      return;
    }

    // Admin commands starter med /
    if (msg.startsWith("/") && user.isAdmin) {
      handleAdminCommand(socket, msg);
    } else {
      io.emit("message", { name: user.name, text: msg, time: new Date().toISOString() });
    }
  });

  // Typing indikator
  socket.on("typing", (isTyping) => {
    const user = users.get(socket.id);
    if (!user || user.muted) return;
    socket.broadcast.emit("typing", { name: user.name, isTyping });
  });

  // Når en bruger forlader chatten
  socket.on("disconnect", () => {
    const user = users.get(socket.id);
    if (user) {
      users.delete(socket.id);
      io.emit("users", Array.from(users.values()).map(u => u.name));
      io.emit("system", `${user.name} gik offline`);
    }
  });

  // --- Admin kommandoer ---
  function handleAdminCommand(socket, cmd) {
    const user = users.get(socket.id);
    const [command, ...args] = cmd.slice(1).split(" ");
    const targetName = args.join(" ");

    switch (command) {
      case "kick": {
        for (let [id, u] of users) {
          if (u.name === targetName) {
            io.to(id).emit("system", "🚪 Du er blevet smidt af chatten!");
            io.to(id).disconnectSockets(true);
            users.delete(id);
            io.emit("users", Array.from(users.values()).map(u => u.name));
            io.emit("system", `${targetName} blev smidt ud af ${user.name}`);
          }
        }
        break;
      }

      case "mute": {
        for (let u of users.values()) {
          if (u.name === targetName) {
            u.muted = true;
            io.emit("system", `${targetName} er muted af ${user.name}`);
          }
        }
        break;
      }

      case "unmute": {
        for (let u of users.values()) {
          if (u.name === targetName) {
            u.muted = false;
            io.emit("system", `${targetName} er unmuted af ${user.name}`);
          }
        }
        break;
      }

      case "jumpscare": {
  const targetName = args.join(" ");
  for (let [id, u] of users) {
    if (u.name === targetName) {
      io.to(id).emit("jumpscare");
      io.emit("system", `${u.name} fik et jumpscare af ${user.name} 😱`);
    }
  }
  break;
}


      case "huge": {
        const text = args.join(" ");
        io.emit("huge", { text });
        break;
      }

      default:
        socket.emit("system", `Ukendt kommando: /${command}`);
    }
  }
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`Server kører på http://localhost:${PORT}`));
