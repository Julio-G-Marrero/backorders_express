const axios = require('axios');
require('dotenv').config();
const Firebird = require('node-firebird');
const fs = require('fs');

// Opciones de configuración de Firebird
const options = {
    host: 'almacennorte.ddns.net',
    port: 3050,
    database: 'C:\\FSPCorona_NEW\\SISTCRASH.GDB',
    user: 'SYSDBA',
    password: 'masterkey',
    WireCrypt: false,
    connectTimeout: 60000, // 60 segundos
};

const fetchBatchFromFirebird = async (start, batchSize) => {
  const query = `
      SELECT CODIGO_BARRAS, EXISTENCIA_FINAL_CANTIDAD
      FROM EXISTENCIAS_INICIO_DIA
      WHERE EXISTENCIA_FINAL_CANTIDAD > 0
      ROWS ${start} TO ${start + batchSize - 1};
  `;

  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
      try {
          return await new Promise((resolve, reject) => {
              Firebird.attach(options, (err, db) => {
                  if (err) {
                      console.error('Error al conectar a Firebird:', err);
                      return reject(err);
                  }

                  db.query(query, (err, result) => {
                      db.detach();
                      if (err) {
                          console.error('Error ejecutando consulta:', err);
                          return reject(err);
                      }

                      resolve(result);
                  });
              });
          });
      } catch (error) {
          attempts++;
          console.error(`Error en el intento ${attempts} de consulta:`, error);

          if (attempts >= maxAttempts) {
              throw new Error('Se alcanzó el número máximo de intentos para conectar con Firebird.');
          }

          console.log('Reintentando la conexión con Firebird...');
          await new Promise(resolve => setTimeout(resolve, 1000)); // Espera antes de reintentar
      }
  }
};



// Obtener datos de Firebird
const fetchAllFirebirdData = async (batchSize = 500) => {
  console.log('Iniciando consulta por lotes a Firebird...');
  let start = 1; // Inicializamos el inicio del rango
  let results = [];
  let hasMore = true;
  const label = `Tiempo total de consulta Firebird - ${Date.now()}`;

  console.time(label);

  while (hasMore) {
      console.log(`Consultando registros ${start} a ${start + batchSize - 1}...`);

      try {
          const batch = await fetchBatchFromFirebird(start, batchSize);

          if (batch.length === 0) {
              hasMore = false;
          } else {
              results = results.concat(batch);
              start += batchSize; // Incrementamos el rango para el siguiente lote
          }
      } catch (error) {
          console.error('Error durante la consulta por lotes:', error);
          break;
      }
  }

  console.timeEnd(`Tiempo total de consulta Firebird - ${Date.now()}`);
  console.log(`Consulta finalizada, total de registros obtenidos: ${results.length}`);
  return results;
};

// Función para esperar
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Respaldar productos de Shopify
const backupShopifyProducts = async (storeName, accessToken) => {
    try {
        const response = await axios.get(
            `https://${storeName}/admin/api/2023-01/products.json?limit=250`,
            {
                headers: { 'X-Shopify-Access-Token': accessToken },
            }
        );
        const products = response.data.products;
        fs.writeFileSync(`backup_${storeName}.json`, JSON.stringify(products, null, 2));
        console.log(`Backup completado para la tienda ${storeName}`);
    } catch (error) {
        console.error('Error al respaldar productos:', error.response?.data || error.message);
        throw error;
    }
};

// Obtener productos de Shopify
const getShopifyProducts = async (storeName, accessToken) => {
    try {
        const response = await axios.get(
            `https://${storeName}/admin/api/2023-01/products.json?limit=250`,
            {
                headers: { 'X-Shopify-Access-Token': accessToken },
            }
        );
        return response.data.products;
    } catch (error) {
        console.error('Error al obtener productos:', error.response?.data || error.message);
        throw error;
    }
};

// Actualizar inventario en Shopify
const updateShopifyInventory = async (storeName, accessToken, inventoryItemId, locationId, availableQuantity) => {
    try {
        // Respetar el límite de Shopify
        await sleep(300);
        const response = await axios.post(
            `https://${storeName}/admin/api/2023-01/inventory_levels/set.json`,
            {
                location_id: locationId,
                inventory_item_id: inventoryItemId,
                available: availableQuantity,
            },
            {
                headers: {
                    'X-Shopify-Access-Token': accessToken,
                    'Content-Type': 'application/json',
                },
            }
        );
        return response.data;
    } catch (error) {
        console.error('Error al actualizar inventario:', error.response?.data || error.message);
        throw error;
    }
};

// Procesar Webhook de Shopify
const processShopifyWebhook = async (req, res) => {
    try {
        const { storeName, accessToken } = process.env;
        const { product_id, inventory_item_id } = req.body;

        console.log(`Recibido webhook para producto: ${product_id}`);

        // Obtener datos de Firebird
        const firebirdData = await fetchAllFirebirdData();
        const firebirdItem = firebirdData.find(item => item.CODIGO_BARRAS === req.body.barcode);

        if (firebirdItem) {
            console.log(`Sincronizando inventario para producto: ${product_id}`);
            await updateShopifyInventory(storeName, accessToken, inventory_item_id, locationId, firebirdItem.EXISTENCIA_FINAL_CANTIDAD);
            res.status(200).send('Inventario sincronizado');
        } else {
            console.log(`Producto con código de barras ${req.body.barcode} no encontrado en Firebird`);
            res.status(404).send('Producto no encontrado en Firebird');
        }
    } catch (error) {
        console.error('Error procesando webhook:', error.message);
        res.status(500).send('Error procesando webhook');
    }
};

// Exportar funciones
module.exports = {
    processShopifyWebhook,
    backupShopifyProducts,
    fetchAllFirebirdData,
};
