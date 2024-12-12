const routerShopify = require('express').Router();
const {updateInvIngcoGlobal} = require('../controllers/storesShopify')

routerShopify.get('/updateInventary', updateInvIngcoGlobal)

module.exports = routerShopify;
