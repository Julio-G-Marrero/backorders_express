const mongoose = require('mongoose');
var validateEmail = function(email) {
  var re = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
  return re.test(email)
};
const userSchema = new mongoose.Schema({
  googleId: {
    type: String, unique: true, sparse: true
  },
  nombre: {
    type:String,
    minlength: 2,
    maxlength: 30,
  },
  email: {
    type:String,
    required: true,
    unique: true,
    lowercase: true,
    validate: [validateEmail, 'Direccion de correo Invalida'],
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Direccion de correo Invalida']
  },
  password: {
    type:String,
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
