/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

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

  // Solo facturamos si el pedido está pagado y no se ha generado una boleta antes
  if (order.status !== "pagado" || order.enlace_pdf) {
    return;
  }

  try {
    // 1. Calcular totales matemáticos (Desglosando el 18% de IGV)
    const total = Number(order.total);
    const gravada = total / 1.18;
    const igv = total - gravada;
    
    // 2. Formatear la fecha
    const fecha = new Date(order.paidAt || order.createdAt);
    const fechaEmision = fecha.toISOString().split('T')[0];

    // 3. Preparar los ítems del pedido
    const items = order.items.map(item => {
      const precioUnitario = Number(item.price);
      const subtotalItem = (precioUnitario * item.qty) / 1.18;
      const igvItem = (precioUnitario * item.qty) - subtotalItem;

      return {
        "unidad_de_medida": "NIU",
        "codigo": item.id,
        "descripcion": item.name,
        "cantidad": item.qty,
        "valor_unitario": (precioUnitario / 1.18).toFixed(2), // Precio sin IGV
        "precio_unitario": precioUnitario.toFixed(2),         // Precio con IGV
        "subtotal": subtotalItem.toFixed(2),
        "tipo_de_igv": "1", // Gravado - Operación Onerosa
        "igv": igvItem.toFixed(2),
        "total": (precioUnitario * item.qty).toFixed(2),
        "anticipo_regularizacion": "false"
      };// 5. Estructurar el JSON exacto para NubeFact
    const payload = {
      "operacion": "generar_comprobante",
      "tipo_de_comprobante": "2", // 2 = Boleta de Venta Electrónica
      "serie": "BBB1",            // Serie de Boletas que tienes en NubeFact
      "numero": "",               // Vacío para que NubeFact ponga el número automático
      "sunat_transaction": "1",   // 1 = Venta Interna
      "cliente_tipo_de_documento": "-", 
      "cliente_numero_de_documento": "-",
      "cliente_denominacion": "CLIENTE VARIOS",
      "cliente_direccion": "",
      "cliente_email": "",
      "fecha_de_emision": fechaEmision,
      "moneda": "1",              // 1 = Soles
      "porcentaje_de_igv": "18.00",
      "total_gravada": gravada.toFixed(2),
      "total_igv": igv.toFixed(2),
      "total": total.toFixed(2),
      "enviar_automaticamente_a_la_sunat": "true",
      "enviar_automaticamente_al_cliente": "false",
      "codigo_unico": order.id,   // <--- 🚨 ESTA ES LA LÍNEA NUEVA QUE EXIGE NUBEFACT 🚨
      "items": items
    };
    });

    // 4. Si cobraron taper, lo añadimos como un ítem extra en la boleta
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

    // 5. Estructurar el JSON exacto para NubeFact
   // 5. Estructurar el JSON exacto para NubeFact
    const payload = {
      "operacion": "generar_comprobante",
      "tipo_de_comprobante": "2", // 2 = Boleta de Venta Electrónica
      "serie": "BBB1",            // Serie de Boletas que tienes en NubeFact
      "numero": "",               // Vacío para que NubeFact ponga el número automático
      "sunat_transaction": "1",   // 1 = Venta Interna
      "cliente_tipo_de_documento": "-", 
      "cliente_numero_de_documento": "-",
      "cliente_denominacion": "CLIENTE VARIOS",
      "cliente_direccion": "",
      "cliente_email": "",
      "fecha_de_emision": fechaEmision,
      "moneda": "1",              // 1 = Soles
      "porcentaje_de_igv": "18.00",
      "total_gravada": gravada.toFixed(2),
      "total_igv": igv.toFixed(2),
      "total": total.toFixed(2),
      "enviar_automaticamente_a_la_sunat": "true",
      "enviar_automaticamente_al_cliente": "false",
      "codigo_unico": order.id,   // <--- 🚨 ESTA ES LA LÍNEA NUEVA QUE EXIGE NUBEFACT 🚨
      "items": items
    };

    // 6. Disparar la información a NubeFact
    const response = await axios.post(RUTA_NUBEFACT, payload, {
      headers: {
        "Authorization": `Bearer ${TOKEN_NUBEFACT}`,
        "Content-Type": "application/json"
      }
    });

    const data = response.data;
    
    // 7. Si fue un éxito, guardar el PDF de la boleta en el pedido de Firestore
    if (data.enlace_del_pdf) {
       await snap.ref.update({
         enlace_pdf: data.enlace_del_pdf,
         comprobante_numero: `${data.serie}-${data.numero}`
       });
       console.log(`Boleta generada con éxito: ${data.serie}-${data.numero}`);
    }

  } catch (error) {
    // Si la SUNAT o NubeFact rechazan la boleta, guardamos el error en los logs
    console.error(" Error NubeFact:", error.response ? error.response.data : error.message);
  }
});
// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
