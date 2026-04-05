const mongoose=require("mongoose");

const RoomInviteSchema=new mongoose.Schema({
    roomId:{
        type:String,
        required:true
    },
    sender:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User"
    },
    receiver:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User"
    },
    status:{
        type:String,
        enum:["pending","accepted","rejected"],
        default:"pending"
    }
},{
    timestamps:true
});

module.exports=mongoose.model("RoomInvite",RoomInviteSchema);