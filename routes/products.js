const express = require('express');
const multer = require('multer');
const routerProduct = express.Router();
const upload = multer({ dest: 'uploads/' });

// Importar los métodos del controlador
const { getProducts, createProduct, getProductsByValues, importCsvProducto } = require('../controllers/products');

// Definir las rutas
routerProduct.get('/', getProducts);
routerProduct.get('/search/:all', getProductsByValues);
routerProduct.post('/', createProduct);
routerProduct.post('/import', upload.single('file'), importCsvProducto);
module.exports = routerProduct;