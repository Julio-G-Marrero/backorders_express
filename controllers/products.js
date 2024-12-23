const Product = require('../models/products');
const fs = require('fs');
const csv = require('csv-parser');
const genericPool = require('generic-pool');
const Firebird = require('node-firebird');
const redis = require("redis");
//Servidor Redis
const client = redis.createClient({
  socket: {
    //host: "127.0.0.1", // Redis local
    host: "10.138.0.2", // Redis GC
    port: 6379,
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        console.error("No se puede reconectar a Redis después de múltiples intentos.");
        return new Error("Redis reconnection failed");
      }
      console.log(`Intentando reconectar a Redis... intento #${retries}`);
      return Math.min(retries * 100, 3000); // Retraso de reconexión (en ms)
    },
    password: "gm785623",
  },
});

client.on("error", (err) => {
  console.error("Error con Redis:", err);
});

(async () => {
  try {
    await client.connect();
    console.log("Conectado a Redis");
  } catch (err) {
    console.error("Error al conectar con Redis:", err);
  }
})();

// Opciones de configuración de Firebird
const options = {
  host: 'almacennorte.ddns.net',  // Dirección IP o hostname de Firebird
  port: 3050,                 // Puerto de Firebird
  database: 'C:\\FSPCorona_NEW\\SISTCRASH.GDB',  // Ruta de la base de datos
  user: 'SYSDBA',              // Usuario de Firebird
  password: 'masterkey',
  WireCrypt: false,
  charset: 'UTF8',
  connectTimeout: 40000,
};

// Configura el pool de conexiones con generic-pool
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

// Controlador para obtener productos de MongoDB
module.exports.getProducts = (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 13;
  const startIndex = (page - 1) * limit;
  Product.find({}).skip(startIndex).limit(limit)
    .then(products => res.send({ products }))
    .catch((err) => res.send({ message: err }));
};

// Controlador para obtener productos por valores desde Firebird usando el pool
const iconv = require("iconv-lite");

module.exports.getProductsByValuesBDNliux = async (req, res) => {
  const { search } = req.query;

  console.log("iniciando");

  if (!search) {
    return res.status(400).json({ error: "Proporcione un valor para buscar." });
  }

  try {
    // Verificar si el resultado ya está en caché
    const cachedResult = await client.get(search.toUpperCase());
    if (cachedResult) {
      console.log("redis");
      return res.json({ productos: JSON.parse(cachedResult) });
    }

    // Obtener conexión del pool de Firebird
    const db = await pool.acquire();

    try {
      const query = `
        SELECT
          CODIGO_MAT,
          DESCRIPCION,
          CODIGO_BARRAS,
          PRECIO_VENTA,
          FAMILIA,
          SUB_FAMILIA
        FROM
          CATALOGO
        WHERE
          UPPER(CODIGO_BARRAS) STARTING WITH UPPER(?) OR
          UPPER(DESCRIPCION) LIKE UPPER(?)
        ROWS 5;
      `;

      db.query(query, [search.toUpperCase(), `${search.toUpperCase()}%`], async (err, result) => {
        pool.release(db); // Liberar conexión al pool

        if (err) {
          console.error("Error al ejecutar la consulta:", err);
          return res.status(500).json({ error: "Error al ejecutar la consulta." });
        }

        // Convertir los resultados a UTF-8
        const utf8Result = result.map((row) => {
          return Object.fromEntries(
            Object.entries(row).map(([key, value]) => [
              key,
              typeof value === "string" ? iconv.decode(Buffer.from(value, "binary"), "utf-8") : value,
            ])
          );
        });

        // Guardar resultado en Redis (TTL de 345,600 segundos = 96 horas)
        await client.setEx(search.toUpperCase(), 345600, JSON.stringify(utf8Result));

        res.json({ productos: utf8Result });
      });
    } catch (err) {
      pool.release(db); // Asegura liberar la conexión en caso de error
      console.error("Error al ejecutar consulta en Firebird:", err);
      res.status(500).json({ error: "Error al ejecutar consulta en Firebird." });
    }
  } catch (err) {
    console.error("Error general:", err);
    res.status(500).json({ error: "Error interno del servidor." });
  }
};




// Controlador para crear un nuevo producto en MongoDB
module.exports.createProduct = (req, res) => {
  Product.create({
    codigo_barras: req.body.codigo_barras,
    codigo_interno: req.body.codigo_interno,
    descripcion: req.body.descripcion,
    familia: req.body.familia,
    sub_familia: req.body.sub_familia
  })
    .then((product) => res.send(product))
    .catch((err) => res.status(500).send({ message: err }));
};

// Controlador para obtener productos por valores desde MongoDB
module.exports.getProductsByValues = (req, res) => {
  const value = String(req.query.value || '');
  const limit = parseInt(req.query.limit) || 5;
  Product.find({
    $or: [
      { codigo_barras: { $regex: value, $options: 'i' } },
      { codigo_interno: { $regex: value, $options: 'i' } },
      { descripcion: { $regex: value, $options: 'i' } },
    ]
  })
    .limit(limit)
    .then(products => res.send({ products }))
    .catch((err) => res.status(500).send({ message: err }));
};

// Controlador para importar productos desde un archivo CSV a MongoDB
module.exports.importCsvProducto = async (req, res) => {
  if (!req.file) {
    return res.status(400).send({ message: 'No se ha subido ningún archivo.' });
  }

  const filePath = req.file.path;
  const productsArray = [];

  fs.createReadStream(filePath)
    .pipe(csv())
    .on('data', (row) => {
      productsArray.push({
        codigo_barras: row.codigo_barras,
        codigo_interno: row.codigo_interno,
        descripcion: row.descripcion,
        precio: parseFloat(row.precio),
        familia: row.familia,
        sub_familia: row.sub_familia,
        proveedor: row.proveedor || 'Diverso',
      });
    })
    .on('end', async () => {
      try {
        // Crear operaciones de escritura en bloque
        const bulkOperations = productsArray.map((product) => ({
          updateOne: {
            filter: {
              $or: [
                { codigo_barras: product.codigo_barras },
                { codigo_interno: product.codigo_interno },
              ],
            },
            update: { $set: product },
            upsert: true, // Inserta si no existe
          },
        }));

        const result = await Product.bulkWrite(bulkOperations);
        const importedCount = result.upsertedCount + result.modifiedCount;

        res.status(200).json({
          message: 'Datos importados correctamente.',
          importedCount,
        });
      } catch (err) {
        console.error('Error al insertar datos en MongoDB:', err);
        res.status(500).send({ message: 'Error al importar datos del CSV' });
      } finally {
        fs.unlinkSync(filePath); // Eliminar archivo temporal
      }
    })
    .on('error', (err) => {
      console.error('Error al procesar el archivo CSV:', err);
      res.status(500).send({ message: 'Error al procesar el archivo CSV' });
    });
};
