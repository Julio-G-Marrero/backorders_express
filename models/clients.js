const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
  nombre: {
    type:String,
    required: true
  },
  direccion: {
    type:String,
  },
  telefono: {
    type:String,
  },
  email: {
    type:String,
  },
})

module.exports = mongoose.model('client', clientSchema)