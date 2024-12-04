const routerClient = require('express').Router();
const multer = require("multer");
const upload = multer({ dest: "uploads/" });
const { getClients, createClients, getClientsByValues,importClientsFromCSV,getClientsByValuesBDNiux } = require('../controllers/clients')

routerClient.get('/', getClients)
routerClient.post('/', createClients)
routerClient.get('/search/:all',getClientsByValues)
routerClient.post("/import", upload.single("csv"), importClientsFromCSV);
routerClient.get("/busqueda", getClientsByValuesBDNiux);

module.exports = routerClient;
