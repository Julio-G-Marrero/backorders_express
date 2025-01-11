const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  codigoMat: { type: String, unique: true },
  descripcion: String,
  codigoBarras: String,
  precioVenta: Number,
  familia: String,
  subFamilia: String,
  updatedAt: { type: Date, default: Date.now },
});
module.exports = mongoose.model('Product', productSchema, 'products');
