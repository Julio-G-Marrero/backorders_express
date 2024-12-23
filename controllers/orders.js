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
            { user_id : user_id}
        ).sort({fecha_apertura : -1}).skip(startIndex).limit(limit)
        .then(orders => res.send({data: orders}))
        .catch((err) => console.log(err)
          // res.status(500).send({ message: err })
      );
    }
}

module.exports.getAllOrders = (req,res) => {
  Order.find({})
  .then(orders => res.send({data: orders}))
  .catch(() => res.status(500).send({ message: 'Error' }));
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
        .sort({fecha_apertura : -1}).limit(limit)
        .then(order => res.send({ data: order }))
        .catch((err) => res.status(500).send({ message: err }));
    }else if(departament == 2){
        Order.find(
            {
                $and: [ { id_estatus: statusid }, { $or: [ { user_id: { $regex :  user_id, $options: 'i' } }] } ]
            }
        )
        .limit(limit)
        .sort({fecha_apertura : -1}).skip(startIndex).limit(limit)
        .then(orders => res.send({data: orders}))
        .catch((err) => res.status(500).send({ message: err }));
    }

}

module.exports.getOrdersByValue = (req, res) => {
  const { id, value, departament } = req.query; // Asegúrate de recibir 'departament' en la consulta

  if (!departament) {
    return res.status(400).send({ message: "Se requiere el departamento" });
  }

  let query = {
    $or: [
      { cliente_nombre: { $regex: value, $options: "i" } },
      { cliente_email: { $regex: value, $options: "i" } },
      { cliente_ubicacion: { $regex: value, $options: "i" } },
    ],
  };

  // Ajusta la consulta según el departamento
  if (departament == 2) {
    if (!id) {
      return res.status(400).send({ message: "Se requiere el ID para el departamento 2" });
    }
    query["user_id"] = id; // Filtra las órdenes por el ID del usuario
  }

  // Realiza la consulta en la base de datos
  Order.find(query)
    .limit(7)
    .sort({ fecha_apertura: -1 })
    .then((order) => res.send({ data: order }))
    .catch((err) => res.status(500).send({ message: err }));
};


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


module.exports.getAuthorizedProducts =  async (req, res) => {
  try {
    // Consulta todos los documentos
    const ventas = await Order.find().select('productos_autorizados monto_autorizado cliente_nombre');

    // Extraer los productos autorizados de cada documento
    const productosAutorizados = ventas.map(venta => ({
      clienteNombre: venta.cliente_nombre,
      productos: venta.productos_autorizados,
      montoAutorizado: venta.monto_autorizado,
    }));

    // Opcional: Puedes sumar los montos autorizados si es necesario
    const totalMontoAutorizado = ventas.reduce((total, venta) => {
      return total + parseFloat(venta.monto_autorizado || 0);
    }, 0);
    // Responder con los productos autorizados y el monto total
    res.json({
      productosAutorizados,
      totalMontoAutorizado,
    });
  } catch (error) {
    console.error('Error al obtener los productos autorizados:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

module.exports.getDeniedProducts = async (req, res) => {
  try {
    // Consulta todos los documentos y selecciona solo los productos denegados
    const ventas = await Order.find().select('productos_denegados cliente_nombre');

    // Extraer los productos denegados de cada venta
    const productosDenegados = ventas.map(venta => ({
      clienteNombre: venta.cliente_nombre,
      productosDenegados: venta.productos_denegados,
    }));

    // Filtrar los productos denegados que existen
    const productosDenegadosFiltrados = productosDenegados.filter(venta => venta.productosDenegados.length > 0);

    // Responder con los productos denegados
    res.json({
      productosDenegados: productosDenegadosFiltrados,
    });
  } catch (error) {
    console.error('Error al obtener los productos denegados:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

module.exports.getAllProducts = async (req, res) => {
  try {
    // Realizamos la consulta para obtener todos los clientes con sus productos
    const clientes = await Order.find();

    // Estructuramos los datos para el reporte
    const reporte = clientes.map(cliente => {
      return {
        cliente_nombre: cliente.cliente_nombre,
        productos: cliente.productos.map(producto => ({
          descripcion: producto.descripcion,
          cantidad: producto.cantidad,
          precio: producto.precio,
          proveedor: producto.proveedor,
          familia: producto.familia,
          sub_familia: producto.sub_familia
        }))
      };
    });

    // Enviamos el reporte como respuesta
    res.json(reporte);

  } catch (err) {
    console.error("Error al generar el reporte: ", err);
    res.status(500).json({ message: 'Error del servidor' });
  }
};