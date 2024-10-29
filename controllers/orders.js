const Order = require('../models/orders')

module.exports.getOrders = (req,res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 7;
    const startIndex = (page - 1) * limit;
    const departament = req.query.departament
    let id = req.query.id
    var user_id = '' + id;
    if(departament == 1) {
        Order.find({}).sort({fecha_apertura : -1}).skip(startIndex).limit(limit)
        .then(orders => res.send({data: orders}))
        .catch(() => res.status(500).send({ message: 'Error' }));
    }else if(departament == 2){
        Order.find(
            { $or: [ { user_id: { $regex :  user_id, $options: 'i' } }] }
        ).sort({fecha_apertura : -1}).skip(startIndex).limit(limit)
        .then(orders => res.send({data: orders}))
        .catch((err) => res.status(500).send({ message: err }));
    }
}

module.exports.getOrdersIndexes = (req,res) => {
    Order.countDocuments({})
    .then(count => res.send(
        {
            totalOrders: count,
        })
    )
    .catch(() => res.status(500).send({ message: 'Error' }));
}

module.exports.getOrdersStats = (req,res) => {
    Order.find({})
    .then(orders => res.send({data: orders}))
    .catch(() => res.status(500).send({ message: 'Error' }));
}

module.exports.getOrdersByStatusId = (req,res) => {
    const {statusid} = req.query
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 7;
    const departament = req.query.departament
    const startIndex = (page - 1) * limit;
    let id = req.query.id
    var user_id = '' + id;
    if(departament == 1) {
        Order.find(
            { $or: [ { id_estatus: { $regex : statusid, $options: 'i' } }] }
        )
        .sort({fecha_apertura : -1}).limit(7)
        .then(order => res.send({ data: order }))
        .catch((err) => res.status(500).send({ message: err }));
    }else if(departament == 2){
        Order.find(
            { 
                $and: [ { id_estatus: statusid }, { $or: [ { user_id: { $regex :  user_id, $options: 'i' } }] } ] 
            } 
        )
        .limit(7)
        .sort({fecha_apertura : -1}).skip(startIndex).limit(7)
        .then(orders => res.send({data: orders}))
        .catch((err) => res.status(500).send({ message: err }));
    }

}

module.exports.getOrdersByValue = (req,res) => {
    let id = req.query.id
    var user_id = '' + id;
    const {value} = req.query
    Order.find(
        { 
            $and: [ { user_id: { $regex :  user_id, $options: 'i' } }, { 
                $or: [ { cliente_nombre: { $regex : value, $options: 'i' } }, { cliente_email: { $regex : value, $options: 'i' } },{ cliente_ubicacion: { $regex : value, $options: 'i' } }] 
            } ] 

        })
    .limit(7)
    .sort({fecha_apertura : -1})
    .then(order => res.send({ data: order }))
    .catch((err) => res.status(500).send({ message: err }));
}

module.exports.getOrdersByValueAndStatus = (req,res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 7;
    const startIndex = (page - 1) * limit;
    const departament = req.query.departament
    const value = req.query.value
    const status = req.query.status
    let id = req.query.id
    var user_id = '' + id;
    if(departament == 1) {
        Order.find({ $and: [ { id_estatus: status }, { $or: [ { cliente_nombre: { $regex : value, $options: 'i' } }, { cliente_email: { $regex : value, $options: 'i' } },{ cliente_ubicacion: { $regex : value, $options: 'i' } }]} ] } )
        .limit(7)
        .sort({fecha_apertura : -1})
        .then(order => res.send({ data: order }))
        .catch((err) => res.status(500).send({ message: err }));
    }else if(departament == 2){
        Order.find({
            $and: [ { id_estatus: status }, { user_id: { $regex :  user_id, $options: 'i' } }, { 
                $or: [ { cliente_nombre: { $regex : value, $options: 'i' } }, { cliente_email: { $regex : value, $options: 'i' } },{ cliente_ubicacion: { $regex : value, $options: 'i' } }] 
            } ] 
            } )
        .limit(7)
        .sort({fecha_apertura : -1})
        .then(order => res.send({ data: order }))
        .catch((err) => res.status(500).send({ message: err }));
    }
}

module.exports.createOrders = (req,res) => {
    const { email_vendedor,nombre_vendedor,productos,cliente_nombre,cliente_email,cliente_tel,cliente_ubicacion,cantidad_productos,id_estatus,fecha_promesa,precio_pactado,comentarios,user_id } = req.body;
    Order.create({email_vendedor,nombre_vendedor,productos,cliente_nombre,cliente_email,cliente_tel,cliente_ubicacion,cantidad_productos,id_estatus,fecha_promesa,precio_pactado,comentarios,user_id })
    .then(order => res.send({ data: order }))
    .catch((err) => res.status(500).send({ message: err }));
}

module.exports.changeStatusOrder = (req,res) => {
  const { id_estatus } = req.body;
  const {orderId} = req.params
  Order.findByIdAndUpdate(orderId,{id_estatus: id_estatus})
  .then(order => res.send({ message: "Exito" }))
  .catch(order => res.send({meessage:'Error'}))
}

module.exports.authorizeOrder = (req,res) => {
    const { productos_autorizados,productos_denegados,cantidad_productos_autorizados,monto_autorizado,fecha_promesa_autorizada,proovedor } = req.body;
    const {orderId} = req.params
    Order.findByIdAndUpdate(orderId,{ $set: {
        "id_estatus": "2",
        "productos_autorizados": productos_autorizados,
        "productos_denegados": productos_denegados,
        "cantidad_productos_autorizados": cantidad_productos_autorizados,
        "monto_autorizado": monto_autorizado,
        "fecha_promesa_autorizada": fecha_promesa_autorizada,
        "proovedor": proovedor,
    }})
    .then(order => res.send({ message: "Exito" }))
    .catch(order => res.send({meessage:'Error'}))
}

module.exports.deleteOrder = (req,res) => {
    const {orderId} = req.params
    Order.findByIdAndDelete(orderId)
    .then(order => res.send({ data: order }))
    .catch(err => res.status(500).send({ message: 'Error' }));
}
