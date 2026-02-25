# 💬 ChatApp — Real-Time 1-to-1 Chat Application

A production-ready real-time chat app built with Node.js, Socket.io, MongoDB, and Vanilla JS.

![Node.js](https://img.shields.io/badge/Node.js-v24-green)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-brightgreen)
![Socket.io](https://img.shields.io/badge/Socket.io-4.6-blue)
![License](https://img.shields.io/badge/License-MIT-yellow)

---

## ✨ Features

- ✅ Real-time 1-to-1 private messaging
- ✅ User registration and login with JWT
- ✅ Password hashing with bcrypt
- ✅ Online / Offline status
- ✅ Typing indicator
- ✅ Read receipts (Seen / Sent)
- ✅ Chat history saved in MongoDB
- ✅ Toast notifications
- ✅ Auto reconnect socket
- ✅ Rate limiting and security
- ✅ Clean modern UI design
- ✅ Works on Mobile and Desktop

---

## 📁 Project Structure

```
chat-app/
├── server/
│   ├── server.js                    ← Main entry point
│   ├── socket.js                    ← All Socket.io logic
│   ├── config/
│   │   └── db.js                    ← MongoDB connection
│   ├── models/
│   │   ├── User.js                  ← User schema
│   │   └── Message.js               ← Message schema
│   ├── routes/
│   │   ├── auth.js                  ← Register and Login
│   │   └── users.js                 ← Users list and messages
│   └── middleware/
│       └── authMiddleware.js        ← JWT protection
├── client/
│   ├── index.html                   ← Login and Register page
│   ├── chat.html                    ← Main chat UI
│   ├── style.css                    ← All styles
│   └── app.js                       ← Frontend logic
├── package.json
├── .env.example
└── README.md
```

---

## 🚀 Run Locally

### Step 1 — Install Requirements

Make sure you have these installed on your computer:

- **Node.js** v18 or higher → https://nodejs.org
- **MongoDB** Community Edition → https://www.mongodb.com/try/download/community
- OR use **MongoDB Atlas** free cloud database (recommended)

---

### Step 2 — Clone or Download the Project

```bash
git clone https://github.com/gauravgit-dotcom/chat-app.git
cd chat-app
```

---

### Step 3 — Install Packages

```bash
npm install
```

---

### Step 4 — Create .env File

```bash
# Mac or Linux
cp .env.example .env

# Windows
copy .env.example .env
```

Open the .env file and fill in your values:

```
PORT=3000
MONGO_URI=mongodb://localhost:27017/chatapp
JWT_SECRET=your_secret_key_here
NODE_ENV=development
```

If using MongoDB Atlas, replace MONGO_URI with your Atlas connection string.

---

### Step 5 — Start MongoDB

**Mac:**
```bash
brew services start mongodb-community
```

**Windows:**
```bash
mongod
```

**Linux:**
```bash
sudo systemctl start mongod
```

---

### Step 6 — Start the App

```bash
npm start
```

You should see:

```
🚀 Server running on http://0.0.0.0:3000
✅ MongoDB Connected: localhost
```

---

### Step 7 — Open in Browser

```
http://localhost:3000
```

Register an account and start chatting!

---

## 🌍 Access From Another Device (Same WiFi)

### Find your IP address:

**Mac:**
```bash
ipconfig getifaddr en0
```

**Windows:**
```bash
ipconfig
```

Look for IPv4 Address — example: 192.168.1.105

### On the other device open browser and go to:

```
http://192.168.1.105:3000
```

Both devices can now register accounts and chat in real time!

---

## ☁️ MongoDB Atlas Setup (Free Cloud Database)

Use this if you want to deploy online or avoid installing MongoDB locally.

1. Go to https://cloud.mongodb.com and create a free account
2. Click Build a Database and choose the FREE M0 option
3. Go to Database Access and create a new user with a password
4. Go to Network Access and add IP address 0.0.0.0/0 to allow all connections
5. Click Connect → Drivers → copy the connection string
6. It looks like this:

```
mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/chatapp?retryWrites=true&w=majority
```

7. Paste this as your MONGO_URI in the .env file

---

## 🌐 Deploy to Render (Free Hosting)

Follow these steps to make your app live on the internet for free.

### Step 1 — Push to GitHub

Make sure your code is on GitHub at:
```
https://github.com/gauravgit-dotcom/chat-app
```

### Step 2 — Create Render Account

Go to https://render.com and sign up with your GitHub account.

### Step 3 — Create New Web Service

1. Click New + button
2. Click Web Service
3. Connect your GitHub repository
4. Fill in these settings:

| Field | Value |
|-------|-------|
| Name | chat-app |
| Environment | Node |
| Build Command | npm install |
| Start Command | node server/server.js |

### Step 4 — Add Environment Variables

| Key | Value |
|-----|-------|
| MONGO_URI | your MongoDB Atlas connection string |
| JWT_SECRET | any long random string |
| NODE_ENV | production |
| PORT | 10000 |

### Step 5 — Deploy

Click Create Web Service and wait 3 to 5 minutes.

Your app will be live at:
```
https://chat-app-xxx.onrender.com
```

---

## 📡 API Endpoints

| Method | Route | Auth Required | Description |
|--------|-------|---------------|-------------|
| POST | /api/register | No | Create new account |
| POST | /api/login | No | Login and get JWT token |
| GET | /api/users | Yes | Get all users list |
| GET | /api/messages/:userId | Yes | Get chat history |

---

## 🔌 Socket.io Events

| Event | Direction | Description |
|-------|-----------|-------------|
| join | Client to Server | Register user as online |
| send_message | Client to Server | Send a message |
| receive_message | Server to Client | Receive a message |
| typing | Client to Server | User is typing |
| stop_typing | Client to Server | User stopped typing |
| mark_as_read | Client to Server | Mark messages as read |
| online_users | Server to Client | Updated online users list |
| messages_read | Server to Client | Notify sender messages were seen |

---

## 🔒 Security Features

- Passwords hashed with bcrypt 12 rounds
- JWT tokens expire after 7 days
- All private routes protected with JWT middleware
- Socket.io connections verified with JWT
- Rate limiting on all API endpoints
- Input validation on all forms
- XSS prevention on frontend
- CORS enabled
- Request body size limited to 10kb

---

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| Node.js | Backend runtime |
| Express.js | Web framework |
| Socket.io | Real-time communication |
| MongoDB | Database |
| Mongoose | MongoDB object modeling |
| JWT | Authentication |
| bcryptjs | Password hashing |
| HTML CSS JS | Frontend |

---

## ❓ Troubleshooting

**Cannot connect to MongoDB**
Make sure MongoDB is running with brew services start mongodb-community

**Port 3000 already in use**
Change PORT to 3001 in your .env file

**Other device cannot connect**
Make sure both devices are on the same WiFi network

**npm not found**
Install Node.js from https://nodejs.org first

---

## 👨‍💻 Developer

Made by **Gaurav** → https://github.com/gauravgit-dotcom

---

## 📄 License

This project is open source and available under the MIT License.
