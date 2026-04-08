const mongoose = require("mongoose");

const ChunkSchema = new mongoose.Schema({
  taskId:        { type: String, required: true },
  chunkIndex:    { type: Number, required: true },
  startRow:      { type: Number, default: 0 },
  endRow:        { type: Number, default: 0 },
  assignedTo:    { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  rows:          { type: Array, default: [] },        // raw rows stored at creation
  processedData: { type: Array, default: [] },        // cleaned rows submitted by worker
  status:        { type: String, enum: ["pending","processing","completed","failed"], default: "pending" },
  retryCount:    { type: Number, default: 0 },
  maxRetries:    { type: Number, default: 3 }
}, { timestamps: true });

module.exports = mongoose.model("Chunk", ChunkSchema);