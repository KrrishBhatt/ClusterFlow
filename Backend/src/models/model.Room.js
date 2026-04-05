const mongoose=require("mongoose");

const RoomSchema=new mongoose.Schema({
    roomId:{
        type:String,
        unique:true
    },
    host:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User"
    },
    members:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User"
    }],
    task:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Task",
        default:null
    }
},{
    timestamps:true
});

module.exports=mongoose.model("Room",RoomSchema);