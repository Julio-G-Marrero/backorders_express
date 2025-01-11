const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require("cors");
const cron = require('node-cron');
const path = require("path");
const auth = require('./middleware/auth');
const routerOrders = require('./routes/orders');
const routerUsers = require('./routes/users');
const routerProduct = require('./routes/products')
const { createUser, login } = require('./controllers/users');
const { updateDepartment } = require('./controllers/users'); // Controlador para la nueva ruta
const routerShopify = require('./routes/storesShopify')
const multer = require("multer");
const csv = require("csv-parser");
const fs = require("fs");
const clientRoutes = require("./routes/clients");
const productRoutes = require("./routes/products");
const admin = require('./controllers/admin')
require('dotenv').config();
const logger = require('./routes/logger')
// Contadores globales
global.redisQueryCount = 0;  // Número de consultas provenientes de Redis
global.firebirdQueryCount = 0; // Número de consultas provenientes de Firebird

const app = express();

// Configuración de límites para body-parser
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));

const allowedOrigins = [
  "http://localhost:3000/globalcar", // Desarrollo local
  "https://julio-g-marrero.github.io", // GitHub Pages raíz
  "https://julio-g-marrero.github.io/globalcar", // Ruta específica de tu aplicación
];

app.use(cors({
  origin:"*",
  // (origin, callback) => {
  //   if (!origin || allowedOrigins.includes(origin)) {
  //     callback(null, true);
  //   } else {
  //     callback(new Error("No autorizado por CORS"));
  //   }
  // },
  methods: ["GET", "POST", "PATCH", "DELETE"],
  credentials: true, // Habilitar envío de cookies si es necesario
}));
app.options("*", cors());

// Middleware para manejo de errores
app.use((err, req, res, next) => {
  logger.error(`Error en Express: ${err.message}`);
  res.status(500).json({ status: 'error', message: 'Ocurrió un error en el servidor.' });
});

// Conexión a MongoDB
mongoose.connect('mongodb://localhost:27017/backorder', {})
  .then(() => console.log("Conectado a MongoDB"))
  .catch(err => console.error("Error al conectar a MongoDB:", err));

const { PORT = 3000 } = process.env;

// Configuración de Multer con límite de tamaño
const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 50 * 1024 * 1024 } // Límite de 50 MB
});
app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  next();
});

const Firebird = require('node-firebird');

// Configuración de Firebird
const options = {
  host: 'almacennorte.ddns.net', // Dirección IP o hostname de Firebird
  port: 3050,                    // Puerto de Firebird
  database: 'C:\\FSPCorona_NEW\\SISTCRASH.GDB', // Ruta de la base de datos
  user: 'SYSDBA',                // Usuario de Firebird
  password: 'masterkey',
  WireCrypt: false,
  charset: 'UTF8',
  connectTimeout: 40000,
};

// Endpoint para obtener 2 productos de prueba
app.get('/products/test', async (req, res) => {
  Firebird.attach(options, (err, db) => {
    if (err) {
      console.error("Error al conectar a Firebird:", err);
      return res.status(500).json({ error: "No se pudo conectar a la base de datos." });
    }

    const query = `
      SELECT
        FIRST 2 *
      FROM
        CATALOGO
    `;

    db.query(query, [], (queryErr, result) => {
      if (queryErr) {
        console.error("Error al ejecutar la consulta:", queryErr);
        db.detach();
        return res.status(500).json({ error: "Error al ejecutar la consulta." });
      }

      // Convertir resultados a formato legible
      const formattedResult = result.map((row) => {
        return Object.fromEntries(
          Object.entries(row).map(([key, value]) => [
            key,
            typeof value === "string" ? value.trim() : value,
          ])
        );
      });

      // Enviar respuesta y liberar conexión
      res.json({ productos: formattedResult });
      db.detach();
    });
  });
});

// Rutas públicas
app.use('/users/register', createUser);
app.post('/users/login', login);

// **Nueva ruta pública para actualizar departamento por email**
app.patch('/users/update-department-by-email', updateDepartment);
app.use('/admin', admin);
app.use('/shopify', routerShopify);
// Endpoint para guardar logs de rendimiento
app.post("/logs/performance", (req, res) => {
  const log = req.body;
  const logFilePath = path.join(__dirname, "logs/performance.log");

  // Escribe el log en el archivo en lugar de enviar múltiples respuestas
  fs.appendFile(logFilePath, JSON.stringify(log) + "\n", (err) => {
    if (err) {
      console.error("Error al escribir en el archivo de logs:", err);
      return res.status(500).json({ error: "No se pudo guardar el log." });
    }
    console.log("Log registrado:", log);
    res.status(201).send("Log registrado");
  });
});

app.get("/logs/performance", (req, res) => {
  const logFilePath = path.join(__dirname, "logs/performance.log");

  fs.readFile(logFilePath, "utf8", (err, data) => {
    if (err) {
      console.error("Error al leer el archivo de logs:", err);
      return res.status(500).json({ error: "No se pudieron obtener los logs." });
    }

    const logs = data
      .split("\n")
      .filter((line) => line.trim() !== "") // Filtra líneas vacías
      .map((line) => {
        try {
          return JSON.parse(line); // Convierte cada línea en un objeto JSON
        } catch (err) {
          console.error("Error al parsear una línea de log:", line, err);
          return null; // Ignora líneas mal formadas
        }
      })
      .filter((log) => log !== null); // Filtra logs mal formados

    // Agregar los contadores globales
    const redisQueryCount = global.redisQueryCount || 0;
    const firebirdQueryCount = global.firebirdQueryCount || 0;
    const totalQueries = redisQueryCount + firebirdQueryCount;

    res.json({
      logs,
      statistics: {
        redisQueryCount,
        firebirdQueryCount,
        totalQueries,
      },
    });
  });
});

app.delete("/logs/performance", (req, res) => {
  const logFilePath = path.join(__dirname, "logs/performance.log");

  fs.unlink(logFilePath, (err) => {
    if (err) {
      if (err.code === "ENOENT") {
        // Si el archivo no existe, devolver un mensaje adecuado
        return res.status(404).json({ message: "El archivo de logs no existe." });
      }
      console.error("Error al eliminar el archivo de logs:", err);
      return res.status(500).json({ error: "No se pudieron borrar los logs." });
    }

    // Crear un archivo vacío nuevamente para evitar problemas de escritura futura
    fs.writeFile(logFilePath, "", (writeErr) => {
      if (writeErr) {
        console.error("Error al recrear el archivo de logs:", writeErr);
        return res.status(500).json({ error: "No se pudo recrear el archivo de logs." });
      }

      res.status(200).json({ message: "Los logs han sido eliminados correctamente." });
    });
  });
});

app.get('/logs/errors-performance', (req, res) => {
  const logFilePath = path.join(__dirname, '/routes/logs/errors-performance.log'); // Ruta del archivo de logs

  fs.readFile(logFilePath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error al leer el archivo de logs:', err);
      return res.status(500).json({ message: 'No se pudo leer el archivo de logs.' });
    }

    try {
      const logs = data
        .split('\n') // Divide por línea
        .filter(line => line.trim() !== '') // Filtra líneas vacías
        .map(line => JSON.parse(line)); // Convierte cada línea a un objeto JSON

      res.status(200).json({ logs });
    } catch (parseErr) {
      console.error('Error al analizar los logs:', parseErr);
      res.status(500).json({ message: 'Error al analizar los logs.' });
    }
  });
});

app.delete("/logs/errors-performance", (req, res) => {
  const logFilePath = path.join(__dirname, '/routes/logs/errors-performance.log'); // Ruta del archivo de logs

  fs.writeFile(logFilePath, "", (err) => {
    if (err) {
      console.error("Error al limpiar el archivo de logs:", err);
      return res.status(500).json({ message: "Error al limpiar el archivo de logs" });
    }
    console.log("Archivo de logs limpiado");
    res.status(200).json({ message: "Logs limpiados exitosamente" });
  });
});

// Middleware de autenticación
app.use(auth);

// Rutas protegidas
app.use('/products', routerProduct);
app.use('/users', routerUsers);
app.use('/orders', routerOrders);
app.use("/clients", clientRoutes);

// Inicia el servidor
const server = app.listen(PORT, () => {
  console.log(`App listening at port ${PORT}`);
});
server.timeout = 600000;// 3 min de esoera
// Ruta para manejar 404
app.get('*', (req, res) => {
  res.status(404).send('404 Not Found');
});
