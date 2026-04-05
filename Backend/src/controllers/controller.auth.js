const User=require("../models/model.User");
const bcrypt=require("bcryptjs");
const jwt=require("jsonwebtoken")

function generateUserId(){
    return "CF-"+Math.floor(100000+Math.random()*900000);
}

async function register(req, res){
    try{
        const {username, email, password}=req.body;

        const emailExists=await User.findOne({email});
        if(emailExists){
            return res.status(400).json({message: "Email already registered"});
        }

        const usernameExists=await User.findOne({username});
        if(usernameExists){
            return res.status(400).json({message: "Username already taken"});
        }
        const hashedPassword=await bcrypt.hash(password, 10);

        const newUser=new User({
            userId:generateUserId(),
            username,
            email,
            password:hashedPassword
        });

        await newUser.save();

        res.status(201).json({message: "User registered",
            userId:newUser.userId
        });
    }catch(err){
        //if two or more users want same username at same time
        if(err.code===11000){
            return res.status(400).json({
                message: "Duplicate field value"
            });
        }
        res.status(500).json({message: "Server error"});
    }
};

async function login(req,res){
    try{
        const {email,password}=req.body;
        const user=await User.findOne({email});

        if(!user){
            return res.status(400).json({message:"Invalid email"});
        }

        const isMatch=await bcrypt.compare(password,user.password);

        if(!isMatch){
            return res.status(400).json({message:"Invalid password"});
        }

        const token=jwt.sign(
            {userId:user._id},
            process.env.JWT_SECRET,
            {expiresIn:"1d"}
        );

        res.json({message:"Login successful",token,userId:user.userId});
    }
    catch(err){
        res.status(500).json({message:"Server error"});
    }
}

module.exports = {register,login};