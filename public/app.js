const socket = io();




const adminCodeInput = document.getElementById("adminCode");
const adminLoginBtn = document.getElementById("adminLogin");
const nameInput = document.getElementById('name');
const joinBtn = document.getElementById('join');
const usersEl = document.getElementById('users');
const messagesEl = document.getElementById('messages');
const form = document.getElementById('form');
const input = document.getElementById('input');
const typingEl = document.getElementById('typing');
const scream = new Audio("/jumpscares/scream.mp3");
scream.preload = "auto";


let joined = false;

joinBtn.addEventListener('click', () => {
  const name = nameInput.value.trim();
  if (!name) return;
  socket.emit('join', name);
  joined = true;
  nameInput.disabled = true;
  joinBtn.disabled = true;
  input.disabled = false;
});

form.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!joined) return;
  const text = input.value.trim();
  if (!text) return;
  socket.emit('message', text);
  input.value = '';
  socket.emit('typing', false);
});

input.addEventListener('input', () => {
  if (!joined) return;
  socket.emit('typing', input.value.length > 0);
});

socket.on('message', (msg) => {
  const div = document.createElement('div');
  const time = new Date(msg.time).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
  div.innerHTML = `<strong>${msg.name}</strong> [${time}]: ${msg.text}`;
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
});

socket.on('system', (text) => {
  const div = document.createElement('div');
  div.style.fontStyle = 'italic';
  div.textContent = text;
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
});

socket.on('users', (list) => {
  usersEl.innerHTML = '';
  list.forEach(u => {
    const li = document.createElement('li');
    li.textContent = u;
    usersEl.appendChild(li);
  });
});

socket.on('typing', ({ name, isTyping }) => {
  if (isTyping) {
    typingEl.textContent = `${name} skriver...`;
    typingEl.hidden = false;
  } else {
    typingEl.hidden = true;
  }
});

// Admin login
adminLoginBtn.addEventListener("click", () => {
  const code = adminCodeInput.value.trim();
  if (code) {
    socket.emit("admin:login", code);
    adminCodeInput.value = "";
  }
});

// Modtag huge-besked
socket.on("huge", ({ text }) => {
  const div = document.createElement("div");
  div.className = "huge-message";
  div.textContent = text;
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
});


socket.on("jumpscare", () => {
  // Vælg random billede fra 1-3
  const random = Math.floor(Math.random() * 3) + 1;
  const imgSrc = `/jumpscares/${random}.jpg`;

  // Opret overlay
  const overlay = document.createElement("div");
  overlay.className = "jumpscare-overlay";
  const img = document.createElement("img");
  img.src = imgSrc;
  overlay.appendChild(img);

  // Spol lyden til start og afspil
  scream.currentTime = 0;
  scream.play();

  // Vis billede samtidig
  document.body.appendChild(overlay);

  // Fjern overlay efter 3 sek
  setTimeout(() => {
    overlay.remove();
  }, 3000);
});


const imageUpload = document.getElementById("imageUpload");

// Når der vælges et billede
imageUpload.addEventListener("change", () => {
  const file = imageUpload.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    const imageData = reader.result; // Base64 data
    socket.emit("image", imageData);
  };
  reader.readAsDataURL(file);
});

socket.on("image", ({ name, image, time }) => {
  const div = document.createElement("div");
  div.className = "message";

  const sender = document.createElement("strong");
  sender.textContent = name + ": ";

  const img = document.createElement("img");
  img.src = image;
  img.className = "chat-image";

  div.appendChild(sender);
  div.appendChild(img);
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
});





