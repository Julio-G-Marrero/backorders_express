const Client = require('../models/clients')
const fs = require("fs"); // Asegúrate de que esta línea esté presente
const csv = require("csv-parser");

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

module.exports.importClientsFromCSV = async (req, res) => {
  if (!req.file) {
    return res.status(400).send("No se ha subido ningún archivo.");
  }

  const filePath = req.file.path;
  const clientsArray = [];

  try {
    // Leer y procesar el archivo CSV
    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (row) => {
        clientsArray.push({
          nombre: row.nombre,
          direccion: row.direccion,
          telefono: row.telefono,
          email: row.email,
        });
      })
      .on("end", async () => {
        try {
          // Filtrar duplicados y usar `upsert` para evitar registros duplicados
          const bulkOperations = clientsArray.map((client) => ({
            updateOne: {
              filter: { email: client.email }, // Verificar duplicados por email
              update: { $set: client },
              upsert: true, // Crear si no existe
            },
          }));

          const result = await Client.bulkWrite(bulkOperations);
          const importedCount = result.upsertedCount;

          res.status(200).json({
            message: "Importación completada correctamente",
            importedCount,
          });
        } catch (error) {
          console.error("Error al importar datos:", error);
          res.status(500).send("Error al importar clientes.");
        } finally {
          fs.unlinkSync(filePath); // Eliminar el archivo temporal
        }
      });
  } catch (error) {
    console.error("Error al procesar el archivo CSV:", error);
    res.status(500).send("Error al procesar el archivo CSV.");
  }
};
