const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
  nombre: String,
  direccion: String,
  telefono: String,
  email: String,
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('client', clientSchema)