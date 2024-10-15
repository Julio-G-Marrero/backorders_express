const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  nombre: {
    type:String,
    required: true,
    minlength: 2,
    maxlength: 30,
  },
  email: {
    type:String,
    required: true,
    unique: true
  },
  password: {
    type:String,
    required: true,
  },
  departament: {
    type:String,
    default: "2"
  },
  acces: {
    type:Boolean,
    default:false
  }
})

module.exports = mongoose.model('user', userSchema);
