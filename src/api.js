export const API_BASE_URL = (process.env.REACT_APP_BACKEND_URL || "http://localhost:5000").replace(/\/$/, "");

export const getAuthToken = () => localStorage.getItem("token");

const buildUrl = (path, params) => {
  const qs = params ? new URLSearchParams(params).toString() : "";
  return `${API_BASE_URL}${path}${qs ? `?${qs}` : ""}`;
};

async function request(path, options = {}) {
  const { body, params, headers, ...fetchOptions } = options;
  const token = getAuthToken();
  const res = await fetch(buildUrl(path, params), {
    ...fetchOptions,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  if (res.status === 401) localStorage.removeItem("token");
  if (!res.ok) {
    const err = new Error(data.error || data.mensaje || `Error ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

const get = (path, params) => request(path, { params });
const post = (path, body) => request(path, { method: "POST", body });
const put = (path, body) => request(path, { method: "PUT", body });
const patch = (path, body) => request(path, { method: "PATCH", body });
const del = (path) => request(path, { method: "DELETE" });

export const auth = {
  usuariosLogin: () => get("/api/auth/usuarios-login"),
  identificar: (codigo) => post("/api/auth/identificar", { codigo }),
  login: (body) => post("/api/auth/login", body),
  me: () => get("/api/auth/me"),
  registrarNombreClave: (nombre_clave) => post("/api/auth/nombre-clave", { nombre_clave }),
  registrarBiometria: (token_dispositivo) => post("/api/auth/biometria", { token_dispositivo }),
};

export const asistencia = {
  reporte: (params = {}) => get("/api/auth/asistencia", params),
  exportUrl: (params = {}) => buildUrl("/api/auth/asistencia", params),
};

export const pedidos = {
  listarActivos: () => get("/api/pedidos/activos"),
  historial: (params = {}) => get("/api/pedidos/historial", params),
  crear: (body) => post("/api/pedidos", body),
  actualizar: (id_pedido, body) => patch(`/api/pedidos/${id_pedido}`, body),
  cobrar: (id_pedido, body) => post(`/api/pedidos/${id_pedido}/cobrar`, body),
  anular: (id_pedido, body) => post(`/api/pedidos/${id_pedido}/anular`, body),
  actualizarCocina: (id_pedido, estado_cocina) => patch(`/api/pedidos/${id_pedido}/cocina`, { estado_cocina }),
  actualizarChecks: (id_pedido, body) => patch(`/api/pedidos/${id_pedido}/checks`, body),
  agregarItems: (id_pedido, body) => post(`/api/pedidos/${id_pedido}/items`, body),
  finalizar: (id_pedido) => post(`/api/pedidos/${id_pedido}/finalizar`),
};

export const menu = {
  obtener: () => get("/api/menu"),
  agregarItem: (body) => post("/api/menu", body),
  eliminarItem: (id_producto) => del(`/api/menu/${id_producto}`),
};

export const config = {
  obtener: () => get("/api/config"),
  actualizar: (clave, valor) => patch("/api/config", { clave, valor }),
  actualizarBulk: (cambios) => put("/api/config/bulk", cambios),
};

export const mesas = {
  listar: () => get("/api/mesas"),
  agregar: () => post("/api/mesas"),
  eliminar: (id_mesa) => del(`/api/mesas/${id_mesa}`),
};

export const solicitudes = {
  listarPendientes: () => get("/api/solicitudes/pendientes"),
  crear: (body) => post("/api/solicitudes", body),
  resolver: (id_solicitud, body) => patch(`/api/solicitudes/${id_solicitud}/resolver`, body),
};

export const caja = {
  obtenerActiva: () => get("/api/caja/activa"),
  abrir: (fondo_inicial) => post("/api/caja/abrir", { fondo_inicial }),
  cerrar: () => post("/api/caja/cerrar"),
};

export const facturacion = {
  emitir: (body) => post("/api/facturacion/emitir", body),
  config: () => get("/api/facturacion/configuracion"),
  consultarDocumento: (params) => get("/api/facturacion/documento", params),
  comprobantes: (params = {}) => get("/api/facturacion/comprobantes", params),
  porPedido: (id_pedido) => get(`/api/facturacion/pedido/${id_pedido}`),
  obtener: (id_comprobante) => get(`/api/facturacion/${id_comprobante}`),
  enviar: (id_comprobante) => post(`/api/facturacion/${id_comprobante}/enviar`),
};

export const reportes = {
  ventas: (params = {}) => get("/api/reportes/ventas", params),
  auditoria: (params = {}) => get("/api/reportes/auditoria", params),
  exportUrl: (params = {}) => buildUrl("/api/reportes/exportar", params),
};

export const staff = {
  listar: () => get("/api/usuarios"),
  listarLocales: () => get("/api/usuarios/locales-disponibles"),
  crear: (body) => post("/api/usuarios", body),
  actualizar: (id_usuario, body) => patch(`/api/usuarios/${id_usuario}`, body),
  resetPin: (id_usuario, nuevo_pin) => patch(`/api/usuarios/${id_usuario}/pin`, { nuevo_pin }),
  actualizarAcceso: (id_usuario, body) => patch(`/api/usuarios/${id_usuario}/acceso`, body),
  eliminar: (id_usuario) => del(`/api/usuarios/${id_usuario}`),
};

export const requerimientos = {
  plantilla: () => get("/api/requerimientos/plantilla"),
  listar: () => get("/api/requerimientos"),
  crear: (body) => post("/api/requerimientos", body),
  obtener: (id_requerimiento) => get(`/api/requerimientos/${id_requerimiento}`),
  actualizar: (id_requerimiento, body) => patch(`/api/requerimientos/${id_requerimiento}`, body),
  finalizar: (id_requerimiento) => post(`/api/requerimientos/${id_requerimiento}/finalizar`),
  exportUrl: (id_requerimiento, formato = "xlsx") =>
    buildUrl(`/api/requerimientos/${id_requerimiento}/exportar`, { formato }),
};
