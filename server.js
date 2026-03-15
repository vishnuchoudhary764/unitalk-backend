require("dotenv").config();
const app = require("./src/app");
const http = require("http");
const initializeSocket = require("./src/socket");

const PORT = 5000;

const server = http.createServer(app);

initializeSocket(server);
server.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});