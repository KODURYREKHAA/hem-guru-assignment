const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const http = require("http");

const app = express();
const server = http.createServer(app);

const io = require("socket.io")(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["x-auth-token"],
    credentials: true,
  },
});

require("dotenv").config();

app.use(express.json());
app.use(cors());

// MongoDB connection
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log(err));

// User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});

// Message Schema
const messageSchema = new mongoose.Schema({
  sender: { type: String, required: true },
  receiver: { type: String, required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

const User = mongoose.model("User", userSchema);
const Message = mongoose.model("Message", messageSchema);

// Authentication Middleware
const auth = (req, res, next) => {
  const token = req.header("x-auth-token");
  if (!token) return res.status(401).send("Access denied. No token provided.");

  try {
    const decoded = jwt.verify(token, "jwtPrivateKey");
    req.user = decoded;
    next();
  } catch (ex) {
    res.status(400).send("Invalid token.");
  }
};

// Register Route
app.post("/api/register", async (req, res) => {
  const { username, password } = req.body;
  let user = await User.findOne({ username });
  if (user)
    return res.status(400).send({ display_msg: "User already exists." });

  user = new User({ username, password });
  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(password, salt);

  await user.save();

  res.status(200).send({ display_msg: "User registered Successfully" });
});

// Login Route
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (!user) return res.status(400).send("Invalid username or password.");

  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword)
    return res.status(400).send("Invalid username or password.");

  const token = jwt.sign(
    { _id: user._id, username: user.username },
    "jwtPrivateKey"
  );
  res.status(200).send(token);
});

// Send Message Route with Sample Responses and Query Handling
app.post("/api/messages", auth, async (req, res) => {
  const { receiver, content } = req.body;
  const message = new Message({ sender: req.user.username, receiver, content });
  await message.save();

  io.emit("message", message);

  // Sample response logic and query handling
  let responseContent = null;
  if (content.toLowerCase() === "hi") {
    responseContent = `Hi, welcome to Aravind's chatbot!\nChoose a query:\n1. Option a\n2. Option b\n3. Option c\n4. Option d\n5. Raise your own query`;
  } else if (content === "1") {
    responseContent = "Thanks for selecting option a.";
  } else if (content === "2") {
    responseContent = "Thanks for selecting option b.";
  } else if (content === "3") {
    responseContent = "Thanks for selecting option c.";
  } else if (content === "4") {
    responseContent = "Thanks for selecting option d.";
  } else if (content.toLowerCase() === "5") {
    responseContent = "Please enter your query:";
  }

  if (responseContent) {
    const botMessage = new Message({
      sender: "ChatBot",
      receiver: req.user.username,
      content: responseContent,
    });
    await botMessage.save();
    io.emit("message", botMessage);
  } else if (content.startsWith("QUERY: ")) {
    const queryNumber = Math.floor(Math.random() * 1000000);
    const botMessage = new Message({
      sender: "ChatBot",
      receiver: req.user.username,
      content: `Thank you for your query. Your ticket number is ${queryNumber}. We will get back to you soon.`,
    });
    await botMessage.save();
    io.emit("message", botMessage);
  }

  res.send(message);
});

// Get Messages Route
app.get("/api/messages", auth, async (req, res) => {
  const messages = await Message.find({
    $or: [{ sender: req.user.username }, { receiver: req.user.username }],
  });
  res.send(messages);
});

// Token Validation Route
app.get("/api/validate-token", auth, (req, res) => {
  res.sendStatus(200);
});

// Socket.io connection
io.on("connection", (socket) => {
  console.log("a user connected");
  socket.on("disconnect", () => {
    console.log("user disconnected");
  });
});

// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
