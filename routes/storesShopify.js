const routerShopify = require('express').Router();
const { syncFirebirdWithShopify,fetchShopifyProducts } = require('../controllers/storesShopify');

// Definimos la ruta para actualizar el inventario
routerShopify.get('/syncInventory', async (req, res) => {
    try {
        const result = await syncFirebirdWithShopify();
        res.json(result); // Devuelve el resumen en JSON
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});
routerShopify.get('/products', async (req, res) => {
  try {
      const result = await fetchShopifyProducts();
      res.json(result); // Devuelve el resumen en JSON
  } catch (error) {
      res.status(500).json({ status: 'error', message: error.message });
  }
});

module.exports = routerShopify;
