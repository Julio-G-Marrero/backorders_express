const Product = require('../models/products');
const fs = require('fs');
const csv = require('csv-parser');
const genericPool = require('generic-pool');
const Firebird = require('node-firebird');
const redis = require("redis");
const iconv = require("iconv-lite");
const logger = require('../routes/logger-performance')
const cron = require('node-cron');

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

// Función para sincronizar productos desde Firebird a MongoDB
const syncProducts = async () => {
  console.log("Iniciando sincronización de productos...");
  try {
    const db = await pool.acquire();
    try {
      const query = `
        SELECT
          CODIGO_MAT AS codigoMat,
          DESCRIPCION AS descripcion,
          CODIGO_BARRAS AS codigoBarras,
          PRECIO_VENTA AS precioVenta,
          FAMILIA AS familia,
          SUB_FAMILIA AS subFamilia
        FROM CATALOGO
      `;
      const products = await runQuery(db, query, []);
      const formattedProducts = products.map((p) => ({
        codigoMat: p.CODIGO_MAT,
        descripcion: p.DESCRIPCION,
        codigoBarras: p.CODIGO_BARRAS,
        precioVenta: p.PRECIO_VENTA,
        familia: p.FAMILIA,
        subFamilia: p.SUB_FAMILIA,
      }));
      // Upsert para actualizar o insertar productos
      for (const product of formattedProducts) {
        await Product.updateOne({ codigoMat: product.codigoMat }, product, { upsert: true });
      }
      console.log("Sincronización de productos completada.");
    } finally {
      pool.release(db);
    }
  } catch (err) {
    console.error("Error durante la sincronización de productos:", err);
  }
};

// // Sincronización periódica (cada hora)
// cron.schedule('0 * * * *', async () => {
//   console.log("Iniciando sincronización periódica...");
//   await syncProducts();
//   console.log("Sincronización periódica completada.");
// });

// // Sincronización inicial
// (async () => {
//   console.log("Iniciando sincronización Productos...");
//   await syncProducts();
//   console.log("Sincronización inicial productos completada.");
// })();

// Opciones de configuración de Firebird
const options = {
  host: 'almacennorte.zapto.org', // Dirección IP o hostname de Firebird
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
  create: () => new Promise((resolve, reject) => {
    Firebird.attach(options, (err, db) => {
      if (err) return reject(err);
      resolve(db);
    });
  }),
  destroy: (db) => new Promise((resolve) => {
    db.detach();
    resolve();
  }),
};

const pool = genericPool.createPool(factory, {
  max: 10,
  min: 2,
  idleTimeoutMillis: 30000,
  acquireTimeoutMillis: 10000, // Tiempo máximo para adquirir una conexión
});

// Función para ejecutar consultas con promesas
const runQuery = (db, query, params) =>
  new Promise((resolve, reject) => {
    db.query(query, params, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
});

// Función para registrar tiempos de respuesta y errores
const logPerformance = async (type, details) => {
  try {
    await fetch("http://localhost:3000/logs/performance", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type,
        timestamp: new Date().toISOString(),
        ...details,
      }),
    });
  } catch (err) {
    console.error("Error al registrar el rendimiento:", err);
  }
};

// Función para obtener datos de Redis con manejo de errores
const getFromRedis = async (key) => {
  try {
    return await client.get(key);
  } catch (err) {
    console.error(`Error obteniendo clave ${key} de Redis:`, err);
    return null;
  }
};
async function retryQuery(queryFn, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await queryFn(); // Ejecuta la función pasada
    } catch (err) {
      if (i === retries - 1) throw err; // Si es el último intento, lanza el error
      console.warn(`Reintento ${i + 1} fallido, intentando nuevamente...`, err.message);
    }
  }
}

module.exports.getProductsByValuesBDNliux = async (req, res) => {
  const { search } = req.query;
  // Validación de entrada
  if (!search || typeof search !== "string" || search.trim().length === 0) {
    return res.status(400).json({ error: "Proporcione un valor de búsqueda válido." });
  }

  const searchKey = search.toUpperCase().trim();
  const cacheKey = `product_search:${searchKey}`; // Clave única para productos

  if (searchKey.length > 100) {
    return res.status(400).json({ error: "El término de búsqueda es demasiado largo." });
  }
  const startTime = Date.now(); // Inicio del tiempo de respuesta

  try {
    // Verificar si el resultado está en caché
    const cachedResult = await getFromRedis(cacheKey);
    if (cachedResult) {
      console.log("Resultado obtenido de Redis.");
      global.redisQueryCount++; // Incrementar el contador de Redis
      await logPerformance("product_search", {
        searchQuery: search.toUpperCase(),
        duration: Date.now() - startTime,
        status: "success",
        cache: true,
      });
      return res.json({ productos: JSON.parse(cachedResult) });
    }

    // Obtener conexión del pool
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
          UPPER(CODIGO_MAT) CONTAINING ? OR
          UPPER(DESCRIPCION) CONTAINING ?
        ROWS 5;
      `;

      // Usa retryQuery para ejecutar la consulta con reintentos
      const result = await retryQuery(
        () => runQuery(db, query, [searchKey, searchKey]),
        3
      );
      const duration = Date.now() - startTime;

      if (duration > 2000) {
        console.warn(`Consulta lenta (${duration}ms): ${query}`);
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
      global.firebirdQueryCount++; // Incrementar el contador de Firebird

      // Guardar resultado en Redis (TTL de 96 horas)
      await client.setEx(cacheKey, 345600, JSON.stringify(utf8Result)); // TTL: 96 horas

      await logPerformance("product_search", {
        searchQuery: search.toUpperCase(),
        duration: Date.now() - startTime,
        status: "success",
        cache: false,
      });

      return res.json({ productos: utf8Result });
    } catch (err) {
      const duration = Date.now() - startTime;
      console.error("Error al ejecutar consulta en Firebird:", err);
      logger.error({
        type: "product_search",
        searchQuery: searchKey,
        duration: Date.now() - startTime,
        status: "error",
        errorMessage: err.message,
      });
      await logPerformance("product_search", {
        searchQuery: search.toUpperCase(),
        duration,
        status: "error",
        errorMessage: err.message,
      });
      return res.status(500).json({ error: "Error al ejecutar consulta en Firebird." });
    } finally {
      pool.release(db); // Liberar conexión al pool
    }
  } catch (err) {
    const duration = Date.now() - startTime;
    console.error("Error general:", err);
    logger.error({
      type: "product_search",
      searchQuery: searchKey,
      duration: Date.now() - startTime,
      status: "error",
      errorMessage: err.message,
    });
    await logPerformance("product_search", {
      searchQuery: search.toUpperCase(),
      duration,
      status: "error",
      errorMessage: err.message,
    });
    return res.status(500).json({ error: "Error interno del servidor." });
  }
};

// Controlador para obtener productos de MongoDB
module.exports.getProducts = (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 13;
  const startIndex = (page - 1) * limit;
  Product.find({}).skip(startIndex).limit(limit)
    .then(products => res.send({ products }))
    .catch((err) => res.send({ message: err }));
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

        return res.status(200).json({
          message: 'Datos importados correctamente.',
          importedCount,
        });
      } catch (err) {
        console.error('Error al insertar datos en MongoDB:', err);
        return res.status(500).send({ message: 'Error al importar datos del CSV' });
      } finally {
        fs.unlinkSync(filePath); // Eliminar archivo temporal
      }
    })
    .on('error', (err) => {
      console.error('Error al procesar el archivo CSV:', err);
      return res.status(500).send({ message: 'Error al procesar el archivo CSV' });
    });
};
