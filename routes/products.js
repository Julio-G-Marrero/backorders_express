const multer = require('multer');
const routerProduct = require('express').Router();
const upload = multer({ dest: 'uploads/' });

// Importar los métodos del controlador
const { getProducts, createProduct, getProductsByValues, importCsvProducto,getProductsByValuesBDNliux } = require('../controllers/products');

// Definir las rutas
routerProduct.get('/', getProducts);
routerProduct.get('/search/all', getProductsByValues);
routerProduct.post('/', createProduct);
routerProduct.post('/import', upload.single('file'), importCsvProducto);
routerProduct.get('/busqueda', getProductsByValuesBDNliux);

module.exports = routerProduct;

