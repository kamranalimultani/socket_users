require("dotenv").config();
const express = require("express");
const http = require("http");
const socketIO = require("socket.io");
const mysql = require("mysql2");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  pingInterval: 10000,
  pingTimeout: 5000,
});

// Serve frontend HTML
app.use(express.static(path.join(__dirname, "public")));

// MySQL connection
const db = mysql.createConnection({
  host: "157.173.216.56",
  user: "u349717077_manmilandbuser",
  password: "p9B9UeJ@",
  database: "u349717077_manmilanlive",
});

db.connect((err) => {
  if (err) {
    console.error("❌ DB Connection error:", err);
  } else {
    console.log("✅ Connected to MySQL");
  }
});

// Helper to get formatted datetime: YYYY-MM-DD HH:mm:ss
function getFormattedDateTime() {
  const now = new Date();
  return now.toISOString().slice(0, 19).replace("T", " ");
}

// Map to store online users
const onlineUsers = new Map();

io.on("connection", (socket) => {
  console.log("🔌 Socket connected:", socket.id);

  socket.on("register_user", (matriId) => {
    if (!matriId) return;

    onlineUsers.set(matriId, socket.id);
    const currentTime = getFormattedDateTime();
    console.log(`✅ User ${matriId} connected via socket.`);

    db.query(
      "UPDATE register SET online_status = 1, online_time = ? WHERE matri_id = ?",
      [currentTime, matriId],
      (err) => {
        if (err) console.error("❌ Error updating status to online:", err);
        else
          console.log(
            `🟢 User ${matriId} marked online in DB @ ${currentTime}`
          );
      }
    );
  });

  socket.on("disconnect", () => {
    let disconnectedMatriId = null;

    for (const [matriId, sockId] of onlineUsers.entries()) {
      if (sockId === socket.id) {
        disconnectedMatriId = matriId;
        onlineUsers.delete(matriId);
        break;
      }
    }

    if (disconnectedMatriId) {
      const currentTime = getFormattedDateTime();

      db.query(
        "UPDATE register SET online_status = 0, online_time = ? WHERE matri_id = ?",
        [currentTime, disconnectedMatriId],
        (err) => {
          if (err) console.error("❌ Error updating status to offline:", err);
          else
            console.log(
              `🔴 User ${disconnectedMatriId} marked offline in DB @ ${currentTime}`
            );
        }
      );
    }

    console.log("❌ Socket disconnected:", socket.id);
  });
});
app.get("/render", (req, res) => {
  db.query(
    "INSERT INTO render_cron (insert_date) VALUES (NOW())",
    (err, result) => {
      if (err) {
        console.error(
          "❌ Error inserting into render_cron:",
          err.code,
          err.message
        );
        return res.status(500).json({ error: err.message });
      }

      res.status(201).json({
        message: "✅ Insert successful",
        id: result.insertId,
        insert_date: new Date().toISOString().slice(0, 19).replace("T", " "), // Return timestamp
      });
    }
  );
});
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
