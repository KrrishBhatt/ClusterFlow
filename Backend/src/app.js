const express=require("express");
const app=express();
const cors=require("cors");

app.use(cors({ origin: [ 'http://localhost:5173', 'https://clusterflow-alpha.vercel.app' ], credentials: true }))
app.use(express.json());

const authRoutes=require("./routes/route.auth");
const usersRoutes=require("./routes/route.user");
const friendsRoutes=require("./routes/route.friends");
const roomsRoutes=require("./routes/route.rooms"); 
const taskRoutes=require("./routes/route.task");

app.use("/api/auth", authRoutes);
app.use("/api/users",usersRoutes);
app.use("/api/friends",friendsRoutes);
app.use("/api/rooms",roomsRoutes);
app.use("/api/tasks",taskRoutes);

console.log("task routes loaded");
module.exports=app;