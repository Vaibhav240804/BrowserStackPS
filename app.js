const fs = require("fs");
const path = require("path");
const express = require("express");
const socketIO = require("socket.io");
const http = require("http");
const port = 8080;
var app = express();
let server = http.createServer(app);
var io = socketIO(server);

io.on("connection", (socket) => {
  console.log("New user connected");

  socket.on("createMessage", (newMessage) => {
    console.log("newMessage", newMessage);
  });

  socket.on("disconnect", () => {
    console.log("disconnected from user");
  });
});

app.get("/", (req, res) => {
  console.log("server is listening on port 8080");
  res.sendFile(__dirname + "/index.html");
});

server.listen(port);

const filename = "log.txt";
let last_modified = 0;
let last_read_position = 0;
let file_path = path.join(__dirname, filename);

function watch_file() {
  fs.watchFile(file_path, (curr, prev) => {
    console.log(last_read_position, last_modified);
    if (curr.mtimeMs !== last_modified) {
      if (last_read_position > curr.size) last_read_position = 0;

      let readStream = fs.createReadStream(file_path, {
        start: last_read_position,
        end: curr.size,
      });

      let remainingData = "";
      readStream.on("data", (chunk) => {
        let data = chunk.toString();
        remainingData += data;
      });

      readStream.on("end", () => {
        let lines = remainingData.split("\n");
        if (lines.length > 1 && last_modified === 0) {
          console.log("entered first time");
          let lastTenLines = lines.slice(-10);
          console.log(lastTenLines);
          let finalData = lastTenLines.join("\n");
          io.emit("newMessage", {
            from: "server",
            text: finalData,
            createdAt: Date.now().toLocaleString(),
          });
        } else if (lines.length > 1) {
          let finalData = lines.join("\n");
          io.emit("newMessage", {
            from: "server",
            text: finalData,
            createdAt: Date.now().toLocaleString(),
          });
        }
      });

      last_read_position = curr.size;
      last_modified = curr.mtimeMs;
    }
  });
}

watch_file();
