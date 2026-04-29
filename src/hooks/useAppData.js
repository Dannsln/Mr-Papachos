import { useState, useEffect, useRef, useCallback } from "react";
import { io } from "socket.io-client";
import * as API from "../api";
import { API_BASE_URL, getAuthToken } from "../api";
import {
  normalizeCaja,
  normalizeMenu,
  normalizeMesas,
  normalizeOrder,
  normalizeOrders,
  normalizeSolicitudes,
  normalizeSolicitud,
  normalizeStaff,
} from "../services/normalizers";

let socketInstance = null;

const getSocket = () => {
  if (!socketInstance) {
    socketInstance = io(API_BASE_URL, {
      transports: ["websocket", "polling"],
      autoConnect: false,
    });
  }
  return socketInstance;
};

const isForbidden = (err) => err?.status === 401 || err?.status === 403;
const isAdminUser = (user) =>
  user?.id === "admin" || (user?.roles || []).some((role) => role === "admin");

export function useAppData(currentUser) {
  const [orders, setOrders] = useState([]);
  const [history, setHistory] = useState([]);
  const [menu, setMenu] = useState([]);
  const [configData, setConfigData] = useState({});
  const [mesasArr, setMesasArr] = useState([]);
  const [solicitudesData, setSolicitudesData] = useState([]);
  const [staffData, setStaffData] = useState([]);
  const [cajaData, setCajaData] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const currentUserRef = useRef(currentUser);
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  const refreshOrders = useCallback(async () => {
    const data = normalizeOrders(await API.pedidos.listarActivos());
    setOrders(data);
    return data;
  }, []);

  const refreshHistory = useCallback(async () => {
    const data = normalizeOrders(await API.pedidos.historial({ pagina: 1, porPagina: 500 }));
    setHistory(data);
    return data;
  }, []);

  const refreshMenu = useCallback(async () => {
    const data = normalizeMenu(await API.menu.obtener());
    setMenu(data);
    return data;
  }, []);

  const refreshConfig = useCallback(async () => {
    const data = await API.config.obtener();
    setConfigData(data || {});
    return data || {};
  }, []);

  const refreshMesas = useCallback(async () => {
    const data = normalizeMesas(await API.mesas.listar());
    setMesasArr(data.map((mesa) => mesa.numero));
    return data;
  }, []);

  const refreshSolicitudes = useCallback(async () => {
    try {
      const data = normalizeSolicitudes(await API.solicitudes.listarPendientes());
      setSolicitudesData(data);
      return data;
    } catch (err) {
      if (isForbidden(err)) {
        setSolicitudesData([]);
        return [];
      }
      throw err;
    }
  }, []);

  const refreshStaff = useCallback(async () => {
    const data = normalizeStaff(await API.staff.listar());
    setStaffData(data);
    return data;
  }, []);

  const refreshCaja = useCallback(async () => {
    const data = normalizeCaja(await API.caja.obtenerActiva());
    setCajaData(data);
    return data;
  }, []);

  const refreshAll = useCallback(async () => {
    setLoadError(null);

    const tasks = [
      refreshOrders(),
      refreshHistory(),
      refreshMenu(),
      refreshConfig(),
      refreshMesas(),
      refreshSolicitudes(),
      refreshStaff(),
      refreshCaja(),
    ];

    const results = await Promise.allSettled(tasks);
    const failed = results.find((result) => result.status === "rejected");
    if (failed) {
      setLoadError(failed.reason);
      console.error("[useAppData] Backend load failed:", failed.reason);
    }
    return results;
  }, [refreshCaja, refreshConfig, refreshHistory, refreshMenu, refreshMesas, refreshOrders, refreshSolicitudes, refreshStaff]);

  const resetData = useCallback(() => {
    setOrders([]);
    setHistory([]);
    setMenu([]);
    setConfigData({});
    setMesasArr([]);
    setSolicitudesData([]);
    setStaffData([]);
    setCajaData(null);
    setLoaded(false);
    setLoadError(null);
  }, []);

  useEffect(() => {
    if (!currentUser) {
      resetData();
      if (socketInstance?.connected) socketInstance.disconnect();
      return;
    }

    let cancelled = false;
    setLoaded(false);

    const socket = getSocket();
    const localId = currentUser.localId;

    socket.auth = { token: getAuthToken() };
    if (!socket.connected) socket.connect();

    const joinLocal = () => socket.emit("join_local", localId);
    socket.on("connect", joinLocal);
    if (socket.connected) joinLocal();

    const upsertOrder = (pedido) => {
      const normalized = normalizeOrder(pedido);
      setOrders((prev) => {
        const id = normalized.id_pedido ?? normalized.id;
        if (!id) return prev;
        const exists = prev.some((order) => (order.id_pedido ?? order.id) === id);
        return exists
          ? prev.map((order) => ((order.id_pedido ?? order.id) === id ? { ...order, ...normalized } : order))
          : [...prev, normalized];
      });
    };

    const mergeOrderPatch = (pedido) => {
      const normalized = normalizeOrder(pedido);
      const id = normalized.id_pedido ?? normalized.id;
      if (!id) return;
      setOrders((prev) =>
        prev.map((order) => ((order.id_pedido ?? order.id) === id ? { ...order, ...normalized } : order))
      );
    };

    const refreshPedidosEHistorial = () => {
      refreshOrders().catch((err) => console.error("[socket] refreshOrders:", err));
      refreshHistory().catch((err) => console.error("[socket] refreshHistory:", err));
    };

    const refreshSolicitudesSafe = () => {
      refreshSolicitudes().catch((err) => console.error("[socket] refreshSolicitudes:", err));
    };

    const handlers = [
      ["pedido:nuevo", upsertOrder],
      ["pedido:actualizado", mergeOrderPatch],
      ["pedido:pagado", ({ id_pedido }) => {
        setOrders((prev) => prev.filter((order) => (order.id_pedido ?? order.id) !== id_pedido));
        refreshPedidosEHistorial();
      }],
      ["pedido:anulado", ({ id_pedido }) => {
        setOrders((prev) => prev.filter((order) => (order.id_pedido ?? order.id) !== id_pedido));
        refreshPedidosEHistorial();
      }],
      ["solicitud:nueva", (solicitud) => {
        if (!isAdminUser(currentUserRef.current)) return;
        const normalized = normalizeSolicitud(solicitud);
        setSolicitudesData((prev) => {
          const id = normalized.id_solicitud ?? normalized.id;
          if (!id || prev.some((sol) => (sol.id_solicitud ?? sol.id) === id)) return prev;
          return [...prev, normalized];
        });
      }],
      ["solicitud:resuelta", refreshSolicitudesSafe],
      ["caja:abierta", (data) => setCajaData(normalizeCaja({ ...data, isOpen: true }))],
      ["caja:cerrada", (data) => setCajaData(normalizeCaja({ ...data, isOpen: false }))],
      ["config:actualizada", ({ clave }) => {
        refreshConfig().catch((err) => console.error("[socket] refreshConfig:", err));
        if (clave === "num_mesas" || clave === "mesas") {
          refreshMesas().catch((err) => console.error("[socket] refreshMesas:", err));
        }
      }],
      ["menu:actualizado", () => refreshMenu().catch((err) => console.error("[socket] refreshMenu:", err))],
      ["staff:actualizado", () => refreshStaff().catch((err) => console.error("[socket] refreshStaff:", err))],
    ];

    handlers.forEach(([event, handler]) => socket.on(event, handler));

    refreshAll().finally(() => {
      if (!cancelled) setLoaded(true);
    });

    return () => {
      cancelled = true;
      socket.off("connect", joinLocal);
      handlers.forEach(([event, handler]) => socket.off(event, handler));
    };
  }, [currentUser, refreshAll, refreshConfig, refreshHistory, refreshMenu, refreshMesas, refreshOrders, refreshSolicitudes, refreshStaff, resetData]);

  return {
    orders,
    setOrders,
    history,
    setHistory,
    menu,
    setMenu,
    configData,
    setConfigData,
    mesasArr,
    setMesasArr,
    solicitudesData,
    setSolicitudesData,
    staffData,
    setStaffData,
    cajaData,
    setCajaData,
    loaded,
    loadError,
    refreshAll,
    refreshOrders,
    refreshHistory,
    refreshMenu,
    refreshConfig,
    refreshMesas,
    refreshSolicitudes,
    refreshStaff,
    refreshCaja,
  };
}
