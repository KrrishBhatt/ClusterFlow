export const getToken    = () => localStorage.getItem('cf_token')
export const getUserId   = () => localStorage.getItem('cf_userId')
export const getUsername = () => localStorage.getItem('cf_username')
export const getMongoId  = () => localStorage.getItem('cf_mongoId')

export function setAuth(token, userId, mongoId, username) {
  localStorage.setItem('cf_token',    token)
  localStorage.setItem('cf_userId',   userId)
  if (mongoId)   localStorage.setItem('cf_mongoId',  mongoId)
  if (username)  localStorage.setItem('cf_username', username)
}

export function clearAuth() {
  ['cf_token','cf_userId','cf_mongoId','cf_username'].forEach(k => localStorage.removeItem(k))
}

export const isLoggedIn = () => !!getToken()