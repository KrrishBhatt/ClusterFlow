const Task  = require("../models/model.Task");
const Room  = require("../models/model.Room");
const Chunk = require("../models/model.Chunk");
const fs    = require("fs");
const csv   = require("csv-parser");
const { Parser } = require("json2csv");

function generateTaskId() {
  return "TASK-" + Math.floor(100000 + Math.random() * 900000);
}

// read ALL rows from a CSV file into memory
function readAllRows(filePath) {
  return new Promise((resolve, reject) => {
    const rows = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", row => rows.push(row))
      .on("end",  ()   => resolve(rows))
      .on("error", reject);
  });
}

// ── createTask ────────────────────────────────────────────────────────────────
async function createTask(req, res) {
  try {
    const { roomId, taskType } = req.body;
    const file = req.files?.[0];

    if (!file) return res.status(400).json({ message: "Dataset file required" });
    if (!roomId) return res.status(400).json({ message: "roomId missing" });

    const room = await Room.findOne({ roomId });
    if (!room) return res.status(404).json({ message: "Room not found" });

    if (room.host.toString() !== req.userId)
      return res.status(403).json({ message: "Only host can start task" });

    const filePath   = "uploads/" + file.filename;
    const allRows    = await readAllRows(filePath);
    const totalRows  = allRows.length;
    const totalChunks = room.members.length;

    if (totalChunks === 0)
      return res.status(400).json({ message: "No members in room" });

    const task = new Task({
      taskId:      generateTaskId(),
      roomId,
      creator:     req.userId,
      datasetName: file.filename,
      taskType:    taskType || "passthrough",
      totalChunks,
      totalRows,
      status:      "processing"
    });
    await task.save();

    // split rows into chunks and store them IN the chunk documents
    const chunkSize = Math.ceil(totalRows / totalChunks);
    const chunks    = [];
    for (let i = 0; i < totalChunks; i++) {
      const startRow = i * chunkSize;
      const endRow   = Math.min(startRow + chunkSize - 1, totalRows - 1);
      const rows     = allRows.slice(startRow, endRow + 1);
      chunks.push({
        taskId:     task.taskId,
        chunkIndex: i,
        startRow,
        endRow,
        rows        // store rows in DB — no file dependency for workers
      });
    }
    await Chunk.insertMany(chunks);

    // delete the uploaded file — rows are now in DB
    try { fs.unlinkSync(filePath); } catch {}

    room.task = task._id;
    await room.save();

    res.json({
      message:     "Task created and chunks generated",
      taskId:      task.taskId,
      totalRows,
      totalChunks,
      taskType:    task.taskType
    });
  } catch (err) {
    console.error("createTask error:", err);
    res.status(500).json({ message: err.message });
  }
}

// ── getChunk — assigns a chunk to a worker and returns its rows ───────────────
async function getChunk(req, res) {
  try {
    const { taskId } = req.query;
    if (!taskId) return res.status(400).json({ message: "taskId required" });

    const chunk = await Chunk.findOneAndUpdate(
      { taskId, status: "pending", assignedTo: null },
      { status: "processing", assignedTo: req.userId },
      { new: true }
    );

    if (!chunk) return res.status(404).json({ message: "No chunks available" });

    const task = await Task.findOne({ taskId });
    if (!task) return res.status(404).json({ message: "Task not found" });

    res.json({
      message:     "Chunk assigned",
      chunkIndex:  chunk.chunkIndex,
      startRow:    chunk.startRow,
      endRow:      chunk.endRow,
      datasetName: task.datasetName,
      taskId:      task.taskId,
      taskType:    task.taskType,
      rows:        chunk.rows    // rows are in DB — always available
    });
  } catch (err) {
    console.error("getChunk error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

// ── submitChunk ───────────────────────────────────────────────────────────────
async function submitChunk(req, res) {
  try {
    const { taskId, chunkIndex, processedData, status } = req.body;

    const chunk = await Chunk.findOne({ taskId, chunkIndex, assignedTo: req.userId });
    if (!chunk) return res.status(404).json({ message: "Chunk not found" });
    if (chunk.status === "completed")
      return res.status(400).json({ message: "Chunk already submitted" });

    if (status === "failed") {
      chunk.retryCount += 1;
      chunk.status     = chunk.retryCount >= chunk.maxRetries ? "failed" : "pending";
      if (chunk.status === "pending") chunk.assignedTo = null;
      await chunk.save();
      return res.json({ message: "Chunk marked for retry" });
    }

    chunk.processedData = processedData;
    chunk.status        = "completed";
    await chunk.save();

    const task = await Task.findOneAndUpdate(
      { taskId },
      { $inc: { processedChunks: 1 } },
      { new: true }
    );

    task.progress = Math.floor((task.processedChunks / task.totalChunks) * 100);
    if (task.processedChunks === task.totalChunks) task.status = "completed";
    await task.save();

    res.json({ message: "Chunk submitted", progress: task.progress });
  } catch (err) {
    console.error("submitChunk error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

// ── getTaskStatus ─────────────────────────────────────────────────────────────
async function geTaskStatus(req, res) {
  try {
    const { taskId } = req.params;
    const task   = await Task.findOne({ taskId });
    if (!task) return res.status(404).json({ message: "Task not found" });

    const chunks = await Chunk.find({ taskId }).select("-rows -processedData");

    res.json({
      taskId:          task.taskId,
      status:          task.status,
      taskType:        task.taskType,
      totalChunks:     task.totalChunks,
      processedChunks: task.processedChunks,
      progress:        task.progress,
      chunks
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
}

// ── getTaskByRoom ─────────────────────────────────────────────────────────────
async function getTaskByRoom(req, res) {
  try {
    const { roomId } = req.params;
    const task = await Task.findOne(
      { roomId, status: { $in: ["processing", "completed"] } }
    ).sort({ createdAt: -1 });

    if (!task) return res.status(404).json({ message: "No active task" });

    res.json({
      taskId:          task.taskId,
      status:          task.status,
      taskType:        task.taskType,
      progress:        task.progress,
      totalChunks:     task.totalChunks,
      processedChunks: task.processedChunks,
      totalRows:       task.totalRows
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
}

// ── getTaskResult ─────────────────────────────────────────────────────────────
async function getTaskResult(req, res) {
  try {
    const { taskId } = req.params;
    const task = await Task.findOne({ taskId });
    if (!task) return res.status(404).json({ message: "Task not found" });
    if (task.status !== "completed")
      return res.status(400).json({ message: "Task not completed yet" });

    const chunks    = await Chunk.find({ taskId }).sort({ chunkIndex: 1 });
    const finalData = chunks.flatMap(c => c.processedData || []);

    res.json({ message: "Final dataset ready", totalRows: finalData.length, data: finalData });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
}

// ── downloadTaskResult ────────────────────────────────────────────────────────
async function downloadTaskResult(req, res) {
  try {
    const { taskId } = req.params;
    const task = await Task.findOne({ taskId });
    if (!task) return res.status(404).json({ message: "Task not found" });
    if (task.status !== "completed")
      return res.status(400).json({ message: "Task not completed yet" });

    const chunks    = await Chunk.find({ taskId }).sort({ chunkIndex: 1 });
    const finalData = chunks.flatMap(c => c.processedData || []);

    if (finalData.length === 0)
      return res.status(400).json({ message: "No data to export" });

    const parser  = new Parser();
    const csvData = parser.parse(finalData);

    res.header("Content-Type", "text/csv");
    res.attachment(`result_${taskId}.csv`);
    return res.send(csvData);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
}

// ── reassignStaleChunks ───────────────────────────────────────────────────────
async function reassignStaleChunks(req, res) {
  try {
    const timeout     = 5 * 60 * 1000; // 5 minutes
    const now         = Date.now();
    const staleChunks = await Chunk.find({ status: "processing" });
    let   reassigned  = 0;

    for (const chunk of staleChunks) {
      if (now - new Date(chunk.updatedAt).getTime() > timeout) {
        chunk.status     = "pending";
        chunk.assignedTo = null;
        await chunk.save();
        reassigned++;
      }
    }
    res.json({ message: "Reassignment complete", reassigned });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
}

async function getAllTasks(req, res) {
  try {
    const tasks = await Task.find();
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
}

module.exports = {
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