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

module.exports.updateDepartment = async (req, res) => {
  const { email } = req.body; // Obtener el email desde el cuerpo de la solicitud
  const { newDepartment } = req.body; // Obtener el nuevo departamento desde el cuerpo de la solicitud

  try {
    // Verificar si el usuario existe y actualizar el campo `departament`
    const updatedUser = await User.findOneAndUpdate(
      { email: email }, // Buscar por email
      { departament: newDepartment }, // Actualizar el campo departament
      { new: true } // Para devolver el documento actualizado
    );

    if (!updatedUser) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    res.status(200).json({
      message: 'Departamento actualizado con éxito',
      user: updatedUser,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al actualizar el departamento' });
  }
};