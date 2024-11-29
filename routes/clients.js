const routerClient = require('express').Router();
const multer = require("multer");
const upload = multer({ dest: "uploads/" }); // Configuración de Multer para subir archivos
const { getClients, createClients, getClientsByValues,importClientsFromCSV } = require('../controllers/clients')
const auth = require('../middleware/auth');

routerClient.get('/', getClients)
routerClient.post('/', createClients)
routerClient.get('/search/:all',getClientsByValues)
routerClient.post("/import", upload.single("csv"), importClientsFromCSV);

module.exports = routerClient;
