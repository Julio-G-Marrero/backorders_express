const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require("cors");
const auth = require('./middleware/auth');
const routerOrders = require('./routes/orders');
const routerUsers = require('./routes/users');
const routerProducts = require('./routes/products');
const routerClient = require('./routes/clients');
const { createUser, login } = require('./controllers/users');
const { updateDepartment } = require('./controllers/users'); // Controlador para la nueva ruta
const multer = require("multer");
const csv = require("csv-parser");
const fs = require("fs");
const clientRoutes = require("./routes/clients");
const productRoutes = require("./routes/products");
const admin = require('./controllers/admin')

const app = express();

// Configuración de límites para body-parser
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));

// Configuración de CORS
const allowedOrigins = [
  "http://localhost:3000", // Frontend local
  "https://julio-g-marrero.github.io/globalcar/", // GitHub Pages
];

app.use(cors({
  origin: allowedOrigins,
  methods: ["GET", "POST", "PATCH", "DELETE"]
}));

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

// Rutas públicas
app.use('/users/register', createUser);
app.post('/users/login', login);

// **Nueva ruta pública para actualizar departamento por email**
app.patch('/users/update-department-by-email', updateDepartment);
app.use('/admin', admin);
// Middleware de autenticación
app.use(auth);

// Rutas protegidas
app.use('/products', routerProducts);
app.use('/users', routerUsers);
app.use('/orders', routerOrders);
app.use("/clients", clientRoutes);

// Inicia el servidor
app.listen(PORT, () => {
  console.log(`App listening at port ${PORT}`);
});

// Ruta para manejar 404
app.get('*', (req, res) => {
  res.status(404).send('404 Not Found');
});
