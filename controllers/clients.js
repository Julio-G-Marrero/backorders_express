const Client = require('../models/clients')

module.exports.getClients = (req,res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 13;
  const startIndex = (page - 1) * limit;
  Client.find({}).skip(startIndex).limit(limit)
  .then(clients => res.send({data: clients}))
  .catch((message) => res.status(500).send({message: message}))
}

module.exports.createClients = (req,res) => {
  Client.create({
    nombre:req.body.nombre,
    direccion:req.body.direccion,
    telefono:req.body.telefono,
    email:req.body.email,
  })
  .then((client) => res.send(client))
  .catch((err) => res.status(500).send({message: err}));
}

module.exports.getClientsByValues = (req,res) => {
  const {value} = req.query
  const limit = parseInt(req.query.limit) || 13;
  Client.find(
      {
        $or: [
          { nombre: { $regex : value, $options: 'i' } },
          { direccion: { $regex : value, $options: 'i' } },
          { telefono: { $regex : value, $options: 'i' } },
          { email: { $regex : value, $options: 'i' } },
        ]
      })
  .limit(limit)
  .then(clients => res.send({ clients }))
  .catch((err) => res.status(500).send({ message: err }));
}