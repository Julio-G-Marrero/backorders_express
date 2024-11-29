const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Modelos importados (ajusta las rutas según tu estructura)
const Client = require('../models/clients');
const Order = require('../models/orders');
const Product = require('../models/products');

// Ruta para limpiar las colecciones
router.delete('/clean-database', async (req, res) => {
  try {
    // Limpia cada colección llamando a `deleteMany` para eliminar todos los documentos
    await Client.deleteMany({});
    await Order.deleteMany({});
    await Product.deleteMany({});

    // Responde al cliente con un mensaje de éxito
    res.status(200).json({
      message: 'Se han limpiado las colecciones: clientes, órdenes y productos.',
    });
  } catch (error) {
    console.error('Error al limpiar la base de datos:', error);
    res.status(500).json({
      message: 'Error al limpiar las colecciones.',
      error: error.message,
    });
  }
});

module.exports = router;
