const Room=require("../models/model.Room");
const User=require("../models/model.User");
const RoomInvite=require("../models/model.RoomInvite");

function generateRoomId(){
    return "ROOM-"+Math.floor(100000+Math.random()*900000);
}

async function joinRoom(req,res){
    try{
        const user=await User.findById(req.userId);

        if(user.currentRoom){
            return res.status(400).json({message:"You are already in another room"});
        }

        const {roomId}=req.body;
        const room=await Room.findOne({roomId});

        if(!room){
            return res.status(404).json({message:"Room not found"});
        }

        if(room.members.includes(req.userId)){
            return res.status(400).json({message:"Already in the room"});
        }

        await Room.findOneAndUpdate({roomId},{$addToSet:{members:req.userId}});

        user.currentRoom=roomId;
        await user.save();
        await room.save();

        res.json({message:"Joined room"});
    }
    catch(err){
        res.status(500).json({message:"Server error"});
    }
}

async function leaveRoom(req,res){
    try{
        const user=await User.findById(req.userId);
        const {roomId}=req.body;

        const room=await Room.findOne({roomId});

        if(!room){
            return res.status(404).json({message:"Room not found"});
        }

        if(!room.members.includes(req.userId)){
            return res.status(400).json({message:"You are not in this room"});
        }

        room.members=room.members.filter(member=>member.toString()!==req.userId);
        user.currentRoom=null;

        // BUG FIX: save room, save user, then send response (was missing all 3)
        await room.save();
        await user.save();
        res.json({message:"Left room successfully"});
    }
    catch(err){
        res.status(500).json({message:"Server error"});
    }
}

async function createRoom(req,res){
    try{
        const user=await User.findById(req.userId);

        if(user.currentRoom){
            return res.status(400).json({message:"You are already in a room"});
        }

        const room=new Room({
            roomId:generateRoomId(),
            host:req.userId,        // BUG FIX: was "creator" — model field is "host"
            members:[req.userId]
        });

        await room.save();

        // Set currentRoom so host can't create a second room
        user.currentRoom=room.roomId;
        await user.save();

        res.json({message:"Room created",roomId:room.roomId});
    }
    catch(err){
        res.status(500).json({message:"Server error"});
    }
}

async function getRoomMembers(req,res){
    try{
        const {roomId}=req.params;
        const room=await Room.findOne({roomId}).populate("members","userId username");

        if(!room){
            return res.status(404).json({message:"Room not found"});
        }

        res.json({roomId:room.roomId,members:room.members});
    }
    catch(err){
        res.status(500).json({message:"Server error"});
    }
}

async function getRoomInfo(req,res){
    try{
        const {roomId}=req.params;

        const room=await Room.findOne({roomId})
            .populate("members","userId username")
            .populate("host","_id userId username"); // BUG FIX: populate host so frontend can read it

        if(!room){
            return res.status(404).json({message:"Room not found"});
        }

        res.json({
            roomId:room.roomId,
            host:room.host,
            members:room.members,
            createdAt:room.createdAt
        });
    }
    catch(err){
        res.status(500).json({message:"Server error"});
    }
}

async function inviteFriend(req,res){
    try{
        const {roomId,receiverId}=req.body;

        const room=await Room.findOne({roomId});

        if(!room){
            return res.status(404).json({message:"Room not found"});
        }

        if(room.host.toString()!==req.userId){
            return res.status(403).json({message:"Only host can invite"});
        }

        const receiver=await User.findById(receiverId);

        if(!receiver){
            return res.status(404).json({message:"User not found"});
        }

        if(receiver.currentRoom){
            return res.status(400).json({message:"User already in a room"});
        }

        const existingInvite=await RoomInvite.findOne({
            roomId,
            receiver:receiverId,
            status:"pending"
        });

        if(existingInvite){
            return res.status(400).json({message:"Invite already sent"});
        }

        const invite=new RoomInvite({
            roomId,
            sender:req.userId,
            receiver:receiverId
        });

        await invite.save();

        res.json({message:"Invite sent"});
    }
    catch(err){
        res.status(500).json({message:"Server error"});
    }
}

async function acceptInvite(req,res){
    try{
        const {inviteId}=req.body;

        const invite=await RoomInvite.findById(inviteId);

        if(!invite){
            return res.status(404).json({message:"Invite not found"});
        }

        if(invite.receiver.toString()!==req.userId){
            return res.status(403).json({message:"Not authorized"});
        }

        if(invite.status!=="pending"){
            return res.status(400).json({message:"Invite already handled"});
        }

        const user=await User.findById(req.userId);

        if(user.currentRoom){
            return res.status(400).json({message:"Already in a room"});
        }

        const room=await Room.findOne({roomId:invite.roomId});

        if(!room){
            return res.status(404).json({message:"Room not found"});
        }

        room.members.push(req.userId);
        user.currentRoom=invite.roomId;
        invite.status="accepted";

        await room.save();
        await user.save();
        await invite.save();

        res.json({message:"Invite accepted",roomId:invite.roomId});
    }
    catch(err){
        res.status(500).json({message:"Server error"});
    }
}

async function rejectInvite(req,res){
    try{
        const {inviteId}=req.body;

        const invite=await RoomInvite.findById(inviteId);

        if(!invite){
            return res.status(404).json({message:"Invite not found"});
        }

        if(invite.receiver.toString()!==req.userId){
            return res.status(403).json({message:"Not authorized"});
        }

        if(invite.status!=="pending"){
            return res.status(400).json({message:"Invite already handled"});
        }

        invite.status="rejected";
        await invite.save();

        res.json({message:"Invite rejected"});
    }
    catch(err){
        res.status(500).json({message:"Server error"});
    }
}

// BUG FIX: was querying "receiverId" field which doesn't exist — fixed to "receiver"
async function getInvites(req,res){
    try{
        const invites=await RoomInvite.find({
            receiver:req.userId,
            status:"pending"
        }).populate("sender","userId username").sort({createdAt:-1});

        res.json({invites});
    }
    catch(err){
        res.status(500).json({message:"Server error"});
    }
}

module.exports={
    createRoom,
    joinRoom,
    getRoomMembers,
    leaveRoom,
    getRoomInfo,
    inviteFriend,
    acceptInvite,
    rejectInvite,
    getInvites
};