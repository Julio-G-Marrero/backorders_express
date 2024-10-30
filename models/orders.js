const mongoose = require('mongoose');
var validateEmail = function(email) {
  var re = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
  return re.test(email)
};
const orderSchema = new mongoose.Schema({
    email_vendedor: {
        type:String,
        required: true,
        validate: [validateEmail, 'Direccion de correo Invalida'],
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Direccion de correo Invalida']
    },
    nombre_vendedor: {
        type:String,
        required: true,
    },
    productos: {
        type: Array,
        default: [],
        required: true
    },
    cliente_nombre: {
        type:String,
        required: true,
    },
    cliente_email: {
        type:String,
        required: true,
    },
    cliente_tel: {
        type:String,
        required: true,
    },
    cliente_ubicacion: {
        type:String,
        required: true,
    },
    cantidad_productos: {
        type:String,
        required: true,
    },
    id_estatus: {
        type:String,
        required: true,
    },
    fecha_promesa: {
        type: Date,
    },
    precio_pactado: {
        type:String,
        required: true,
    },
    productos_autorizados: {
        type: Array,
        default: [],
    },
    productos_denegados: {
        type: Array,
        default: [],
    },
    cantidad_productos_autorizados: {
        type:String,
        default: 0
    },
    monto_autorizado: {
        type:String,
        default: 0
    },
    fecha_promesa_autorizada: {
        type: Date,
        default: null
    },
    comentarios: {
        type:String,
        default: "Sin comentarios"
    },
    user_id: {
      type:String,
      required: true,
    },
    fecha_apertura: {
        type: Date,
        default: Date.now,
    },
})

  module.exports = mongoose.model('order', orderSchema);
