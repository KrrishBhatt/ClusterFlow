const jwt=require("jsonwebtoken");

function authMiddleware(req,res,next){
    try{
        const authHeader=req.headers.authorization;

        if(!authHeader){
            return res.status(401).json({message:"No token provided"});
        }

        const token=authHeader.split(" ")[1];

        if(!token){
            return res.status(401).json({message:"Invalid token"});
        }

        const decoded=jwt.verify(token,process.env.JWT_SECRET);

        req.userId=decoded.userId;

        next();
    }
    catch(err){
        return res.status(401).json({message:"Unauthorized"});
    }
}

module.exports=authMiddleware;