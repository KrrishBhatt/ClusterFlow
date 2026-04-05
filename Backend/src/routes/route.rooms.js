const express=require("express");
const router=express.Router();

const roomsController=require("../controllers/controller.room");
const authMiddleware=require("../middleware/middleware.auth");

router.post("/create",authMiddleware,roomsController.createRoom);
router.post("/join",authMiddleware,roomsController.joinRoom);
router.get("/members/:roomId",authMiddleware,roomsController.getRoomMembers);
router.post("/leave",authMiddleware,roomsController.leaveRoom);
router.get("/info/:roomId",authMiddleware,roomsController.getRoomInfo);
router.post("/invite",authMiddleware,roomsController.inviteFriend);
router.post("/invite/reject",authMiddleware,roomsController.rejectInvite);
router.post("/invite/accept",authMiddleware,roomsController.acceptInvite);

// BUG FIX: getInvites was defined in controller but never registered as a route
router.get("/invites",authMiddleware,roomsController.getInvites);

module.exports=router;