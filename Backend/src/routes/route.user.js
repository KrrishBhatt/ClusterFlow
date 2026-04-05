const express=require("express");
const router=express.Router();

const usersController=require("../controllers/controller.users");

router.get("/:userId",usersController.findUserById);

module.exports=router;