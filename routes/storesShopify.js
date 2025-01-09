const routerShopify = require('express').Router();
const { syncFirebirdWithShopify } = require('../controllers/storesShopify');

// Definimos la ruta para actualizar el inventario
let isSyncInProgress = false;

routerShopify.get('/syncInventory', async (req, res) => {
    if (isSyncInProgress) {
        return res.status(400).json({ status: 'error', message: 'Sincronización en progreso, intente más tarde.' });
    }

    isSyncInProgress = true;
    console.log(`Sincronización iniciada a las: ${new Date().toISOString()}`);

    try {
        const result = await syncFirebirdWithShopify();
        res.json(result);
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    } finally {
        isSyncInProgress = false; // Liberar el bloqueo
        console.log(`Sincronización finalizada a las: ${new Date().toISOString()}`);
    }
});

module.exports = routerShopify;
