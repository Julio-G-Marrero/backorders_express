const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  codigo_barras: {
    type:String,
    required: true
  },
  codigo_interno: {
    type:String,
    required: true
  },
  descripcion: {
    type:String,
    required: true
  },
  precio: {
    type:Number,
    required: true
  },
  familia: {
    type:String,
    required: true
  },
  sub_familia: {
    type:String,
    required: true
  }
})

module.exports = mongoose.model('product', productSchema)