const axios = require('axios');
const Firebird = require('node-firebird');

// Configuración de Firebird
const firebirdOptions = {
    host: 'almacennorte.ddns.net',
    port: 3050,
    database: 'C:\\FSPCorona_NEW\\SISTCRASH.GDB',
    user: 'SYSDBA',
    password: 'masterkey',
    WireCrypt: false,
    connectTimeout: 40000,
};

// Obtener datos de Firebird por lotes
const fetchAllFirebirdData = async (batchSize = 500) => {
    console.log('Iniciando consulta por lotes a Firebird...');
    let start = 1;
    let results = [];
    let hasMore = true;

    while (hasMore) {
        console.log(`Consultando registros ${start} a ${start + batchSize - 1}...`);
        const query = `
            SELECT CODIGO_BARRAS, EXISTENCIA_FINAL_CANTIDAD
            FROM EXISTENCIAS_INICIO_DIA
            WHERE EXISTENCIA_FINAL_CANTIDAD > 0
            ROWS ${start} TO ${start + batchSize - 1};
        `;

        const batch = await new Promise((resolve, reject) => {
            Firebird.attach(firebirdOptions, (err, db) => {
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

        if (batch.length === 0) {
            hasMore = false;
        } else {
            results = results.concat(batch);
            start += batchSize;
        }
    }

    console.log(`Consulta finalizada, total de registros obtenidos: ${results.length}`);
    return results;
};

// Obtener productos de Shopify
const fetchAllShopifyProducts = async () => {
  const allProducts = [];
  let url = `https://${process.env.SHOPIFY_STORE_NAME}/admin/api/2023-01/products.json?limit=250`;

  try {
      while (url) {
          const response = await axios.get(url, {
              headers: {
                  'X-Shopify-Access-Token': process.env.SHOPIFY_API_ACCESS_TOKEN,
              },
          });

          // Agregar los productos obtenidos al array general
          allProducts.push(...response.data.products);

          // Revisar si hay una página siguiente
          const linkHeader = response.headers.link;
          if (linkHeader && linkHeader.includes('rel="next"')) {
              const match = linkHeader.match(/<([^>]+)>; rel="next"/);
              url = match ? match[1] : null; // URL de la siguiente página
          } else {
              url = null; // No hay más páginas
          }
      }

      console.log(`Total de productos obtenidos de Shopify: ${allProducts.length}`);
      return allProducts;
  } catch (error) {
      console.error('Error al obtener productos de Shopify:', error.response?.data || error.message);
      throw error;
  }
};


// Actualizar inventario en Shopify
const updateShopifyInventory = async (inventoryItemId, locationId, availableQuantity) => {
    try {
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
                },
            }
        );

        console.log(`Inventario actualizado para ${inventoryItemId}: ${availableQuantity}`);
        return response.data;
    } catch (error) {
        console.error('Error al actualizar inventario en Shopify:', error.response?.data || error.message);
        throw error;
    }
};

// Sincronizar inventarios entre Firebird y Shopify
const syncFirebirdWithShopify = async () => {
  try {
      console.log('Iniciando sincronización...');

      // Paso 1: Obtener datos de Firebird
      const firebirdData = await fetchAllFirebirdData(500); // Consulta por lotes

      // Paso 2: Obtener todos los productos de Shopify
      const shopifyProducts = await fetchAllShopifyProducts();

      // Paso 3: Cruzar datos y actualizar inventarios
      const updates = [];
      let totalProcessed = 0;
      let totalUpdated = 0;
      let notFound = [];
      let updateErrors = [];

      for (const firebirdItem of firebirdData) {
          totalProcessed++;
          const shopifyProduct = shopifyProducts.flatMap(product => product.variants).find(
              variant => variant.barcode === firebirdItem.CODIGO_BARRAS
          );

          if (shopifyProduct) {
              // Intentar actualizar el inventario
              try {
                  await updateShopifyInventory(
                      shopifyProduct.inventory_item_id,
                      process.env.SHOPIFY_LOCATION_ID,
                      firebirdItem.EXISTENCIA_FINAL_CANTIDAD
                  );
                  totalUpdated++;
              } catch (error) {
                  console.error(`Error actualizando producto ${shopifyProduct.barcode}:`, error.message);
                  updateErrors.push({ barcode: shopifyProduct.barcode, error: error.message });
              }
          } else {
              // Producto no encontrado en Shopify
              notFound.push({ barcode: firebirdItem.CODIGO_BARRAS });
          }
      }

      console.log('Sincronización completada.');
      return {
          status: 'success',
          totalProcessed,
          totalUpdated,
          notFoundCount: notFound.length,
          updateErrorCount: updateErrors.length,
          notFound,
          updateErrors,
      };
  } catch (error) {
      console.error('Error durante la sincronización:', error.message);
      throw error;
  }
};


module.exports = {
    fetchAllFirebirdData,
    fetchAllShopifyProducts,
    updateShopifyInventory,
    syncFirebirdWithShopify,
};
