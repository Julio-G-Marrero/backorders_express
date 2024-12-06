const Client = require('../models/clients')
const fs = require("fs"); // Asegúrate de que esta línea esté presente
const csv = require("csv-parser");
const genericPool = require('generic-pool');

const factory = {
  create: function () {
    return new Promise((resolve, reject) => {
      Firebird.attach(options, (err, db) => {
        if (err) return reject(err);
        resolve(db);
      });
    });
  },
  destroy: function (db) {
    return new Promise((resolve) => {
      db.detach();
      resolve();
    });
  }
};

const pool = genericPool.createPool(factory, { max: 10, min: 2 });


const Firebird = require('node-firebird');
const options = {
  host: 'almacennorte.ddns.net',  // Dirección IP o hostname de Firebird
  port: 3050,                 // Puerto de Firebird
  database: 'C:\\FSPCorona_NEW\\SISTCRASH.GDB',  // Ruta de la base de datos
  user: 'SYSDBA',              // Usuario de Firebird
  password: 'masterkey',
  WireCrypt: false,
  connectTimeout: 40000
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
  const value = String(req.query.value || '');
  const limit = parseInt(req.query.limit) || 5;
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

  pool.acquire().then((db) => {
    const query = `
      SELECT
        NOMBRE,
        DIRECCION,
        TELEFONO,
        E_MAIL
      FROM CLIENTES
      WHERE
        UPPER(NOMBRE) LIKE '%' || UPPER(?) || '%'
        OR UPPER(E_MAIL) LIKE '%' || UPPER(?) || '%'
        OR UPPER(DIRECCION) LIKE '%' || UPPER(?) || '%'
      ROWS 5
    `;

    db.query(query, [search, search, search], (err, result) => {
      pool.release(db);

      if (err) {
        console.error('Error al ejecutar la consulta:', err);
        return res.status(500).json({ error: 'Error al ejecutar la consulta' });
      }

      if (result.length === 0) {
        return res.status(404).json({ message: 'No se encontraron clientes con ese criterio.' });
      }

      res.json({ clientes: result });
    });
  }).catch((err) => {
    console.error('Error obteniendo conexión del pool:', err);
    return res.status(500).json({ error: 'Error conectando a la base de datos' });
  });
};


module.exports.importClientsFromCSV = async (req, res) => {
  if (!req.file) {
    return res.status(400).send("No se ha subido ningún archivo.");
  }

  const filePath = req.file.path;
  const clientsArray = [];

  try {
    // Leer y procesar el archivo CSV de manera correcta, asegurando que se lean todos los datos antes del bulkWrite
    await new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row) => {
          clientsArray.push({
            nombre: row.nombre,
            direccion: row.direccion,
            telefono: row.telefono,
            email: row.email,
          });
        })
        .on('end', resolve)
        .on('error', reject);
    });

    // Filtrar duplicados basados en campos que no sean siempre iguales ("sin definir")
    const bulkOperations = clientsArray.map((client) => {
      const filterCriteria = client.email && client.email !== 'sin definir'
        ? { email: client.email }
        : { nombre: client.nombre, telefono: client.telefono };

      return {
        updateOne: {
          filter: filterCriteria,  // Verificar duplicados por email o combinación de nombre y teléfono
          update: { $set: client },
          upsert: true, // Crear si no existe
        },
      };
    });

    if (bulkOperations.length > 0) {
      const result = await Client.bulkWrite(bulkOperations);
      const importedCount = result.upsertedCount + result.modifiedCount;

      res.status(200).json({
        message: 'Importación completada correctamente.',
        importedCount,
      });
    } else {
      res.status(400).json({ message: 'No se encontraron datos válidos para importar.' });
    }
  } catch (error) {
    console.error('Error al importar datos:', error);
    res.status(500).send('Error al importar clientes.');
  } finally {
    fs.unlinkSync(filePath); // Eliminar archivo temporal
  }
};
