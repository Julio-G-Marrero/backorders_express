const Client = require('../models/clients')
const fs = require("fs"); // Asegúrate de que esta línea esté presente
const csv = require("csv-parser");

const Firebird = require('node-firebird');
const options = {
  host: 'almacennorte.ddns.net',  // Dirección IP o hostname de Firebird
  port: 3050,                 // Puerto de Firebird
  database: 'C:\\FSPCorona_NEW\\SISTCRASH.GDB',  // Ruta de la base de datos
  user: 'SYSDBA',              // Usuario de Firebird
  password: 'masterkey',
  WireCrypt: true,
  connectTimeout: 30000
};


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

module.exports.getClientsByValuesBDNiux = (req, res) => {
  const { search } = req.query;

  if (!search) {
    return res.status(400).json({ error: 'Por favor proporciona un valor para buscar.' });
  }

  Firebird.attach(options, function(err, db) {
    if (err) {
      console.error('Error al conectar con la base de datos:', err);
      return res.status(500).json({ error: 'Error de conexión a la base de datos' });
    }

    // Consulta para obtener las tablas, limitando a 10 resultados
    const query = `
      SELECT
        NO_CLIENTE,
        NOMBRE,
        DIRECCION,
        TELEFONO,
        E_MAIL
      FROM CLIENTES
      WHERE
        UPPER(NOMBRE) LIKE '%' || UPPER(?) || '%'
        OR UPPER(E_MAIL) LIKE '%' || UPPER(?) || '%'
        OR UPPER(DIRECCION) LIKE '%' || UPPER(?) || '%'
      ROWS 10
    `;

    db.query(query, [search, search, search], function(err, result) {
      if (err) {
        console.error('Error al ejecutar la consulta:', err);
        db.detach();
        return res.status(500).json({ error: 'Error al ejecutar la consulta' });
      }

      // Devuelve el resultado de la consulta
      res.json({ clientes: result });

      // Cierra la conexión
      db.detach();
    });
  });
};
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
