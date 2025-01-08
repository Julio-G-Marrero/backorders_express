const routerShopify = require('express').Router();
const {fetchAllFirebirdData} = require('../controllers/storesShopify')

routerShopify.get('/updateInventary', fetchAllFirebirdData)

module.exports = routerShopify;
