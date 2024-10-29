const routerOrders = require('express').Router();
const { getOrders, createOrders,changeStatusOrder,deleteOrder, authorizeOrder,getOrdersIndexes,getOrdersByStatusId,getOrdersByValue,getOrdersStats,getOrdersByValueAndStatus } = require('../controllers/orders')
const { celebrate, Joi } = require('celebrate');

routerOrders.get('/',getOrders)
routerOrders.get('/search-status-value',getOrdersByValueAndStatus)
routerOrders.get('/search/:all',getOrdersByValue)
routerOrders.get('/stats',getOrdersStats)
routerOrders.get('/indexs',getOrdersIndexes)
routerOrders.get('/idstatus',getOrdersByStatusId)

routerOrders.post('/', celebrate({
  body: Joi.object().keys({
    title: Joi.string().required().min(2).max(30),
    text: Joi.string().required().min(2),
  }),
}), createOrders);
// routerOrders.post('/',createOrders)
routerOrders.patch('/:orderId/estatus',changeStatusOrder)
routerOrders.patch('/:orderId/authorize',authorizeOrder)

routerOrders.delete('/:orderId/delete', celebrate({
    // validar parámetros
  params: Joi.object().keys({
    orderId: Joi.string().alphanum().length(24),
  }),
}), deleteOrder);

// routerOrders.delete('/:orderId/delete',deleteOrder)

module.exports = routerOrders;
