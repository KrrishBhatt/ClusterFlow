const express=require("express");
const router=express.Router();

const friendsController=require("../controllers/controller.friends");
const authMiddleware=require("../middleware/middleware.auth");

router.post("/request",authMiddleware,friendsController.sendFriendRequest);
router.get("/requests",authMiddleware,friendsController.getFriendRequests);
router.post("/accept",authMiddleware,friendsController.acceptFriendRequest);
router.post("/reject",authMiddleware,friendsController.rejectFriendRequest);
router.get("/",authMiddleware,friendsController.getFriends);

module.exports=router;