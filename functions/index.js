const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { getFirestore } = require("firebase-admin/firestore");
const admin = require("firebase-admin");
const axios = require("axios");

admin.initializeApp();
const db = getFirestore();

// 🚨 AQUÍ PEGA TU RUTA Y TU TOKEN DE NUBEFACT 🚨
const RUTA_NUBEFACT = "https://api.nubefact.com/api/v1/086e83b2-99c0-4158-9eb7-4f6cd4df1315";
const TOKEN_NUBEFACT = "6190df51b80647fabd7d4ca8c81324a702e671297b734faa90320c8957c5c42e";

exports.generarBoleta = onDocumentCreated("mrpapachos_historial/{orderId}", async (event) => {
  const snap = event.data;
  if (!snap) return;
  const order = snap.data();

  if (order.status !== "pagado" || order.enlace_pdf) {
    return;
  }

  try {
    const total = Number(order.total);
    const gravada = total / 1.18;
    const igv = total - gravada;
    
    const fecha = new Date(order.paidAt || order.createdAt);
    const fechaEmision = fecha.toISOString().split('T')[0];

    const items = order.items.map(item => {
      const precioUnitario = Number(item.price);
      const subtotalItem = (precioUnitario * item.qty) / 1.18;
      const igvItem = (precioUnitario * item.qty) - subtotalItem;

      return {
        "unidad_de_medida": "NIU",
        "codigo": item.id,
        "descripcion": item.name,
        "cantidad": item.qty,
        "valor_unitario": (precioUnitario / 1.18).toFixed(2), 
        "precio_unitario": precioUnitario.toFixed(2),         
        "subtotal": subtotalItem.toFixed(2),
        "tipo_de_igv": "1", 
        "igv": igvItem.toFixed(2),
        "total": (precioUnitario * item.qty).toFixed(2),
        "anticipo_regularizacion": "false"
      };
    });

    if (order.taperCost && Number(order.taperCost) > 0) {
        const taperTotal = Number(order.taperCost);
        const taperGravada = taperTotal / 1.18;
        const taperIgv = taperTotal - taperGravada;
        items.push({
            "unidad_de_medida": "NIU",
            "codigo": "TAPER",
            "descripcion": "Taper / Bolsa",
            "cantidad": 1,
            "valor_unitario": taperGravada.toFixed(2),
            "precio_unitario": taperTotal.toFixed(2),
            "subtotal": taperGravada.toFixed(2),
            "tipo_de_igv": "1",
            "igv": taperIgv.toFixed(2),
            "total": taperTotal.toFixed(2),
            "anticipo_regularizacion": "false"
        });
    }

    // Lógica dinámica para Boleta o Factura
    let tipoComprobante = "2"; // 2 = Boleta por defecto
    let serieComprobante = "BBB1";
    let tipoDocCliente = "-";
    let numDocCliente = "-";
    let nombreCliente = "CLIENTE VARIOS";
    let direccionCliente = "";

    if (order.sunatDocType === "RUC") {
        tipoComprobante = "1"; // 1 = Factura
        serieComprobante = "FFF1";
        tipoDocCliente = "6"; // 6 = RUC
        numDocCliente = order.sunatDocNum || "00000000000";
        nombreCliente = order.sunatCustomerName || "SIN RAZON SOCIAL";
        direccionCliente = order.sunatCustomerAddress || "-";
    } else if (order.sunatDocType === "DNI") {
        tipoComprobante = "2"; // 2 = Boleta
        serieComprobante = "BBB1";
        tipoDocCliente = "1"; // 1 = DNI
        numDocCliente = order.sunatDocNum || "00000000";
        nombreCliente = order.sunatCustomerName || "SIN NOMBRE";
        direccionCliente = order.sunatCustomerAddress || "";
    }

    const payload = {
      "operacion": "generar_comprobante",
      "tipo_de_comprobante": tipoComprobante, 
      "serie": serieComprobante,            
      "numero": "",               
      "sunat_transaction": "1",   
      "cliente_tipo_de_documento": tipoDocCliente, 
      "cliente_numero_de_documento": numDocCliente,
      "cliente_denominacion": nombreCliente,
      "cliente_direccion": direccionCliente,
      "cliente_email": "",
      "fecha_de_emision": fechaEmision,
      "moneda": "1",              
      "porcentaje_de_igv": "18.00",
      "total_gravada": gravada.toFixed(2),
      "total_igv": igv.toFixed(2),
      "total": total.toFixed(2),
      "enviar_automaticamente_a_la_sunat": "true",
      "enviar_automaticamente_al_cliente": "false",
      "codigo_unico": order.id,
      "items": items
    };

    const response = await axios.post(RUTA_NUBEFACT, payload, {
      headers: {
        "Authorization": `Bearer ${TOKEN_NUBEFACT}`,
        "Content-Type": "application/json"
      }
    });

    const data = response.data;
    
    if (data.enlace_del_pdf) {
       await snap.ref.update({
         enlace_pdf: data.enlace_del_pdf,
         comprobante_numero: `${data.serie}-${data.numero}`
       });
       console.log(`✅ ${order.sunatDocType === "RUC" ? "Factura" : "Boleta"} generada con éxito: ${data.serie}-${data.numero}`);
    }

  } catch (error) {
    console.error("❌ Error NubeFact:", error.response ? error.response.data : error.message);
  }
});