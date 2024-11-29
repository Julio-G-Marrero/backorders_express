const routerProduct = require('express').Router();
const upload = multer({ dest: 'uploads/' });

const multer = require("multer");
const { getProducts,createProduct,getProductsByValues,importCsvProducto } = require('../controllers/products');

routerProduct.get('/',getProducts)
routerProduct.get('/search/:all',getProductsByValues)
routerProduct.post('/',createProduct)
routerProduct.post("/import", upload.single("csv"),importCsvProducto);

module.exports = routerProduct