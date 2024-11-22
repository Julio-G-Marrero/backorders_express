const { compareSync } = require('bcrypt');
const User = require('../models/users')
const bcrypt = require('bcryptjs');

module.exports.getUsers = (req,res) => {
    User.find({})
    .then(users => res.send({ data: users }))
    .catch(() => res.status(500).send({ message: 'Error' }));
}

exports.createUser = (req, res) => {
    bcrypt.hash(req.body.password, 10)
      .then(hash => User.create({
        nombre: req.body.nombre,
        email: req.body.email,
        password: hash,
      }))
      .then((user) => res.send(user))
      .catch((err) => res.status(500).send({message: err}));
};

const jwt = require('jsonwebtoken');
exports.login = (req, res) => {
    const { email, password } = req.body;
    User.findOne({ email })
    .then((user) => {
      if (!user) {
        return res.send({ error: "Email o contraseña incorrecta" });
      }
      return bcrypt.compare(password, user.password)
        .then((matched) => {
          if (!matched) {
            return res.send({ error: "Email o contraseña incorrecta" });
          }
          return user;
        }).then((user) => {
            // estamos creando un token
            const token = jwt.sign({ _id: user._id }, 'some-secret-key',
              {   expiresIn: '1d' });
            // devolvemos el token
            res.send({ token, user });
          })
          .catch((err) => {
            res
              .status(401)
          });
    });
};


module.exports.getUserMe = (req,res) => {
    const {email} = req.body
    User.find({email : email})
    .then(user => res.send({ data: user }))
    .catch(() => res.status(500).send({ message: 'Error' }));
}