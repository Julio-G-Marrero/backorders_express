const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  codigo_barras: {
    type: String,
    required: true,
  },
  codigo_interno: {
    type: String,
    required: true,
  },
  descripcion: {
    type: String,
    required: true,
  },
  precio: {
    type: String,
    required: true,
  },
  familia: {
    type: String,
    default: "Diversa",
  },
  sub_familia: {
    type: String,
    default: "Diversa",
  },
  provedor: {
    type: String,
    default: "Diverso",
  },
});

module.exports = mongoose.model('Product', productSchema, 'products');
