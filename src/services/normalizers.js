const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseJson = (value, fallback = {}) => {
  if (!value) return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

export const roleToApp = (role) => {
  const normalized = String(role || "").trim().toUpperCase();
  if (normalized === "ADMIN" || normalized === "SUPERADMIN") return "admin";
  if (normalized === "CAJERO") return "cajero";
  if (normalized === "MESERO" || normalized === "ATENCION_CLIENTE" || normalized === "ATENCION AL CLIENTE") return "mesero";
  if (normalized === "COCINA" || normalized === "COCINERO") return "cocinero";
  return normalized.toLowerCase();
};

export const normalizeRoles = (roles = []) => {
  const source = Array.isArray(roles) ? roles : [roles];
  return [...new Set(source.map(roleToApp).filter(Boolean))];
};

export const normalizeMenuItem = (item = {}) => {
  const id = item.id ?? item.id_producto ?? item.productId ?? item.codigo;
  const price = toNumber(item.price ?? item.precio_base ?? item.precio ?? item.precio_unitario);
  const cat = item.cat ?? item.categoria ?? item.nombre_categoria ?? item.category ?? "Sin categoria";
  const name = item.name ?? item.nombre ?? item.nombre_producto ?? "";

  return {
    ...item,
    id,
    id_producto: item.id_producto ?? id,
    cat,
    categoria: item.categoria ?? cat,
    name,
    nombre: item.nombre ?? name,
    price,
    precio: item.precio ?? price,
    precio_base: item.precio_base ?? price,
    desc: item.desc ?? item.descripcion ?? "",
    descripcion: item.descripcion ?? item.desc ?? "",
  };
};

export const normalizeMenu = (items = []) =>
  (Array.isArray(items) ? items : [])
    .map(normalizeMenuItem)
    .filter((item) => item.id !== undefined && item.id !== null && item.name);

export const normalizeOrderItem = (item = {}) => {
  const id = item.id ?? item.id_producto ?? item.productId;
  const qty = toNumber(item.qty ?? item.cantidad, 0);
  const price = toNumber(
    item.price ?? item.precio ?? item.precio_unitario_historico ?? item.precio_unitario,
    0
  );
  const cat = item.cat ?? item.categoria ?? item.nombre_categoria ?? "Sin categoria";
  const name = item.name ?? item.nombre ?? item.nombre_producto ?? "";
  const notes = item.notes ?? item.notas ?? item.notas_plato ?? "";

  return {
    ...item,
    id,
    id_producto: item.id_producto ?? id,
    id_detalle: item.id_detalle,
    cat,
    categoria: item.categoria ?? cat,
    name,
    nombre: item.nombre ?? name,
    qty,
    cantidad: qty,
    price,
    precio: item.precio ?? price,
    notes,
    notas: item.notas ?? notes,
    isLlevar: Boolean(item.isLlevar ?? item.es_para_llevar ?? item.llevar),
    opciones: item.opciones || [],
  };
};

export const normalizeOrder = (pedido = {}) => {
  const items = (Array.isArray(pedido.items) ? pedido.items : [])
    .map(normalizeOrderItem)
    .filter((item) => item.id !== undefined && item.id !== null && item.qty > 0);

  const estadoPago = String(pedido.estado_pago ?? pedido.status ?? "").toUpperCase();
  const rawTipo = String(pedido.tipo_pedido ?? pedido.orderType ?? "").toUpperCase();
  const isMesa =
    rawTipo === "MESA" ||
    pedido.orderType === "mesa" ||
    String(pedido.identificador_cliente || "").toLowerCase().startsWith("mesa");

  const identificador = pedido.identificador_cliente ?? pedido.customer ?? "";
  const table = isMesa
    ? String(pedido.table ?? identificador).replace(/^Mesa\s*/i, "").trim()
    : "";

  const explicitTotal = pedido.total ?? pedido.monto_total ?? pedido.total_pedido;
  const calculatedTotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const total = explicitTotal !== undefined && explicitTotal !== null
    ? toNumber(explicitTotal, calculatedTotal)
    : calculatedTotal;

  return {
    ...pedido,
    id: pedido.id ?? pedido.id_pedido,
    id_pedido: pedido.id_pedido ?? pedido.id,
    status: pedido.status ?? (estadoPago ? estadoPago.toLowerCase() : undefined),
    table,
    orderType: isMesa ? "mesa" : "llevar",
    createdAt: pedido.createdAt ?? pedido.creado_en ?? pedido.created_at ?? null,
    paidAt: pedido.paidAt ?? pedido.pagado_en ?? pedido.paid_at ?? null,
    kitchenStatus: String(pedido.kitchenStatus ?? pedido.estado_cocina ?? "PENDIENTE").toLowerCase(),
    estado_cocina: pedido.estado_cocina ?? String(pedido.kitchenStatus ?? "PENDIENTE").toUpperCase(),
    isPaid: Boolean(pedido.isPaid ?? estadoPago === "PAGADO"),
    anulado: Boolean(pedido.anulado ?? estadoPago === "ANULADO"),
    total,
    items,
    itemChecks: parseJson(pedido.itemChecks ?? pedido.checks ?? pedido.item_checks, {}),
    payments: parseJson(pedido.payments ?? pedido.pagos, pedido.payments || undefined),
    payment: pedido.payment ?? (String(pedido.metodo_pago || "").toLowerCase() || undefined),
    _mesero: pedido._mesero ?? pedido.nombre_mesero ?? pedido.mesero ?? "",
  };
};

export const normalizeOrders = (orders = []) =>
  (Array.isArray(orders) ? orders : []).map(normalizeOrder);

export const normalizeMesa = (mesa = {}) => ({
  ...mesa,
  id_mesa: mesa.id_mesa ?? mesa.id,
  numero: toNumber(mesa.numero ?? mesa.number),
});

export const normalizeMesas = (mesas = []) =>
  (Array.isArray(mesas) ? mesas : [])
    .map(normalizeMesa)
    .filter((mesa) => mesa.numero > 0);

export const normalizeStaffUser = (user = {}) => ({
  ...user,
  id: user.id ?? user.id_usuario,
  id_usuario: user.id_usuario ?? user.id,
  name: user.name ?? user.nombre ?? "",
  nombre: user.nombre ?? user.name ?? "",
  dni: user.dni ?? user.numero_documento ?? "",
  numero_documento: user.numero_documento ?? user.dni ?? "",
  codigo_usuario: user.codigo_usuario ?? user.codigoUsuario ?? "",
  tiene_nombre_clave: Boolean(user.tiene_nombre_clave ?? user.hasAlias),
  biometria_registrada: Boolean(user.biometria_registrada ?? user.hasBiometric),
  locales: Array.isArray(user.locales) ? user.locales : [],
  roles: normalizeRoles(user.roles || []),
  pinHash: user.pinHash ?? (user.pin_hash ? "set" : null),
});

export const normalizeStaff = (users = []) =>
  (Array.isArray(users) ? users : []).map(normalizeStaffUser).filter((user) => user.id && user.name);

export const normalizeCaja = (caja = null) => {
  if (!caja) return null;
  return {
    ...caja,
    isOpen: Boolean(caja.isOpen ?? !caja.fecha_cierre),
    openedAt: caja.openedAt ?? caja.fecha_apertura ?? caja.created_at ?? null,
    closedAt: caja.closedAt ?? caja.fecha_cierre ?? null,
    fondoInicial: toNumber(caja.fondoInicial ?? caja.fondo_inicial, 0),
    openedBy: caja.openedBy ?? caja.nombre_apertura ?? caja.usuario_apertura,
    closedBy: caja.closedBy ?? caja.nombre_cierre ?? caja.usuario_cierre,
  };
};

export const normalizeSolicitud = (solicitud = {}) => {
  const payload = parseJson(solicitud.payload, {});
  const status = String(solicitud.status ?? solicitud.estado ?? "PENDIENTE").toLowerCase();
  const typeRaw = solicitud.type ?? solicitud.tipo ?? payload.type ?? "";
  const type = String(typeRaw).toLowerCase();

  return {
    ...payload,
    ...solicitud,
    payload,
    id: solicitud.id ?? solicitud.id_solicitud,
    id_solicitud: solicitud.id_solicitud ?? solicitud.id,
    type: type === "acceso_dispositivo" ? "acceso" : type,
    status: status === "aprobado" ? "aprobada" : status === "rechazado" ? "rechazada" : status,
    requestedBy: solicitud.requestedBy ?? solicitud.id_usuario_origen,
    requestedByName: solicitud.requestedByName ?? solicitud.nombre_origen ?? "Usuario",
    createdAt: solicitud.createdAt ?? solicitud.creado_en ?? null,
    rejectReason: solicitud.rejectReason ?? solicitud.motivo_rechazo,
  };
};

export const normalizeSolicitudes = (solicitudes = []) =>
  (Array.isArray(solicitudes) ? solicitudes : []).map(normalizeSolicitud);
