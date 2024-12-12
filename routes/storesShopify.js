const routerShopify = require('express').Router();
const {updateIngcoInv} = require('../controllers/storesShopify')

routerShopify.get('/ingco-inventario', updateIngcoInv)

module.exports = routerShopify;
