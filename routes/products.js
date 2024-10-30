const routerProduct = require('express').Router();
const { getProducts,createProduct,getProductsByValues } = require('../controllers/products');

routerProduct.get('/',getProducts)
routerProduct.get('/search/:all',getProductsByValues)
routerProduct.post('/',createProduct)


module.exports = routerProduct