const mongoose=require("mongoose");

const ChunkSchema=new mongoose.Schema({
    taskId:{
        type:String,
        required:true
    },
    chunkIndex:{
        type:Number,
        required:true
    },
    assignedTo:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        default:null
    },
    processedData:{
        type:Array,
        default:[]
    },
    status:{
        type:String,
        enum:["pending","processing","completed"],
        default:"pending"
    },
    retryCount:{
        type:Number,
        default:0
    },
    maxRetries:{
        type:Number,
        default:3
    }
},{
    timestamps:true
});

module.exports=mongoose.model("Chunk",ChunkSchema);