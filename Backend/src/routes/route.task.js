const express=require("express");
const router=express.Router();

const taskController=require("../controllers/controller.task");
const authMiddleware=require("../middleware/middleware.auth");
const upload=require("../middleware/middleware.upload");

// authMiddleware added so req.userId is available in createTask
router.post("/create",authMiddleware,upload.any(),taskController.createTask);

router.post("/submit-chunk",authMiddleware,taskController.submitChunk);

// taskId comes from req.query (GET /get-chunk?taskId=TASK-xxx)
router.get("/get-chunk",authMiddleware,taskController.getChunk);

router.get("/status/:taskId",authMiddleware,taskController.geTaskStatus);
router.post("/reassign",authMiddleware,taskController.reassignStaleChunks);
router.get("/result/:taskId",authMiddleware,taskController.getTaskResult);
router.get("/result/download/:taskId",authMiddleware,taskController.downloadTaskResult);

// Workers call this to auto-find the active taskId for their room
router.get("/room/:roomId",authMiddleware,taskController.getTaskByRoom);

router.get("/getAllTasks",authMiddleware,taskController.getAllTasks);

module.exports=router;