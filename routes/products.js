const routerProduct = require('express').Router();
const multer = require("multer");
const upload = multer({ dest: "uploads/" }); // Configuración de Multer para subir archivos
const { getProducts,createProduct,getProductsByValues,importProductosFromCSV } = require('../controllers/products');

routerProduct.get('/',getProducts)
routerProduct.get('/search/:all',getProductsByValues)
routerProduct.post('/',createProduct)
routerProduct.post("/import", upload.single("csv"), importProductosFromCSV);

module.exports = routerProduct