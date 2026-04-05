const FriendRequest=require("../models/model.FriendRequest");
const User=require("../models/model.User");

async function getFriendRequests(req,res){
    try{
        const requests=await FriendRequest.find({
            receiver:req.userId,
            status:"pending"
        }).populate("sender","userId username");

        res.json(requests);
    }
    catch(err){
        res.status(500).json({message:"Server error"});
    }
}

async function sendFriendRequest(req,res){
    try{
        const {receiverId}=req.body;

        const receiver=await User.findOne({userId:receiverId});

        if(!receiver){
            return res.status(404).json({message:"User not found"});
        }

        if(receiver._id.toString()===req.userId){
            return res.status(400).json({message:"Cannot send request to yourself"});
        }

        const existingFriend=await FriendRequest.findOne({
            sender:req.userId,
            receiver:receiver._id,
            status:"accepted"
        });

        if(existingFriend){
            return res.status(400).json({message:"Already friends"});
        }

        const pendingRequest=await FriendRequest.findOne({
            sender:req.userId,
            receiver:receiver._id,
            status:"pending"
        });

        if(pendingRequest){
            return res.status(400).json({message:"Request already sent"});
        }

        const reverseRequest=await FriendRequest.findOne({
            sender:receiver._id,
            receiver:req.userId,
            status:"pending"
        });

        if(reverseRequest){
            return res.status(400).json({
                message:"User has already sent you a friend request"
            });
        }

        const request=new FriendRequest({
            sender:req.userId,
            receiver:receiver._id
        });

        await request.save();

        res.json({message:"Friend request sent"});
    }
    catch(err){
        res.status(500).json({message:"Server error"});
    }
}

async function acceptFriendRequest(req,res){
    try{
        const {requestId}=req.body;
        
        const request=await FriendRequest.findById(requestId);

        if(!request){
            return res.status(404).json({message:"Request not found"});
        }

        if(request.receiver.toString()!==req.userId){
            return res.status(403).json({message:"User not authorized"});
        }

        if(request.status!=="pending"){
            return res.status(400).json({message:"Request already processed"});
        }

        request.status="accepted";

        await request.save();

        await User.findByIdAndUpdate(
            request.sender,
            {$addToSet:{friends:request.receiver}}
        );

        await User.findByIdAndUpdate(
            request.receiver,
            {$addToSet:{friends:request.sender}}
        );

        res.json({message:"Friend request accepted"});
    }
    catch(err){
        res.status(500).json({message:"Server error"});
    }
}

async function rejectFriendRequest(req,res){
    try{
        const {requestId}=req.body;

        const request=await FriendRequest.findById(requestId);

        if(!request){
            return res.status(404).json({message:"Request not found"});
        }

        if(request.receiver.toString()!==req.userId){
            return res.status(403).json({message:"User not authorized"});
        }

        if(request.status!=="pending"){
            return res.status(400).json({message:"Request already processed"});
        }

        request.status="rejected";

        await request.save();

        res.json({message:"Friend request rejected"});
    }
    catch(err){
        res.status(500).json({message:"Server error"});
    }
}

async function getFriends(req,res){
    try{
        const userId=req.userId;
        const user=await User.findById(userId).populate("friends","userId username");

        if(!user){
            return res.status(404).json({message:"User not found"});
        }

        res.json(user.friends);
    }
    catch(err){
        res.status(500).json({message:"Server error"});
    }
}

module.exports={
    sendFriendRequest,
    getFriendRequests,
    acceptFriendRequest,
    rejectFriendRequest,
    getFriends
};