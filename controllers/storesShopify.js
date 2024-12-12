const axios = require('axios');
require('dotenv').config();
const Firebird = require('node-firebird');

// Función para esperar
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Opciones de configuración de Firebird
const options = {
    host: 'almacennorte.ddns.net',  // Dirección IP o hostname de Firebird
    port: 3050,                 // Puerto de Firebird
    database: 'C:\\FSPCorona_NEW\\SISTCRASH.GDB',  // Ruta de la base de datos
    user: 'SYSDBA',              // Usuario de Firebird
    password: 'masterkey',
    WireCrypt: false,
    connectTimeout: 40000
};

// Obtener todos los datos desde Firebird
const fetchAllFirebirdData = async () => {
    return new Promise((resolve, reject) => {
        Firebird.attach(options, (err, db) => {
            if (err) {
                console.error('Error al conectar a Firebird:', err);
                return reject(err);
            }

            const query = `
                SELECT CODIGO_BARRAS, EXISTENCIA_FINAL_CANTIDAD
                FROM EXISTENCIAS_INICIO_DIA
                WHERE EXISTENCIA_FINAL_CANTIDAD > 0
                ORDER BY CODIGO_BARRAS;
            `;

            db.query(query, (err, result) => {
                db.detach();

                if (err) {
                    console.error('Error ejecutando la consulta en Firebird:', err);
                    return reject(err);
                }

                resolve(result);
            });
        });
    });
};

// Obtener ubicaciones activas desde Shopify
const getActiveLocations = async () => {
    try {
        const response = await axios.get(
            `https://${process.env.SHOPIFY_STORE_NAME}/admin/api/2023-01/locations.json`,
            {
                headers: {
                    'X-Shopify-Access-Token': process.env.SHOPIFY_API_ACCESS_TOKEN,
                },
            }
        );

        const activeLocations = response.data.locations.filter(location => location.active);

        if (activeLocations.length === 0) {
            throw new Error('No hay ubicaciones activas en Shopify');
        }

        console.log('Ubicaciones activas:', activeLocations);
        return activeLocations;
    } catch (error) {
        console.error('Error al obtener las ubicaciones activas:', error.response?.data || error.message);
        throw error;
    }
};

// Obtener productos desde Shopify
const getShopifyProducts = async () => {
    try {
        const response = await axios.get(
            `https://${process.env.SHOPIFY_STORE_NAME}/admin/api/2023-01/products.json?limit=250`,
            {
                headers: {
                    'X-Shopify-Access-Token': process.env.SHOPIFY_API_ACCESS_TOKEN,
                },
            }
        );

        return response.data.products;
    } catch (error) {
        console.error('Error al obtener productos de Shopify:', error.response?.data || error.message);
        throw error;
    }
};

// Actualizar inventario en Shopify con retraso para respetar el límite de llamadas
const updateShopifyInventory = async (inventoryItemId, locationId, availableQuantity) => {
    try {
        // Esperar 500ms entre cada solicitud para respetar el límite de Shopify
        await sleep(750);

        const response = await axios.post(
            `https://${process.env.SHOPIFY_STORE_NAME}/admin/api/2023-01/inventory_levels/set.json`,
            {
                location_id: locationId,
                inventory_item_id: inventoryItemId,
                available: availableQuantity,
            },
            {
                headers: {
                    'X-Shopify-Access-Token': process.env.SHOPIFY_API_ACCESS_TOKEN,
                    'Content-Type': 'application/json',
                },
            }
        );

        return response.data;
    } catch (error) {
        console.error('Error al actualizar el inventario:', error.response?.data || error.message);
        throw error;
    }
};

// Sincronizar inventarios entre Firebird y Shopify
const syncInventories = async () => {
    const results = [];
    try {
        console.log('Obteniendo ubicaciones activas...');
        const activeLocations = await getActiveLocations();
        const locationId = activeLocations[0]?.id;

        if (!locationId) {
            throw new Error('No se pudo obtener una ubicación activa');
        }

        console.log('Obteniendo datos de Firebird...');
        const firebirdData = await fetchAllFirebirdData();

        console.log('Obteniendo productos de Shopify...');
        const shopifyProducts = await getShopifyProducts();

        for (const firebirdItem of firebirdData) {
            const shopifyVariant = shopifyProducts
                .flatMap(product => product.variants)
                .find(variant => variant.barcode === firebirdItem.CODIGO_BARRAS);

            if (shopifyVariant) {
                try {
                    const inventoryResult = await updateShopifyInventory(
                        shopifyVariant.inventory_item_id,
                        locationId,
                        firebirdItem.EXISTENCIA_FINAL_CANTIDAD
                    );

                    results.push({
                        barcode: firebirdItem.CODIGO_BARRAS,
                        inventory_item_id: shopifyVariant.inventory_item_id,
                        updated_quantity: firebirdItem.EXISTENCIA_FINAL_CANTIDAD,
                        status: 'updated',
                    });
                } catch (error) {
                    results.push({
                        barcode: firebirdItem.CODIGO_BARRAS,
                        status: 'error',
                        error: error.response?.data || error.message,
                    });
                }
            } else {
                results.push({
                    barcode: firebirdItem.CODIGO_BARRAS,
                    status: 'not_found_in_shopify',
                });
            }
        }

        return results;
    } catch (error) {
        console.error('Error durante la sincronización:', error.message);
        throw error;
    }
};


module.exports.updateIngcoInv = async (req,res) => {
  try {
    const results = await syncInventories();
    res.json({
        status: 'success',
        total_products_processed: results.length,
        results,
    });
  } catch (error) {
    res.status(500).json({
        status: 'error',
        message: 'Error durante la sincronización de inventarios',
        details: error.message,
    });
  }
}
