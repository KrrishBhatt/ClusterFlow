const User=require("../models/model.User");

async function findUserById(req,res){
    try{
        const {userId}=req.params;

        const user=await User.findOne({userId});

        if(!user){
            return res.status(404).json({message:"User not found"});
        }

        res.json({
            userId:userId,
            username:user.username
        });
    }
    catch(err){
        res.status(500).json({message:"Server error"});
    }
}

module.exports={findUserById};