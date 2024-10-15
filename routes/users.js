const routerUser = require('express').Router();
const { getUsers,createUser,login,getUserMe } = require('../controllers/users')
const auth = require('../middleware/auth');

routerUser.get('/',auth, getUsers)
routerUser.get('/me',auth, getUserMe)
routerUser.post('/register',createUser)
routerUser.post('/login',login)

module.exports = routerUser;
