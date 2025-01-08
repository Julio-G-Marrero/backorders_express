const routerShopify = require('express').Router();
const { fetchAllFirebirdData } = require('../controllers/storesShopify');

// Definimos la ruta para actualizar el inventario
routerShopify.get('/updateInventory', async (req, res) => {
    try {
        // Obtenemos el batchSize desde los query params o usamos 500 por defecto
        const batchSize = parseInt(req.query.batchSize, 10) || 500;

        // Validamos que batchSize sea un número entero positivo
        if (!Number.isInteger(batchSize) || batchSize <= 0) {
            return res.status(400).json({
                status: 'error',
                message: `batchSize debe ser un entero positivo. Valor recibido: ${req.query.batchSize}`,
            });
        }

        // Llamamos a la función que consulta Firebird
        const data = await fetchAllFirebirdData(batchSize);

        // Retornamos los datos obtenidos
        res.json({
            status: 'success',
            total: data.length,
            data: data,
        });
    } catch (error) {
        console.error('Error al consultar Firebird:', error);
        res.status(500).json({
            status: 'error',
            message: 'Error al consultar Firebird',
            details: error.message,
        });
    }
});

module.exports = routerShopify;
