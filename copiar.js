import React from "react";
import DashboardAside from "./DashboardAside";
import HeaderApp from "./HeaderApp";
import api from "../utilis/api";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import { useHistory } from "react-router";
import jsPDF from "jspdf";
import "jspdf-autotable";
import logo from "../images/logo.png";
import { Chart, BarController, BarElement, CategoryScale, LinearScale, Title, Tooltip, Legend } from "chart.js";
import { useEffect, useRef } from "react";

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Title, Tooltip, Legend);

function InformesPage(props) {
  const [productosAutorizados, setProductosAutorizados] = React.useState([]);
  const [productosDenegados, setProductosDenegados] = React.useState([]);
  const [allProducts, setAllProducts] = React.useState([]);
  const [productosDenegadosMonto, setProductosDenegadosMonto] = React.useState();
  const [productosAutorizadosMonto, setProductosAutorizadosMonto] = React.useState();
  const [productosAllMonto, setProductosAllMonto] = React.useState();
  const [productosAutorizadosCantidad, setProductosAutorizadosCantidad] = React.useState();
  const [productosDenegadosCantidad, setProductosDenegadosCantidad] = React.useState();
  const [productosAllCantidad, setProductosAllCantidad] = React.useState();
  const [cantidadPorFamilia, setCantidadPorFamilia] = React.useState({});
  const [cantidadPorCliente, setCantidadPorCliente] = React.useState({});
  const [selectedCliente, setSelectedCliente] = React.useState("Todos");
  const [selectedFamilia, setSelectedFamilia] = React.useState("Todos");
  const [filteredMontos, setFilteredMontos] = React.useState([]);
  const [filteredCantidades, setFilteredCantidades] = React.useState([]);


  const history = useHistory();
  const chartRef = useRef(null);
  const quantityChartRef = useRef(null);
  const familyChartRef = useRef(null);
  const clientChartRef = useRef(null);
  let chartInstance = useRef(null);
  let quantityChartInstance = useRef(null);
  let familyChartInstance = useRef(null);
  let clientChartInstance = useRef(null);

  React.useEffect(() => {
    fetchProductosAutorizados();
    fetchProductosDenegados();
    fetchAllProductos();
  }, []);

  console.log(allProducts)

  useEffect(() => {
    const productosFiltrados = filtrarProductos();
    actualizarDatosFiltrados(productosFiltrados);
  }, [selectedCliente, selectedFamilia, allProducts]);

  React.useEffect(() => {
    if (filteredMontos.length > 0 && filteredCantidades.length > 0) {
      generateChart();
      generateQuantityChart();
    }
  }, [filteredMontos, filteredCantidades]);

  useEffect(() => {
    const productosFiltrados = filtrarProductos();
    actualizarDatosFiltrados(productosFiltrados);
  }, [selectedCliente, selectedFamilia, allProducts]);


  const filtrarProductos = () => {
    let productosFiltrados = allProducts;

    // Filtrar por cliente
    if (selectedCliente !== "Todos") {
      productosFiltrados = productosFiltrados.filter(
        (pedido) => pedido.cliente_nombre === selectedCliente
      );
    }

    // Filtrar por familia
    if (selectedFamilia !== "Todos") {
      productosFiltrados = productosFiltrados.map((pedido) => ({
        ...pedido,
        productos: pedido.productos.filter(
          (producto) => producto.familia === selectedFamilia
        ),
        productos_denegados: pedido.productos_denegados
          ? pedido.productos_denegados.filter(
              (producto) => producto.familia === selectedFamilia
            )
          : [],
        productos_autorizados: pedido.productos_autorizados
          ? pedido.productos_autorizados.filter(
              (producto) => producto.familia === selectedFamilia
            )
          : [],
      }));
    }

    // Filtrar pedidos que contengan datos relevantes
    return productosFiltrados.filter(
      (pedido) =>
        pedido.productos.length > 0 ||
        pedido.productos_denegados.length > 0 ||
        pedido.productos_autorizados.length > 0
    );
  };

  const actualizarDatosFiltrados = (productosFiltrados) => {
    const montos = [0, 0, 0]; // [Denegados, Autorizados, Solicitados]
    const cantidades = [0, 0, 0];

    productosFiltrados.forEach((pedido) => {
      // Sumar montos y cantidades de productos solicitados
      pedido.productos.forEach((producto) => {
        montos[2] += producto.cantidad * parseFloat(producto.precio || 0);
        cantidades[2] += producto.cantidad;
      });

      // Sumar montos y cantidades de productos denegados
      pedido.productos_denegados.forEach((producto) => {
        montos[0] += producto.cantidad * parseFloat(producto.precio || 0);
        cantidades[0] += producto.cantidad;
      });

      // Sumar montos y cantidades de productos autorizados
      pedido.productos_autorizados.forEach((producto) => {
        montos[1] += producto.cantidad * parseFloat(producto.precio || 0);
        cantidades[1] += producto.cantidad;
      });
    });

    setFilteredMontos(montos);
    setFilteredCantidades(cantidades);
  };

  React.useEffect(() => {
    const productosFiltrados = filtrarProductos();
    actualizarDatosFiltrados(productosFiltrados);

    // Actualizar datos para las gráficas de familia y cliente
    setCantidadPorFamilia(calcularCantidadPorFamilia(productosFiltrados));
    setCantidadPorCliente(calcularCantidadPorCliente(productosFiltrados));
  }, [selectedCliente, selectedFamilia, allProducts]);

  const calcularCantidadPorFamilia = (data) => {
    const cantidadPorFamilia = {};
    data.forEach((pedido) => {
      pedido.productos.forEach((producto) => {
        if (producto.familia in cantidadPorFamilia) {
          cantidadPorFamilia[producto.familia] += producto.cantidad;
        } else {
          cantidadPorFamilia[producto.familia] = producto.cantidad;
        }
      });
    });
    return cantidadPorFamilia;
  };

  const calcularCantidadPorCliente = (data) => {
    const cantidadPorCliente = {};
    data.forEach((pedido) => {
      let totalCantidad = 0;
      pedido.productos.forEach((producto) => {
        totalCantidad += producto.cantidad;
      });
      if (cantidadPorCliente[pedido.cliente_nombre]) {
        cantidadPorCliente[pedido.cliente_nombre] += totalCantidad;
      } else {
        cantidadPorCliente[pedido.cliente_nombre] = totalCantidad;
      }
    });
    return cantidadPorCliente;
  };

  useEffect(() => {
    const productosFiltrados = filtrarProductos();

    // Calcular datos para las gráficas de Montos y Cantidades
    const montos = calcularMontos(productosFiltrados);
    const cantidades = calcularCantidades(productosFiltrados);

    setFilteredMontos(montos);
    setFilteredCantidades(cantidades);

    setCantidadPorFamilia(calcularCantidadPorFamilia(productosFiltrados));
    setCantidadPorCliente(calcularCantidadPorCliente(productosFiltrados));
  }, [selectedCliente, selectedFamilia, allProducts]);


  React.useEffect(() => {
    const productosFiltrados = filtrarProductos();
    setCantidadPorFamilia(calcularCantidadPorFamilia(productosFiltrados));
    setCantidadPorCliente(calcularCantidadPorCliente(productosFiltrados));
  }, [selectedCliente, selectedFamilia, allProducts]);

  useEffect(() => {
    const { totalMontos, totalCantidades } = filtrarDatosPorClienteYFamilia(
      selectedCliente,
      selectedFamilia,
      allProducts
    );

    setFilteredMontos(totalMontos);
    setFilteredCantidades(totalCantidades);
  }, [selectedCliente, selectedFamilia, allProducts]);


  React.useEffect(() => {
    if (productosDenegadosMonto && productosAutorizadosMonto && productosAllMonto) {
      generateChart();
    }
    if (productosDenegadosCantidad && productosAutorizadosCantidad && productosAllCantidad) {
      generateQuantityChart();
    }
    if (Object.keys(cantidadPorFamilia).length > 0) {
      generateFamilyChart();
    }
    if (Object.keys(cantidadPorCliente).length > 0) {
      generateClientChart();
    }
  }, [productosDenegadosMonto, productosAutorizadosMonto, productosAllMonto, productosDenegadosCantidad, productosAutorizadosCantidad, productosAllCantidad, cantidadPorFamilia, cantidadPorCliente]);

  const MySwal = withReactContent(Swal);

  const fetchProductosAutorizados = () => {
    fetch(`${api.addressEndpoints}/orders/informes-autorizados`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${props.jwt}`,
      },
    })
      .then((response) => response.json())
      .then((data) => {
        setProductosAutorizados(data.productosAutorizados);
        setProductosAutorizadosMonto(calcularMontoTotalAutorizado(data.productosAutorizados));
        setProductosAutorizadosCantidad(calcularCantidadTotalAutorizado(data.productosAutorizados));
      })
      .catch((err) => console.log(err));
  };

  const calcularMontos = (data) => {
    let totalDenegado = 0;
    let totalAutorizado = 0;
    let totalSolicitado = 0;

    data.forEach((pedido) => {
      pedido.productos.forEach((producto) => {
        totalSolicitado += producto.cantidad * producto.precio;
      });

      if (pedido.denegados) {
        pedido.denegados.forEach((producto) => {
          totalDenegado += producto.cantidad * producto.precio;
        });
      }

      if (pedido.autorizados) {
        pedido.autorizados.forEach((producto) => {
          totalAutorizado += producto.cantidad * producto.precio;
        });
      }
    });

    return [totalDenegado, totalAutorizado, totalSolicitado];
  };

  const calcularCantidades = (data) => {
    let cantidadDenegado = 0;
    let cantidadAutorizado = 0;
    let cantidadSolicitado = 0;

    data.forEach((pedido) => {
      pedido.productos.forEach((producto) => {
        cantidadSolicitado += producto.cantidad;
      });

      if (pedido.denegados) {
        pedido.denegados.forEach((producto) => {
          cantidadDenegado += producto.cantidad;
        });
      }

      if (pedido.autorizados) {
        pedido.autorizados.forEach((producto) => {
          cantidadAutorizado += producto.cantidad;
        });
      }
    });

    return [cantidadDenegado, cantidadAutorizado, cantidadSolicitado];
  };



  const fetchProductosDenegados = () => {
    fetch(`${api.addressEndpoints}/orders/informes-denegados`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${props.jwt}`,
      },
    })
      .then((response) => response.json())
      .then((data) => {
        setProductosDenegados(data.productosDenegados);
        setProductosDenegadosMonto(calcularMontoTotalDenegado(data.productosDenegados));
        setProductosDenegadosCantidad(calcularCantidadTotalDenegado(data.productosDenegados));
      })
      .catch((err) => console.log(err));
  };

  const fetchAllProductos = () => {
    fetch(`${api.addressEndpoints}/orders/todas`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${props.jwt}`,
      },
    })
      .then((response) => response.json())
      .then((data) => {
        setAllProducts(data.data);
        setProductosAllMonto(calcularMontoTotalSolicitado(data));
        setProductosAllCantidad(calcularCantidadTotalSolicitado(data));
        setCantidadPorFamilia(calcularCantidadPorFamilia(data));
        console.log(data)
        setCantidadPorCliente(calcularCantidadPorCliente(data));
      })
      .catch((err) => console.log(err));
  };


  const calcularMontoTotalDenegado = (data) => {
    let totalMontoDenegado = 0;
    data.forEach((pedido) => {
      pedido.productosDenegados.forEach((productosGrupo) => {
        productosGrupo.forEach((producto) => {
          totalMontoDenegado += parseFloat(producto.precio) * producto.cantidad;
        });
      });
    });
    return totalMontoDenegado;
  };

  const calcularMontoTotalSolicitado = (data) => {
    let totalMontoSolicitado = 0;
    data.forEach((pedido) => {
      pedido.productos.forEach((producto) => {
        totalMontoSolicitado += parseFloat(producto.precio) * producto.cantidad;
      });
    });
    return totalMontoSolicitado;
  };

  const calcularMontoTotalAutorizado = (data) => {
    let totalMontoAutorizado = 0;
    data.forEach((pedido) => {
      totalMontoAutorizado += parseFloat(pedido.montoAutorizado);
    });
    return totalMontoAutorizado;
  };

  const calcularCantidadTotalAutorizado = (data) => {
    let totalCantidadAutorizado = 0;
    data.forEach((pedido) => {
      pedido.productos.forEach((productosGrupo) => {
        productosGrupo.forEach((producto) => {
          totalCantidadAutorizado += producto.cantidad;
        });
      });
    });
    return totalCantidadAutorizado;
  };

  const calcularCantidadTotalDenegado = (data) => {
    let totalCantidadDenegado = 0;
    data.forEach((pedido) => {
      pedido.productosDenegados.forEach((productosGrupo) => {
        productosGrupo.forEach((producto) => {
          totalCantidadDenegado += producto.cantidad;
        });
      });
    });
    return totalCantidadDenegado;
  };

  const calcularCantidadTotalSolicitado = (data) => {
    let totalCantidadSolicitado = 0;
    data.forEach((pedido) => {
      pedido.productos.forEach((producto) => {
        totalCantidadSolicitado += producto.cantidad;
      });
    });
    return totalCantidadSolicitado;
  };


  const generateChart = () => {
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }
    const ctx = chartRef.current.getContext("2d");
    chartInstance.current = new Chart(ctx, {
      type: "bar",
      data: {
        labels: ["Denegados", "Autorizados", "Solicitados"],
        datasets: [
          {
            label: "Montos Comparativos",
            data: filteredMontos, // Datos filtrados
            backgroundColor: [
              "rgba(255, 99, 132, 0.6)",
              "rgba(54, 162, 235, 0.6)",
              "rgba(75, 192, 192, 0.6)",
            ],
            borderColor: [
              "rgba(255, 99, 132, 1)",
              "rgba(54, 162, 235, 1)",
              "rgba(75, 192, 192, 1)",
            ],
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: "top" },
          title: {
            display: true,
            text: "Comparación de Montos Denegados, Autorizados y Solicitados",
          },
        },
      },
    });
  };

  const generateQuantityChart = () => {
    if (quantityChartInstance.current) {
      quantityChartInstance.current.destroy();
    }
    const ctx = quantityChartRef.current.getContext("2d");
    quantityChartInstance.current = new Chart(ctx, {
      type: "bar",
      data: {
        labels: ["Denegados", "Autorizados", "Solicitados"],
        datasets: [
          {
            label: "Cantidades Comparativas",
            data: filteredCantidades, // Datos filtrados
            backgroundColor: [
              "rgba(255, 159, 64, 0.6)",
              "rgba(75, 192, 192, 0.6)",
              "rgba(153, 102, 255, 0.6)",
            ],
            borderColor: [
              "rgba(255, 159, 64, 1)",
              "rgba(75, 192, 192, 1)",
              "rgba(153, 102, 255, 1)",
            ],
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: "top" },
          title: {
            display: true,
            text: "Comparación de Cantidades Denegadas, Autorizadas y Solicitadas",
          },
        },
      },
    });
  };


  const generateFamilyChart = () => {
    if (familyChartInstance.current) {
      familyChartInstance.current.destroy();
    }
    const ctx = familyChartRef.current.getContext("2d");
    familyChartInstance.current = new Chart(ctx, {
      type: "bar",
      data: {
        labels: Object.keys(cantidadPorFamilia),
        datasets: [
          {
            label: "Cantidad de Productos por Familia",
            data: Object.values(cantidadPorFamilia),
            backgroundColor: "rgba(54, 162, 235, 0.6)",
            borderColor: "rgba(54, 162, 235, 1)",
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: "top",
          },
          title: {
            display: true,
            text: "Cantidad de Productos por Familia",
          },
        },
      },
    });
  };


  const generateClientChart = () => {
    if (clientChartInstance.current) {
      clientChartInstance.current.destroy();
    }
    const ctx = clientChartRef.current.getContext("2d");
    clientChartInstance.current = new Chart(ctx, {
      type: "bar",
      data: {
        labels: Object.keys(cantidadPorCliente),
        datasets: [
          {
            label: "Cantidad de Productos por Cliente",
            data: Object.values(cantidadPorCliente),
            backgroundColor: "rgba(255, 206, 86, 0.6)",
            borderColor: "rgba(255, 206, 86, 1)",
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: "top",
          },
          title: {
            display: true,
            text: "Cantidad de Productos Solicitados por Cliente",
          },
        },
      },
    });
  };

  const renderProductTable = () => {
    return (
      <div className="bg-white p-4 rounded-lg shadow-md w-full">
        <h3 className="text-lg font-semibold mb-4">Detalle de Productos Solicitados</h3>
        <table className="min-w-full table-auto">
          <thead>
            <tr>
              <th className="px-4 py-2 border">Descripción</th>
              <th className="px-4 py-2 border">Cantidad</th>
              <th className="px-4 py-2 border">Precio</th>
            </tr>
          </thead>
          <tbody>
            {allProducts.map((pedido, index) => (
              pedido.productos.map((producto, productoIndex) => (
                <tr key={`${index}-${productoIndex}`}>
                  <td className="px-4 py-2 border">{producto.descripcion}</td>
                  <td className="px-4 py-2 border">{producto.cantidad}</td>
                  <td className="px-4 py-2 border">{producto.precio}</td>
                </tr>
              ))
            ))}
          </tbody>
        </table>
      </div>
    );
  };


  const filtrarDatosPorClienteYFamilia = (cliente, familia, allProducts) => {
    let totalMontos = [0, 0, 0]; // [Denegados, Autorizados, Solicitados]
    let totalCantidades = [0, 0, 0]; // [Denegados, Autorizados, Solicitados]

    allProducts.forEach((pedido) => {
      // Filtrar por cliente si es necesario
      if (cliente !== "Todos" && pedido.cliente_nombre !== cliente) {
        return;
      }

      pedido.productos.forEach((producto) => {
        // Filtrar por familia si es necesario
        if (familia !== "Todos" && producto.familia !== familia) {
          return;
        }

        // Sumar a "Solicitados"
        totalMontos[2] += parseFloat(producto.precio) * producto.cantidad;
        totalCantidades[2] += producto.cantidad;
      });

      if (pedido.denegados) {
        pedido.denegados.forEach((producto) => {
          if (familia !== "Todos" && producto.familia !== familia) {
            return;
          }

          // Sumar a "Denegados"
          totalMontos[0] += parseFloat(producto.precio) * producto.cantidad;
          totalCantidades[0] += producto.cantidad;
        });
      }

      if (pedido.autorizados) {
        pedido.autorizados.forEach((producto) => {
          if (familia !== "Todos" && producto.familia !== familia) {
            return;
          }

          // Sumar a "Autorizados"
          totalMontos[1] += parseFloat(producto.precio) * producto.cantidad;
          totalCantidades[1] += producto.cantidad;
        });
      }
    });

    return { totalMontos, totalCantidades };
  };


  const generarReporteDenegadosPDF = async () => {
    const doc = new jsPDF();
    const logoBase64 = await loadImageToBase64(`${logo}`);
    doc.addImage(logoBase64, "PNG", 15, 12, 25, 25);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    const pageWidth = doc.internal.pageSize.getWidth();
    const marginRight = 10;
    const nombreNegocio = "FSP GLOBAL TOOLS";
    const nombreNegocioWidth = doc.getTextWidth(nombreNegocio);
    doc.text(nombreNegocio, pageWidth - nombreNegocioWidth - marginRight, 15);
    doc.setFont("helvetica", "normal");
    const infoNegocio = [
      "Calle egipto 610, CP:25230, Saltillo Coahuila",
      "Teléfono: +52 123 456 7890",
      "Email: contacto@globalcar.mx",
    ];
    infoNegocio.forEach((linea, index) => {
      const textWidth = doc.getTextWidth(linea);
      doc.text(linea, pageWidth - textWidth - marginRight, 22 + index * 7);
    });
    doc.line(10, 45, 200, 45);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Reporte de Productos Denegados", 10, 55);
    const reporteSimplificado = productosDenegados
      .filter((item) => item.productosDenegados && item.productosDenegados.length > 0)
      .map((item) => {
        const productosDenegadosFlattened = item.productosDenegados.flat();
        const montoTotal = productosDenegadosFlattened.reduce((total, producto) => {
          const precioNumerico = parseFloat(producto.precio.replace(",", "."));
          return total + producto.cantidad * precioNumerico;
        }, 0);
        return {
          clienteNombre: item.clienteNombre,
          productosDenegados: productosDenegadosFlattened.map((producto) => ({
            descripcion: producto.descripcion,
            cantidad: producto.cantidad,
            precio: producto.precio,
          })),
          montoTotal,
        };
      });
    if (reporteSimplificado.length === 0) {
      doc.text("No hay productos denegados para mostrar.", 10, 70);
      doc.save("reporte_productos_denegados.pdf");
      return;
    }
    let yPosition = 65;
    reporteSimplificado.forEach((cliente, index) => {
      const montoTotal = formatoMoneda(cliente.montoTotal);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(`Cliente: ${cliente.clienteNombre}`, 14, yPosition);
      const productosDenegados = cliente.productosDenegados.map((producto) => [
        producto.descripcion,
        producto.cantidad,
        producto.precio,
      ]);
      doc.autoTable({
        startY: yPosition + 7,
        head: [["Producto", "Cantidad", "Precio"]],
        body: productosDenegados,
      });
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Monto Total: ${montoTotal}`, 14, doc.lastAutoTable.finalY + 10);
      yPosition = doc.lastAutoTable.finalY + 20;
    });
    let totalMontoDenegado = 0;
    reporteSimplificado.forEach((cliente) => {
      totalMontoDenegado += parseFloat(cliente.montoTotal);
    });
    const totalMontoFormateado = new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(totalMontoDenegado);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`Total de Monto Denegado: ${totalMontoFormateado}`, 10, doc.internal.pageSize.height - 30);
    const totalPages = doc.internal.pages.length;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(
      `Página ${doc.internal.getCurrentPageInfo().pageNumber} de ${totalPages}`,
      pageWidth - 30,
      doc.internal.pageSize.height - 10
    );
    doc.save("reporte_productos_denegados.pdf");
  };

  const loadImageToBase64 = (imagePath) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = imagePath;
      img.crossOrigin = "Anonymous";

      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);

        resolve(canvas.toDataURL("image/png"));
      };

      img.onerror = (error) => reject("Error al cargar la imagen: " + error);
    });
  };
  const formatoMoneda = (monto) => {
    return new Intl.NumberFormat("es-MX", {
        style: "currency",
        currency: "MXN",
    }).format(Number(monto));
};

  const generarReporteSolicitadosPDF = async () => {
    const doc = new jsPDF();

    // Logo del negocio (requiere un archivo base64 o imagen cargada)
    const logoBase64 = await loadImageToBase64(`${logo}`);  // Cambia 'logo' con la ruta de tu logo
    doc.addImage(logoBase64, "PNG", 15, 12, 25, 25); // Ajusta posición y tamaño (x, y, width, height)

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");

    // Información del negocio alineada a la derecha
    const pageWidth = doc.internal.pageSize.getWidth();
    const marginRight = 10;

    // Nombre del negocio (en negritas)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    const nombreNegocio = "FSP GLOBAL TOOLS";
    const nombreNegocioWidth = doc.getTextWidth(nombreNegocio);
    doc.text(nombreNegocio, pageWidth - nombreNegocioWidth - marginRight, 15);

    // Resto de la información (en fuente normal)
    doc.setFont("helvetica", "normal");
    const infoNegocio = [
        "Calle egipto 610, CP:25230, Saltillo Coahuila",
        "Teléfono: +52 123 456 7890",
        "Email: contacto@globalcar.mx",
    ];

    infoNegocio.forEach((linea, index) => {
        const textWidth = doc.getTextWidth(linea);
        doc.text(linea, pageWidth - textWidth - marginRight, 22 + index * 7); // Ajustar 'y' con un offset
    });

    // Línea divisoria
    doc.line(10, 45, 200, 45); // Línea de separación (x1, y1, x2, y2)

    // Título principal
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Reporte de Productos Solicitados", 10, 55);

    // Filtrar y mapear los productos solicitados
    const reporteSimplificado = allProducts
        .filter((item) => item.productos && item.productos.length > 0) // Filtrar solo aquellos con productos
        .map((item) => {
            // Aplanar los productos solicitados
            const productosSolicitadosFlattened = item.productos.flat();

            // Calcular el monto total solicitado por cliente
            const montoTotal = productosSolicitadosFlattened.reduce((total, producto) => {
                // Convertir precio a número
                const precioNumerico = parseFloat(producto.precio.replace(',', '.'));
                return total + (producto.cantidad * precioNumerico); // Sumar cantidad * precio de cada producto
            }, 0);

            return {
                clienteNombre: item.cliente_nombre,
                productosSolicitados: productosSolicitadosFlattened.map((producto) => ({
                    descripcion: producto.descripcion,
                    cantidad: producto.cantidad,
                    precio: producto.precio,
                })),
                montoTotal, // Agregar el monto total solicitado
            };
        });

    // Si no hay productos solicitados, salimos de la función sin generar el PDF
    if (reporteSimplificado.length === 0) {
        doc.text("No hay productos solicitados para mostrar.", 10, 70);
        doc.save("reporte_productos_solicitados.pdf");
        return;
    }

    // Contenido del reporte
    let yPosition = 65;
    reporteSimplificado.forEach((cliente, index) => {
        const montoTotal = formatoMoneda(cliente.montoTotal);

        // Título por cliente
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text(`Cliente: ${cliente.clienteNombre}`, 14, yPosition);

        // Tabla para los productos solicitados
        const productosSolicitados = cliente.productosSolicitados.map((producto) => [
            producto.descripcion,
            producto.cantidad,
            producto.precio,
        ]);

        doc.autoTable({
            startY: yPosition + 7,
            head: [["Producto", "Cantidad", "Precio"]],
            body: productosSolicitados,
        });

        // Monto total solicitado
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(
            `Monto Total: ${montoTotal}`,
            14,
            doc.lastAutoTable.finalY + 10
        );

        // Actualizar la posición Y para el siguiente cliente
        yPosition = doc.lastAutoTable.finalY + 20;
    });

    // Calcular el total de todos los montos solicitados
    let totalMontoSolicitado = 0;
    reporteSimplificado.forEach(cliente => {
        totalMontoSolicitado += parseFloat(cliente.montoTotal);
    });

    // Formatear el monto total como dinero
    const totalMontoFormateado = new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
    }).format(totalMontoSolicitado);

    // Mostrar el total de los montos solicitados en formato de dinero
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`Total de Monto Solicitado: ${totalMontoFormateado}`, 10, doc.internal.pageSize.height - 30);

    // Agregar el número de página al final de la página
    const totalPages = doc.internal.pages.length;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(
        `Página ${doc.internal.getCurrentPageInfo().pageNumber} de ${totalPages}`,
        pageWidth - 30,
        doc.internal.pageSize.height - 10
    );

    // Descargar el PDF
    doc.save("reporte_productos_solicitados.pdf");
  };
  const generarReporteAutorizadosPDF = async () => {
    const doc = new jsPDF();

    // Logo del negocio (requiere un archivo base64 o imagen cargada)
    const logoBase64 = await loadImageToBase64(`${logo}`);  // Cambia 'logo' con la ruta de tu logo
    doc.addImage(logoBase64, "PNG", 15, 12, 25, 25); // Ajusta posición y tamaño (x, y, width, height)

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");

    // Información del negocio alineada a la derecha
    const pageWidth = doc.internal.pageSize.getWidth();
    const marginRight = 10;

    // Nombre del negocio (en negritas)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    const nombreNegocio = "FSP GLOBAL TOOLS";
    const nombreNegocioWidth = doc.getTextWidth(nombreNegocio);
    doc.text(nombreNegocio, pageWidth - nombreNegocioWidth - marginRight, 15);

    // Resto de la información (en fuente normal)
    doc.setFont("helvetica", "normal");
    const infoNegocio = [
        "Calle egipto 610, CP:25230, Saltillo Coahuila",
        "Teléfono: +52 123 456 7890",
        "Email: contacto@globalcar.mx",
    ];

    infoNegocio.forEach((linea, index) => {
        const textWidth = doc.getTextWidth(linea);
        doc.text(linea, pageWidth - textWidth - marginRight, 22 + index * 7); // Ajustar 'y' con un offset
    });

    // Línea divisoria
    doc.line(10, 45, 200, 45); // Línea de separación (x1, y1, x2, y2)

    // Título principal
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Reporte de Productos Solicitados", 10, 55);

    // Filtrar y mapear los productos solicitados
    const reporteSimplificado = productosAutorizados
        .filter((item) => item.productos && item.productos.length > 0) // Filtrar solo aquellos con productos
        .map((item) => {
            // Aplanar los productos solicitados
            const productosSolicitadosFlattened = item.productos.flat();

            // Calcular el monto total solicitado por cliente
            const montoTotal = productosSolicitadosFlattened.reduce((total, producto) => {
                // Convertir precio a número
                const precioNumerico = parseFloat(producto.precio.replace(',', '.'));
                return total + (producto.cantidad * precioNumerico); // Sumar cantidad * precio de cada producto
            }, 0);

            return {
                clienteNombre: item.clienteNombre,
                productosSolicitados: productosSolicitadosFlattened.map((producto) => ({
                    descripcion: producto.descripcion,
                    cantidad: producto.cantidad,
                    precio: producto.precio,
                })),
                montoTotal, // Agregar el monto total solicitado
            };
        });

    // Si no hay productos solicitados, salimos de la función sin generar el PDF
    if (reporteSimplificado.length === 0) {
        doc.text("No hay productos solicitados para mostrar.", 10, 70);
        doc.save("reporte_productos_solicitados.pdf");
        return;
    }

    // Contenido del reporte
    let yPosition = 65;
    reporteSimplificado.forEach((cliente, index) => {
        const montoTotal = formatoMoneda(cliente.montoTotal);

        // Título por cliente
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text(`Cliente: ${cliente.clienteNombre}`, 14, yPosition);

        // Tabla para los productos solicitados
        const productosSolicitados = cliente.productosSolicitados.map((producto) => [
            producto.descripcion,
            producto.cantidad,
            producto.precio,
        ]);

        doc.autoTable({
            startY: yPosition + 7,
            head: [["Producto", "Cantidad", "Precio"]],
            body: productosSolicitados,
        });

        // Monto total solicitado
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(
            `Monto Total: ${montoTotal}`,
            14,
            doc.lastAutoTable.finalY + 10
        );

        // Actualizar la posición Y para el siguiente cliente
        yPosition = doc.lastAutoTable.finalY + 20;
    });

    // Calcular el total de todos los montos solicitados
    let totalMontoSolicitado = 0;
    reporteSimplificado.forEach(cliente => {
        totalMontoSolicitado += parseFloat(cliente.montoTotal);
    });

    // Formatear el monto total como dinero
    const totalMontoFormateado = new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
    }).format(totalMontoSolicitado);

    // Mostrar el total de los montos solicitados en formato de dinero
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`Total de Monto Solicitado: ${totalMontoFormateado}`, 10, doc.internal.pageSize.height - 30);

    // Agregar el número de página al final de la página
    const totalPages = doc.internal.pages.length;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(
        `Página ${doc.internal.getCurrentPageInfo().pageNumber} de ${totalPages}`,
        pageWidth - 30,
        doc.internal.pageSize.height - 10
    );

    // Descargar el PDF
    doc.save("reporte_productos_autorizados.pdf");
  };

  console.log(allProducts)
  return (
    <>
      <div className="dashboard">
        <div className="dashboard__aside">
          <DashboardAside setIsLoggedIn={props.setIsLoggedIn} />
        </div>
        <div className="dashboard__component">
          <HeaderApp page="Informes" />
          <div className="dashboard__table mt-10">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-10">Reportes y Estadísticas</h2>
              <div className="flex justify-between items-center mb-6 w-96">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Filtrar por Cliente:</label>
                  <select
                    value={selectedCliente}
                    onChange={(e) => setSelectedCliente(e.target.value)}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option value="Todos">Todos</option>
                    {Object.keys(cantidadPorCliente).map((cliente) => (
                      <option key={cliente} value={cliente}>
                        {cliente}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Filtrar por Familia:</label>
                  <select
                    value={selectedFamilia}
                    onChange={(e) => setSelectedFamilia(e.target.value)}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option value="Todos">Todos</option>
                    {Object.keys(cantidadPorFamilia).map((familia) => (
                      <option key={familia} value={familia}>
                        {familia}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                <div className="bg-white p-4 rounded-lg shadow-md flex flex-col justify-center items-center">
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Productos Solicitados</h3>
                    <button
                      className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                      onClick={generarReporteSolicitadosPDF}
                    >
                      Descargar PDF
                    </button>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Productos Autorizados</h3>
                    <button
                      className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                      onClick={generarReporteAutorizadosPDF}
                    >
                      Descargar PDF
                    </button>
                  </div>
                  <div>
                  <h3 className="text-lg font-semibold mb-4">Productos Denegados</h3>
                  <button
                    className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                    onClick={generarReporteDenegadosPDF}
                  >
                    Descargar PDF
                  </button>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-md flex flex-col justify-center items-center">
                  <h3 className="text-lg font-semibold mb-4">Gráfica de Montos</h3>
                  <canvas ref={chartRef} />
                </div>
                <div className="bg-white p-4 rounded-lg shadow-md flex flex-col justify-center items-center">
                  <h3 className="text-lg font-semibold mb-4">Gráfica de Cantidades</h3>
                  <canvas ref={quantityChartRef} />
                </div>
                <div className="bg-white p-4 rounded-lg shadow-md flex flex-col justify-center items-center">
                  <h3 className="text-lg font-semibold mb-4">Cantidad de Productos por Familia</h3>
                  <canvas ref={familyChartRef} />
                </div>
                <div className="bg-white p-4 rounded-lg shadow-md flex flex-col justify-center items-center">
                  <h3 className="text-lg font-semibold mb-4">Cantidad de Productos por Cliente</h3>
                  <canvas ref={clientChartRef} />
                </div>
                {renderProductTable()}
              </div>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}

export default InformesPage;
