const express = require("express");
const connectDB = require("./config/db");
const requestRoutes = require("./routes/request");
const privateChatRoutes = require("./routes/privateChat")
const authRoutes = require("./routes/auth.js")

const cors = require("cors");  
const app = express();

connectDB();

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));
app.use(cors({
  origin: "*",
  methods: ["GET","POST","PUT","DELETE","OPTIONS"],
  allowedHeaders: ["Content-Type","Authorization"]
}));
app.use("/api/auth", authRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/private-chat", privateChatRoutes);


app.use("/uploads", express.static("src/uploads"));

app.get("/", (req, res) => {
  res.send("Trishul Backend OK");
});

module.exports = app;