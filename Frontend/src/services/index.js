import API from './api'
import { getToken } from '../utils/auth'

// ===== AUTH =====
export const authService = {
  register: (data) => API.post('/auth/register', data).then(r => r.data),
  login:    (data) => API.post('/auth/login',    data).then(r => r.data),
}

// ===== USERS =====
export const usersService = {
  findById: (userId) => API.get(`/users/${userId}`).then(r => r.data),
}

// ===== FRIENDS =====
export const friendsService = {
  getAll:      ()           => API.get('/friends/').then(r => r.data),
  getRequests: ()           => API.get('/friends/requests').then(r => r.data),
  sendRequest: (receiverId) => API.post('/friends/request', { receiverId }).then(r => r.data),
  accept:      (requestId)  => API.post('/friends/accept',  { requestId }).then(r => r.data),
  reject:      (requestId)  => API.post('/friends/reject',  { requestId }).then(r => r.data),
}

// ===== ROOMS =====
export const roomsService = {
  create:       ()                    => API.post('/rooms/create').then(r => r.data),
  join:         (roomId)              => API.post('/rooms/join',  { roomId }).then(r => r.data),
  leave:        (roomId)              => API.post('/rooms/leave', { roomId }).then(r => r.data),
  getInfo:      (roomId)              => API.get(`/rooms/info/${roomId}`).then(r => r.data),
  getMembers:   (roomId)              => API.get(`/rooms/members/${roomId}`).then(r => r.data),
  inviteFriend: (roomId, receiverId)  => API.post('/rooms/invite', { roomId, receiverId }).then(r => r.data),
  acceptInvite: (inviteId)            => API.post('/rooms/invite/accept', { inviteId }).then(r => r.data),
  rejectInvite: (inviteId)            => API.post('/rooms/invite/reject', { inviteId }).then(r => r.data),
}

// ===== TASKS =====
export const tasksService = {
  // taskType: "remove_nulls" | "remove_duplicates" | "normalize" | "passthrough"
  create: (roomId, file, taskType = 'passthrough') => {
    const fd = new FormData()
    fd.append('roomId', roomId)
    fd.append('file', file)
    fd.append('taskType', taskType)
    return API.post('/tasks/create', fd, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(r => r.data)
  },

  // taskId from req.query
  getChunk:    (taskId) => API.get('/tasks/get-chunk', { params: { taskId } }).then(r => r.data),
  submitChunk: (data)   => API.post('/tasks/submit-chunk', data).then(r => r.data),
  getStatus:   (taskId) => API.get(`/tasks/status/${taskId}`).then(r => r.data),
  getResult:   (taskId) => API.get(`/tasks/result/${taskId}`).then(r => r.data),
  reassign:    ()       => API.post('/tasks/reassign').then(r => r.data),

  // Workers auto-find the active taskId for their room
  getTaskByRoom: (roomId) => API.get(`/tasks/room/${roomId}`).then(r => r.data),

  downloadUrl: (taskId) =>
    `${API.defaults.baseURL}/tasks/result/download/${taskId}`,
}