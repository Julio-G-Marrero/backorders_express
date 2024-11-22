const routerClient = require('express').Router();
const { getClients, createClients, getClientsByValues } = require('../controllers/clients')
const auth = require('../middleware/auth');

routerClient.get('/', getClients)
routerClient.post('/', createClients)
routerClient.get('/search/:all',getClientsByValues)

module.exports = routerClient;
