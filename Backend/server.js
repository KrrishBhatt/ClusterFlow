require("dotenv").config();
const fs  = require("fs");
const app = require("./src/app");
const connectDB = require("./db/db");

// create uploads folder if it doesn't exist (Render ephemeral disk)
if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
  console.log("Created uploads/ folder");
}

const PORT = process.env.PORT || 3000;
connectDB();
app.listen(PORT, () => { console.log(`Server running on ${PORT}`) });