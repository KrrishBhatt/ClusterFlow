const mongoose=require("mongoose");

const userSchema=new mongoose.Schema({
    userId: {
    type: String,
    unique: true
    },
    username:{
        type: String,
        required:true,
        unique:true
    },
    email:{
        type: String,
        required:true,
        unique:true
    },
    password:{
        type: String,
        required:true
    },
    friendRequests: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],
    friends:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User"
    }],
    inOnline:{
        type:Boolean,
        default:false
    },
    createdAt:{
        type:Date,
        default:Date.now
    },
    currentRoom:{
        type:String,
        default:null
    }
});

const userModel=mongoose.model("User",userSchema);

module.exports=userModel;