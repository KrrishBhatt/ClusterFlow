const Task=require("../models/model.Task");
const Room=require("../models/model.Room");
const Chunk=require("../models/model.Chunk");

const fs=require("fs");
const csv=require("csv-parser");
const {Parser}=require("json2csv");

function generateTaskId(){
    return "TASK-"+Math.floor(100000+Math.random()*900000);
}

function countRows(filePath){
    return new Promise((resolve,reject)=>{
        let count=0;
        fs.createReadStream(filePath)
            .pipe(csv())
            .on("data",()=>count++)
            .on("end",()=>resolve(count))
            .on("error",reject);
    });
}

// Read specific rows from CSV (0-indexed, inclusive)
function readRows(filePath,startRow,endRow){
    return new Promise((resolve,reject)=>{
        const rows=[];
        let index=0;
        fs.createReadStream(filePath)
            .pipe(csv())
            .on("data",(row)=>{
                if(index>=startRow && index<=endRow) rows.push(row);
                index++;
            })
            .on("end",()=>resolve(rows))
            .on("error",reject);
    });
}

async function createTask(req,res){
    try{
        const {roomId, taskType}=req.body;
        const file=req.files[0];

        if(!file){
            return res.status(400).json({message:"Dataset file required"});
        }
        if(!roomId){
            return res.status(400).json({message:"roomId missing"});
        }

        const datasetName=file.filename;
        const filePath="uploads/"+datasetName;

        const room=await Room.findOne({roomId});
        if(!room){
            return res.status(404).json({message:"Room not found"});
        }

        if(room.host.toString()!==req.userId){
            return res.status(403).json({message:"Only host can start task"});
        }

        const totalRows=await countRows(filePath);
        const totalChunks=room.members.length;

        const task=new Task({
            taskId:generateTaskId(),
            roomId,
            creator:req.userId,
            datasetName,
            taskType:taskType||"passthrough",
            totalChunks,
            totalRows,
            status:"processing"
        });

        await task.save();

        const chunks=[];
        for(let i=0;i<totalChunks;i++){
            chunks.push({taskId:task.taskId,chunkIndex:i});
        }
        await Chunk.insertMany(chunks);

        // Store task reference on room
        room.task=task._id;
        await room.save();

        res.json({
            message:"Task created and chunks generated",
            taskId:task.taskId,
            totalRows,
            totalChunks,
            taskType:task.taskType
        });
    }
    catch(err){
        console.log(err);
        res.status(500).json({message:err.message});
    }
}

async function getChunk(req,res){
    try{
        // Route is GET /get-chunk?taskId=xxx — use req.query not req.params
        const {taskId}=req.query;

        if(!taskId){
            return res.status(400).json({message:"taskId query param required"});
        }

        const chunk=await Chunk.findOneAndUpdate(
            {taskId,status:"pending",assignedTo:null},
            {status:"processing",assignedTo:req.userId},
            {new:true}
        );

        if(!chunk){
            return res.status(404).json({message:"No chunks available"});
        }

        const task=await Task.findOne({taskId});
        if(!task){
            return res.status(404).json({message:"Task not found"});
        }

        const chunkSize=Math.ceil(task.totalRows/task.totalChunks);
        const startRow=chunk.chunkIndex*chunkSize;
        const endRow=Math.min(startRow+chunkSize-1,task.totalRows-1);

        // Read actual CSV rows for this chunk
        const filePath="uploads/"+task.datasetName;
        let rows=[];
        try{
            rows=await readRows(filePath,startRow,endRow);
        }catch(e){
            rows=[];
        }

        res.json({
            message:"Chunk assigned",
            chunkIndex:chunk.chunkIndex,
            startRow,
            endRow,
            datasetName:task.datasetName,
            taskId:task.taskId,
            taskType:task.taskType,   // send taskType so worker knows what to do
            rows                      // actual CSV rows
        });
    }
    catch(err){
        console.log("Error in getChunk:",err);
        res.status(500).json({message:"Server error"});
    }
}

async function submitChunk(req,res){
    try{
        const {taskId,chunkIndex,processedData,status}=req.body;

        const chunk=await Chunk.findOne({taskId,chunkIndex,assignedTo:req.userId});
        if(!chunk){
            return res.status(404).json({message:"Chunk not found"});
        }
        if(chunk.status==="completed"){
            return res.status(400).json({message:"Chunk already submitted"});
        }

        if(status==="failed"){
            chunk.retryCount+=1;
            if(chunk.retryCount>=chunk.maxRetries){
                chunk.status="failed";
            }else{
                chunk.status="pending";
                chunk.assignedTo=null;
            }
            await chunk.save();
            return res.json({message:"Chunk marked for retry"});
        }

        chunk.processedData=processedData;
        chunk.status="completed";
        await chunk.save();

        const task=await Task.findOneAndUpdate(
            {taskId},
            {$inc:{processedChunks:1}},
            {new:true}
        );

        task.progress=Math.floor((task.processedChunks/task.totalChunks)*100);

        if(task.processedChunks===task.totalChunks){
            task.status="completed";
        }

        await task.save();

        res.json({
            message:"Chunk submitted successfully",
            progress:task.progress
        });
    }
    catch(err){
        res.status(500).json({message:"Server error"});
    }
}

async function geTaskStatus(req,res){
    try{
        const {taskId}=req.params;
        const task=await Task.findOne({taskId});

        if(!task){
            return res.status(404).json({message:"Task not found"});
        }

        const chunks=await Chunk.find({taskId});

        res.json({
            taskId:task.taskId,
            status:task.status,
            taskType:task.taskType,
            totalChunks:task.totalChunks,
            processedChunks:task.processedChunks,
            progress:task.progress,
            chunks
        });
    }
    catch(err){
        res.status(500).json({message:"Server error"});
    }
}

async function reassignStaleChunks(req,res){
    try{
        const timeout=60*1000;
        const now=Date.now();
        const staleChunks=await Chunk.find({status:"processing"});
        let reassigned=0;

        for(let chunk of staleChunks){
            const lastUpdate=new Date(chunk.updatedAt).getTime();
            if(now-lastUpdate>timeout){
                chunk.status="pending";
                chunk.assignedTo=null;
                await chunk.save();
                reassigned++;
            }
        }

        res.json({message:"Reassignment complete",reassigned});
    }
    catch(err){
        res.status(500).json({message:"Server error"});
    }
}

async function getTaskResult(req,res){
    try{
        const {taskId}=req.params;
        const task=await Task.findOne({taskId});

        if(!task){
            return res.status(404).json({message:"Task not found"});
        }
        if(task.status!=="completed"){
            return res.status(400).json({message:"Task not completed yet"});
        }

        const chunks=await Chunk.find({taskId}).sort({chunkIndex:1});
        let finalData=[];
        for(let chunk of chunks){
            finalData=[...finalData,...chunk.processedData];
        }

        res.json({
            message:"Final dataset ready",
            totalRows:finalData.length,
            taskType:task.taskType,
            data:finalData
        });
    }
    catch(err){
        res.status(500).json({message:"Server error"});
    }
}

async function downloadTaskResult(req,res){
    try{
        const {taskId}=req.params;
        const task=await Task.findOne({taskId});

        if(!task){
            return res.status(404).json({message:"Task not found"});
        }
        if(task.status!=="completed"){
            return res.status(400).json({message:"Task not completed yet"});
        }

        const chunks=await Chunk.find({taskId}).sort({chunkIndex:1});
        let finalData=[];
        for(let chunk of chunks){
            finalData=[...finalData,...chunk.processedData];
        }

        if(finalData.length===0){
            return res.status(400).json({message:"No data to export"});
        }

        const parser=new Parser();
        const csvData=parser.parse(finalData);

        res.header("Content-Type","text/csv");
        res.attachment(`result_${taskId}.csv`);
        return res.send(csvData);
    }
    catch(err){
        res.status(500).json({message:"Server error"});
    }
}

// Get active task for a room — workers call this to find their taskId
async function getTaskByRoom(req,res){
    try{
        const {roomId}=req.params;
        const task=await Task.findOne(
            {roomId,status:{$in:["processing","completed"]}}
        ).sort({createdAt:-1});

        if(!task){
            return res.status(404).json({message:"No active task for this room"});
        }

        res.json({
            taskId:task.taskId,
            status:task.status,
            taskType:task.taskType,
            progress:task.progress,
            totalChunks:task.totalChunks,
            processedChunks:task.processedChunks
        });
    }
    catch(err){
        res.status(500).json({message:"Server error"});
    }
}

async function getAllTasks(req,res){
    try{
        const tasks=await Task.find();
        res.json(tasks);
    }
    catch(err){
        res.status(500).json({message:"Server error"});
    }
}

module.exports={
    createTask,
    getChunk,
    submitChunk,
    geTaskStatus,
    reassignStaleChunks,
    getTaskResult,
    downloadTaskResult,
    getTaskByRoom,
    getAllTasks
};