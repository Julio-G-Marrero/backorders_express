// Ruta y controlador en Express para manejar la importación de productos
const express = require('express');
const multer = require('multer');

const routerProduct = express.Router();
const upload = multer({ dest: 'uploads/' });

const { getProducts, createProduct, getProductsByValues, importCsvProducto } = require('../controllers/products');

routerProduct.get('/', getProducts);
routerProduct.get('/search/:all', getProductsByValues);
routerProduct.post('/', createProduct);
routerProduct.post('/import', upload.single('file'), importCsvProducto);
