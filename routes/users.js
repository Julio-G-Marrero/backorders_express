const routerUser = require('express').Router();
const { getUsers,getUserMe } = require('../controllers/users')
const auth = require('../middleware/auth');

routerUser.get('/',auth, getUsers)
routerUser.get('/me',auth, getUserMe)


module.exports = routerUser;
