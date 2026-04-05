const mongoose=require("mongoose");

const TaskSchema=new mongoose.Schema({
    taskId:{
        type:String,
        unique:true
    },
    roomId:{
        type:String,
        required:true
    },
    creator:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User"
    },
    datasetName:{
        type:String
    },
    taskType:{
        type:String,
        enum:["remove_nulls","remove_duplicates","normalize","passthrough"],
        default:"passthrough"
    },
    totalChunks:{
        type:Number
    },
    totalRows:{
        type:Number,
        default:0
    },
    processedChunks:{
        type:Number,
        default:0
    },
    status:{
        type:String,
        enum:["pending","processing","completed","failed"],
        default:"pending"
    },
    progress:{
        type:Number,
        default:0
    }
},{
    timestamps:true
});

module.exports=mongoose.model("Task",TaskSchema);