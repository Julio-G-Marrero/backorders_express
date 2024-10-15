const routerOrders = require('express').Router();
const { getOrders, createOrders,changeStatusOrder,deleteOrder, authorizeOrder,getOrdersIndexes,getOrdersByStatusId,getOrdersByValue,getOrdersStats,getOrdersByValueAndStatus } = require('../controllers/orders')

routerOrders.get('/',getOrders)
routerOrders.get('/search-status-value',getOrdersByValueAndStatus)
routerOrders.get('/search/:all',getOrdersByValue)
routerOrders.get('/stats',getOrdersStats)
routerOrders.get('/indexs',getOrdersIndexes)
routerOrders.get('/idstatus',getOrdersByStatusId)
routerOrders.post('/',createOrders)
routerOrders.patch('/:orderId/estatus',changeStatusOrder)
routerOrders.patch('/:orderId/authorize',authorizeOrder)
routerOrders.delete('/:orderId/delete',deleteOrder)

module.exports = routerOrders;
