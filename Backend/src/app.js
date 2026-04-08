const express = require("express");
const app     = express();
const cors    = require("cors");

app.use(cors({
  origin: function(origin, callback) {
    // allow any origin — works for Vercel preview URLs and localhost
    callback(null, true);
  },
  credentials: true
}));

app.use(express.json());

const authRoutes    = require("./routes/route.auth");
const usersRoutes   = require("./routes/route.user");
const friendsRoutes = require("./routes/route.friends");
const roomsRoutes   = require("./routes/route.rooms");
const taskRoutes    = require("./routes/route.task");

app.use("/api/auth",    authRoutes);
app.use("/api/users",   usersRoutes);
app.use("/api/friends", friendsRoutes);
app.use("/api/rooms",   roomsRoutes);
app.use("/api/tasks",   taskRoutes);

// health check
app.get("/api", (req, res) => res.json({ status: "ok" }));

console.log("All routes loaded");
module.exports = app;