const mongoose=require("mongoose");
async function connectDB(){
    try{
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to database");
    }
    catch(err)
    {
        console.log("Database connection failed", err);
    }
}
module.exports=connectDB;