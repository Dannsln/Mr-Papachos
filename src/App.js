import { useState, useEffect, useRef, useCallback, Component } from "react";
import * as API from "./api";
import { RequerimientosComponent } from "./features/requerimientos/RequerimientosComponent";
import { StaffManager } from "./features/staff/StaffManager";
import { useAppData } from "./hooks/useAppData";
import { normalizeStaffUser } from "./services/normalizers";

// ─── ERROR BOUNDARY ──────────────────────────────────────────────────────────
class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { console.error("App crash:", error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{background:"#111",color:"#fff",minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div style={{textAlign:"center",maxWidth:500}}>
            <div style={{fontSize:40,marginBottom:12}}>⚠️</div>
            <div style={{color:"#FFD700",fontWeight:900,fontSize:20,marginBottom:12}}>Error en la aplicación</div>
            <div style={{background:"#1a1a1a",padding:16,borderRadius:8,fontSize:12,color:"#e74c3c",textAlign:"left",marginBottom:16,whiteSpace:"pre-wrap",wordBreak:"break-all"}}>
              {this.state.error?.message || "Error desconocido"}
            </div>
            <button onClick={()=>this.setState({hasError:false,error:null})} style={{background:"#FFD700",color:"#111",border:"none",borderRadius:8,padding:"10px 24px",fontWeight:900,cursor:"pointer",fontSize:14}}>
              Reintentar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}



// ─── SHA-256 helper (Web Crypto API — sin librerías) ─────────────────────────
const asArray = (value) => Array.isArray(value) ? value : [];
const pickConfig = (config, keys, fallback) => {
 for (const key of keys) {
  if (config && config[key] !== undefined && config[key] !== null) return config[key];
 }
 return fallback;
};
const getBeverageCategories = (config) =>
 asArray(pickConfig(config, ["categorias_bebidas", "beverageCategories", "beverage_cats"], []));
const getSalsaOptions = (item, config) =>
 asArray(item?.salsas || item?.salsaOptions || item?.opciones_salsa || pickConfig(config, ["salsas_alitas", "salsaOptions", "salsas"], []));
const getSalsaCategories = (config) =>
 asArray(pickConfig(config, ["categorias_salsas", "salsaCategories"], []));
const itemNeedsSalsas = (item, config) =>
 Boolean(item?.requiere_salsas || item?.requiresSauce || getSalsaCategories(config).includes(item?.cat));
const getItemCustomizations = (config) =>
 pickConfig(config, ["personalizaciones_items", "itemCustomizations", "items_con_eleccion"], {}) || {};
const getItemCustomization = (item, config) => {
 const customizations = getItemCustomizations(config);
 return item?.personalizacion || item?.customization || item?.configuracion || customizations[item?.id] || customizations[item?.id_producto] || null;
};

const fmt = (n) => `S/.${Number(n).toFixed(2)}`;
const newDraft = () => ({ table:"", items:[], payTiming:"despues", notes:"", phone:"", orderType:"mesa", taperCost:0, deliveryAddress:"" });

const getPay = (o, type) => o.payments ? (Number(o.payments[type]) || 0) : (o.payment === type ? o.total : 0);
const timeStr = (iso) => { if(!iso)return""; const d=new Date(iso); return d.toLocaleTimeString("es-PE",{hour:"2-digit",minute:"2-digit"}); };
const minutesAgo = (iso) => { const m=Math.floor((Date.now()-new Date(iso))/60000); if(m<1)return"ahora"; if(m<60)return`hace ${m}m`; return`hace ${Math.floor(m/60)}h ${m%60}m`; };

function useWindowWidth() {
 const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1024);
 useEffect(() => {
 const h = () => setW(window.innerWidth);
 window.addEventListener("resize", h);
 return () => window.removeEventListener("resize", h);
 }, []);
 return w;
}


function LandingScreen({ onEnter, Y, isMobile }) {
 return (
 <div 
 onClick={onEnter}
 style={{
 background: "#050505", height: "100vh", width: "100vw", 
 display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", 
 cursor: "pointer", position: "relative", overflow: "hidden"
 }}
 >
 <style>{`
 /* Efecto de resplandor neón que sigue la silueta del PNG */
 @keyframes neonGlow {
 0%, 100% { filter: drop-shadow(0 0 5px ${Y}) drop-shadow(0 0 15px ${Y}) drop-shadow(0 0 30px ${Y}); transform: scale(1); }
 50% { filter: drop-shadow(0 0 2px ${Y}) drop-shadow(0 0 5px ${Y}) drop-shadow(0 0 10px ${Y}); transform: scale(0.98); }
 }
 @keyframes pulseText {
 0% { opacity: 0.3; }
 100% { opacity: 1; }
 }
 `}</style>
 
 <img 
 src="/logo.png" 
 alt="MR Papachos Logo" 
 style={{
 width: isMobile ? "70vw" : "25vw",
 maxWidth: "400px",
 animation: "neonGlow 2.5s infinite alternate",
 zIndex: 10
 }} 
 />

 <div style={{
 position: "absolute", bottom: "15%",
 fontFamily: "'Nunito', sans-serif", fontSize: 14, color: "#888",
 animation: "pulseText 1.5s infinite alternate", letterSpacing: 2,
 textTransform: "uppercase"
 }}>
 Iniciando sesion
 </div>
 </div>
 );
}

// ═══════════════════════════════════════════════════════════════════
// ICONO DE MESA VECTORIAL (SVG) 
// ═══════════════════════════════════════════════════════════════════
const IconoMesa = ({ color, size }) => (
 <svg width={size} height={size * 0.75} viewBox="0 0 120 90" fill="none" xmlns="http://www.w3.org/2000/svg" 
 style={{ marginBottom: 10, filter: color !== "#ffffff" ? `drop-shadow(0px 0px 6px ${color}88)` : 'none' }}>
 <rect x="5" y="30" width="15" height="30" rx="4" stroke={color} strokeWidth="3" />
 <rect x="100" y="30" width="15" height="30" rx="4" stroke={color} strokeWidth="3" />
 <rect x="35" y="5" width="20" height="15" rx="4" stroke={color} strokeWidth="3" />
 <rect x="65" y="5" width="20" height="15" rx="4" stroke={color} strokeWidth="3" />
 <rect x="35" y="70" width="20" height="15" rx="4" stroke={color} strokeWidth="3" />
 <rect x="65" y="70" width="20" height="15" rx="4" stroke={color} strokeWidth="3" />
 <rect x="16" y="16" width="88" height="58" rx="8" fill="#1c1c1c" stroke={color} strokeWidth="4" />
 </svg>
);

const ORDER_TYPE_ASSETS = {
 mesa: "/mesa.svg",
 llevar: "/llevar.svg",
};

const OrderTypeIcon = ({ type, size = 18, color = "#eee" }) => {
 const fill = color === "#111"
  ? "linear-gradient(145deg,#050505 0%,#3a3a3a 48%,#080808 100%)"
  : `linear-gradient(145deg,#ffffff 0%,${color} 45%,#8bd8ff 100%)`;
 return (
  <span
   aria-hidden="true"
   style={{
    width: size,
    height: size,
    display: "inline-block",
    flexShrink: 0,
    background: fill,
    WebkitMask: `url(${ORDER_TYPE_ASSETS[type]}) center / contain no-repeat`,
    mask: `url(${ORDER_TYPE_ASSETS[type]}) center / contain no-repeat`,
    filter: color === "#111" ? "none" : `drop-shadow(0 0 5px ${color}aa)`,
   }}
  />
 );
};

const OrderTypeBadgeGroup = ({ types = [], Y, compact = false }) => {
 const visibleTypes = ["mesa", "llevar"].filter(type => types.includes(type));
 if (!visibleTypes.length) return null;
 return (
  <div style={{
   position:"absolute",
   top:10,
   right:10,
   display:"flex",
   gap:5,
   alignItems:"center",
   background:"rgba(0,0,0,.55)",
   border:"1px solid #333",
   borderRadius:8,
   padding:compact ? "4px 5px" : "5px 6px",
   boxShadow:"0 4px 12px rgba(0,0,0,.35)",
  }}>
   {visibleTypes.map(type => (
    <span
     key={type}
     title={type === "mesa" ? "Mesa" : "Para llevar"}
     style={{
      width:compact ? 22 : 26,
      height:compact ? 22 : 26,
      borderRadius:6,
      display:"flex",
      alignItems:"center",
      justifyContent:"center",
      background:type === "mesa" ? `${Y}22` : "#0a1520",
      border:`1px solid ${type === "mesa" ? `${Y}55` : "#3498db55"}`,
     }}
    >
     <OrderTypeIcon type={type} size={compact ? 14 : 17} color={type === "mesa" ? Y : "#5dade2"} />
    </span>
   ))}
  </div>
 );
};

const getMesaServiceTypes = (mesaOrders = []) => {
 if (!mesaOrders.length) return [];
 const hasLlevar = mesaOrders.some(order => (order.items || []).some(item => item.isLlevar));
 const hasMesa = mesaOrders.some(order => {
  const items = order.items || [];
  return items.length === 0 || items.some(item => !item.isLlevar);
 });
 return [hasMesa && "mesa", hasLlevar && "llevar"].filter(Boolean);
};

// ═══════════════════════════════════════════════════════════════════
// STAFF POR DEFECTO (primer arranque)
// ═══════════════════════════════════════════════════════════════════
const ROLE_INFO = {
 admin:    { label:"Administrador", color:"#FFD700",},
 cajero:   { label:"Cajero",        color:"#3498db",},
 mesero:   { label:"Atención al cliente", color:"#27ae60",},
 cocinero: { label:"Cocina",        color:"#e67e22",},
};
const roleToApp = (role) => {
 const r = String(role || "").toUpperCase();
 if (r === "ADMIN" || r === "SUPERADMIN") return "admin";
 if (r === "CAJERO") return "cajero";
 if (r === "MESERO" || r === "ATENCION_CLIENTE" || r === "ATENCION AL CLIENTE") return "mesero";
 if (r === "COCINA" || r === "COCINERO") return "cocinero";
 return String(role || "").toLowerCase();
};
const normalizeRolesForApp = (roles = []) => [...new Set((roles || []).map(roleToApp).filter(Boolean))];
const hasRole = (user, role) => normalizeRolesForApp(user?.roles || [user?.id]).includes(role);
const roleLabels = (roles = []) => normalizeRolesForApp(roles).map(role => ROLE_INFO[role]?.label || role).join(" · ");
const authDeviceKey = (id) => `papachos_device_${id}`;
const buildSessionUser = (usuario = {}) => {
 const local = usuario.locales?.find(l => Number(l.id_local) === Number(usuario.id_local)) || usuario.locales?.[0] || {};
 const roles = normalizeRolesForApp(local.roles?.length ? local.roles : usuario.roles);
 const activeRole = roles.includes("admin") ? "admin" : roles[0];
 const hasAlias = Boolean(usuario.tiene_nombre_clave ?? usuario.hasAlias);
 const hasBiometric = Boolean(usuario.biometria_registrada ?? usuario.hasBiometric);
 return {
  id: activeRole,
  label: roleLabels(roles),
  name: usuario.nombre || usuario.name,
  userId: usuario.id_usuario || usuario.id,
  dni: usuario.numero_documento || usuario.dni || "",
  codigoUsuario: usuario.codigo_usuario || "",
  activeRole,
  roles,
  localId: local.id_local || usuario.id_local,
 localName: local.nombre || usuario.local_nombre || "Local",
  hasAlias,
  needsAliasSetup: Boolean(usuario.requiere_nombre_clave ?? usuario.needsAliasSetup ?? !hasAlias),
  hasBiometric,
  needsBiometricSetup: Boolean(usuario.requiere_biometria ?? usuario.needsBiometricSetup ?? !hasBiometric),
 };
};
const downloadWithAuth = async (url, filename) => {
 const res = await fetch(url, {
  headers: {
   ...(API.getAuthToken() ? { Authorization: `Bearer ${API.getAuthToken()}` } : {}),
  },
 });
 if (!res.ok) throw new Error("No se pudo descargar el archivo");
 const blob = await res.blob();
 const href = URL.createObjectURL(blob);
 const a = document.createElement("a");
 a.href = href;
 a.download = filename;
 document.body.appendChild(a);
 a.click();
 a.remove();
 URL.revokeObjectURL(href);
};

// ═══════════════════════════════════════════════════════════════════
// DEV PANEL — acceso master sin PIN (solo desarrollador)
// ═══════════════════════════════════════════════════════════════════
const DEV_SECRET = process.env.REACT_APP_DEV_SECRET || "";

function DevPanel({ onClose, onDevLogin, s, Y, isMobile }) {
 const locales = [];
 const [selectedLocal, setSelectedLocal] = useState(null);
 const [staff, setStaff] = useState([]);
 const [loading, setLoading] = useState(false);
 const [editingUser, setEditingUser] = useState(null);
 const [newPin, setNewPin] = useState("");
 const [localToast, setLocalToast] = useState(null);
 const [activeTab, setActiveTab] = useState("acceso"); // "acceso" | "staff"

 const toast_ = useCallback((msg, color="#27ae60") => { setLocalToast({msg,color}); setTimeout(()=>setLocalToast(null),2500); }, []);

const loadLocal = useCallback(async () => {
  setLoading(true); setStaff([]); setEditingUser(null);
  try {
   const users = await API.staff.listar();
   setStaff((users || []).map(normalizeStaffUser));
  } catch (err) {
   setStaff([]);
   toast_("No se pudo consultar el staff en backend", "#e74c3c");
  }
  setLoading(false);
}, [toast_]);
 useEffect(() => { loadLocal(); }, [loadLocal]);


 const handleResetPin = async (userId) => {
  try {
    await API.staff.resetPin(userId, null);
    await loadLocal();
    toast_("🔑 PIN reseteado", "#e67e22");
  } catch {
    toast_("⚠️ Error al resetear PIN", "#e74c3c");
  }
};;

 const handleForcePin = async (userId) => {
  if (newPin.length < 4) return;
  try {
    await API.staff.resetPin(userId, newPin);
    await loadLocal();
    setNewPin(""); setEditingUser(null);
    toast_("✅ PIN actualizado");
  } catch {
    toast_("⚠️ Error al actualizar PIN", "#e74c3c");
  }
};

 const handleDeleteUser = async (userId) => {
  try {
    await API.staff.eliminar(userId);
    await loadLocal();
    toast_("🗑 Usuario eliminado", "#e74c3c");
  } catch {
    toast_("⚠️ Error al eliminar usuario", "#e74c3c");
  }
};

 const handleDevEnter = (user, role) => {
  toast_("El acceso directo DEV esta desactivado. Inicia sesion contra el backend.", "#e67e22");
 };

 return (
  <div style={{background:"#0a0a0a", minHeight:"100vh", padding:20, color:"#eee", fontFamily:"'Nunito',sans-serif"}}>
   <div style={{maxWidth:700, margin:"0 auto"}}>
    <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20}}>
     <div>
      <div style={{fontFamily:"'Bebas Neue',cursive", fontSize:28, color:"#e74c3c", letterSpacing:2}}>🔧 PANEL DESARROLLADOR</div>
      <div style={{fontSize:11, color:"#555", marginTop:2}}>Acceso completo · Mr. Papachos</div>
     </div>
     <button style={{...s.btn("danger"), padding:"8px 16px"}} onClick={onClose}>✕ Salir</button>
    </div>

    {localToast && <div style={{background:localToast.color,color:"#fff",padding:"8px 14px",borderRadius:8,fontSize:13,fontWeight:800,marginBottom:12}}>{localToast.msg}</div>}

    {/* Tabs */}
    <div style={{display:"flex", gap:6, marginBottom:16}}>
     {[["acceso","🚀 Acceso rápido"],["staff","👥 Gestión de staff"]].map(([id,label])=>(
      <button key={id} style={{...s.btn(activeTab===id?"primary":"secondary"), padding:"8px 18px"}}
       onClick={()=>setActiveTab(id)}>{label}</button>
     ))}
    </div>

    {/* Local selector */}
    <div style={{display:"flex", gap:8, marginBottom:16, flexWrap:"wrap"}}>
     {locales.map(l => (
      <button key={l.id} style={{...s.btn(selectedLocal===l.id?"warn":"secondary"), padding:"8px 20px"}}
       onClick={() => setSelectedLocal(l.id)}>{l.nombre}</button>
     ))}
    </div>

    {loading ? <div style={{textAlign:"center", color:"#555", padding:40}}>Cargando...</div> : (
     activeTab === "acceso" ? (
      // ── ACCESO RÁPIDO ──
      <div>
       <div style={{fontSize:12, color:"#555", marginBottom:12, textTransform:"uppercase", letterSpacing:1}}>
        Entrar como — sin PIN requerido
       </div>
       {staff.map(user => (
        <div key={user.id} style={{background:"#1a1a1a", borderRadius:12, padding:"12px 16px", marginBottom:8, border:"1px solid #2a2a2a"}}>
         <div style={{fontWeight:900, fontSize:14, marginBottom:8}}>{user.name}</div>
         <div style={{display:"flex", gap:6, flexWrap:"wrap"}}>
          {user.roles.map(role => {
           const info = ROLE_INFO[role];
           return (
            <button key={role} style={{...s.btn("secondary"), padding:"6px 14px", fontSize:12, border:`1px solid ${info.color}44`, color:info.color, fontWeight:800}}
             onClick={() => handleDevEnter(user, role)}>
             → {info.label}
            </button>
           );
          })}
         </div>
        </div>
       ))}
      </div>
     ) : (
      // ── GESTIÓN DE STAFF ──
      <div>
       <div style={{fontSize:12, color:"#555", marginBottom:10, textTransform:"uppercase", letterSpacing:1}}>
        {staff.length} usuarios en {locales.find(l=>l.id===selectedLocal)?.nombre}
       </div>
       {staff.map(user => (
        <div key={user.id} style={{background:"#1a1a1a", borderRadius:12, padding:"14px 16px", marginBottom:8, border:"1px solid #2a2a2a"}}>
         <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom: editingUser===user.id ? 12 : 0}}>
          <div>
           <div style={{fontWeight:900, fontSize:15}}>{user.name}</div>
           <div style={{fontSize:11, color:"#555", marginTop:2}}>
            {user.roles.map(r=>`${ROLE_INFO[r]?.label||r}`).join(" · ")}
            {" · "}<span style={{color:user.pinHash?"#27ae60":"#e74c3c"}}>{user.pinHash?"PIN activo ✓":"Sin PIN"}</span>
           </div>
          </div>
          <div style={{display:"flex", gap:6}}>
           <button style={{...s.btn("warn"), padding:"5px 10px", fontSize:11}}
            onClick={() => handleResetPin(user.id)}>Reset PIN</button>
           <button style={{...s.btn("blue"), padding:"5px 10px", fontSize:11}}
            onClick={() => setEditingUser(editingUser===user.id ? null : user.id)}>
            {editingUser===user.id ? "Cancelar" : "Set PIN"}
           </button>
           {!user.roles.includes("admin") && (
            <button style={{...s.btn("danger"), padding:"5px 8px", fontSize:11}}
             onClick={() => handleDeleteUser(user.id)}>🗑</button>
           )}
          </div>
         </div>
         {editingUser === user.id && (
          <div style={{display:"flex", gap:8, alignItems:"center", marginTop:8}}>
           <input style={{...s.input, flex:1}} type="password" placeholder="Nuevo PIN (4-6 dígitos)"
            value={newPin} onChange={e=>setNewPin(e.target.value.replace(/\D/g,"").slice(0,6))}
            onKeyDown={e=>e.key==="Enter"&&handleForcePin(user.id)} />
           <button style={{...s.btn("success"), padding:"8px 14px"}} onClick={()=>handleForcePin(user.id)}
            disabled={newPin.length<4}>✓ Guardar</button>
          </div>
         )}
        </div>
       ))}
      </div>
     )
    )}
   </div>
  </div>
 );
}

// ═══════════════════════════════════════════════════════════════════
// LOGIN SCREEN — Flujo: Sucursal → Rol → Usuario → PIN
// ═══════════════════════════════════════════════════════════════════
function LoginScreen({ onLogin, s, Y, isMobile }) {
 const [step, setStep] = useState("codigo");
 const [codigo, setCodigo] = useState("");
 const [usuario, setUsuario] = useState(null);
 const [locales, setLocales] = useState([]);
 const [selectedLocal, setSelectedLocal] = useState(null);
 const [selectedRole, setSelectedRole] = useState(null);
 const [pin, setPin] = useState("");
 const [error, setError] = useState("");
 const [checking, setChecking] = useState(false);
 const [pendingMsg, setPendingMsg] = useState("");
 const [devClickCount, setDevClickCount] = useState(0);
 const [showDev, setShowDev] = useState(false);

 const deviceKey = authDeviceKey;
 const getDeviceName = () => {
  if (typeof navigator === "undefined") return "Equipo desconocido";
  return `${navigator.platform || "Equipo"} - ${navigator.userAgent?.split(" ")?.[0] || "Navegador"}`;
 };

 const buildAppUser = (user, local, role) => {
  const roles = normalizeRolesForApp(local?.roles?.length ? local.roles : user.roles);
  const activeRole = role || (roles.includes("admin") ? "admin" : roles[0]);
  const hasAlias = Boolean(user.tiene_nombre_clave ?? user.hasAlias);
  const hasBiometric = Boolean(user.biometria_registrada ?? user.hasBiometric);
  return {
   id: activeRole,
   label: roleLabels(roles),
   name: user.nombre || user.name,
   userId: user.id_usuario || user.id,
   dni: user.numero_documento || user.dni || "",
   codigoUsuario: user.codigo_usuario || "",
   activeRole,
   roles,
   localId: local?.id_local || user.id_local,
   localName: local?.nombre || user.local_nombre || "Local",
   hasAlias,
   needsAliasSetup: Boolean(user.requiere_nombre_clave ?? user.needsAliasSetup ?? !hasAlias),
   hasBiometric,
   needsBiometricSetup: Boolean(user.requiere_biometria ?? user.needsBiometricSetup ?? !hasBiometric),
  };
 };

 const handleIdentify = async () => {
  if (!codigo.trim()) return;
  setChecking(true); setError(""); setPendingMsg("");
  try {
   const res = await API.auth.identificar(codigo.trim());
   const user = res.usuario;
   const locs = (user.locales || []).map(l => ({ ...l, roles: normalizeRolesForApp(l.roles || user.roles) }));
   setUsuario(user);
   setLocales(locs);
   if (locs.length === 1) handleSelectLocal(user, locs[0]);
   else setStep("local");
  } catch (err) {
   setError(Array.isArray(err.data?.usuarios) ? "Ingresa tu nombre de acceso exacto para continuar" : (err.message || "No se pudo identificar el usuario"));
  }
  setChecking(false);
 };

 const handleSelectLocal = (user, local) => {
  const u = user || usuario;
  const roles = normalizeRolesForApp(local.roles || u?.roles || []);
  setSelectedLocal(local);
  setSelectedRole(roles[0] || null);
  setPin("");
  setError(roles.length ? "" : "Este usuario no tiene roles asignados en el local.");
  setStep("pin");
 };

 const finishLogin = (loginUser) => {
  const local = selectedLocal || loginUser.locales?.[0];
  const appUser = buildAppUser(loginUser, local, selectedRole);
  onLogin(appUser);
 };

 const submitLogin = async ({ biometrico = false } = {}) => {
  if (!usuario || !selectedLocal || (!biometrico && pin.length < 4)) return;
  setChecking(true); setError(""); setPendingMsg("");
  try {
   if (biometrico) {
    if (!window.PublicKeyCredential || !navigator.credentials) throw new Error("Este navegador no tiene huella/passkey disponible.");
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);
    await navigator.credentials.get({ publicKey: { challenge, timeout: 60000, userVerification: "required" } });
   }

   const res = await API.auth.login({
    id_usuario: usuario.id_usuario,
    id_local: selectedLocal.id_local,
    pin,
    biometrico,
    nombre_equipo: getDeviceName(),
    token_dispositivo_guardado: localStorage.getItem(deviceKey(usuario.id_usuario)),
   });

   localStorage.setItem("token", res.token);
   if (res.token_dispositivo) localStorage.setItem(deviceKey(usuario.id_usuario), res.token_dispositivo);
   finishLogin(res.usuario);
  } catch (err) {
   const data = err.data || {};
   if (data.token_dispositivo) localStorage.setItem(deviceKey(usuario.id_usuario), data.token_dispositivo);
   if (data.estado === "DISPOSITIVO_PENDIENTE") setPendingMsg(data.mensaje || "Solicitud enviada al administrador.");
   else setError(err.message || "No se pudo iniciar sesion");
   setPin("");
  }
  setChecking(false);
 };

 const handlePinDigit = (d) => { if (pin.length < 6) setPin(p => p + d); };
 const handlePinDel = () => setPin(p => p.slice(0, -1));
 const cardBtn = { ...s.btn("secondary"), padding:"14px 20px", fontSize:15, fontWeight:900, textAlign:"left", display:"flex", alignItems:"center", gap:12, border:"1px solid #2a2a2a", width:"100%", cursor:"pointer" };
 const currentRoles = normalizeRolesForApp(selectedLocal?.roles || usuario?.roles || []);
 const hasSavedDevice = Boolean(usuario?.id_usuario && localStorage.getItem(deviceKey(usuario.id_usuario)));
 const loadingUsers = false;
 const visibleLoginUsers = [];
 const pickUser = () => {};

 const handleDevTap = () => {
  if (!DEV_SECRET) return;
  const next = devClickCount + 1;
  setDevClickCount(next);
  if (next >= 7) { setShowDev(true); setDevClickCount(0); }
 };
 if (showDev) return <DevPanel onClose={() => setShowDev(false)} onDevLogin={onLogin} s={s} Y={Y} isMobile={isMobile} />;

 return (
  <div style={{background:"#111",minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",color:"#fff",padding:20}}>
   <img src="/logo.png" alt="MR. Papachos" style={{width:isMobile?"68vw":"260px",maxWidth:"340px",marginBottom:10,filter:`drop-shadow(0 0 10px ${Y}66)`}} />
   <div onClick={handleDevTap} style={{fontSize:10,color:"#333",letterSpacing:2,marginBottom:36,textTransform:"uppercase",cursor:"default",userSelect:"none"}}>Sistema de Gestion</div>

   {step === "codigo" && (
    <div style={{width:"100%",maxWidth:440}}>
     <div style={{fontSize:11,color:"#666",textTransform:"uppercase",letterSpacing:1,marginBottom:14,textAlign:"center"}}>Ingresa el nombre de acceso asignado</div>
     <input style={{...s.input, textAlign:"center", fontSize:16, padding:13, marginBottom:10}} placeholder="Ej. DanyDNI" value={codigo} onChange={e=>setCodigo(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleIdentify()} autoComplete="off" spellCheck="false" autoFocus />
     {error && <div style={{color:"#e74c3c",fontSize:12,fontWeight:700,marginBottom:10,textAlign:"center"}}>{error}</div>}
     <div style={{...s.card,textAlign:"center",color:"#777",marginBottom:10,padding:"14px 16px"}}>
      <div style={{fontWeight:900,color:"#eee",fontSize:13,marginBottom:4}}>Primer acceso</div>
      <div style={{fontSize:11,color:"#666"}}>Usa el nombre que te asignaron. Luego podras activar nombre en clave y huella.</div>
     </div>
     <div style={{display:"none"}}>
      {loadingUsers ? <div style={{...s.card,textAlign:"center",color:"#777"}}>Cargando usuarios...</div> : visibleLoginUsers.map(user => (
       <button key={user.id} onClick={() => pickUser(user)} style={{...cardBtn,justifyContent:"space-between",padding:"12px 14px"}}>
        <span style={{minWidth:0}}>
         <span style={{display:"block",fontSize:15,color:"#eee",overflow:"hidden",textOverflow:"ellipsis"}}>{user.name}</span>
         <span style={{display:"block",fontSize:10,color:"#777",marginTop:2}}>DNI {user.numero_documento || "sin DNI"} · Usuario {user.codigo_usuario || user.id}</span>
        </span>
        <span style={{fontSize:10,color:Y,fontWeight:900,textAlign:"right"}}>{roleLabels(user.roles)}</span>
       </button>
      ))}
      {!loadingUsers && visibleLoginUsers.length === 0 && <div style={{...s.card,textAlign:"center",color:"#777"}}>No hay coincidencias</div>}
     </div>
     <button onClick={handleIdentify} disabled={!codigo.trim() || checking} style={{...s.btn("secondary"),width:"100%",padding:12,fontSize:13,opacity:!codigo.trim()?0.45:1}}>{checking ? "Verificando..." : "Continuar"}</button>
    </div>
   )}

   {step === "local" && usuario && (
    <div style={{width:"100%",maxWidth:340}}>
     <button onClick={() => { setStep("codigo"); setUsuario(null); }} style={{...s.btn("secondary"),marginBottom:16,fontSize:11,padding:"4px 12px"}}>Volver</button>
     <div style={{fontSize:11,color:"#666",textTransform:"uppercase",letterSpacing:1,marginBottom:14,textAlign:"center"}}>Locales habilitados para {usuario.nombre}</div>
     <div style={{display:"flex",flexDirection:"column",gap:10}}>{locales.map(loc => <button key={loc.id_local} onClick={() => handleSelectLocal(usuario, loc)} style={{...cardBtn, justifyContent:"center", fontSize:17, padding:18}}>{loc.nombre}</button>)}</div>
    </div>
   )}

   {step === "role" && usuario && selectedLocal && (
    <div style={{width:"100%",maxWidth:330}}>
     <button onClick={() => locales.length > 1 ? setStep("local") : setStep("codigo")} style={{...s.btn("secondary"),marginBottom:16,fontSize:11,padding:"4px 12px"}}>Volver</button>
     <div style={{fontSize:11,color:"#666",textTransform:"uppercase",letterSpacing:1,marginBottom:14,textAlign:"center"}}>Rol de ingreso</div>
     <div style={{display:"flex",flexDirection:"column",gap:10}}>{currentRoles.map(role => { const info = ROLE_INFO[role] || { label: role, color: Y }; return <button key={role} onClick={() => { setSelectedRole(role); setStep("pin"); }} style={{...cardBtn, border:`2px solid ${info.color}33`, padding:"16px 20px"}}><div><div style={{color:info.color,fontWeight:900,fontSize:15}}>{info.label}</div><div style={{fontSize:10,color:"#555",marginTop:2}}>{selectedLocal.nombre}</div></div></button>; })}</div>
    </div>
   )}

   {step === "pin" && usuario && selectedLocal && (
    <div style={{width:"100%",maxWidth:300,textAlign:"center"}}>
     <button onClick={() => { setStep(locales.length > 1 ? "local" : "codigo"); setPin(""); setError(""); setPendingMsg(""); }} style={{...s.btn("secondary"),marginBottom:16,fontSize:11,padding:"4px 12px"}}>Volver</button>
     <div style={{fontSize:19,fontWeight:900,marginBottom:3}}>{usuario.nombre}</div>
     <div style={{fontSize:11,color:"#555",marginBottom:20}}>{selectedLocal.nombre}<br/>DNI {usuario.numero_documento || "sin DNI"} · {roleLabels(currentRoles)}</div>
     <div style={{display:"flex",justifyContent:"center",gap:10,marginBottom:22}}>{Array.from({length:6}).map((_,i)=><div key={i} style={{width:13,height:13,borderRadius:"50%",background:i<pin.length?Y:"transparent",border:`2px solid ${i<pin.length?Y:"#444"}`}} />)}</div>
     <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:14}}>{["1","2","3","4","5","6","7","8","9","","0","Borrar"].map((d,i)=><button key={i} onClick={()=>d==="Borrar"?handlePinDel():d?handlePinDigit(d):null} disabled={!d&&d!=="0"} style={{height:54,borderRadius:12,fontSize:d==="Borrar"?12:22,fontWeight:700,cursor:d===""?"default":"pointer",background:d==="Borrar"?"#222":d===""?"transparent":"#1e1e1e",border:d===""?"none":"1px solid #333",color:"#eee",opacity:d===""?0:1}}>{d}</button>)}</div>
     {pendingMsg && <div style={{color:"#f39c12",fontSize:12,fontWeight:700,marginBottom:10}}>{pendingMsg}</div>}
     {error && <div style={{color:"#e74c3c",fontSize:12,fontWeight:700,marginBottom:10}}>{error}</div>}
     <button onClick={()=>submitLogin()} disabled={pin.length<4||checking||!selectedRole} style={{...s.btn("primary"),width:"100%",padding:14,fontSize:16,opacity:pin.length<4||!selectedRole?0.4:1,marginBottom:8}}>{checking ? "Verificando..." : "Entrar"}</button>
     <button onClick={()=>submitLogin({biometrico:true})} disabled={checking || !hasSavedDevice} style={{...s.btn("secondary"),width:"100%",padding:12,fontSize:13,opacity:hasSavedDevice?1:0.45}}>{hasSavedDevice ? "Huella / Passkey" : "Huella no registrada"}</button>
    </div>
   )}
  </div>
 );
}

function AuthSetupModal({ currentUser, onUpdate, s, Y, isMobile }) {
 const [step, setStep] = useState(currentUser?.needsAliasSetup ? "alias" : "biometria");
 const [alias, setAlias] = useState("");
 const [error, setError] = useState("");
 const [saving, setSaving] = useState(false);

 useEffect(() => {
  if (currentUser?.needsAliasSetup) setStep("alias");
  else if (currentUser?.needsBiometricSetup) setStep("biometria");
 }, [currentUser?.needsAliasSetup, currentUser?.needsBiometricSetup]);

 const updateUser = (patch) => onUpdate(patch);

 const submitAlias = async () => {
  if (saving) return;
  const value = alias.trim();
  if (value.length < 3) {
   setError("Usa al menos 3 caracteres.");
   return;
  }
  setSaving(true); setError("");
  try {
   await API.auth.registrarNombreClave(value);
   updateUser({ hasAlias:true, needsAliasSetup:false });
   setAlias("");
   if (currentUser?.needsBiometricSetup) setStep("biometria");
  } catch (err) {
   setError(err.message || "No se pudo registrar el nombre en clave.");
  }
  setSaving(false);
 };

 const registerBiometric = async () => {
  if (saving) return;
  setSaving(true); setError("");
  try {
   const tokenDispositivo = localStorage.getItem(authDeviceKey(currentUser.userId));
   if (!tokenDispositivo) throw new Error("Primero inicia sesion con PIN en este equipo.");
   if (!window.PublicKeyCredential || !navigator.credentials) throw new Error("Este navegador no permite huella/passkey.");

   const challenge = new Uint8Array(32);
   window.crypto.getRandomValues(challenge);
   const userId = new TextEncoder().encode(`papachos-${currentUser.userId}`);
   await navigator.credentials.create({
    publicKey: {
     challenge,
     rp: { name: "Mr. Papachos" },
     user: {
      id: userId,
      name: `papachos-${currentUser.userId}`,
      displayName: currentUser.name || "Usuario",
     },
     pubKeyCredParams: [
      { type: "public-key", alg: -7 },
      { type: "public-key", alg: -257 },
     ],
     authenticatorSelection: { userVerification: "required", residentKey: "preferred" },
     timeout: 60000,
     attestation: "none",
    },
   });
   await API.auth.registrarBiometria(tokenDispositivo);
   updateUser({ hasBiometric:true, needsBiometricSetup:false });
  } catch (err) {
   setError(err.message || "No se pudo registrar la huella/passkey.");
  }
  setSaving(false);
 };

 const skipBiometric = () => {
  updateUser({ hasBiometric:false, needsBiometricSetup:false });
 };

 const isAliasStep = step === "alias" && currentUser?.needsAliasSetup;
 const title = isAliasStep ? "Nombre en clave" : "Huella digital";
 const subtitle = isAliasStep
  ? "Elige un nombre corto para entrar mas rapido."
  : "Registra este equipo para entrar con huella o passkey.";

 return (
  <div style={{background:"#111",minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",padding:20,fontFamily:"'Nunito',sans-serif"}}>
   <div style={{width:"100%",maxWidth:430}}>
    <div style={{textAlign:"center",marginBottom:20}}>
     <img src="/logo.png" alt="MR. Papachos" style={{width:isMobile?"62vw":"230px",maxWidth:"300px",filter:`drop-shadow(0 0 10px ${Y}55)`}} />
    </div>
    <div style={{...s.card,padding:isMobile?18:22,border:`1px solid ${Y}44`}}>
     <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:24,color:Y,letterSpacing:1,marginBottom:4,textAlign:"center"}}>{title}</div>
     <div style={{fontSize:12,color:"#777",textAlign:"center",marginBottom:18}}>{subtitle}</div>

     {isAliasStep ? (
      <>
       <input
        style={{...s.input,textAlign:"center",fontSize:16,padding:13,marginBottom:10}}
        placeholder=""
        value={alias}
        onChange={e=>setAlias(e.target.value)}
        onKeyDown={e=>e.key==="Enter"&&submitAlias()}
        autoFocus
        autoComplete="off"
        spellCheck="false"
       />
       {error && <div style={{color:"#e74c3c",fontSize:12,fontWeight:800,textAlign:"center",marginBottom:12}}>{error}</div>}
       <button onClick={submitAlias} disabled={saving || alias.trim().length < 3} style={{...s.btn("primary"),width:"100%",padding:13,fontSize:14,opacity:alias.trim().length < 3 ? 0.45 : 1}}>
        {saving ? "Guardando..." : "Guardar nombre en clave"}
       </button>
      </>
     ) : (
      <>
       <div style={{background:"#111",border:"1px solid #2a2a2a",borderRadius:8,padding:14,marginBottom:14,textAlign:"center"}}>
        <div style={{fontSize:13,fontWeight:900,color:"#eee"}}>{currentUser.name}</div>
        <div style={{fontSize:11,color:"#666",marginTop:2}}>Este registro queda solo para este dispositivo.</div>
       </div>
       {error && <div style={{color:"#e74c3c",fontSize:12,fontWeight:800,textAlign:"center",marginBottom:12}}>{error}</div>}
       <button onClick={registerBiometric} disabled={saving} style={{...s.btn("primary"),width:"100%",padding:13,fontSize:14,marginBottom:8}}>
        {saving ? "Abriendo seguridad..." : "Registrar huella / passkey"}
       </button>
       <button onClick={skipBiometric} disabled={saving} style={{...s.btn("secondary"),width:"100%",padding:11,fontSize:12}}>
        Ahora no
       </button>
      </>
     )}
    </div>
   </div>
  </div>
 );
}

function CloseBtn({ onClose }) {
 return (
 <button
 onClick={onClose}
 style={{flexShrink:0,width:38,height:38,borderRadius:10,background:"#2a2a2a",border:"2px solid #555",color:"#eee",fontSize:20,fontWeight:900,lineHeight:1,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",transition:"background .15s,border-color .15s"}}
 onMouseEnter={e=>{e.currentTarget.style.background="#c0392b";e.currentTarget.style.borderColor="#e74c3c";}}
 onMouseLeave={e=>{e.currentTarget.style.background="#2a2a2a";e.currentTarget.style.borderColor="#555";}}
 aria-label="Cerrar"
 >−</button>
 );
}

// ═══════════════════════════════════════════════════════════════════
// MODAL PERSONALIZACIÓN COMBOS / ÍTEMS CON ELECCIÓN OBLIGATORIA
// ═══════════════════════════════════════════════════════════════════

function ComboCustomizacionModal({ item, customization, onConfirm, onClose, s, Y }) {
 const config = customization;
 const [stepIdx, setStepIdx] = useState(0);
 const [selections, setSelections] = useState({});

 if (!config) { onConfirm(item, {}); return null; }

 const step = config.steps[stepIdx];
 const isLast = stepIdx === config.steps.length - 1;

 const handleSelect = (option) => {
  const newSel = { ...selections, [step.key]: option };
  setSelections(newSel);
  if (isLast) {
   // Build note string from selections
   const stepsByKey = Object.fromEntries((config.steps || []).map(s => [s.key, s]));
   const noteStr = Object.entries(newSel)
    .map(([k, v]) => `${stepsByKey[k]?.noteLabel || stepsByKey[k]?.label || k}: ${v}`)
    .join(" · ");
   onConfirm(item, newSel, noteStr);
  } else {
   setStepIdx(i => i + 1);
  }
 };

 return (
  <div style={s.overlay} onClick={onClose}>
   <div style={{...s.modal, maxWidth:380}} onClick={e=>e.stopPropagation()}>
    <div style={{...s.row, marginBottom:10}}>
     <div style={{color:Y, fontFamily:"'Bebas Neue',cursive", fontSize:18, letterSpacing:1}}>
      {item.name}
     </div>
     <CloseBtn onClose={onClose}/>
    </div>
    <div style={{fontSize:11, color:"#555", marginBottom:4, textTransform:"uppercase", letterSpacing:1}}>
     Paso {stepIdx+1} de {config.steps.length}
    </div>
    <div style={{fontWeight:900, fontSize:16, color:"#eee", marginBottom:16}}>{step.label}</div>
    <div style={{display:"flex", flexDirection:"column", gap:8}}>
     {step.options.map(opt => (
      <button key={opt}
       style={{...s.btn("secondary"), padding:"14px 16px", fontSize:14, fontWeight:800,
        border:"1px solid #333", textAlign:"left",
        transition:"border-color .15s, background .15s"}}
       onMouseEnter={e=>{e.currentTarget.style.borderColor=Y;e.currentTarget.style.background=`${Y}18`;}}
       onMouseLeave={e=>{e.currentTarget.style.borderColor="#333";e.currentTarget.style.background="#2a2a2a";}}
       onClick={() => handleSelect(opt)}>
       {opt}
      </button>
     ))}
    </div>
    {stepIdx > 0 && (
     <button style={{...s.btn("secondary"), marginTop:12, fontSize:11}} onClick={() => setStepIdx(i=>i-1)}>
      ← Volver al paso anterior
     </button>
    )}
   </div>
  </div>
 );
}


// ═══════════════════════════════════════════════════════════════════
function SalsasModalComponent({ initialSalsas = [], salsaOptions = [], onSave, onClose, s, Y }) {
 const [selected, setSelected] = useState(initialSalsas);
 const salsaNames = salsaOptions.map(s => typeof s === "string" ? s : (s?.name || s?.nombre)).filter(Boolean);

 const toggleSalsa = (salsa) => {
 if (selected.find(x => x.name === salsa)) {
 setSelected(selected.filter(x => x.name !== salsa));
 } else {
 if (salsa === "Clásica") {
 setSelected([{ name: "Clásica", style: "Sin crema" }]);
 } else {
 const noClasica = selected.filter(x => x.name !== "Clásica");
 setSelected([...noClasica, { name: salsa, style: "Bañadas" }]);
 }
 }
 };

 const toggleStyle = (salsa) => {
 setSelected(selected.map(x => x.name === salsa ? { ...x, style: x.style === "Bañadas" ? "Aparte" : "Bañadas" } : x));
 };

 return (
 <div style={s.overlay} onClick={onClose}>
 <div style={{...s.modal, maxWidth:380}} onClick={e => e.stopPropagation()}>
 <div style={{fontSize:24, marginBottom:10, color:Y, fontFamily:"'Bebas Neue',cursive", letterSpacing:1, display:"flex", justifyContent:"space-between", alignItems:"center"}}>
 <span>ELEGIR SALSAS</span>
 <CloseBtn onClose={onClose} />
 </div>
 
 <div style={{ display:"flex", gap:6, marginTop:6, flexWrap:"wrap", marginBottom:16 }}>
 {salsaNames.map(salsa => {
 const isSelected = selected.find(x => x.name === salsa);
 return (
 <button key={salsa} 
 style={{...s.btn(isSelected ? "primary" : "secondary"), fontSize:11}}
 onClick={() => toggleSalsa(salsa)}>
 {salsa}
 </button>
 )
 })}
 </div>

 {selected.length > 0 && (
 <div style={{marginBottom:16}}>
 <div style={{ fontSize:11, color:"#888", textTransform:"uppercase", letterSpacing:1, marginBottom:8 }}>Estilo por salsa seleccionada:</div>
 {selected.map(salsa => (
 <div key={salsa.name} style={{display:"flex", justifyContent:"space-between", alignItems:"center", background:"#222", padding:"8px 12px", borderRadius:8, marginBottom:6}}>
 <span style={{fontWeight:800, color:Y, fontSize:13}}>{salsa.name}</span>
 {salsa.name === "Clásica" ? (
 <span style={{color:"#888", fontSize:11, fontStyle:"italic"}}>Sin cremas</span>
 ) : (
 <button style={{...s.btn(salsa.style === "Bañadas" ? "warn" : "blue"), padding:"4px 10px", fontSize:11}} 
 onClick={() => toggleStyle(salsa.name)}>
 {salsa.style}
 </button>
 )}
 </div>
 ))}
 </div>
 )}

 <button style={{...s.btn("success"), width:"100%", padding:14, marginTop:8}} onClick={() => onSave(selected)}>
 Guardar Salsas
 </button>
 </div>
 </div>
 );
}

// ═══════════════════════════════════════════════════════════════════
// MODAL DIVIDIR CUENTA (SPLIT BILL)
// ═══════════════════════════════════════════════════════════════════
function SplitBillModal({ order, onProceed, onClose, s, Y, fmt }) {
 const [splitItems, setSplitItems] = useState(
 (order.items||[]).map(i => ({ ...i, splitQty: 0 }))
 );

 const splitTotal = splitItems.reduce((acc, i) => acc + (i.price * i.splitQty), 0);

 const handleQty = (cartId, delta, maxQty) => {
 setSplitItems(prev => prev.map(i => {
 if (i.cartId === cartId) {
 let newQty = i.splitQty + delta;
 if (newQty < 0) newQty = 0;
 if (newQty > maxQty) newQty = maxQty;
 return { ...i, splitQty: newQty };
 }
 return i;
 }));
 };

 return (
 <div style={s.overlay} onClick={onClose}>
 <div style={{...s.modal, maxWidth:420}} onClick={e => e.stopPropagation()}>
 <div style={{...s.row, marginBottom:14}}>
 <h2 style={{color:Y, fontFamily:"'Bebas Neue',cursive", margin:0, fontSize:24, letterSpacing:1}}> DIVIDIR CUENTA</h2>
 <CloseBtn onClose={onClose} />
 </div>
 
 <div style={{fontSize:12, color:"#aaa", marginBottom:16}}>
 Selecciona las cantidades que el cliente actual va a pagar. El resto se quedará en la cuenta de la mesa.
 </div>

 <div style={{maxHeight: 300, overflowY:"auto", marginBottom:16}}>
 {splitItems.map(item => (
 <div key={item.cartId} style={{display:"flex", alignItems:"center", justifyContent:"space-between", background:"#1a1a1a", padding:10, borderRadius:8, marginBottom:8, border:"1px solid #333"}}>
 <div style={{flex:1}}>
 <div style={{fontWeight:800, fontSize:13}}>{item.name} {item.isLlevar && "(Llevar)"}</div>
 <div style={{fontSize:11, color:"#888"}}>{item.qty} disponible(s) · {fmt(item.price)} c/u</div>
 </div>
 <div style={{display:"flex", alignItems:"center", gap:10}}>
 <button style={{...s.btn("danger"), padding:"4px 10px"}} onClick={() => handleQty(item.cartId, -1, item.qty)}>−</button>
 <span style={{fontWeight:900, fontSize:16, minWidth:20, textAlign:"center", color: item.splitQty > 0 ? Y : "#666"}}>{item.splitQty}</span>
 <button style={{...s.btn(), padding:"4px 10px"}} onClick={() => handleQty(item.cartId, 1, item.qty)}>+</button>
 </div>
 </div>
 ))}
 </div>

 <div style={{display:"flex", justifyContent:"space-between", padding:"12px 0", borderTop:`2px solid ${Y}55`, marginBottom:12}}>
 <span style={{fontWeight:900, fontSize:16}}>SUBTOTAL A COBRAR</span>
 <span style={{fontWeight:900, fontSize:16, color:Y}}>{fmt(splitTotal)}</span>
 </div>

 <button style={{...s.btn("success"), width:"100%", padding:14, fontSize:15, opacity: splitTotal === 0 ? 0.4 : 1}} 
 onClick={() => onProceed(splitItems.filter(i => i.splitQty > 0), splitTotal)} disabled={splitTotal === 0}>
 Proceder a Cobrar S/. {splitTotal.toFixed(2)}
 </button>
 </div>
 </div>
 );
}

// ═══════════════════════════════════════════════════════════════════
// MODAL DE EDICIÓN
// ═══════════════════════════════════════════════════════════════════
function EditOrderModal({ order, onSave, onClose, menu, appConfig, isMobile, s, Y, isAdmin=true, currentUser, onRequestPrecio }) {
 const [eTable, setETable] = useState(order.table);
 const [eItems, setEItems] = useState(order.items.map(i => ({ ...i, individualNotes: i.individualNotes || Array(i.qty).fill("") })));
 const [eNotes, setENotes] = useState(order.notes || "");
 const [ePhone, setEPhone] = useState(order.phone || "");
 const [eOrderType, setEOrderType] = useState(order.orderType || "mesa");

 const [eCat, setECat] = useState("Todos");
 const [eSearch, setESearch] = useState("");
 const eCats = [...new Set(menu.map(i => i.cat).filter(Boolean))];
 const [salsasModal, setSalsasModal] = useState(null);
 const [editingPrice, setEditingPrice] = useState(null); // { cartId, value, motivo }

 const eTotal = eItems.reduce((sum, i) => sum + i.price * i.qty, 0);

 const eUpdatePrice = (cartId, newPrice, motivo) => {
 const p = Math.max(0, parseFloat(newPrice) || 0);
 setEItems(prev => prev.map(i => i.cartId === cartId ? { ...i, price: p, ...(motivo?.trim() ? { priceNote: motivo.trim() } : {}) } : i));
 setEditingPrice(null);
 };

 const eAddItem = (item) => setEItems(prev => {
 const ex = prev.find(i => i.cartId === item.id);
 if (ex) {
 return prev.map(i => i.cartId === item.id ? { ...i, qty: i.qty + 1, individualNotes: [...i.individualNotes, ""] } : i);
 }
 return [...prev, { ...item, cartId: item.id, qty: 1, individualNotes: [""] }];
 });

 const eChangeQty = (cartId, d) => setEItems(prev =>
 prev.map(i => {
 if (i.cartId === cartId) {
 const newQty = i.qty + d;
 let newNotes = [...(i.individualNotes || [])];
 if (d > 0) newNotes.push("");
 else newNotes.pop();
 return { ...i, qty: newQty, individualNotes: newNotes };
 }
 return i;
 }).filter(i => i.qty > 0)
 );

 const eUpdateIndividualNote = (cartId, idx, note) => setEItems(prev =>
 prev.map(i => {
 if (i.cartId === cartId) {
 const newNotes = [...i.individualNotes];
 newNotes[idx] = note;
 return { ...i, individualNotes: newNotes };
 }
 return i;
 })
 );

 const filtE = menu.filter(i =>
 (eCat === "Todos" || i.cat === eCat) &&
 i.name.toLowerCase().includes(eSearch.toLowerCase())
 );
 
 const handleSave = () => {
 if (!eTable.trim() || !eItems.length) return;
 let finalItems = [...eItems];
 onSave({ ...order, table: eTable, items: finalItems, notes: eNotes, phone: ePhone, total: eTotal, orderType: eOrderType, taperCost: 0 });
 };

 const [eComboModal, setEComboModal] = useState(null);

 const handleCartaClick = (item) => {
 const customization = getItemCustomization(item, appConfig);
 if (customization) {
 setEComboModal({ item, customization });
 } else if (itemNeedsSalsas(item, appConfig)) {
 setSalsasModal({ itemToAdd: item, salsas: [] });
 } else {
 eAddItem(item);
 }
 };

 return (
 <div style={s.modal} onClick={e => e.stopPropagation()}>
 {eComboModal && (
 <ComboCustomizacionModal item={eComboModal.item} customization={eComboModal.customization} s={s} Y={Y}
  onClose={() => setEComboModal(null)}
  onConfirm={(item, selections, noteStr) => {
   const cartId = `${item.id}-${Date.now()}`;
   eAddItem({ ...item, cartId, _comboNote: noteStr });
   setEComboModal(null);
  }}
 />
 )}
 {salsasModal && (
      <SalsasModalComponent
        initialSalsas={salsasModal.salsas}
  salsaOptions={getSalsaOptions(salsasModal.itemToAdd, appConfig)}
 onSave={(salsas) => {
 if (salsasModal.itemToAdd) {
 const customizedItem = { ...salsasModal.itemToAdd, cartId: `${salsasModal.itemToAdd.id}-${Date.now()}`, salsas };
 eAddItem(customizedItem);
 } else {
 setEItems(prev => prev.map(i => i.cartId === salsasModal.cartId ? {...i, salsas} : i));
 }
 setSalsasModal(null);
 }} 
 onClose={() => setSalsasModal(null)} 
 s={s} Y={Y} 
 />
 )}

 <div style={{ ...s.row, marginBottom:14 }}>
 <div style={{ color:Y, fontFamily:"'Bebas Neue',cursive", fontSize:20, letterSpacing:1 }}> EDITAR PEDIDO</div>
 <CloseBtn onClose={onClose} />
 </div>

 <div style={{ marginBottom:10 }}>
 <label style={{ fontSize:11, color:"#888", textTransform:"uppercase", letterSpacing:1 }}>Tipo de pedido</label>
 <div style={{ display:"flex", gap:6, marginTop:4 }}>
 {["mesa","llevar"].map(t => (
 <button key={t} style={{ ...s.btn(eOrderType===t?"primary":"secondary"), flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}
 onClick={() => { setEOrderType(t); }}>
 <OrderTypeIcon type={t} size={18} color={eOrderType===t ? "#111" : (t==="mesa" ? Y : "#5dade2")} />
 {t==="mesa"?"Mesa":"Para llevar"}
 </button>
 ))}
 </div>
 <input style={{ ...s.input, marginTop:6 }} value={eTable} onChange={e => setETable(e.target.value)}
 placeholder={eOrderType==="mesa"?"Ej: Mesa 5":"Nombre del cliente"} spellCheck="false" />
 </div>

 {eOrderType === "llevar" && (
 <div style={{ marginBottom:10 }}>
 <label style={{ fontSize:11, color:"#888", textTransform:"uppercase", letterSpacing:1 }}>Teléfono</label>
 <input style={{ ...s.input, marginTop:4 }} value={ePhone} onChange={e => setEPhone(e.target.value)} placeholder="Ej: 9 87654321" />
 </div>
 )}

 <div style={{ marginBottom:10 }}>
 <label style={{ fontSize:11, color:"#888", textTransform:"uppercase", letterSpacing:1 }}>Notas Generales</label>
 <textarea style={{ ...s.input, marginTop:4, resize:"vertical", minHeight:60, fontFamily:"inherit" }} value={eNotes} onChange={e => setENotes(e.target.value)} placeholder="Sin cebolla en general..." spellCheck="false" />
 </div>

 <div style={{ marginBottom:12 }}>
 <label style={{ fontSize:11, color:"#888", textTransform:"uppercase", letterSpacing:1 }}>Productos del pedido</label>
 {eItems.length === 0
 ? <div style={{ textAlign:"center", color:"#444", padding:"12px 0", fontSize:12 }}>Agrega productos desde abajo</div>
 : eItems.map(item => (
 <div key={item.cartId} style={{ marginBottom:10, padding:"10px", background:"#0a0a0a", borderRadius:8, border:"1px solid #222" }}>
 <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:8, paddingBottom:8, borderBottom:"1px solid #252525" }}>
 <div style={{ flex:1, fontSize:14, fontWeight:700 }}>
 {item.name} {item.isLlevar && <span style={{marginLeft:6, background:"#154360", color:"#3498db", borderRadius:4, padding:"2px 6px", fontSize:10, fontWeight:700}}>(Llevar)</span>}
 {itemNeedsSalsas(item, appConfig) && (
 <button style={{...s.btn("secondary"), padding:"2px 6px", fontSize:10, marginLeft:6}} onClick={() => setSalsasModal({cartId: item.cartId, salsas: item.salsas || []})}>
 Salsas
 </button>
 )}
 {eOrderType === "mesa" && (
 <button
  style={{...s.btn(item.isLlevar?"blue":"secondary"), padding:"2px 8px", fontSize:10, marginLeft:6}}
  onClick={() => setEItems(prev=>prev.map(i=>i.cartId===item.cartId?{...i,isLlevar:!i.isLlevar}:i))}>
  {item.isLlevar?"Llevar":"Mesa"}
 </button>
 )}
 </div>
 <button style={{ ...s.btn("danger"), padding:"4px 10px", fontSize:14 }} onClick={() => eChangeQty(item.cartId,-1)}>−</button>
 <span style={{ fontWeight:900, minWidth:20, textAlign:"center", fontSize:14 }}>{item.qty}</span>
 <button style={{ ...s.btn(), padding:"4px 10px", fontSize:14 }} onClick={() => eChangeQty(item.cartId,1)}>+</button>
 <div style={{display:"flex", flexDirection:"column", alignItems:"flex-end", gap:2}}>
 <span style={{ color:Y, fontWeight:900, fontSize:14, minWidth:55, textAlign:"right" }}>{fmt(item.price*item.qty)}</span>
 {isAdmin ? (
  <button style={{...s.btn("secondary"), padding:"1px 6px", fontSize:10, opacity:0.8}}
   onClick={() => setEditingPrice({ cartId: item.cartId, value: String(item.price), motivo: "" })}>
   ✏️ precio
  </button>
 ) : (
  <button style={{...s.btn("blue"), padding:"1px 6px", fontSize:10, opacity:0.8}}
   onClick={() => setEditingPrice({ cartId: item.cartId, value: String(item.price), motivo: "", solicitando: true })}>
   📨 precio
  </button>
 )}
 </div>
 </div>

 {/* Editor inline de precio */}
 {editingPrice?.cartId === item.cartId && (
 <div style={{background:"#0d1a0d", border:`1px solid ${Y}44`, borderRadius:8, padding:"10px 12px", marginBottom:8}}>
 <div style={{fontSize:11, color:"#888", marginBottom:6, textTransform:"uppercase", letterSpacing:1}}>Editar precio unitario</div>
 <div style={{display:"flex", gap:6, alignItems:"center", marginBottom:8}}>
 <span style={{fontSize:12, color:"#aaa", whiteSpace:"nowrap"}}>S/.</span>
 <input
 type="number"
 min="0" step="0.5"
 autoFocus
 style={{...s.input, flex:1, fontWeight:900, fontSize:16, color:Y}}
 value={editingPrice.value}
 onChange={e => setEditingPrice(prev => ({...prev, value: e.target.value}))}
 onKeyDown={e => { if(e.key==="Enter") eUpdatePrice(item.cartId, editingPrice.value, editingPrice.motivo); if(e.key==="Escape") setEditingPrice(null); }}
 />
 <span style={{fontSize:12, color:"#555", whiteSpace:"nowrap"}}>× {item.qty} = {fmt((parseFloat(editingPrice.value)||0)*item.qty)}</span>
 </div>
 <input
 style={{...s.input, fontSize:12, marginBottom:8}}
 placeholder="Motivo del cambio (opcional)"
 value={editingPrice.motivo}
 onChange={e => setEditingPrice(prev => ({...prev, motivo: e.target.value}))}
 spellCheck="false"
 />
 <div style={{display:"flex", gap:6}}>
 <button style={{...s.btn(isAdmin?"success":"blue"), flex:2, padding:"6px 10px", fontSize:12}}
 onClick={() => {
  if (isAdmin) {
   eUpdatePrice(item.cartId, editingPrice.value, editingPrice.motivo);
  } else {
   onRequestPrecio({
    type: "precio",
    requestedBy: currentUser?.userId || currentUser?.id,
    requestedByName: currentUser?.name || currentUser?.label,
    orderId: order.id,
    orderTable: order.table,
    orderType: order.orderType,
    orderTotal: order.total,
    orderItems: order.items,
    cartId: item.cartId,
    itemName: item.name,
    oldPrice: item.price,
    newPrice: parseFloat(editingPrice.value) || item.price,
    priceMotivo: editingPrice.motivo,
   });
   setEditingPrice(null);
  }
 }}>
 {isAdmin ? "✅ Aplicar" : "📨 Solicitar cambio"}
 </button>
 <button style={{...s.btn("secondary"), flex:1, padding:"6px 10px", fontSize:12}}
 onClick={() => setEditingPrice(null)}>
 Cancelar
 </button>
 </div>
 </div>
 )}
 
 {item.salsas?.length > 0 && (
 <div style={{color:Y, fontSize:11, marginBottom:4, fontStyle:"italic"}}>
 Salsas: {item.salsas.map(sa => `${sa.name} (${sa.style})`).join(", ")}
 </div>
 )}
 {item.priceNote && (
 <div style={{fontSize:11, color:"#e67e22", marginBottom:4}}>
 ✏️ Precio ajustado: {item.priceNote}
 </div>
 )}
 {item._comboNote && (
 <div style={{fontSize:11, color:"#3498db", marginBottom:4}}>
 🎯 {item._comboNote}
 </div>
 )}

 {item.id !== "TAPER" && Array.from({ length: item.qty }).map((_, idx) => (
 <textarea 
 key={idx}
 style={{ ...s.input, fontSize:13, padding:"6px 10px", marginTop: 4, background:"#141414", resize:"vertical", minHeight:40, fontFamily:"inherit" }} 
 placeholder={`Nota para el plato ${idx + 1}...`} 
 value={item.individualNotes?.[idx] || ""} 
 spellCheck="false"
 onChange={e => eUpdateIndividualNote(item.cartId, idx, e.target.value)} 
 />
 ))}
 </div>
 ))
 }
 {eItems.length > 0 && (
 <div style={{ display:"flex", justifyContent:"space-between", padding:"10px 0 2px", borderTop:`2px solid ${Y}44` }}>
 <span style={{ fontWeight:900 }}>TOTAL</span>
 <span style={{ fontWeight:900, color:Y }}>{fmt(eTotal)}</span>
 </div>
 )}
 </div>

 <div style={{ marginBottom:12 }}>
 <label style={{ fontSize:11, color:"#888", textTransform:"uppercase", letterSpacing:1 }}>Agregar más productos</label>
 <input style={{ ...s.input, marginTop:4, marginBottom:6 }} placeholder="Buscar..." value={eSearch} onChange={e => setESearch(e.target.value)} />
 <div style={{ display:"flex", gap:4, flexWrap:"wrap", marginBottom:6 }}>
 {["Todos",...eCats].map(c => (
 <button key={c} style={{ ...s.btn(eCat===c?"primary":"secondary"), fontSize:9, padding:"3px 7px" }} onClick={() => setECat(c)}>{c}</button>
 ))}
 </div>
 <div style={{ maxHeight:160, overflowY:"auto" }}>
 {filtE.map(item => {
 const inE = eItems.find(i => i.id === item.id);
 return (
 <div key={item.id} onClick={() => handleCartaClick(item)} style={{ ...s.card, cursor:"pointer", marginBottom:4, padding:"7px 10px", border: inE ? `1px solid ${Y}55` : "1px solid #2a2a2a" }}>
 <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
 <span style={{ fontSize:13 }}> {item.name}</span>
 <div style={{ display:"flex", alignItems:"center", gap:6 }}>
 <span style={{ color:Y, fontWeight:900, fontSize:12 }}>{fmt(item.price)}</span>
 <span style={{ background:"#2a2a2a", borderRadius:"50%", width:20, height:20, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, color:"#aaa", fontSize:14 }}>+</span>
 </div>
 </div>
 </div>
 );
 })}
 </div>
 </div>

 <button style={{ ...s.btn("warn"), width:"100%", padding:12, fontSize:14, opacity:(!eTable||!eItems.length)?0.4:1 }}
 onClick={handleSave} disabled={!eTable||!eItems.length}>
 Guardar Cambios
 </button>
 </div>
 );
}

// ═══════════════════════════════════════════════════════════════════
// MODAL MULTICOBRO — con descuento por ítem y global
// ═══════════════════════════════════════════════════════════════════
function CobrarModal({ orderContext, total, onConfirm, onClose, s, Y }) {
 // ── Descuento global ─────────────────────────────────────────────
 const [descPct, setDescPct] = useState(0);
 const [descSoles, setDescSoles] = useState(0);
 const [descMode, setDescMode] = useState("pct"); // "pct" | "soles"
 const [descMotivo, setDescMotivo] = useState("");
 const [showDesc, setShowDesc] = useState(false);

 // ── Descuentos por ítem: { cartId: { mode:"pct"|"soles", value:number } }
 const [itemDiscounts, setItemDiscounts] = useState({});
 const [itemDiscMode, setItemDiscMode] = useState("pct"); // global toggle for item discount mode
 const [showItemDisc, setShowItemDisc] = useState(false);

 const displayItems = orderContext.splitItems
  ? orderContext.splitItems.filter(i => i.splitQty > 0).map(i => ({...i, qty: i.splitQty}))
  : (orderContext.items || []);
 const [comprobanteTipo, setComprobanteTipo] = useState("ticket");
 const [docNumero, setDocNumero] = useState("");
 const [clienteNombre, setClienteNombre] = useState("");
 const [clienteDireccion, setClienteDireccion] = useState("");
 const [docLookupMsg, setDocLookupMsg] = useState("");
 const [docLookupLoading, setDocLookupLoading] = useState(false);
 const docDigits = docNumero.replace(/\D/g, "");
 const comprobanteSeleccionado = comprobanteTipo !== "ticket";
 const comprobanteError = comprobanteTipo === "01"
  ? (docDigits.length !== 11 ? "La factura requiere RUC de 11 digitos." : !clienteNombre.trim() ? "Ingresa la razon social." : "")
  : "";
 const comprobanteReady = !comprobanteSeleccionado || !comprobanteError;
 const lookupDocumento = async () => {
  if (!docDigits) return;
  setDocLookupLoading(true); setDocLookupMsg("");
  try {
   const data = await API.facturacion.consultarDocumento({ tipo: comprobanteTipo === "01" ? "RUC" : "DNI", numero: docDigits });
   setClienteNombre(data.razon_social || data.razonSocial || data.nombre || data.nombre_completo || clienteNombre);
   setClienteDireccion(data.direccion || data.domicilio || clienteDireccion);
   setDocLookupMsg("Datos cargados");
  } catch (err) {
   setDocLookupMsg(err.message || "Consulta no disponible");
  }
  setDocLookupLoading(false);
 };

 // Compute effective price per item based on its own mode
 const getItemEffective = (item) => {
  const d = itemDiscounts[item.cartId] || { mode: itemDiscMode, value: 0 };
  const val = parseFloat(d.value) || 0;
  const originalTotal = item.price * item.qty;
  if (d.mode === "soles") {
   const discAmt = Math.min(val, originalTotal);
   return { original: originalTotal, effective: originalTotal - discAmt, discAmt };
  } else {
   const pct = Math.min(val, 100);
   const discAmt = Math.round(originalTotal * pct / 100 * 100) / 100;
   return { original: originalTotal, effective: originalTotal - discAmt, discAmt };
  }
 };

 const itemsSubtotal = displayItems.reduce((sum, item) => sum + getItemEffective(item).effective, 0);
 const hasItemDiscounts = displayItems.some(item => {
  const d = itemDiscounts[item.cartId] || { value: 0 };
  return (parseFloat(d.value) || 0) > 0;
 });
 const totalItemDiscAmt = Math.round((total - itemsSubtotal) * 100) / 100;

 // Descuento global — % o soles
 const descAmt = descMode === "soles"
  ? Math.min(Math.max(0, parseFloat(descSoles)||0), itemsSubtotal)
  : Math.round((itemsSubtotal * (Number(descPct)||0) / 100) * 100) / 100;
 const totalFinal = Math.max(0, itemsSubtotal - descAmt);

 const [ef, setEf] = useState(totalFinal);
 const [ya, setYa] = useState(0);
 const [ta, setTa] = useState(0);
 useEffect(() => { setEf(totalFinal); setYa(0); setTa(0); }, [totalFinal]);

 const sum = Number(ef||0) + Number(ya||0) + Number(ta||0);
 const diff = totalFinal - sum;
 const DESCUENTOS_RAPIDOS = [5, 10, 15, 20, 25, 50];
 const totalDescuento = totalItemDiscAmt + descAmt;

 const setItemDisc = (cartId, field, val) => {
  setItemDiscounts(prev => ({
   ...prev,
   [cartId]: { mode: prev[cartId]?.mode || itemDiscMode, value: prev[cartId]?.value || 0, ...prev[cartId], [field]: val }
  }));
 };

 const handleConfirm = () => {
  if (!comprobanteReady) return;
  onConfirm({
   efectivo: Number(ef||0), yape: Number(ya||0), tarjeta: Number(ta||0),
   descuentoPct: descMode === "pct" ? (Number(descPct)||0) : 0,
   descuentoAmt: totalDescuento,
   descuentoMotivo: descMotivo,
   totalOriginal: total, totalFinal,
   itemDiscounts: hasItemDiscounts ? itemDiscounts : undefined,
   comprobante: comprobanteSeleccionado ? {
    tipo_comprobante: comprobanteTipo,
    cliente: {
     tipo_documento: comprobanteTipo === "01" ? "6" : (docDigits ? "1" : "0"),
     numero_documento: docDigits,
     razon_social: clienteNombre.trim(),
     direccion: clienteDireccion.trim(),
    },
   } : null,
  });
 };

 return (
 <div style={s.modal} onClick={e => e.stopPropagation()}>
 <div style={{...s.row, marginBottom:14}}>
  <h2 style={{color:Y, fontFamily:"'Bebas Neue',cursive", margin:0, fontSize:24, letterSpacing:1}}>💰 COBRAR</h2>
  <CloseBtn onClose={onClose} />
 </div>

 {/* ── Descuentos por ítem ── */}
 {displayItems.length > 0 && (
  <div style={{marginBottom:12}}>
   <button style={{...s.btn(showItemDisc?"warn":"secondary"), width:"100%", padding:"8px 12px", fontSize:12, marginBottom: showItemDisc ? 10 : 0}}
    onClick={() => setShowItemDisc(v => !v)}>
    {showItemDisc ? "▲ Ocultar descuentos por ítem" : "🏷 Descuentos por ítem"}
   </button>
   {showItemDisc && (
    <div style={{background:"#111", border:"1px solid #8e5a00", borderRadius:10, padding:"12px 14px"}}>
     {/* Modo global para ítems */}
     <div style={{display:"flex", gap:6, marginBottom:12}}>
      <button style={{...s.btn(itemDiscMode==="pct"?"warn":"secondary"), flex:1, fontSize:11, padding:"5px 0"}}
       onClick={() => { setItemDiscMode("pct"); setItemDiscounts(prev => { const n={}; Object.keys(prev).forEach(k=>{n[k]={...prev[k],mode:"pct"}}); return n; }); }}>
       % Porcentaje
      </button>
      <button style={{...s.btn(itemDiscMode==="soles"?"warn":"secondary"), flex:1, fontSize:11, padding:"5px 0"}}
       onClick={() => { setItemDiscMode("soles"); setItemDiscounts(prev => { const n={}; Object.keys(prev).forEach(k=>{n[k]={...prev[k],mode:"soles"}}); return n; }); }}>
       S/. Soles
      </button>
     </div>

     {displayItems.map(item => {
      const d = itemDiscounts[item.cartId] || { mode: itemDiscMode, value: 0 };
      const eff = getItemEffective(item);
      const hasDisc = (parseFloat(d.value)||0) > 0;
      return (
       <div key={item.cartId} style={{marginBottom:10, padding:"10px 12px", background:"#1a1a1a", borderRadius:10, border:`1px solid ${hasDisc?"#d35400":"#2a2a2a"}`}}>
        {/* Nombre + precio */}
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6}}>
         <div style={{fontSize:13, fontWeight:700, flex:1, minWidth:0, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>
          {item.qty}× {item.name}
         </div>
         <div style={{fontSize:12, flexShrink:0, marginLeft:8, textAlign:"right"}}>
          {hasDisc ? (
           <>
            <span style={{textDecoration:"line-through", color:"#555", marginRight:6}}>{fmt(eff.original)}</span>
            <span style={{color:"#27ae60", fontWeight:900}}>{fmt(eff.effective)}</span>
            <span style={{color:"#d35400", marginLeft:6, fontSize:11}}>−{fmt(eff.discAmt)}</span>
           </>
          ) : (
           <span style={{color:"#888"}}>{fmt(eff.original)}</span>
          )}
         </div>
        </div>
        {/* Toggle % / S/. por ítem + input */}
        <div style={{display:"flex", gap:6, alignItems:"center"}}>
         <button style={{...s.btn(d.mode==="pct"?"primary":"secondary"), padding:"4px 10px", fontSize:11, flexShrink:0}}
          onClick={() => setItemDisc(item.cartId, "mode", "pct")}>%</button>
         <button style={{...s.btn(d.mode==="soles"?"primary":"secondary"), padding:"4px 10px", fontSize:11, flexShrink:0}}
          onClick={() => setItemDisc(item.cartId, "mode", "soles")}>S/.</button>
         <input type="number"
          style={{...s.input, flex:1, textAlign:"center", padding:"6px 8px", fontSize:14, fontWeight:900}}
          min="0" max={d.mode==="pct"?100:eff.original} step={d.mode==="pct"?1:0.5}
          placeholder="0"
          value={d.value || ""}
          onChange={e => {
           const raw = parseFloat(e.target.value)||0;
           const capped = d.mode==="pct" ? Math.min(100, Math.max(0, raw)) : Math.max(0, raw);
           setItemDisc(item.cartId, "value", capped||0);
          }}
         />
         <span style={{color:"#888", fontSize:13, fontWeight:700, flexShrink:0}}>{d.mode==="pct"?"%":"S/."}</span>
        </div>
        {/* Atajos rápidos por ítem */}
        {d.mode === "pct" ? (
         <div style={{display:"flex", gap:4, flexWrap:"wrap", marginTop:6}}>
          {[5,10,15,20,25,50].map(p => (
           <button key={p} style={{...s.btn((d.value||0)===p?"warn":"secondary"), padding:"2px 8px", fontSize:10}}
            onClick={()=>setItemDisc(item.cartId,"value",(d.value||0)===p?0:p)}>{p}%</button>
          ))}
         </div>
        ) : (
         <div style={{display:"flex", gap:4, flexWrap:"wrap", marginTop:6}}>
          {[1,2,3,5,10].map(v => (
           <button key={v} style={{...s.btn((d.value||0)===v?"warn":"secondary"), padding:"2px 8px", fontSize:10}}
            onClick={()=>setItemDisc(item.cartId,"value",(d.value||0)===v?0:v)}>S/.{v}</button>
          ))}
         </div>
        )}
       </div>
      );
     })}

     {hasItemDiscounts && (
      <div style={{display:"flex", justifyContent:"space-between", padding:"8px 12px", background:"#0d1a0d", borderRadius:8, border:"1px solid #27ae6033", marginTop:4}}>
       <span style={{color:"#27ae60", fontWeight:800, fontSize:13}}>Ahorro por ítems:</span>
       <span style={{color:"#27ae60", fontWeight:900, fontSize:14}}>−{fmt(totalItemDiscAmt)}</span>
      </div>
     )}
    </div>
   )}
  </div>
 )}

 {/* ── Total display ── */}
 <div style={{textAlign:"center", background:"#111", padding:"12px 16px", borderRadius:10, marginBottom:12}}>
  {totalDescuento > 0 && (
   <div style={{fontSize:13, color:"#888", textDecoration:"line-through", marginBottom:2}}>
    Total original: {fmt(total)}
   </div>
  )}
  <div style={{fontSize:22, fontWeight:900}}>
   TOTAL A COBRAR: <span style={{color: totalDescuento > 0 ? "#27ae60" : Y}}>{fmt(totalFinal)}</span>
  </div>
  {hasItemDiscounts && (
   <div style={{fontSize:12, color:"#27ae60", marginTop:4, fontWeight:700}}>
    🏷 Descuento ítems: −{fmt(totalItemDiscAmt)}
   </div>
  )}
  {descAmt > 0 && (
   <div style={{fontSize:12, color:"#27ae60", marginTop:2, fontWeight:700}}>
    🏷 Descuento {descMode==="soles" ? `S/.${descAmt.toFixed(2)}` : `${descPct}%`}: −{fmt(descAmt)}{descMotivo ? ` · ${descMotivo}` : ""}
   </div>
  )}
  {totalDescuento > 0 && (
   <div style={{fontSize:13, color:"#2ecc71", marginTop:4, fontWeight:900, background:"#0a2a0a", borderRadius:6, padding:"4px 8px", display:"inline-block"}}>
    Ahorro total: −{fmt(totalDescuento)}
   </div>
  )}
 </div>

 {/* ── Descuento global ── */}
 <div style={{marginBottom:12}}>
  <button
   style={{...s.btn(showDesc?"warn":"secondary"), width:"100%", padding:"8px 12px", fontSize:12, marginBottom: showDesc ? 10 : 0}}
   onClick={()=>setShowDesc(v=>!v)}>
   {showDesc ? "▲ Ocultar descuento global" : "🏷 Descuento global"}
  </button>

  {showDesc && (
   <div style={{background:"#111", border:"1px solid #d35400", borderRadius:10, padding:"12px 14px"}}>
    {/* Toggle % / Soles */}
    <div style={{display:"flex", gap:6, marginBottom:12}}>
     <button style={{...s.btn(descMode==="pct"?"warn":"secondary"), flex:1, fontSize:12}}
      onClick={()=>{ setDescMode("pct"); setDescSoles(0); }}>% Porcentaje</button>
     <button style={{...s.btn(descMode==="soles"?"warn":"secondary"), flex:1, fontSize:12}}
      onClick={()=>{ setDescMode("soles"); setDescPct(0); }}>S/. Soles</button>
    </div>

    {descMode === "pct" ? (
     <>
      <div style={{fontSize:11, color:"#888", textTransform:"uppercase", letterSpacing:1, marginBottom:8}}>Porcentaje sobre subtotal con descuentos</div>
      <div style={{display:"flex", gap:6, flexWrap:"wrap", marginBottom:10}}>
       {DESCUENTOS_RAPIDOS.map(p => (
        <button key={p}
         style={{...s.btn(Number(descPct)===p?"warn":"secondary"), padding:"5px 10px", fontSize:12}}
         onClick={()=>setDescPct(Number(descPct)===p ? 0 : p)}>
         {p}%
        </button>
       ))}
      </div>
      <div style={{display:"flex", alignItems:"center", gap:8, marginBottom:10}}>
       <input type="number" style={{...s.input, flex:1}} min="0" max="100" step="1"
        placeholder="% personalizado" value={descPct||""}
        onChange={e => setDescPct(Math.min(100,Math.max(0,Number(e.target.value)||0)))} />
       <span style={{color:"#888", fontWeight:700, whiteSpace:"nowrap"}}>% = −{fmt(descAmt)}</span>
      </div>
     </>
    ) : (
     <>
      <div style={{fontSize:11, color:"#888", textTransform:"uppercase", letterSpacing:1, marginBottom:8}}>Monto a descontar en soles</div>
      <div style={{display:"flex", gap:6, flexWrap:"wrap", marginBottom:10}}>
       {[1,2,5,10,20,50].map(s_ => (
        <button key={s_}
         style={{...s.btn(Number(descSoles)===s_?"warn":"secondary"), padding:"5px 10px", fontSize:12}}
         onClick={()=>setDescSoles(Number(descSoles)===s_ ? 0 : s_)}>
         S/.{s_}
        </button>
       ))}
      </div>
      <div style={{display:"flex", alignItems:"center", gap:8, marginBottom:10}}>
       <span style={{color:"#aaa", fontWeight:700}}>S/.</span>
       <input type="number" style={{...s.input, flex:1}} min="0" step="0.5"
        placeholder="Monto personalizado" value={descSoles||""}
        onChange={e => setDescSoles(Math.max(0, parseFloat(e.target.value)||0))} />
       <span style={{color:"#888", fontWeight:700, whiteSpace:"nowrap"}}>= −{fmt(descAmt)}</span>
      </div>
     </>
    )}
    <input style={s.input} placeholder="Motivo (opcional)" value={descMotivo}
     onChange={e => setDescMotivo(e.target.value)} spellCheck="false" />
   </div>
 )}
 </div>

 <div style={{background:"#111", border:"1px solid #303030", borderRadius:8, padding:"12px 14px", marginBottom:12}}>
  <div style={{fontSize:11, color:"#888", textTransform:"uppercase", letterSpacing:1, marginBottom:8}}>Comprobante electronico</div>
  <div style={{display:"flex", gap:6, marginBottom: comprobanteSeleccionado ? 10 : 0}}>
   {[
    ["ticket", "Ticket"],
    ["03", "Boleta"],
    ["01", "Factura"],
   ].map(([id, label]) => (
    <button key={id} style={{...s.btn(comprobanteTipo===id?"primary":"secondary"), flex:1, padding:"7px 8px", fontSize:12}}
     onClick={() => {
      setComprobanteTipo(id);
      if (id === "ticket") { setDocNumero(""); setClienteNombre(""); setClienteDireccion(""); }
     }}>
     {label}
    </button>
   ))}
  </div>
  {comprobanteSeleccionado && (
   <div style={{display:"flex", flexDirection:"column", gap:8}}>
    <div style={{display:"flex", gap:6}}>
     <input
      style={s.input}
      placeholder={comprobanteTipo === "01" ? "RUC" : "DNI (opcional)"}
      value={docNumero}
      onChange={e => setDocNumero(e.target.value)}
      inputMode="numeric"
      spellCheck="false"
     />
     <button style={{...s.btn("secondary"), padding:"7px 10px"}} onClick={lookupDocumento} disabled={!docDigits || docLookupLoading}>
      {docLookupLoading ? "..." : "Buscar"}
     </button>
    </div>
    <input
     style={s.input}
     placeholder={comprobanteTipo === "01" ? "Razon social" : "Nombre del cliente (opcional)"}
     value={clienteNombre}
     onChange={e => setClienteNombre(e.target.value)}
     spellCheck="false"
    />
    <input
     style={s.input}
     placeholder="Direccion (opcional)"
     value={clienteDireccion}
     onChange={e => setClienteDireccion(e.target.value)}
     spellCheck="false"
    />
    {docLookupMsg && <div style={{color:docLookupMsg === "Datos cargados" ? "#27ae60" : "#e67e22", fontSize:11, fontWeight:800, textAlign:"center"}}>{docLookupMsg}</div>}
    {comprobanteError && <div style={{color:"#e74c3c", fontSize:12, fontWeight:800, textAlign:"center"}}>{comprobanteError}</div>}
   </div>
  )}
 </div>

 {/* ── Métodos de pago ── */}
 <div style={{display:"flex", flexDirection:"column", gap:10, marginBottom:12}}>
  {[
   {label:"Efectivo", val:ef, set:setEf, todoFn:()=>{setEf(totalFinal);setYa(0);setTa(0);}},
   {label:"Yape", val:ya, set:setYa, todoFn:()=>{setEf(0);setYa(totalFinal);setTa(0);}},
   {label:"Tarjeta", val:ta, set:setTa, todoFn:()=>{setEf(0);setYa(0);setTa(totalFinal);}},
  ].map(({label, val, set, todoFn}) => (
   <div key={label} style={{display:"flex", alignItems:"center", gap:10}}>
    <span style={{width:90, fontWeight:700, fontSize:13}}>{label}</span>
    <input type="number" style={s.input} value={val} onChange={e=>set(e.target.value)} min="0" step="0.5" />
    <button style={s.btn("secondary")} onClick={todoFn}>Todo</button>
   </div>
  ))}
 </div>

 {Math.abs(diff) > 0.01 && (
  <div style={{textAlign:"center", fontSize:13, color: diff>0?"#e74c3c":"#e67e22", fontWeight:700, marginBottom:8, padding:"6px", background:"#1a0a0a", borderRadius:6}}>
   {diff > 0 ? `⚠ Falta: ${fmt(diff)}` : `⚠ Excede: ${fmt(Math.abs(diff))}`}
  </div>
 )}

 <button
  style={{...s.btn("success"), width:"100%", padding:14, fontSize:16, opacity: Math.abs(diff)>0.01 || !comprobanteReady ? 0.45 : 1}}
  onClick={handleConfirm} disabled={Math.abs(diff)>0.01 || !comprobanteReady}>
  ✅ Confirmar Cobro {totalDescuento > 0 ? `(ahorro −${fmt(totalDescuento)})` : ""}
 </button>
 </div>
 )
}

// ═══════════════════════════════════════════════════════════════════
// NUEVO PEDIDO (Carrito)
// ═══════════════════════════════════════════════════════════════════
function NuevoPedidoComponent({ draft, setDraft, menu, appConfig, addItem, changeQty, updateIndividualNote, draftTotal, fmt, submitOrder, newDraft, s, Y, isDesktop, isMobile, isTablet, mesasArr, cajaAbierta }) {
 const [search, setSearch] = useState("");
 const [catFilter, setCatFilter] = useState("Todos");
 const [showCartModal, setShowCartModal] = useState(false);
 const [salsasModal, setSalsasModal] = useState(null);
 const [comboModal, setComboModal] = useState(null); // item requiring customization
 const menuCats = [...new Set(menu.map(i => i.cat).filter(Boolean))];

 const filteredMenu = menu.filter(i => (catFilter === "Todos" || i.cat === catFilter) && i.name.toLowerCase().includes(search.toLowerCase()));
 const itemCount = draft.items.reduce((sum, i) => sum + i.qty, 0);

 const handleCartaClick = (item) => {
 const customization = getItemCustomization(item, appConfig);
 if (customization) {
 setComboModal({ item, customization });
 } else if (itemNeedsSalsas(item, appConfig)) {
 setSalsasModal({ itemToAdd: item, salsas: [] });
 } else {
 addItem(item);
 }
 };

 const CartContent = () => (
 <div style={{ ...s.cardHL, position: isDesktop ? "sticky" : "static", top:8, background: isMobile ? "#1a1a1a" : "#1c1c1c", border: isMobile ? "none" : `1px solid ${Y}44`, padding: isMobile ? 0 : 14, display: isDesktop ? "flex" : "block", flexDirection: "column", maxHeight: isDesktop ? "calc(100vh - 100px)" : "none", overflowY: isDesktop ? "hidden" : "auto" }}>
   {salsasModal && !salsasModal.itemToAdd && (
     <SalsasModalComponent 
       initialSalsas={salsasModal.salsas} 
       onSave={(salsas) => {
         setDraft(prev => ({...prev, items: prev.items.map(i => i.cartId === salsasModal.cartId ? {...i, salsas} : i)}));
         setSalsasModal(null);
       }} 
       onClose={() => setSalsasModal(null)} s={s} Y={Y} 
     />
   )}
   {comboModal && (
      <ComboCustomizacionModal item={comboModal.item} customization={comboModal.customization} s={s} Y={Y}
       onClose={() => setComboModal(null)}
       onConfirm={(item, selections, noteStr) => {
         const cartId = `${item.id}-${Date.now()}`;
         addItem({ ...item, cartId, _comboNote: noteStr });
         setComboModal(null);
       }}
     />
   )}

   {/* ─── CABECERA FIJA ─── */}
   <div style={{ flexShrink: 0, marginBottom: 12 }}>
     <div style={{ ...s.title, fontSize:22, marginBottom:12, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
       <span>🛒 PEDIDO ACTUAL</span>
       {isMobile && <CloseBtn onClose={() => setShowCartModal(false)} />}
     </div>

     <label style={{ fontSize:11, color:"#888", textTransform:"uppercase", letterSpacing:1, display:"block", marginBottom:4 }}>Tipo de pedido</label>
     <div style={{ display:"flex", gap:6 }}>
       {["mesa","llevar"].map(t => (
         <button key={t} style={{ ...s.btn(draft.orderType===t?"primary":"secondary"), flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}
           onClick={() => setDraft(d => ({...d, orderType:t, taperCost:0, payTiming: "despues", table:"", phone:"", deliveryAddress:""}))}>
           <OrderTypeIcon type={t} size={18} color={draft.orderType===t ? "#111" : (t==="mesa" ? Y : "#5dade2")} />
           {t==="mesa" ? "Mesa" : "Para llevar"}
         </button>
       ))}
     </div>
   </div>

   {/* ─── ÁREA SCROLLEABLE (Inputs + Ítems + Notas) ─── */}
   <div style={{ flexGrow: 1, overflowY: "auto", minHeight: 0, paddingRight: 4, display: "flex", flexDirection: "column", gap: 14 }}>
     
     {/* 1. Datos del Cliente / Mesa */}
     <div>
       {draft.orderType === "mesa" ? (
         <select style={s.input}
           value={draft.table}
           onChange={e => setDraft(d => ({...d, table: e.target.value}))}>
           <option value="">-- Seleccionar Mesa --</option>
           {(mesasArr||[]).map(n => <option key={n} value={String(n)}>Mesa {n}</option>)}
         </select>
       ) : (
         <div style={{display:"flex", flexDirection:"column", gap:6}}>
           <input style={s.input} placeholder="Nombre del cliente (opcional)" value={draft.table || ""} onChange={e => setDraft(d => ({...d, table: e.target.value}))} spellCheck="false" />
           <input style={s.input} placeholder="Número de teléfono (opcional)" value={draft.phone || ""} onChange={e => setDraft(d => ({...d, phone: e.target.value}))} spellCheck="false" />
           <input style={s.input} placeholder="Dirección de entrega (opcional)" value={draft.deliveryAddress || ""} onChange={e => setDraft(d => ({...d, deliveryAddress: e.target.value}))} spellCheck="false" />
         </div>
       )}
     </div>

     {/* 2. Alertas y timing de pago */}
     <div>
       {draft.orderType === "llevar" ? (
         <div style={{background:"#0a1520", border:"1px solid #3498db44", borderRadius:8, padding:"10px 14px", display:"flex", alignItems:"center", gap:10}}>
           <span style={{fontSize:18}}>🥡</span>
           <div>
             <div style={{fontSize:11, color:"#3498db", fontWeight:800, textTransform:"uppercase", letterSpacing:1}}>Espera cobro del cajero</div>
             <div style={{fontSize:11, color:"#555", marginTop:2}}>El pedido se registra y el cajero lo cobra antes de enviarlo a cocina</div>
           </div>
         </div>
       ) : (
         <>
           <label style={{ fontSize:11, color:"#888", textTransform:"uppercase", letterSpacing:1, display:"block", marginBottom:4 }}>Momento del Cobro</label>
           <div style={{ display:"flex", gap:6 }}>
             <button style={{ ...s.btn(draft.payTiming==="despues"?"primary":"secondary"), flex:1 }} onClick={() => setDraft(d => ({...d,payTiming:"despues"}))}> Pagar después</button>
             <button style={{ ...s.btn(draft.payTiming==="ahora"?"primary":"secondary"), flex:1 }} onClick={() => setDraft(d => ({...d,payTiming:"ahora"}))}> Pagar ahora</button>
           </div>
         </>
       )}
     </div>

     {/* 3. Lista de Ítems */}
     <div style={{ ...(draft.orderType === "llevar" ? { background:"#0b1a10", border:"1px solid #27ae6055", borderRadius:10, padding:"10px 10px 2px" } : {}) }}>
       {draft.items.length === 0 ? (
         <div style={{ textAlign:"center", color:"#444", padding:"20px 0", fontSize:13 }}>Toca un platillo para agregarlo →</div>
       ) : (
         <>
           {draft.orderType === "llevar" && (
             <div style={{ fontSize:11, color:"#27ae60", fontWeight:800, textTransform:"uppercase", letterSpacing:1, marginBottom:8, display:"flex", alignItems:"center", gap:6 }}>
               <span>📦</span> Ítems del pedido ({draft.items.reduce((s,i)=>s+i.qty,0)})
             </div>
           )}
           {draft.items.map(item => (
             <div key={item.cartId} style={{ marginBottom:8, padding:"10px", background: draft.orderType==="llevar" ? "#0f2218" : "#0a0a0a", borderRadius:8, border: draft.orderType==="llevar" ? "1px solid #27ae6033" : "1px solid #222" }}>
               <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:8, paddingBottom:8, borderBottom:"1px solid #252525" }}>
                 <div style={{ flex:1 }}>
                   <div style={{ fontWeight:700, fontSize:14 }}>
                     {item.name} 
                      {itemNeedsSalsas(item, appConfig) && (
                       <button style={{...s.btn("secondary"), padding:"2px 6px", fontSize:10, marginLeft:6}} onClick={() => setSalsasModal({cartId: item.cartId, salsas: item.salsas || []})}>
                         Salsas
                       </button>
                     )}
                   </div>
                   {draft.orderType === "mesa" && (
                     <button
                       style={{...s.btn(item.isLlevar?"blue":"secondary"), padding:"2px 8px", fontSize:10, marginTop:4}}
                       onClick={() => setDraft(d => ({...d, items: d.items.map(i => i.cartId===item.cartId ? {...i, isLlevar:!i.isLlevar} : i)}))}>
                       {item.isLlevar ? "Para llevar" : "Para mesa"}
                     </button>
                   )}
                 </div>
                 <button style={{ ...s.btn("danger"), padding:"4px 10px", fontSize:14 }} onClick={() => changeQty(item.cartId,-1)}>−</button>
                 <span style={{ fontWeight:900, minWidth:20, textAlign:"center", fontSize:14 }}>{item.qty}</span>
                 <button style={{ ...s.btn(), padding:"4px 10px", fontSize:14 }} onClick={() => changeQty(item.cartId,1)}>+</button>
                 <span style={{ color:Y, fontWeight:900, fontSize:14, minWidth:55, textAlign:"right" }}>{fmt(item.price*item.qty)}</span>
               </div>
               {item.salsas?.length > 0 && <div style={{color:Y, fontSize:11, marginBottom:4, fontStyle:"italic"}}> Salsas: {item.salsas.map(sa => `${sa.name} (${sa.style})`).join(", ")}</div>}
               {item._comboNote && <div style={{color:"#3498db", fontSize:11, marginBottom:4, fontStyle:"italic"}}>🎯 {item._comboNote}</div>}
               {Array.from({ length: item.qty }).map((_, idx) => (
                 <textarea key={idx} style={{ ...s.input, fontSize:13, padding:"6px 10px", marginTop: 4, background:"#141414", resize:"vertical", minHeight:40, fontFamily:"inherit" }} 
                   placeholder={`Nota para el plato ${idx + 1}...`} value={item.individualNotes?.[idx] || ""} spellCheck="false" onChange={e => updateIndividualNote(item.cartId, idx, e.target.value)} />
               ))}
             </div>
           ))}
         </>
       )}
     </div>

     {/* 4. Notas Generales */}
     <div>
       <label style={{ fontSize:11, color:"#888", textTransform:"uppercase", letterSpacing:1, display:"block", marginBottom:4 }}>Notas Generales</label>
       <textarea style={{ ...s.input, resize:"vertical", minHeight:60, fontFamily:"inherit" }} value={draft.notes}
         onChange={e => setDraft(d => ({...d, notes: e.target.value}))} placeholder="Sin cebolla en general..." spellCheck="false" />
     </div>

   </div>

   {/* ─── FOOTER FIJO ─── */}
   <div style={{ flexShrink: 0, marginTop: 12 }}>
     <div style={{ display:"flex", justifyContent:"space-between", padding:"10px 0", borderTop:`2px solid ${Y}55`, marginBottom:12 }}>
       <span style={{ fontWeight:900, fontSize:17 }}>TOTAL</span>
       <span style={{ fontWeight:900, fontSize:17, color:Y }}>{fmt(draftTotal)}</span>
     </div>

      <button style={{ ...s.btn(), width:"100%", padding:16, fontSize:16, opacity:(!cajaAbierta || (draft.orderType==="mesa" && !draft.table) || !draft.items.length)?0.4:1 }}
       onClick={() => { submitOrder(); if(isMobile) setShowCartModal(false); }} disabled={!cajaAbierta || (draft.orderType==="mesa" && !draft.table) || !draft.items.length}>
       {!cajaAbierta ? "🔴 Caja cerrada" : draft.payTiming==="ahora" ? " Continuar al Cobro" : " Enviar a Cocina"}
     </button>
     <button style={{ ...s.btn("secondary"), width:"100%", padding:10, marginTop:8, fontSize:13 }}
       onClick={() => { setDraft(newDraft()); if(isMobile) setShowCartModal(false); }}> Limpiar Pedido</button>
   </div>
 </div>
 );

 return (
 <div style={{ display:"grid", gridTemplateColumns: (isDesktop || isTablet) ? "1fr 340px" : "1fr", gap: isMobile ? 12 : 14, alignItems: "start" }}>
 {!cajaAbierta && (
 <div style={{gridColumn:"1/-1", background:"#1a0505", border:"2px solid #e74c3c", borderRadius:12, padding:"14px 18px", display:"flex", alignItems:"center", gap:12, marginBottom:4}}>
  <span style={{fontSize:28}}>🔴</span>
  <div>
   <div style={{fontWeight:900, fontSize:15, color:"#e74c3c"}}>Caja cerrada — no se pueden tomar pedidos</div>
   <div style={{fontSize:12, color:"#888", marginTop:2}}>El administrador debe abrir la caja desde el Dashboard antes de continuar.</div>
  </div>
 </div>
 )}
 {salsasModal && salsasModal.itemToAdd && (
 <SalsasModalComponent 
  initialSalsas={[]}
  salsaOptions={getSalsaOptions(salsasModal.itemToAdd, appConfig)}
 onSave={(salsas) => {
 const customizedItem = { ...salsasModal.itemToAdd, cartId: `${salsasModal.itemToAdd.id}-${Date.now()}`, salsas };
 addItem(customizedItem);
 setSalsasModal(null);
 }} 
 onClose={() => setSalsasModal(null)} s={s} Y={Y} 
 />
 )}
 {comboModal && !comboModal._fromCart && (
 <ComboCustomizacionModal item={comboModal.item} customization={comboModal.customization} s={s} Y={Y}
  onClose={() => setComboModal(null)}
  onConfirm={(item, selections, noteStr) => {
   const cartId = `${item.id}-${Date.now()}`;
   addItem({ ...item, cartId, _comboNote: noteStr });
   setComboModal(null);
  }}
 />
 )}
 <div>
 <div style={s.title}> CARTA</div>
 <input style={{ ...s.input, marginBottom:8 }} placeholder="Buscar platillo..." value={search} onChange={e => setSearch(e.target.value)} />
 <div style={{ display:"flex", gap:4, flexWrap:"wrap", marginBottom:10 }}>
 {["Todos",...menuCats].map(c => <button key={c} style={{ ...s.btn(catFilter===c?"primary":"secondary"), fontSize: isMobile?9:10, padding: isMobile?"3px 6px":"4px 10px" }} onClick={() => setCatFilter(c)}>{c}</button>)}
 </div>
 <div>
 {filteredMenu.length === 0 && <div style={{ color:"#555", textAlign:"center", padding:20 }}>Sin resultados</div>}
 {filteredMenu.map(item => {
 const inDraftQty = draft.items.filter(i => i.id === item.id).reduce((s,i) => s + i.qty, 0);
 return (
 <div key={item.id} onClick={() => handleCartaClick(item)} style={{ ...s.card, cursor:"pointer", border: inDraftQty > 0 ? `1px solid ${Y}66`:"1px solid #2a2a2a", marginBottom:5, padding: isMobile?"8px 10px":"10px 12px" }}>
 <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
 <div style={{ flex:1 }}><span style={{ fontWeight:700, fontSize: isMobile?13:14 }}>{item.name}</span></div>
 <div style={{ display:"flex", alignItems:"center", gap:6 }}>
 <span style={{ color:Y, fontWeight:900, fontSize: isMobile?13:14 }}>{fmt(item.price)}</span>
 {inDraftQty > 0 ? <span style={{ background:Y, color:"#111", borderRadius:12, padding:"1px 8px", fontSize:12, fontWeight:900 }}>×{inDraftQty}</span> : <span style={{ background:"#2a2a2a", borderRadius:"50%", width:22, height:22, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, fontSize:16, color:"#aaa" }}>+</span>}
 </div>
 </div>
 {item.desc && <div style={{ fontSize:10, color:"#555", marginTop:3, paddingLeft:22 }}>{item.desc}</div>}
 </div>
 );
 })}
 </div>
 </div>
 {(isDesktop || isTablet) ? <div>{CartContent()}</div> : (
 <>
 {showCartModal && <div style={{...s.overlay, zIndex:9999}} onClick={() => setShowCartModal(false)}><div style={s.modal} onClick={e => e.stopPropagation()}>{CartContent()}</div></div>}
 <button onClick={() => setShowCartModal(true)} style={{ position: "fixed", bottom: 20, right: 20, width: 66, height: 66, borderRadius: 33, background: Y, border: "none", boxShadow: "0 6px 16px rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, cursor: "pointer" }}>
   <svg width="30" height="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
     <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" stroke="#111" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
     <line x1="3" y1="6" x2="21" y2="6" stroke="#111" strokeWidth="2.2" strokeLinecap="round"/>
     <path d="M16 10a4 4 0 01-8 0" stroke="#111" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
   </svg>
   {itemCount > 0 && <div style={{ position: "absolute", top: -2, right: -2, background: "#e74c3c", color: "#fff", borderRadius: 12, padding: "2px 7px", fontSize: 13, fontWeight: 900, border: "2px solid #111", minWidth: 22, textAlign: "center" }}>{itemCount}</div>}
 </button>
 </>
 )}
 </div>
 );
}

// ════════════════════════════════════════════════════════════════════
// SISTEMA DE IMPRESIÓN — Ticket Cocina + Ticket Consumidor
// ════════════════════════════════════════════════════════════════════

const TICKET_CSS = `
 @page{size:58mm auto;margin:0}
 *{box-sizing:border-box;margin:0;padding:0}
 body{font-family:'Courier New',Courier,monospace;font-size:12px;width:58mm;padding:4mm 3mm 8mm;background:#fff;color:#000;-webkit-print-color-adjust:exact;print-color-adjust:exact}
 .logo{text-align:center;font-size:15px;font-weight:900;letter-spacing:2px;margin-bottom:1mm;text-transform:uppercase}
 .sub{text-align:center;font-size:9px;margin-bottom:2mm}
 .divider{border:none;border-top:1.5px dashed #000;margin:2.5mm 0}
 .divider-solid{border:none;border-top:2.5px solid #000;margin:2mm 0}
 .mesa{text-align:center;font-size:19px;font-weight:900;margin:2mm 0 1mm;letter-spacing:1px;line-height:1.3}
 .hora{text-align:center;font-size:11px;margin-bottom:0.5mm;font-weight:700}
 .fecha{text-align:center;font-size:9px;margin-bottom:1.5mm}
 .badge{text-align:center;font-size:9px;margin-bottom:2mm;font-style:italic}
 table{width:100%;border-collapse:collapse}
 td{padding:1.5mm 0;vertical-align:top}
 .qty{width:8mm;font-weight:900;font-size:13px}
 .item{width:auto;font-weight:700;font-size:12px;padding-right:1mm}
 .price{width:18mm;text-align:right;white-space:nowrap;font-weight:700;font-size:12px}
 .item-row td{border-bottom:1px dotted #ccc;padding-bottom:1mm}
 .sub-cell{font-size:9.5px;padding-top:0;padding-bottom:1.5mm;padding-left:8mm;color:#000}
 .note-cell{font-style:italic;font-weight:600;color:#333}
 .disc-cell{font-weight:900}
 .llevar-tag{font-size:8px;font-weight:900;border:1px solid #000;padding:0 2px;margin-left:2px;vertical-align:middle}
 .total-section{margin-top:2.5mm;padding-top:2mm;border-top:2.5px solid #000}
 .total-row{display:flex;justify-content:space-between;font-size:15px;font-weight:900}
 .disc-row{display:flex;justify-content:space-between;font-size:11px;margin-top:1mm}
 .notes{font-size:10.5px;font-style:italic;margin-top:2.5mm;padding:2mm;border:2px solid #000;font-weight:700;text-align:center;text-transform:uppercase;letter-spacing:0.5px}
 .paid-marker{text-align:center;font-weight:900;font-size:13px;margin-top:2.5mm;border:2px solid #000;padding:2mm;letter-spacing:2px}
 .footer{text-align:center;font-size:9px;margin-top:4mm;letter-spacing:2px;font-weight:700}
 .header-badge{text-align:center;background:#000;color:#fff;font-size:11px;font-weight:900;padding:2mm;margin-bottom:2mm;letter-spacing:2px}
`;

function openTicketWindow(htmlContent) {
 const blob = new Blob([htmlContent], { type: 'text/html' });
 const url = URL.createObjectURL(blob);
 const win = window.open(url, '_blank');
 if (!win) alert("Permite las ventanas emergentes para imprimir tickets.");
}

function buildHeader(label, order) {
 const hora  = new Date().toLocaleTimeString("es-PE",{hour:"2-digit",minute:"2-digit"});
 const fecha = new Date().toLocaleDateString("es-PE",{day:"2-digit",month:"2-digit",year:"2-digit"});
 const tipoBase = order.orderType==="llevar"
  ? `LLEVAR${order.table ? ` — ${order.table}` : ""}${order.phone ? `<br><small>${order.phone}</small>` : ""}`
  : `MESA ${order.table}`;
 return `
  <div class="header-badge">${label}</div>
  <div class="logo">MR. PAPACHOS</div>
  <div class="sub">¡Sabe a Cajacho! · Cajamarca</div>
  <hr class="divider-solid">
  <div class="mesa">${tipoBase}</div>
  <div class="hora">${hora} hs</div>
  <div class="fecha">${fecha}</div>
 `;
}

// ── TICKET DE COCINA — con notas, salsas, adicionales, sin precios ─
function printKitchenTicket(order) {
 const itemRows = (order.items||[]).map(i => {
  const validNotes = (i.individualNotes||[]).filter(n=>n.trim());
  const notesHtml  = validNotes.map((n,idx)=>`<tr><td colspan="2" class="sub-cell note-cell"> ↳ [${idx+1}]: ${n}</td></tr>`).join("");
  const salsasHtml = i.salsas?.length>0
   ? `<tr><td colspan="2" class="sub-cell"> Salsas: ${i.salsas.map(s=>`${s.name} (${s.style})`).join(" · ")}</td></tr>` : "";
  const comboHtml  = i._comboNote
   ? `<tr><td colspan="2" class="sub-cell"> 🎯 ${i._comboNote}</td></tr>` : "";
  const llevar     = i.isLlevar ? ` <span class="llevar-tag">LLEVAR</span>` : "";
  const adicion    = i._isAdicion ? ` <span class="llevar-tag">+EXTRA</span>` : "";
  return `<tr class="item-row"><td class="qty">${i.qty}x</td><td class="item">${i.name}${llevar}${adicion}</td></tr>${salsasHtml}${comboHtml}${notesHtml}`;
 }).join("");

 const totalItems = (order.items||[]).reduce((s,i)=>s+i.qty,0);
 const notes = order.notes ? `<div class="notes">⚠ NOTA: ${order.notes}</div>` : "";

 const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Cocina</title>
<style>${TICKET_CSS}</style></head><body>
 ${buildHeader("▶ COCINA ◀", order)}
 <div class="badge">${totalItems} ítem${totalItems!==1?"s":""} · Por: ${order._mesero||"—"}</div>
 <hr class="divider">
 <table>${itemRows}</table>
 ${notes}
 <div class="footer">— COCINA · MR. PAPACHOS —</div>
  <script>window.onload=()=>window.print()</script>
</body></html>`;
 openTicketWindow(html);
}

// ── TICKET DE CONSUMIDOR — limpio, con precios, descuentos por ítem ─
function printConsumerTicket(order, opts = {}) {
 // opts: { items, overrideTotal, discountData, label, splitIdx }
 const displayItems = opts.items || order.items || [];
 const label = opts.label || (order.isPaid ? "★ RECIBO DE PAGO ★" : "◆ CUENTA");

 const itemRows = displayItems.map(i => {
  const qty     = i.splitQty || i.qty;
  const origPx  = (i._originalPrice || i.price) * qty;
  const finalPx = i.price * qty;
  const hasDisc = i._originalPrice && i._originalPrice > i.price;
  const llevar  = i.isLlevar ? ` <span class="llevar-tag">LLEVAR</span>` : "";
  const comboHtml = i._comboNote
   ? `<tr><td colspan="3" class="sub-cell"> 🎯 ${i._comboNote}</td></tr>` : "";
  const salsasHtml = i.salsas?.length>0
   ? `<tr><td colspan="3" class="sub-cell"> ${i.salsas.map(s=>`${s.name} (${s.style})`).join(" · ")}</td></tr>` : "";
  const priceRow = hasDisc
   ? `<tr><td colspan="3" class="sub-cell disc-cell"> ↳ Precio ajustado (era S/.${origPx.toFixed(2)}) −S/.${(origPx-finalPx).toFixed(2)}</td></tr>` : "";
  const priceNoteRow = i.priceNote
   ? `<tr><td colspan="3" class="sub-cell"> ↳ ${i.priceNote}</td></tr>` : "";
  return `<tr class="item-row"><td class="qty">${qty}x</td><td class="item">${i.name}${llevar}</td><td class="price">S/.${finalPx.toFixed(2)}</td></tr>${salsasHtml}${comboHtml}${priceRow}${priceNoteRow}`;
 }).join("");

 // Totals
 const subtotal = displayItems.reduce((s,i)=>{
  const qty = i.splitQty || i.qty;
  return s + i.price * qty;
 }, 0);
 const discData = opts.discountData || {};
 const itemDiscAmt  = discData.itemDiscAmt  || 0;
 const globalDiscAmt= discData.globalDiscAmt|| 0;
 const finalTotal   = opts.overrideTotal !== undefined ? opts.overrideTotal : subtotal;

 let totalSection = `<div class="total-section">`;
 if (itemDiscAmt > 0 || globalDiscAmt > 0) {
  totalSection += `<div class="disc-row"><span>Subtotal</span><span>S/.${subtotal.toFixed(2)}</span></div>`;
  if (itemDiscAmt > 0)   totalSection += `<div class="disc-row"><span>🏷 Desc. por ítems</span><span>−S/.${itemDiscAmt.toFixed(2)}</span></div>`;
  if (globalDiscAmt > 0) totalSection += `<div class="disc-row"><span>🏷 Desc. global${discData.globalMotivo ? ` (${discData.globalMotivo})` : ""}</span><span>−S/.${globalDiscAmt.toFixed(2)}</span></div>`;
 }
 totalSection += `<div class="total-row"><span>TOTAL</span><span>S/.${finalTotal.toFixed(2)}</span></div>`;

 // Payment methods
 if (order.isPaid || opts.showPayments) {
  const ef = order.payments?.efectivo || 0;
  const ya = order.payments?.yape    || 0;
  const ta = order.payments?.tarjeta || 0;
  if (ef>0) totalSection += `<div class="disc-row"><span>💵 Efectivo</span><span>S/.${ef.toFixed(2)}</span></div>`;
  if (ya>0) totalSection += `<div class="disc-row"><span>📱 Yape</span><span>S/.${ya.toFixed(2)}</span></div>`;
  if (ta>0) totalSection += `<div class="disc-row"><span>💳 Tarjeta</span><span>S/.${ta.toFixed(2)}</span></div>`;
  totalSection += `<div class="paid-marker">★ PAGADO ★</div>`;
 }
 totalSection += `</div>`;

 const splitBadge = opts.splitIdx !== undefined ? `<div class="badge">Pago ${opts.splitIdx} de ${opts.splitTotal}</div>` : "";
 const notes = order.notes ? `<div class="notes">Nota: ${order.notes}</div>` : "";

 const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Recibo</title>
<style>${TICKET_CSS}</style></head><body>
 ${buildHeader(label, order)}
 ${splitBadge}
 <hr class="divider">
 <table>${itemRows}</table>
 ${notes}
 ${totalSection}
 <div class="footer">— GRACIAS POR SU VISITA —</div>
  <script>window.onload=()=>window.print()</script>
</body></html>`;
 openTicketWindow(html);
}

// ── PRINT BOTH (cocina + consumidor) ─────────────────────────────────
function printOrder(order) {
 if (order.isPaid) {
  // Consumer receipt only
  printConsumerTicket(order, { showPayments: true });
 } else {
  // Kitchen ticket (active order)
  printKitchenTicket(order);
 }
}

// ── PRINT SPLIT ITEMS for one client ────────────────────────────────
function printSplitTicket(order, selectedItems, splitIdx, splitTotal) {
 const items = selectedItems.map(i => ({...i, qty: i.splitQty || i.qty}));
 printConsumerTicket(order, { items, splitIdx, splitTotal });
}


// ═══════════════════════════════════════════════════════════════════
// COMPONENTES SECUNDARIOS
// ═══════════════════════════════════════════════════════════════════
function DashboardComponent({ orders, history, fmt, setTab, finishPaidOrder, setCobrarTarget, isMobile, s, Y, caja, abrirCaja, cerrarCaja, currentUser, getPay, soundConfig, setSoundConfig }) {
 const isAdmin = hasRole(currentUser, "admin");
 const [fondoInput, setFondoInput] = useState("");
 const [showCierreModal, setShowCierreModal] = useState(false);
 const [cierreData, setCierreData] = useState(null);
 const [showSoundPanel, setShowSoundPanel] = useState(false);

 const testSound = () => { playBeeps(soundConfig); speak("Prueba de sonido"); };
 const descargarAsistencia = async (formato) => {
  try {
   await downloadWithAuth(API.asistencia.exportUrl({ formato }), `asistencias.${formato === "pdf" ? "pdf" : "xlsx"}`);
  } catch (err) {
   window.alert(err.message || "No se pudo descargar el reporte");
  }
 };

 // Midnight warning
 const [showMidnightWarning, setShowMidnightWarning] = useState(false);
 useEffect(() => {
  const checkMidnight = () => {
   const now = new Date();
   const h = now.getHours(), m = now.getMinutes();
   if (h === 0 && m === 0) setShowMidnightWarning(true);
  };
  const t = setInterval(checkMidnight, 30000);
  return () => clearInterval(t);
 }, []);

 // Usar paidAt para agrupar el día (si pagó hoy, cuenta hoy aunque creado ayer)
 const today = new Date().toDateString();
 // Caja session: show totals from current session open time, never include anulled
 const cajaOpenedAt = caja?.openedAt ? new Date(caja.openedAt) : null;
 const cajaDay = cajaOpenedAt ? cajaOpenedAt.toDateString() : null;
 const inCurrentSession = (o) => {
  if (!cajaOpenedAt) return false;
  if (o.anulado || o.status === "anulado") return false;
  // Same day boundary as cerrarCaja: use createdAt for the day, never cross midnight
  const orderDay = new Date(o.createdAt).toDateString();
  if (cajaDay && orderDay !== cajaDay) return false;
  const t = new Date(o.paidAt || o.createdAt).getTime();
  return t >= cajaOpenedAt.getTime();
 };
 const paidArchivedSession = history.filter(o => o.status==="pagado" && !o.anulado && inCurrentSession(o));
 const paidActiveSession   = orders.filter(o => o.isPaid && !o.anulado && inCurrentSession(o));
 // allPaidSession: todos los pedidos de la sesión de caja (para totales de efectivo/Yape/tarjeta)
 const allPaidSession = [...paidArchivedSession, ...paidActiveSession];
 // allPaidToday: solo pedidos pagados HOY (para los stats "Recaudado hoy" / "Pagados hoy")
 const isToday = (o) => new Date(o.paidAt || o.createdAt).toDateString() === today;
 const allPaidToday = allPaidSession.filter(isToday);
 // Total en caja efectivo = fondo inicial + efectivo cobrado (toda la sesión)
 
 // 1. Primero declara e inicializa las bases
const cashRev = allPaidSession.reduce((s,o) => s + getPay(o,"efectivo"), 0);
const todayRev = allPaidToday.reduce((s,o) => s + o.total, 0);
const yapeRev = allPaidSession.reduce((s,o) => s + getPay(o,"yape"), 0);
const cardRev = allPaidSession.reduce((s,o) => s + getPay(o,"tarjeta"), 0);
const totalRev = history.filter(o => o.status==="pagado" && !o.anulado).reduce((s,o) => s + o.total, 0)
               + paidActiveSession.reduce((s,o) => s + o.total, 0);
const totalEnCaja = (caja?.fondoInicial||0) + cashRev;

 const handleCerrar = async () => {
  const corte = await cerrarCaja();
  if (corte) { setCierreData(corte); setShowCierreModal(true); }
 };

 return (
 <div>
  {/* ── Aviso medianoche ── */}
  {showMidnightWarning && (
   <div style={{background:"#1a0505", border:"2px solid #e74c3c", borderRadius:12, padding:"14px 18px", marginBottom:14, display:"flex", justifyContent:"space-between", alignItems:"center"}}>
    <div>
     <div style={{fontWeight:900, fontSize:15, color:"#e74c3c"}}>🌙 Son las 00:00 — ¿Cerramos la caja de hoy?</div>
     <div style={{fontSize:12, color:"#888", marginTop:2}}>Los pedidos del nuevo día empezarán a contar desde que abras una nueva caja.</div>
    </div>
    <button style={{...s.btn("danger"), padding:"8px 16px", fontWeight:900, flexShrink:0}} onClick={() => { setShowMidnightWarning(false); handleCerrar(); }}>
     🔒 Cerrar ahora
    </button>
    <button style={{...s.btn("secondary"), padding:"8px 12px", marginLeft:6, flexShrink:0}} onClick={() => setShowMidnightWarning(false)}>Luego</button>
   </div>
  )}

  {/* ── WIDGET CAJA ── */}
  {isAdmin && (
   <div style={{...s.card, marginBottom:16, border: caja?.isOpen ? `1px solid #27ae6066` : `1px solid #e74c3c44`, background: caja?.isOpen ? "#0a1f0a" : "#1a0a0a"}}>
    <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom: caja?.isOpen ? 12 : 0}}>
     <div>
      <div style={{fontFamily:"'Bebas Neue',cursive", fontSize:18, letterSpacing:1, color: caja?.isOpen ? "#27ae60" : "#e74c3c"}}>
       {caja?.isOpen ? "🟢 CAJA ABIERTA" : "🔴 CAJA CERRADA"}
      </div>
      {caja?.isOpen && (
       <div style={{fontSize:10, color:"#555", marginTop:2}}>
        Abierta por {caja.openedBy} · Fondo S/.{(caja.fondoInicial||0).toFixed(2)}
        {" · "}{new Date(caja.openedAt).toLocaleTimeString("es-PE",{hour:"2-digit",minute:"2-digit"})}
       </div>
      )}
      {!caja?.isOpen && caja?.ultimoCorte && (
       <div style={{fontSize:10, color:"#555", marginTop:2}}>
        Último cierre: {new Date(caja.ultimoCorte.cierreAt).toLocaleTimeString("es-PE",{hour:"2-digit",minute:"2-digit"})}
        {" por "}{caja.ultimoCorte.cerradoBy}
       </div>
      )}
     </div>
     {caja?.isOpen ? (
      <button style={{...s.btn("danger"), padding:"6px 14px", fontSize:12, fontWeight:900}} onClick={handleCerrar}>
       🔒 Cerrar Caja
      </button>
     ) : (
      <div style={{display:"flex", gap:6, alignItems:"center"}}>
       <input
        type="number" min="0" step="0.5"
        style={{...s.input, width:110, padding:"6px 10px", fontSize:13}}
        placeholder="Caja chica S/."
        value={fondoInput}
        onChange={e => setFondoInput(e.target.value)}
       />
       <button style={{...s.btn("success"), padding:"6px 14px", fontSize:12, fontWeight:900}}
        onClick={() => { abrirCaja(fondoInput); setFondoInput(""); }}>
        🟢 Abrir Caja
       </button>
      </div>
     )}
    </div>

    {/* Resumen en caja abierta */}
    {caja?.isOpen && allPaidSession.length > 0 && (
     <div style={{display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8}}>
      <div style={{background:"#0f2a0f", borderRadius:8, padding:"8px 10px", textAlign:"center"}}>
       <div style={{color:"#27ae60", fontWeight:900, fontSize:16}}>S/.{totalEnCaja.toFixed(2)}</div>
       <div style={{fontSize:9, color:"#555", marginTop:2}}>💵 Total en caja</div>
       <div style={{fontSize:10, color:"#444", marginTop:1}}>Fondo {fmt(caja.fondoInicial)} + {fmt(cashRev)} cobrado</div>
      </div>
      <div style={{background:"#1a0f2a", borderRadius:8, padding:"8px 10px", textAlign:"center"}}>
       <div style={{color:"#8e44ad", fontWeight:900, fontSize:16}}>S/.{yapeRev.toFixed(2)}</div>
       <div style={{fontSize:9, color:"#555", marginTop:2}}>Yape</div>
      </div>
      <div style={{background:"#0f1a2a", borderRadius:8, padding:"8px 10px", textAlign:"center"}}>
       <div style={{color:"#2980b9", fontWeight:900, fontSize:16}}>S/.{cardRev.toFixed(2)}</div>
       <div style={{fontSize:9, color:"#555", marginTop:2}}>Tarjeta</div>
      </div>
     </div>
    )}

    {/* Historial de cortes */}
    {isAdmin && caja?.cortes?.length > 0 && (
     <div style={{marginTop:12, borderTop:"1px solid #2a2a2a", paddingTop:10}}>
      <div style={{fontSize:10, color:"#555", textTransform:"uppercase", letterSpacing:1, marginBottom:6}}>Cortes del día</div>
      {caja.cortes
  .filter(c => new Date(c.cierreAt).toDateString() === new Date().toDateString())
  .slice(-5).reverse().map((c,i) => (
       <div key={i} style={{display:"flex", justifyContent:"space-between", fontSize:11, color:"#777", padding:"3px 0", borderBottom:"1px solid #1a1a1a"}}>
        <span>{new Date(c.cierreAt).toLocaleTimeString("es-PE",{hour:"2-digit",minute:"2-digit"})} · {c.cerradoBy}</span>
        <span style={{color:"#aaa", fontWeight:700}}>S/.{c.total.toFixed(2)} · {c.pedidosCobrados} pedidos</span>
       </div>
      ))}
     </div>
    )}
   </div>
  )}

  {isAdmin && (
   <div style={{...s.card, marginBottom:16, display:"flex", justifyContent:"space-between", alignItems:"center", gap:10, flexWrap:"wrap"}}>
    <div>
     <div style={{fontWeight:900, color:"#eee", fontSize:14}}>Asistencia de jornada</div>
     <div style={{fontSize:11, color:"#666", marginTop:2}}>Reporte listo para cierre administrativo</div>
    </div>
    <div style={{display:"flex", gap:8}}>
     <button style={{...s.btn("secondary"), padding:"8px 12px"}} onClick={() => descargarAsistencia("xlsx")}>Excel</button>
     <button style={{...s.btn("secondary"), padding:"8px 12px"}} onClick={() => descargarAsistencia("pdf")}>PDF</button>
    </div>
   </div>
  )}

  {/* ── PANEL SONIDO COCINA (admin) ── */}
  {isAdmin && (
   <div style={{...s.card, marginBottom:16, border:"1px solid #333"}}>
    <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
     <div style={{fontSize:13, fontWeight:800, color:"#aaa"}}>🔔 Sonido de Cocina</div>
     <div style={{display:"flex", gap:6}}>
      <button style={{...s.btn("secondary"), padding:"4px 10px", fontSize:11}} onClick={testSound}>▶ Probar</button>
      <button style={{...s.btn(showSoundPanel?"warn":"secondary"), padding:"4px 10px", fontSize:11}} onClick={()=>setShowSoundPanel(v=>!v)}>⚙ Config</button>
     </div>
    </div>
    {showSoundPanel && (
     <div style={{marginTop:12, display:"flex", flexDirection:"column", gap:10}}>
      <div>
       <div style={{fontSize:11, color:"#666", marginBottom:4}}>Volumen: <b style={{color:Y}}>{Math.round((soundConfig.volume||0.75)*100)}%</b></div>
       <input type="range" min="0.1" max="1" step="0.05" value={soundConfig.volume||0.75}
        style={{width:"100%", accentColor:Y}}
        onChange={e=>setSoundConfig(c=>({...c,volume:parseFloat(e.target.value)}))}/>
      </div>
      <div>
       <div style={{fontSize:11, color:"#666", marginBottom:4}}>Frecuencia: <b style={{color:Y}}>{soundConfig.freq||880} Hz</b></div>
       <input type="range" min="400" max="1600" step="40" value={soundConfig.freq||880}
        style={{width:"100%", accentColor:Y}}
        onChange={e=>setSoundConfig(c=>({...c,freq:parseInt(e.target.value)}))}/>
      </div>
      <div>
       <div style={{fontSize:11, color:"#666", marginBottom:4}}>Pitidos: <b style={{color:Y}}>{soundConfig.beeps||3}</b></div>
       <div style={{display:"flex", gap:6}}>
        {[1,2,3,4,5].map(n=>(
         <button key={n} style={{...s.btn((soundConfig.beeps||3)===n?"primary":"secondary"), flex:1, padding:"6px 0"}}
          onClick={()=>setSoundConfig(c=>({...c,beeps:n}))}>{n}</button>
        ))}
       </div>
      </div>
      <div>
       <div style={{fontSize:11, color:"#666", marginBottom:4}}>Tipo de onda:</div>
       <div style={{display:"flex", gap:6}}>
        {[["square","Fuerte"],["sine","Suave"],["sawtooth","Agudo"],["triangle","Redondo"]].map(([t,l])=>(
         <button key={t} style={{...s.btn((soundConfig.type||"square")===t?"primary":"secondary"), flex:1, padding:"5px 0", fontSize:10}}
          onClick={()=>setSoundConfig(c=>({...c,type:t}))}>{l}</button>
        ))}
       </div>
      </div>
     </div>
    )}
   </div>
  )}

  {/* ── STATS ── */}
  <div style={s.title}>Resumen del Día</div>
  <div style={s.grid(isMobile ? 130 : 140)}>
   <div style={s.statCard}><div style={s.statNum}>{orders.filter(o => o.kitchenStatus !== "listo" && !o.anulado).length}</div><div style={s.statLbl}>En Cocina</div></div>
   <div style={s.statCard}><div style={s.statNum}>{allPaidToday.length}</div><div style={s.statLbl}>Pagados hoy</div></div>
   <div style={{...s.statCard, border:`1px solid ${Y}55`}}><div style={{...s.statNum, fontSize:isMobile?16:20}}>{fmt(todayRev)}</div><div style={s.statLbl}>Recaudado hoy</div></div>
   <div style={s.statCard}><div style={{...s.statNum, fontSize:isMobile?16:20}}>{fmt(totalRev)}</div><div style={s.statLbl}>Total</div></div>
  </div>
  {allPaidSession.length > 0 && (
   <div style={{...s.card, marginTop:8}}>
    <div style={s.row}>
     <div style={{textAlign:"center", flex:1}}><div style={{color:"#27ae60", fontWeight:900, fontSize:isMobile?13:16}}>{fmt(cashRev)}</div><div style={{fontSize:10, color:"#666"}}>Efectivo</div></div>
     <div style={{width:1, background:"#333", height:36}}/>
     <div style={{textAlign:"center", flex:1}}><div style={{color:"#8e44ad", fontWeight:900, fontSize:isMobile?13:16}}>{fmt(yapeRev)}</div><div style={{fontSize:10, color:"#666"}}>Yape</div></div>
     <div style={{width:1, background:"#333", height:36}}/>
     <div style={{textAlign:"center", flex:1}}><div style={{color:"#2980b9", fontWeight:900, fontSize:isMobile?13:16}}>{fmt(cardRev)}</div><div style={{fontSize:10, color:"#666"}}>Tarjeta</div></div>
    </div>
   </div>
  )}

  {/* ── MODAL CIERRE ── */}
  {showCierreModal && cierreData && (
   <div style={s.overlay} onClick={() => setShowCierreModal(false)}>
    <div style={{...s.modal, maxWidth:380}} onClick={e => e.stopPropagation()}>
     <div style={{textAlign:"center", marginBottom:16}}>
      <div style={{fontSize:36, marginBottom:6}}>🔒</div>
      <div style={{fontFamily:"'Bebas Neue',cursive", fontSize:24, color:"#e67e22", letterSpacing:1}}>CIERRE DE CAJA</div>
      <div style={{fontSize:11, color:"#666"}}>
       {new Date(cierreData.cierreAt).toLocaleDateString("es-PE")} · Cerrada por {cierreData.cerradoBy}
      </div>
     </div>
     <div style={{background:"#111", borderRadius:10, padding:14, marginBottom:14}}>
      <div style={{display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:"1px solid #222"}}>
       <span style={{color:"#888"}}>Fondo incial</span>
       <span style={{fontWeight:700}}>{fmt(cierreData.fondoInicial)}</span>
      </div>
      <div style={{display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:"1px solid #222"}}>
       <span style={{color:"#27ae60"}}>💵 Efectivo cobrado</span>
       <span style={{fontWeight:700, color:"#27ae60"}}>{fmt(cierreData.efectivo)}</span>
      </div>
      <div style={{display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:"1px solid #222"}}>
       <span style={{color:"#8e44ad"}}>📱 Yape</span>
       <span style={{fontWeight:700, color:"#8e44ad"}}>{fmt(cierreData.yape)}</span>
      </div>
      <div style={{display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:"1px solid #222"}}>
       <span style={{color:"#2980b9"}}>💳 Tarjeta</span>
       <span style={{fontWeight:700, color:"#2980b9"}}>{fmt(cierreData.tarjeta)}</span>
      </div>
      <div style={{display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:"1px solid #222"}}>
       <span style={{color:"#aaa"}}>Pedidos cobrados</span>
       <span style={{fontWeight:700}}>{cierreData.pedidosCobrados}</span>
      </div>
      <div style={{display:"flex", justifyContent:"space-between", padding:"8px 0", marginTop:4}}>
       <span style={{color:"#eee", fontWeight:900, fontSize:15}}>TOTAL EN CAJA</span>
       <span style={{fontWeight:900, fontSize:18, color:"#27ae60"}}>{fmt(cierreData.totalEnCaja)}</span>
      </div>
      <div style={{fontSize:10, color:"#555", textAlign:"right"}}>(Fondo + Efectivo cobrado)</div>
     </div>
     <button style={{...s.btn("primary"), width:"100%", padding:12, fontSize:14}} onClick={() => setShowCierreModal(false)}>
      Aceptar
     </button>
    </div>
   </div>
  )}
 </div>
 );
}

function MesasComponent({ orders, setDraft, newDraft, setTab, setMesaModal, finishPaidOrder, setCobrarTarget, setSplitTarget, setEditingOrder, printOrder, cancelOrder, setAnulacionModal, isMobile, isTablet, s, Y, fmt, mesasArr, addMesa, removeMesa, currentUser }) {
 const llevarOrders = orders.filter(o => o.orderType==="llevar" && !o.anulado);
 // Solo admin y cajero pueden cobrar pedidos para llevar
 const canCobrarLlevar = hasRole(currentUser, "admin") || hasRole(currentUser, "cajero");
 
 return (
 <div>
 <div style={{...s.row, marginBottom:14}}>
 <div style={{display:"flex", alignItems:"center", gap:12}}>
 <div style={s.title}> MESAS ({mesasArr.length})</div>
 {/* Solo el Admin puede agregar o quitar mesas */}
 {hasRole(currentUser, "admin") && (
 <div style={{display:"flex", gap:4, marginBottom:10}}>
 <button style={{...s.btn("danger"), padding:"4px 12px", fontSize:18}} onClick={removeMesa}>-</button>
 <button style={{...s.btn("success"), padding:"4px 12px", fontSize:18}} onClick={addMesa}>+</button>
 </div>
 )}
 </div>
 <button style={{...s.btn(), display:"flex", alignItems:"center", gap:8}} onClick={() => { setDraft({...newDraft(), orderType:"llevar", payTiming:"ahora"}); setTab("nuevo"); }}>
  <OrderTypeIcon type="llevar" size={17} color="#111" />
  Para llevar
 </button>
 </div>

 <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr 1fr":"repeat(3, 1fr)", gridAutoRows: isTablet ? "minmax(25vh, auto)" : "auto", gap: isMobile ? 12 : 20, marginBottom:20 }}>
 {mesasArr.map(num => {
 const mesaOrders = orders.filter(o => o.table===String(num) && o.orderType!=="llevar" && !o.anulado);
 const ocupada = mesaOrders.length > 0;
 const total = mesaOrders.reduce((sum,o) => sum + o.total, 0);
 const serviceTypes = getMesaServiceTypes(mesaOrders);
 return (
 <div key={num} onClick={() => setMesaModal(num)} style={{ background:ocupada?`${Y}15`:"#1c1c1c", border:`2px solid ${ocupada?Y:"#2a2a2a"}`, borderRadius:14, padding: "24px 16px", minHeight: isMobile ? 140 : isTablet ? "25vh" : 160, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", cursor:"pointer", textAlign:"center", position:"relative" }}>
 {ocupada && <div style={{position:"absolute", top:12, left:12, width:12, height:12, borderRadius:"50%", background:"#27ae60", boxShadow:"0 0 8px #27ae60"}}/>}
 {ocupada && <OrderTypeBadgeGroup types={serviceTypes} Y={Y} />}
 <IconoMesa color={ocupada ? Y : "#ffffff"} size={isMobile ? 80 : 100} />
 <div style={{fontFamily:"'Bebas Neue',cursive", fontSize:24, color:ocupada?Y:"#555", letterSpacing:1}}>MESA {num}</div>
 <div style={{fontSize:12, color:ocupada?"#aaa":"#444", marginTop:6}}>{ocupada?`${mesaOrders.length} pedido${mesaOrders.length>1?"s":""} · ${fmt(total)}`:"Libre"}</div>
 </div>
 );
 })}
 </div>
 
 {llevarOrders.length > 0 && (
 <div>
 <div style={{...s.title, fontSize:16}}> PARA LLEVAR ({llevarOrders.length})</div>
 {llevarOrders.map(o => {
  const isEsperando = o.status === 'esperando_cobro';
  return (
  <div key={o.id} style={{...s.card, borderLeft:`4px solid ${isEsperando?"#3498db":o.isPaid?"#27ae60":"#e67e22"}`}}>
  <div style={s.row}>
  <div>
   <span style={{fontWeight:900}}> {o.table}</span>
   {isEsperando && <span style={{...s.tag("#0a1520","#3498db"), marginLeft:6, fontSize:10}}>⏳ Esperando cobro</span>}
   {o.isPaid && !isEsperando && <span style={{...s.tag("#1e5c2e"), marginLeft:6}}> Pagado</span>}
  </div>
  <span style={{color:Y, fontWeight:900}}>{fmt(o.total)}</span>
  </div>
  <div style={{display:"flex", gap:6, marginTop:8, flexWrap:"wrap"}}>
  {o.isPaid && !isEsperando ? (
  <button style={{...s.btn("blue"), flex:1}} onClick={() => finishPaidOrder(o.id)}>✅ Entregado</button>
  ) : isEsperando ? (
   canCobrarLlevar
    ? <button style={{...s.btn("success"), flex:2}} onClick={() => setCobrarTarget({type:'existing', data:o})}>💰 Cobrar y enviar a cocina</button>
    : <div style={{flex:2, background:"#0a1520", border:"1px solid #3498db33", borderRadius:8, padding:"8px 12px", fontSize:12, color:"#3498db", textAlign:"center", fontWeight:700}}>⏳ Esperando al cajero</div>
  ) : (
   canCobrarLlevar && <button style={{...s.btn("success"), flex:1}} onClick={() => setCobrarTarget({type:'existing', data:o})}>💰 Cobrar</button>
  )}
  {hasRole(currentUser, "admin") && <button style={{...s.btn("warn"), padding:"7px 10px"}} onClick={() => setEditingOrder(o)}>✏️</button>}
  <button style={s.btn("secondary")} onClick={() => printOrder(o)}>🖨</button>
  {hasRole(currentUser, "admin") && (
  <button style={{...s.btn("danger"), padding:"7px 10px"}} onClick={() => setAnulacionModal(o)}>🚫</button>
  )}
  </div>
  </div>
 );})}
 </div>
 )}
 </div>
 );
}

function MesaModalComponent({ num, orders, setDraft, newDraft, onClose, setTab, setCobrarTarget, setSplitTarget, setEditingOrder, setAnulacionModal, printOrder, isMobile, s, Y, fmt, currentUser, crearSolicitud, isAdmin }) {
 const mesaOrders = orders.filter(o => o.table===String(num) && o.orderType!=="llevar" && !o.anulado)
  .sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)); // más reciente arriba
 const isMesero = hasRole(currentUser, "mesero");
 const canCobrar = isAdmin || hasRole(currentUser, "cajero");
 return (
 <div style={s.modal} onClick={e => e.stopPropagation()}>
 <div style={{...s.row, marginBottom:14}}>
 <div style={{color:Y, fontFamily:"'Bebas Neue',cursive", fontSize:22}}>🍽 MESA {num}</div>
 <CloseBtn onClose={onClose} />
 </div>
 {mesaOrders.length === 0
 ? <div style={{textAlign:"center", padding:30, color:"#555"}}><div style={{fontSize:32}}></div><div style={{marginTop:8}}>Mesa libre</div></div>
 : mesaOrders.map(o => (
 <div key={o.id} style={{...s.card, borderLeft:`3px solid ${Y}`}}>
 <div style={s.row}>
 <div><span style={{fontSize:12, color:"#888"}}>{minutesAgo(o.createdAt)}</span>{o.isPaid&&<span style={{...s.tag("#1e5c2e"), marginLeft:6}}> Pagado</span>}</div>
 <span style={{color:Y, fontWeight:900}}>{fmt(o.total)}</span>
 </div>
 <div style={{margin:"8px 0"}}>
 {(o.items||[]).map((item,i) => {
 const validNotes = (item.individualNotes || []).filter(n => n.trim() !== "");
 return (
 <div key={i} style={{marginBottom:6}}>
 <div style={{display:"flex", justifyContent:"space-between", fontSize:13, padding:"3px 0", borderBottom:"1px solid #222"}}>
 <span>{item.qty}x {item.name}{item.isLlevar && <span style={{marginLeft:6, background:"#154360", color:"#3498db", borderRadius:4, padding:"1px 5px", fontSize:10, fontWeight:700}}> Llevar</span>}</span>
 <span style={{color:"#888"}}>{fmt(item.price*item.qty)}</span>
 </div>
 {item.salsas?.length > 0 && <div style={{fontSize:11, color:Y, paddingLeft:4, marginTop:2}}> {item.salsas.map(s => `${s.name} (${s.style})`).join(', ')}</div>}
 {item._comboNote && <div style={{fontSize:11, color:"#3498db", paddingLeft:4, marginTop:2}}>🎯 {item._comboNote}</div>}
 {validNotes.map((n, idx) => <div key={idx} style={{fontSize:11, color:"#999", fontStyle:"italic", paddingLeft:4, marginTop:2, whiteSpace:"pre-wrap"}}>â"" Plato {idx+1}: {n}</div>)}
 </div>
 )})}
 </div>
 {o.notes && <div style={{fontSize:11, color:"#888", fontStyle:"italic", marginBottom:8, whiteSpace:"pre-wrap"}}> {o.notes}</div>}
 {!isMesero && (
 <div style={{display:"flex", gap:6, flexWrap:"wrap"}}>
 {canCobrar && !o.isPaid && <button style={{...s.btn("success"), flex:1}} onClick={() => { setCobrarTarget({type:'existing', data:o}); onClose(); }}> Cobrar Todo</button>}
 {canCobrar && !o.isPaid && <button style={{...s.btn("secondary"), flex:1}} onClick={() => { setSplitTarget(o); onClose(); }}> Dividir</button>}
 {isAdmin && !o.isPaid && <button style={{...s.btn("warn"), flex:1}} onClick={() => { setEditingOrder(o); onClose(); }}> Editar</button>}
 <button style={s.btn("secondary")} onClick={() => printOrder(o)}> Ticket</button>
 {isAdmin && !o.isPaid && <button style={{...s.btn("danger"), padding:"7px 10px", fontSize:11}} onClick={() => { setAnulacionModal(o); onClose(); }}>🚫 Anular</button>}
 </div>
 )}
 {isMesero && (
 <div style={{display:"flex", gap:6}}>
 <button style={s.btn("secondary")} onClick={() => printOrder(o)}>🖨 Ver ticket</button>
 {!o.isPaid && <button style={{...s.btn("danger"), padding:"7px 10px", fontSize:11}} onClick={() => { setAnulacionModal(o); onClose(); }}>📨 Solicitar anulación</button>}
 </div>
 )}
 </div>
 ))
 }
 <button style={{...s.btn(), width:"100%", padding:12, marginTop:8}} onClick={() => { setDraft({...newDraft(), table:String(num), orderType:"mesa"}); onClose(); setTab("nuevo"); }}>
 + Agregar pedido a Mesa {num}
 </button>
 </div>
 );
}

function InlineSplit({ order, onProceed, onClose, s, Y, fmt }) {
 const [splitItems, setSplitItems] = useState(
  (order.items||[]).map(i => ({ ...i, splitQty: 0 }))
 );
 const [ticketMode, setTicketMode] = useState(null); // null | "asking" | "separate" | "single"
 const splitTotal = splitItems.reduce((acc, i) => acc + i.price * i.splitQty, 0);
 const selectedItems = splitItems.filter(i => i.splitQty > 0);
 const remainingItems = splitItems.filter(i => i.qty - i.splitQty > 0);

 const handleQty = (cartId, delta, maxQty) => {
  setSplitItems(prev => prev.map(i => {
   if (i.cartId !== cartId) return i;
   const next = Math.min(Math.max(i.splitQty + delta, 0), maxQty);
   return { ...i, splitQty: next };
  }));
 };

 const handleCobrar = () => {
  if (selectedItems.length === 0) return;
  // Ask ticket preference before proceeding
  setTicketMode("asking");
 };

 const handlePrintAndProceed = (mode) => {
  const totalParts = 1; // can extend later for numbered splits
  if (mode === "separate") {
   // Print just selected items ticket now
   printSplitTicket(order, selectedItems, 1, totalParts);
  } else {
   // Single combined ticket — print full remaining for reference
   printConsumerTicket(order, { items: selectedItems });
  }
  onProceed(selectedItems, splitTotal);
 };

 return (
 <div style={{marginTop:0, overflow:"hidden", animation:"slideDown 0.22s ease-out", background:"#111", borderTop:`2px dashed ${Y}44`, borderRadius:"0 0 12px 12px", padding:"14px 12px 12px"}}>
 <style>{`@keyframes slideDown{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)}}`}</style>

 {/* Asking ticket mode dialog */}
 {ticketMode === "asking" && (
  <div style={{background:"#1a1a1a", border:`2px solid ${Y}55`, borderRadius:10, padding:"14px 16px", marginBottom:14}}>
   <div style={{fontWeight:900, fontSize:14, color:Y, marginBottom:10}}>🖨 ¿Cómo deseas el ticket?</div>
   <div style={{fontSize:12, color:"#888", marginBottom:12}}>
    Seleccionaste {selectedItems.reduce((s,i)=>s+i.splitQty,0)} ítem(s) · S/.{splitTotal.toFixed(2)}
    {remainingItems.length > 0 && <div style={{marginTop:4}}>Quedan {remainingItems.reduce((s,i)=>s+(i.qty-i.splitQty),0)} ítem(s) para otros clientes</div>}
   </div>
   <div style={{display:"flex", flexDirection:"column", gap:8}}>
    <button style={{...s.btn("primary"), padding:"12px 0", fontSize:13}} onClick={() => handlePrintAndProceed("separate")}>
     🧾 Ticket individual + Cobrar solo esto
    </button>
    <button style={{...s.btn("secondary"), padding:"10px 0", fontSize:12}} onClick={() => handlePrintAndProceed("single")}>
     📄 Cobrar sin ticket separado
    </button>
    <button style={{...s.btn("danger"), padding:"8px 0", fontSize:11}} onClick={() => setTicketMode(null)}>
     ← Volver a seleccionar
    </button>
   </div>
  </div>
 )}

 {ticketMode === null && (
 <>
  <div style={{fontSize:11, color:"#888", textTransform:"uppercase", letterSpacing:1, marginBottom:10}}>
   Dividir — elige cuánto paga este cliente
  </div>
  {splitItems.map(item => {
   const filled = item.splitQty > 0;
   return (
    <div key={item.cartId} style={{display:"flex", alignItems:"center", justifyContent:"space-between", background: filled ? `${Y}12` : "#1a1a1a", border:`1px solid ${filled ? Y+"55" : "#2a2a2a"}`, borderRadius:8, padding:"8px 10px", marginBottom:6, transition:"all .15s"}}>
     <div style={{flex:1, minWidth:0}}>
      <div style={{fontWeight:700, fontSize:13, color: filled ? "#fff" : "#aaa"}}>
       {item.name}
       {item.isLlevar && <span style={{marginLeft:6,background:"#154360",color:"#3498db",borderRadius:4,padding:"1px 5px",fontSize:9,fontWeight:700}}>Llevar</span>}
      </div>
      <div style={{fontSize:11, color:"#555"}}>{item.qty} disp. · {fmt(item.price)} c/u</div>
     </div>
     <div style={{display:"flex", alignItems:"center", gap:8, flexShrink:0}}>
      <button style={{...s.btn("danger"), padding:"3px 10px", fontSize:15, lineHeight:1}} onClick={() => handleQty(item.cartId,-1,item.qty)}>−</button>
      <span style={{fontWeight:900, fontSize:15, minWidth:22, textAlign:"center", color: filled ? Y : "#555"}}>{item.splitQty}</span>
      <button style={{...s.btn(), padding:"3px 10px", fontSize:15, lineHeight:1}} onClick={() => handleQty(item.cartId,1,item.qty)}>+</button>
      <span style={{color:"#888", fontSize:12, minWidth:52, textAlign:"right"}}>{fmt(item.price*item.splitQty)}</span>
     </div>
    </div>
   );
  })}
  <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 4px 4px", borderTop:`1px solid #2a2a2a`, marginTop:6}}>
   <span style={{fontWeight:900, fontSize:14}}>SUBTOTAL</span>
   <span style={{fontWeight:900, fontSize:16, color:Y}}>{fmt(splitTotal)}</span>
  </div>
  <div style={{display:"flex", gap:8, marginTop:10}}>
   <button style={{...s.btn("secondary"), flex:1, padding:10}} onClick={onClose}>Cancelar división</button>
   <button style={{...s.btn("secondary"), padding:"10px 12px", fontSize:12}} disabled={selectedItems.length===0}
    onClick={() => selectedItems.length > 0 && printSplitTicket(order, selectedItems, 1, 1)}>
    🖨 Ticket
   </button>
   <button style={{...s.btn("success"), flex:2, padding:10, fontSize:14, opacity: splitTotal===0?0.4:1}}
    disabled={splitTotal===0}
    onClick={handleCobrar}>
    💰 Cobrar S/.{splitTotal.toFixed(2)}
   </button>
  </div>
 </>
 )}
 </div>
 );
}

// ═══════════════════════════════════════════════════════════════════
// MODAL DE ANULACIÓN CON REEMPLAZO (solo Admin)
// ═══════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════
// MODAL DE ANULACIÓN CON REEMPLAZO (Unificado para Admin y Staff)
// ═══════════════════════════════════════════════════════════════════
function AnulacionModal({ order, onConfirm, onRequest, onClose, menu, s, Y, fmt, isAdmin=true, currentUser }) {
 const [step, setStep] = useState("confirm"); // "confirm" | "details"
 const [motivo, setMotivo] = useState("");
 const [crearReemplazo, setCrearReemplazo] = useState(null);
 const [repItems, setRepItems] = useState(
  (order.items || [])
  .filter(i => i.cat !== "Tapers" && i.id !== "TAPER")
  .map(i => ({ ...i, qty: i.qty, individualNotes: i.individualNotes || [] }))
 );
 const [menuSearch, setMenuSearch] = useState("");
 const [menuCat, setMenuCat] = useState("Todos");

 const repTotal = repItems.reduce((s, i) => s + i.price * i.qty, 0);

 const changeRepQty = (cartId, delta) => {
  setRepItems(prev => prev.map(i => {
   if (i.cartId !== cartId) return i;
   const newQty = Math.max(0, i.qty + delta);
   return { ...i, qty: newQty };
  }).filter(i => i.qty > 0));
 };

 const addRepItem = (item) => {
  setRepItems(prev => {
   const cartId = item.cartId || item.id;
   const ex = prev.find(i => i.cartId === cartId);
   if (ex) return prev.map(i => i.cartId === cartId ? { ...i, qty: i.qty + 1 } : i);
   return [...prev, { ...item, cartId, qty: 1, individualNotes: [""] }];
  });
 };

 // Filtrar tapers de la carta del reemplazo
 const menuParaReemplazo = (menu || []).filter(i => i.cat !== "Tapers");
 const filteredRepMenu = menuParaReemplazo.filter(i =>
  (menuCat === "Todos" || i.cat === menuCat) &&
  i.name.toLowerCase().includes(menuSearch.toLowerCase())
 );
 const repCats = [...new Set(menuParaReemplazo.map(i => i.cat))];

 // PASO 1: Confirmación explícita
 if (step === "confirm") {
  return (
   <div style={s.modal} onClick={e => e.stopPropagation()}>
    <div style={{textAlign:"center", padding:"10px 0 20px"}}>
     <div style={{fontSize:52, marginBottom:10}}>🚫</div>
     <div style={{color:"#e74c3c", fontFamily:"'Bebas Neue',cursive", fontSize:26, letterSpacing:1, marginBottom:8}}>
      ¿ANULAR ESTE PEDIDO?
     </div>
     <div style={{background:"#1a0a0a", border:"1px solid #e74c3c44", borderRadius:8, padding:"10px 14px", marginBottom:16, textAlign:"left"}}>
      <div style={{fontWeight:900, fontSize:15, color:"#eee", marginBottom:6}}>
       {order.orderType==="llevar" ? `🥡 ${order.table||"Sin nombre"}` : `🍽 Mesa ${order.table}`}
       <span style={{color:Y, marginLeft:10}}>{fmt(order.total)}</span>
      </div>
      {(order.items||[]).map((item,i) => (
       <div key={i} style={{fontSize:12, color:"#888", display:"flex", justifyContent:"space-between"}}>
        <span>{item.qty}× {item.name}</span><span>{fmt(item.price*item.qty)}</span>
       </div>
      ))}
     </div>
     <div style={{color:"#888", fontSize:13, marginBottom:20}}>
      {isAdmin 
        ? <><b style={{color:"#e74c3c"}}>ANULACIÓN DIRECTA.</b> Esta acción no se puede deshacer.</>
        : <>Se enviará una <b style={{color:"#8e44ad"}}>SOLICITUD DE ANULACIÓN</b> al administrador para su revisión.</>}
     </div>
     <div style={{display:"flex", gap:10}}>
      <button style={{...s.btn("secondary"), flex:1, padding:14, fontSize:14}} onClick={onClose}>
       Cancelar
      </button>
      <button style={{...s.btn(isAdmin ? "danger" : "blue"), flex:1, padding:14, fontSize:14, fontWeight:900}}
       onClick={() => setStep("details")}>
       {isAdmin ? "Sí, ANULAR" : "Configurar Solicitud"}
      </button>
     </div>
    </div>
   </div>
  );
 }

 // PASO 2: Motivo + Reemplazo (Unificado)
 const isSubmitDisabled = crearReemplazo === null || (!isAdmin && !motivo.trim());

 return (
  <div style={s.modal} onClick={e => e.stopPropagation()}>
   <div style={{...s.row, marginBottom:14}}>
    <h2 style={{color:isAdmin ? "#e74c3c" : "#8e44ad", fontFamily:"'Bebas Neue',cursive", margin:0, fontSize:22, letterSpacing:1}}>
      {isAdmin ? " ANULAR PEDIDO" : " SOLICITAR ANULACIÓN"}
    </h2>
    <CloseBtn onClose={onClose} />
   </div>

   {/* Motivo */}
   <div style={{marginBottom:16}}>
    <label style={{fontSize:11, color:"#888", textTransform:"uppercase", letterSpacing:1}}>
      Motivo de anulación {isAdmin ? "(opcional)" : <span style={{color:"#e67e22"}}>(obligatorio)</span>}
    </label>
    <input style={{...s.input, marginTop:4, borderColor: !isAdmin && !motivo.trim() ? "#e67e2255" : "#383838"}} 
      placeholder="Ej: Error en el pedido, cliente se retiró..." 
      value={motivo} onChange={e => setMotivo(e.target.value)} spellCheck="false" />
   </div>

   {/* ¿Agregar reemplazo? */}
   <div style={{marginBottom:14}}>
    <div style={{fontSize:12, color:"#aaa", marginBottom:10, fontWeight:700, textTransform:"uppercase", letterSpacing:1}}>¿Agregar pedido de reemplazo?</div>
    <div style={{display:"flex", gap:8}}>
     <button style={{...s.btn(crearReemplazo===true?"success":"secondary"), flex:1, padding:12, fontSize:13}} onClick={() => setCrearReemplazo(true)}>
       Sí, modificar pedido
     </button>
     <button style={{...s.btn(crearReemplazo===false?"danger":"secondary"), flex:1, padding:12, fontSize:13}} onClick={() => setCrearReemplazo(false)}>
       No, anular por completo
     </button>
    </div>
   </div>

   {/* Sección de reemplazo con carta completa */}
   {crearReemplazo === true && (
    <div style={{background:"#0a1a0a", border:"1px solid #27ae6044", borderRadius:8, padding:"10px 14px", marginBottom:14}}>
     <div style={{fontSize:11, color:"#27ae60", textTransform:"uppercase", letterSpacing:1, marginBottom:10, fontWeight:800}}>
      ✏️ Ítems del reemplazo
     </div>

     {/* Carrito de reemplazo */}
     {repItems.length === 0
      ? <div style={{color:"#555", fontSize:12, textAlign:"center", padding:"6px 0", marginBottom:10}}>Sin ítems — agrega desde la carta abajo</div>
      : <>
       {repItems.map(item => (
        <div key={item.cartId} style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6, background:"#0f2a0f", borderRadius:6, padding:"6px 10px"}}>
         <span style={{fontSize:13, color:"#ccc", flex:1}}>{item.name}</span>
         <div style={{display:"flex", alignItems:"center", gap:6}}>
          <button style={{...s.btn("danger"), padding:"2px 8px", fontSize:13}} onClick={() => changeRepQty(item.cartId, -1)}>−</button>
          <span style={{fontWeight:900, color:Y, minWidth:20, textAlign:"center"}}>{item.qty}</span>
          <button style={{...s.btn(), padding:"2px 8px", fontSize:13}} onClick={() => changeRepQty(item.cartId, 1)}>+</button>
          <span style={{color:"#666", fontSize:11, minWidth:48, textAlign:"right"}}>{fmt(item.price*item.qty)}</span>
         </div>
        </div>
       ))}
       <div style={{display:"flex", justifyContent:"space-between", borderTop:"1px solid #27ae6033", marginTop:6, paddingTop:6, fontWeight:900}}>
        <span style={{color:"#27ae60"}}>Total reemplazo</span>
        <span style={{color:Y}}>{fmt(repTotal)}</span>
       </div>
      </>
     }

     {/* Buscador de carta */}
     <div style={{marginTop:10, borderTop:"1px solid #1a3a1a", paddingTop:10}}>
      <div style={{fontSize:11, color:"#555", textTransform:"uppercase", letterSpacing:1, marginBottom:6}}>+ Agregar desde la carta</div>
      <input style={{...s.input, marginBottom:6, fontSize:12, padding:"6px 10px"}} placeholder="Buscar platillo..." value={menuSearch} onChange={e => setMenuSearch(e.target.value)} />
      <div style={{display:"flex", gap:4, flexWrap:"wrap", marginBottom:6}}>
       {["Todos", ...repCats].map(c => (
        <button key={c} style={{...s.btn(menuCat===c?"primary":"secondary"), fontSize:9, padding:"2px 6px"}} onClick={() => setMenuCat(c)}>{c}</button>
       ))}
      </div>
      <div style={{maxHeight:160, overflowY:"auto"}}>
       {filteredRepMenu.map(item => {
        const inCart = repItems.find(i => i.cartId === item.id || i.id === item.id);
        return (
         <div key={item.id} onClick={() => addRepItem(item)} style={{display:"flex", justifyContent:"space-between", alignItems:"center", padding:"6px 8px", borderRadius:6, marginBottom:4, background: inCart ? `${Y}15` : "#111", border:`1px solid ${inCart ? Y+"44" : "#1a2a1a"}`, cursor:"pointer"}}>
          <span style={{fontSize:12, color:"#ccc", flex:1}}>{item.name}</span>
          <div style={{display:"flex", alignItems:"center", gap:6}}>
           <span style={{color:Y, fontWeight:900, fontSize:12}}>{fmt(item.price)}</span>
           {inCart
            ? <span style={{background:Y, color:"#111", borderRadius:10, padding:"1px 7px", fontSize:11, fontWeight:900}}>×{inCart.qty}</span>
            : <span style={{background:"#2a3a2a", borderRadius:"50%", width:20, height:20, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, color:"#aaa"}}>+</span>
           }
          </div>
         </div>
        );
       })}
      </div>
     </div>
    </div>
   )}

   {crearReemplazo === false && (
    <div style={{background:"#1a0a0a", border:"1px solid #e74c3c33", borderRadius:8, padding:"10px 14px", marginBottom:14, fontSize:12, color:"#e74c3c"}}>
     ⚠️ El pedido se anulará sin reemplazo. La cocina no recibirá ningún nuevo ticket.
    </div>
   )}

   {!isAdmin && (
    <div style={{fontSize:11, color:"#8e44ad", background:"#150a1a", borderRadius:8, padding:"8px 12px", marginBottom:14, border:"1px solid #8e44ad33"}}>
     📱 La solicitud, junto con el reemplazo, se enviará al Administrador en tiempo real.
    </div>
   )}

   <button
    style={{...s.btn(isAdmin ? "danger" : "blue"), width:"100%", padding:14, fontSize:15, opacity: isSubmitDisabled ? 0.4 : 1}}
    disabled={isSubmitDisabled}
    onClick={() => {
      if (isAdmin) {
        onConfirm(crearReemplazo ? repItems : [], motivo);
      } else {
        onRequest({
          type: "anulacion",
          requestedBy: currentUser?.userId || currentUser?.id,
          requestedByName: currentUser?.name || currentUser?.label,
          orderId: order.id,
          orderTable: order.table,
          orderType: order.orderType,
          orderTotal: order.total,
          orderItems: order.items,
          orderSnapshot: order,
          motivo,
          replacementItems: crearReemplazo ? repItems : [],
        });
        onClose();
      }
    }}>
    {isAdmin 
      ? ` Confirmar Anulación${crearReemplazo && repItems.length > 0 ? " y Enviar Reemplazo" : ""}`
      : "📨 Enviar Solicitud de Anulación"}
   </button>
  </div>
 );
}

function PedidosComponent({ orders, toggleItemCheck, setTab, finishPaidOrder, setCobrarTarget,
  setSplitTarget, setEditingOrder, printOrder, cancelOrder, setConfirmDelete,
  setAnulacionModal, currentUser, isMobile, s, Y, fmt, beverageCategories = [] }) {
 const [splitOpenId, setSplitOpenId] = useState(null);
 const isAdmin = hasRole(currentUser, "admin");
 const isCajero = hasRole(currentUser, "cajero");
 const isMesero = hasRole(currentUser, "mesero");
 // Solo admin y cajero pueden cobrar — meseros NUNCA
 const canCobrar = isAdmin || isCajero;
 const canDelete = isAdmin;
 const canAnular = true;
 const [showAnulados, setShowAnulados] = useState(false);

 const handleInlineProceed = (order, items, total) => {
 setSplitOpenId(null);
 setCobrarTarget({ type:'split', data: { originalOrder: order, splitItems: items, total } });
 };

 // Separar: esperando cobro (llevar sin pagar) vs activos normales
 const esperandoCobro = orders.filter(o => o.status === 'esperando_cobro' && !o.anulado)
  .sort((a,b) => new Date(a.createdAt) - new Date(b.createdAt));
 const activeOrders = orders.filter(o => o.status !== 'esperando_cobro' && !o.anulado)
  .sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
 const anuladosOrders = orders.filter(o => o.anulado);

 return (
 <div>
 <style>{`.pedido-card{transition:box-shadow .15s}.pedido-card:hover{box-shadow:0 4px 20px rgba(255,215,0,.08)}`}</style>
 <div style={{...s.row, marginBottom:14}}>
 <div style={s.title}>PEDIDOS ACTIVOS</div>
 {(isAdmin || isMesero) && <button style={s.btn()} onClick={() => setTab("nuevo")}>+ Nuevo</button>}
 </div>

 {/* ── SECCIÓN: Para llevar esperando cobro ── */}
 {esperandoCobro.length > 0 && (
  <div style={{marginBottom:18}}>
   <div style={{display:"flex", alignItems:"center", gap:8, marginBottom:10}}>
    <div style={{fontFamily:"'Bebas Neue',cursive", fontSize:isMobile?16:18, color:"#3498db", letterSpacing:1}}>
     🥡 PARA LLEVAR — ESPERANDO COBRO ({esperandoCobro.length})
    </div>
   </div>
   {esperandoCobro.map(o => (
    <div key={o.id} style={{...s.card, borderLeft:"4px solid #3498db", marginBottom:8, padding:isMobile?"12px 10px":"14px 16px"}}>
     <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:6}}>
      <div>
       <div style={{fontFamily:"'Bebas Neue',cursive", fontSize:isMobile?20:22, color:"#3498db", letterSpacing:1}}>
        🥡 {o.table||"Sin nombre"}
       </div>
       {o._mesero && <div style={{fontSize:11, color:"#666", marginTop:2}}>Tomado por: {o._mesero}</div>}
      </div>
      <div style={{textAlign:"right"}}>
       <div style={{fontWeight:900, fontSize:isMobile?18:20, color:Y}}>{fmt(o.total)}</div>
       <div style={{fontSize:10, color:"#555", marginTop:1}}>{new Date(o.createdAt).toLocaleTimeString("es-PE",{hour:"2-digit",minute:"2-digit"})}</div>
      </div>
     </div>
     <div style={{marginBottom:8}}>
      {(o.items||[]).map((item,i) => (
       <div key={i} style={{display:"flex", justifyContent:"space-between", fontSize:12, color:"#aaa", padding:"2px 0", borderBottom:"1px solid #1e1e1e"}}>
        <span>{item.qty}× {item.name}</span>
        <span style={{color:"#666"}}>{fmt(item.price*item.qty)}</span>
       </div>
      ))}
     </div>
     {o.notes && <div style={{fontSize:11,color:"#888",fontStyle:"italic",marginBottom:8}}>"{o.notes}"</div>}
     <div style={{display:"flex", gap:6, flexWrap:"wrap"}}>
      {/* Solo cajero/admin cobran — meseros NUNCA */}
      {canCobrar && (
       <button style={{...s.btn("success"),flex:2,fontWeight:900}}
        onClick={()=>setCobrarTarget({type:'existing',data:o})}>
        💰 Cobrar y enviar a cocina
       </button>
      )}
      {!canCobrar && (
       <div style={{flex:2, background:"#1a1a1a", border:"1px solid #3498db33", borderRadius:8, padding:"8px 12px", fontSize:12, color:"#3498db", textAlign:"center", fontWeight:700}}>
        ⏳ Esperando al cajero
       </div>
      )}
      <button style={{...s.btn("secondary"), padding:"7px 10px"}} onClick={()=>printKitchenTicket(o)}>🖨</button>
      {canAnular && !o.isPaid && (
       <button style={{...s.btn("danger"), padding:"7px 10px", fontSize:11}} onClick={()=>setAnulacionModal(o)}>🚫</button>
      )}
     </div>
    </div>
   ))}
  </div>
 )}

 {/* ── SECCIÓN: Pedidos activos normales ── */}
 {activeOrders.length === 0 && esperandoCobro.length === 0
 ? <div style={{textAlign:"center", padding:60, color:"#444"}}>
 <div style={{fontSize:40, marginBottom:8}}>🍽</div>
 <div style={{fontSize:15}}>Sin pedidos activos</div>
 </div>
 : activeOrders.map(o => {
 const splitOpen = splitOpenId === o.id;
 const mins = Math.floor((Date.now()-new Date(o.createdAt))/60000);
 const urgentColor = mins>=20?"#e74c3c":mins>=10?"#e67e22":Y;
 const isReplacement = !!o.replacesId;
 return (
 <div key={o.id}>
 <div className="pedido-card" style={{
 ...s.card,
 borderLeft:`4px solid ${isReplacement ? "#27ae60" : urgentColor}`,
 marginBottom: splitOpen ? 0 : 10,
 borderRadius: splitOpen ? "12px 12px 0 0" : 12,
 padding: isMobile ? "12px 10px" : "14px 16px"
 }}>
 {/* Badge de reemplazo */}
 {isReplacement && (
 <div style={{background:"#0a2a0a", border:"1px solid #27ae6055", borderRadius:6, padding:"4px 10px", marginBottom:8, fontSize:11, color:"#27ae60", fontWeight:800}}>
 🔄 REEMPLAZO — sustituye al pedido anulado
 </div>
 )}
 {/* Cabecera */}
 <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:6}}>
 <div style={{display:"flex", alignItems:"center", gap:8, flexWrap:"wrap"}}>
 <span style={{fontFamily:"'Bebas Neue',cursive", fontSize:isMobile?20:24, color: isReplacement?"#27ae60":urgentColor, letterSpacing:1}}>
 {o.orderType==="llevar" ? `🥡 ${o.table||"Sin nombre"}` : `Mesa ${o.table}`}
 </span>
 {o.orderType==="llevar" && (o.phone||o.deliveryAddress) && (
 <span style={{fontSize:11, color:"#888"}}>{[o.phone, o.deliveryAddress].filter(Boolean).join(" · ")}</span>
 )}
 {o.isPaid && <span style={{...s.tag("#1e5c2e"), fontSize:10}}>Pagado</span>}
 {o.kitchenStatus==='listo' && <span style={{...s.tag("#2980b9"), fontSize:10}}>Listo</span>}
 {o.orderType==="mesa" && (o.items||[]).some(i=>i.isLlevar) && (
 <span style={{...s.tag("#154360","#3498db"), fontSize:10}}>🥡 Mixto</span>
 )}
 </div>
 <div style={{textAlign:"right", flexShrink:0}}>
 <div style={{fontWeight:900, fontSize:isMobile?18:22, color:Y}}>{fmt(o.total)}</div>
 <div style={{fontSize:10, color: mins>=20?"#e74c3c":mins>=10?"#e67e22":"#555", marginTop:1}}>
 {timeStr(o.createdAt)} · {minutesAgo(o.createdAt)}
 </div>
 </div>
 </div>
 {/* Items */}
 {/* Items */}
 <div style={{marginBottom:8, paddingLeft:2}}>
 {(o.items||[]).map((item,i) => {
 const isDrink = beverageCategories.includes(item.cat);
 const checks = o.itemChecks || {};
 let doneQty = checks[i];
 if (doneQty === true) doneQty = item.qty;
 doneQty = Number(doneQty) || 0;
 const isDone = doneQty === item.qty;
 const notes = (item.individualNotes||[]).filter(n=>n.trim());
 
 // Seguridad: Solo el dueño del pedido, o el admin, pueden marcar la bebida
 const canWaiterCheck = isDrink && (hasRole(currentUser, "admin") || currentUser?.name === o._mesero || currentUser?.name === o._adicionPor);

 return (
 <div key={i} style={{marginBottom:4}}>
 <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", fontSize:isMobile?12:13, padding:"3px 0", borderBottom:"1px solid #1e1e1e"}}>
 
 <div style={{display:"flex", alignItems:"center", gap:8, flex:1}}>
   {/* Botón de barra interactivo para meseros */}
   {isDrink && canWaiterCheck ? (
     <button onClick={(e) => { e.stopPropagation(); toggleItemCheck(o, i, false); }} 
       style={{...s.btn(isDone?"success":"secondary"), padding:"2px 8px", fontSize:10}}>
       {isDone ? "✓ Servido" : "Servir"}
     </button>
   ) : isDrink ? (
     <span style={{fontSize:10, color:isDone?"#27ae60":"#e67e22", border:`1px solid ${isDone?"#27ae6044":"#e67e2244"}`, padding:"1px 4px", borderRadius:4}}>
       {isDone?"✓ Listo":"⏳ Barra"}
     </span>
   ) : null}

   <span style={{color: isDone && isDrink ? "#555" : "#ccc", textDecoration: isDone && isDrink ? "line-through" : "none"}}>
    <span style={{color:"#888", marginRight:4}}>{item.qty}×</span>
    {item.name}
    {item.isLlevar && <span style={{marginLeft:6,background:"#154360",color:"#3498db",borderRadius:4,padding:"1px 5px",fontSize:9,fontWeight:700}}>Llevar</span>}
    {item._isAdicion && <span style={{marginLeft:6,background:"#2d1a4a",color:"#c39bd3",borderRadius:4,padding:"1px 5px",fontSize:9,fontWeight:900}}>+ADICIONAL</span>}
   </span>
 </div>
 
 <span style={{color:"#FFD700", fontWeight:900, fontSize:12, marginLeft:8, whiteSpace:"nowrap"}}>{fmt(item.price*item.qty)}</span>
 </div>
 {item.salsas?.length>0 && <div style={{fontSize:10,color:Y,paddingLeft:8,marginTop:1,fontStyle:"italic"}}>↳ {item.salsas.map(sa=>`${sa.name} (${sa.style})`).join(', ')}</div>}
 {item._comboNote && <div style={{fontSize:10,color:"#3498db",paddingLeft:8,marginTop:1,fontStyle:"italic"}}>🎯 {item._comboNote}</div>}
 {item.priceNote && <div style={{fontSize:10,color:"#e67e22",paddingLeft:8,marginTop:1}}>✏️ {item.priceNote}</div>}
 {notes.map((n,idx)=><div key={idx} style={{fontSize:10,color:"#777",fontStyle:"italic",paddingLeft:8,marginTop:1}}>â"" Plato {idx+1}: {n}</div>)}
 </div>
 );
 })}
 </div>
 {o.notes && <div style={{fontSize:11,color:"#888",fontStyle:"italic",marginBottom:8,padding:"4px 8px",background:"#1a1a1a",borderRadius:4}}>"{o.notes}"</div>}
 {/* Botones según rol */}
 <div style={{display:"flex", gap:5, flexWrap:"wrap", marginTop:4}}>
 {/* Cobrar: SOLO admin y cajero. Meseros nunca. */}
 {canCobrar && (o.isPaid
 ? <button style={{...s.btn("blue"),flex:1}} onClick={()=>finishPaidOrder(o.id)}>Entregado</button>
 : <>
 <button style={{...s.btn("success"),flex:2,fontWeight:900}} onClick={()=>setCobrarTarget({type:'existing',data:o})}>💰 Cobrar</button>
 <button style={{...s.btn(splitOpen?"primary":"secondary"), flex:1}} onClick={()=>setSplitOpenId(splitOpen?null:o.id)}>
 {splitOpen ? "▲" : " Dividir"}
 </button>
 </>
 )}
 {!o.isPaid && !isMesero && (
 <button style={{...s.btn("warn"),flex:1}} onClick={()=>setEditingOrder(o)}> Editar</button>
 )}
 <button style={{...s.btn("secondary"), padding:"7px 10px", fontSize:11}} onClick={()=>printKitchenTicket(o)}>🍳</button>
 <button style={{...s.btn("secondary"), padding:"7px 10px", fontSize:11}} onClick={()=>printConsumerTicket(o)}>🧾</button>
 {canAnular && !o.isPaid && (
 <button style={{...s.btn("danger"), padding:"7px 10px", fontSize:11, fontWeight:800}} onClick={()=>setAnulacionModal(o)}>🚫 Anular</button>
 )}
 {canDelete && (
 <button style={{...s.btn("secondary"), padding:"7px 10px", fontSize:11, fontWeight:800, color:"#e74c3c", border:"1px solid #e74c3c44"}} onClick={()=>setConfirmDelete(o.id)}>🗑</button>
 )}
 </div>
 </div>
 {splitOpen && canCobrar && (
 <InlineSplit
 order={o}
 onProceed={(items, total) => handleInlineProceed(o, items, total)}
 onClose={() => setSplitOpenId(null)}
 s={s} Y={Y} fmt={fmt}
 />
 )}
 </div>
 );
 })}

 {/* ── Pedidos Anulados (colapsable, no entorpece) ── */}
 {anuladosOrders.length > 0 && (
 <div style={{marginTop:16}}>
 <button
 onClick={() => setShowAnulados(v => !v)}
 style={{display:"flex", alignItems:"center", gap:8, background:"none", border:"1px solid #2a2a2a", borderRadius:8, padding:"8px 14px", cursor:"pointer", color:"#555", fontSize:12, fontWeight:700, width:"100%", marginBottom: showAnulados ? 0 : 0}}>
 <span style={{color:"#e74c3c"}}>🚫</span>
 Pedidos anulados ({anuladosOrders.length})
 <span style={{marginLeft:"auto", fontSize:10}}>{showAnulados ? "▲ ocultar" : "▼ ver"}</span>
 </button>
 {showAnulados && (
 <div style={{marginTop:6, opacity:0.75}}>
 {anuladosOrders.map(o => (
 <div key={o.id} style={{
 background:"#111", border:"1px solid #2a2a2a", borderLeft:"4px solid #e74c3c44",
 borderRadius:10, padding:"10px 14px", marginBottom:8
 }}>
 <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4}}>
 <div style={{display:"flex", alignItems:"center", gap:8}}>
 <span style={{fontFamily:"'Bebas Neue',cursive", fontSize:18, color:"#555", textDecoration:"line-through"}}>
 {o.orderType==="llevar" ? `🥡 ${o.table||"Sin nombre"}` : `Mesa ${o.table}`}
 </span>
 <span style={{...s.tag("#3a0a0a"), color:"#e74c3c", fontSize:10, border:"1px solid #e74c3c33"}}>ANULADO</span>
 </div>
 <span style={{color:"#555", fontWeight:900, fontSize:15, textDecoration:"line-through"}}>{fmt(o.total)}</span>
 </div>
 {o.motivoAnulacion && <div style={{fontSize:11, color:"#666", fontStyle:"italic", marginBottom:4}}>Motivo: {o.motivoAnulacion}</div>}
 {o.replacedById && <div style={{fontSize:11, color:"#27ae60"}}>🔄 Reemplazado por nuevo pedido</div>}
 <div style={{fontSize:10, color:"#444", marginTop:4}}>Anulado: {timeStr(o.anuladoAt)}</div>
 <div style={{display:"flex", gap:6, marginTop:6, flexWrap:"wrap"}}>
 <button style={{...s.btn("secondary"), padding:"4px 10px", fontSize:11}} onClick={()=>printOrder(o)}>🖨 Ticket</button>
 {canDelete && <button style={{...s.btn("secondary"), padding:"4px 8px", fontSize:11, color:"#e74c3c", border:"1px solid #e74c3c33"}} onClick={()=>setConfirmDelete(o.id)}>🗑 Borrar</button>}
 </div>
 </div>
 ))}
 </div>
 )}
 </div>
 )}
 </div>
 );
}

// ── Audio/Speech helper ───────────────────────────────────────────
function playBeeps(cfg) {
 try {
  const vol   = cfg?.volume  !== undefined ? cfg.volume  : 0.75;
  const freq  = cfg?.freq    !== undefined ? cfg.freq    : 880;
  const beeps = cfg?.beeps   !== undefined ? cfg.beeps   : 3;
  const type  = cfg?.type    || "square";
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -10; comp.ratio.value = 4; comp.connect(ctx.destination);
  Array.from({length: beeps}).forEach((_, b) => {
   const offset = b * 0.28;
   const osc = ctx.createOscillator(); const gain = ctx.createGain();
   osc.connect(gain); gain.connect(comp);
   osc.frequency.value = freq; osc.type = type;
   gain.gain.setValueAtTime(0, ctx.currentTime + offset);
   gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + offset + 0.02);
   gain.gain.setValueAtTime(vol, ctx.currentTime + offset + 0.14);
   gain.gain.linearRampToValueAtTime(0, ctx.currentTime + offset + 0.22);
   osc.start(ctx.currentTime + offset); osc.stop(ctx.currentTime + offset + 0.26);
  });
 } catch(e) {}
}

function speak(text) {
 try {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = "es-PE"; utt.rate = 0.95; utt.pitch = 1.1; utt.volume = 1;
  window.speechSynthesis.speak(utt);
 } catch(e) {}
}

function CocinaComponent({ orders, toggleItemCheck, markKitchenListo, isMobile, isDesktop, s, Y, soundConfig }) {
 const sorted = [...orders].sort((a,b) => new Date(a.createdAt) - new Date(b.createdAt));

 // ── Track previous state for change detection ─────────────────────
 const prevOrdersRef = useRef({});        // id -> { status, itemCount, kitchenStatus, isAnulado }
 const [anuladoFlash, setAnuladoFlash] = useState([]); // [{ id, order, expiresAt }]

 useEffect(() => {
  const now = Date.now();
  const prev = prevOrdersRef.current;
  const next = {};

  orders.forEach(o => {
   next[o.id] = { status: o.status, kitchenStatus: o.kitchenStatus, isAnulado: !!o.anulado, itemCount: (o.items||[]).length };
   const p = prev[o.id];

   if (!p) {
    // Brand new order
    if (!o.anulado && o.kitchenStatus !== 'listo') {
     const waiter = o._mesero || "Mesero";
     playBeeps(soundConfig);
     setTimeout(() => speak(`Nuevo pedido de ${waiter}`), 200);
    }
   } else {
    // Additional items added (merge) — item count grew
    if (!o.anulado && o._adicionPor && (o.items||[]).length > p.itemCount) {
     const waiter = o._adicionPor || "Mesero";
     playBeeps({ ...(soundConfig||{}), freq: 660, beeps: 2 });
     setTimeout(() => speak(`Pedido adicional de ${waiter}`), 200);
    }
    // Order became ready
    if (p.kitchenStatus !== 'listo' && o.kitchenStatus === 'listo') {
     const waiter = o._mesero || "Mesero";
     playBeeps({ ...(soundConfig||{}), freq: 1100, beeps: 2, type:"sine" });
     setTimeout(() => speak(`Listo para ${waiter}`), 200);
    }
    // Order anulado
    if (!p.isAnulado && o.anulado) {
     playBeeps({ ...(soundConfig||{}), freq: 300, beeps: 3, type:"sawtooth", volume: 0.9 });
     setTimeout(() => speak("Pedido anulado"), 200);
     // Show flash for 25 seconds
     setAnuladoFlash(prev2 => [...prev2.filter(x=>x.id!==o.id), { id: o.id, order: o, expiresAt: now + 25000 }]);
     setTimeout(() => setAnuladoFlash(p2 => p2.filter(x => x.id !== o.id)), 25000);
    }
   }
  });

  prevOrdersRef.current = next;
  }, [orders, soundConfig]);

 // Clean expired flashes
 useEffect(() => {
  const timer = setInterval(() => {
   setAnuladoFlash(p => p.filter(x => x.expiresAt > Date.now()));
  }, 1000);
  return () => clearInterval(timer);
 }, []);

 const toggleCheck = (order, itemIdx) => toggleItemCheck(order, itemIdx, true);

 const activeOrders = sorted.filter(order =>
  order.kitchenStatus !== 'listo' &&
  order.kitchenStatus !== 'esperando_cobro' &&
  !order.anulado
 );

 return (
 <div>
  {/* ── Pedidos Anulados Flash (25 seg) ── */}
  {anuladoFlash.map(({ id, order, expiresAt }) => {
   const secsLeft = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
   return (
    <div key={id} style={{background:"#2a0000", border:"2px solid #e74c3c", borderRadius:12, padding:"14px 18px", marginBottom:12, animation:"pulse 1s infinite alternate"}}>
     <style>{`@keyframes pulse{from{border-color:#e74c3c}to{border-color:#ff8080}}`}</style>
     <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6}}>
      <div style={{color:"#e74c3c", fontFamily:"'Bebas Neue',cursive", fontSize:20, letterSpacing:1}}>🚫 PEDIDO ANULADO</div>
      <div style={{fontSize:11, color:"#888"}}>Desaparece en {secsLeft}s</div>
     </div>
     <div style={{fontWeight:900, fontSize:15, color:"#eee", marginBottom:4}}>
      {order.orderType==="llevar" ? `🥡 ${order.table||"Sin nombre"}` : `Mesa ${order.table}`}
      {order._mesero && <span style={{fontSize:12, color:"#888", marginLeft:8}}>· {order._mesero}</span>}
     </div>
     {order.motivoAnulacion && <div style={{fontSize:12, color:"#e67e22", fontStyle:"italic"}}>Motivo: "{order.motivoAnulacion}"</div>}
     {order.replacedById && (
      <div style={{fontSize:12, color:"#27ae60", marginTop:4}}>🔄 Reemplazado — el nuevo pedido aparece en pantalla</div>
     )}
     <div style={{display:"flex", flexWrap:"wrap", gap:4, marginTop:8}}>
      {(order.items||[]).map((it,i)=>(
       <span key={i} style={{background:"#3a0000", borderRadius:4, padding:"2px 8px", fontSize:11, color:"#e74c3c", border:"1px solid #e74c3c33", textDecoration:"line-through"}}>
        {it.qty}× {it.name}
       </span>
      ))}
     </div>
    </div>
   );
  })}

  {activeOrders.length === 0 && anuladoFlash.length === 0 ? (
   <div style={{textAlign:"center", padding:60, color:"#444"}}>
    <div style={{fontSize:56}}>👨‍🍳</div>
    <div style={{marginTop:12, fontSize:16}}>Sin pedidos pendientes en cocina</div>
   </div>
  ) : (
   <div>
    <div style={{...s.row, marginBottom:14}}>
     <div style={s.title}>COCINA — {activeOrders.length} pendiente{activeOrders.length!==1?"s":""}</div>
    </div>
    <div style={{display:"grid", gridTemplateColumns:isDesktop?"1fr 1fr":"1fr", gap:12}}>
     {activeOrders.map((order, priority) => {
      const checks = order.itemChecks || {};
      const mins = Math.floor((Date.now() - new Date(order.createdAt))/60000);
      const hasAdicion = (order.items||[]).some(i=>i._isAdicion);
      const urgency = mins >= 15 ? "URGENTE" : mins >= 8 ? "ATENTO" : "NORMAL";

      return (
       <div key={order.id} style={{background:mins>=15?"#1f0d0d":mins>=8?"#1f180d":"#1c1c1c", borderRadius:14, border:`2px solid ${mins>=15?"#e74c3c":mins>=8?"#e67e22":order.replacesId?"#27ae60":Y}`, padding:14, position:"relative", transition:"all .3s"}}>
        <div style={{position:"absolute", top:10, right:10, fontSize:10, fontWeight:900, color:mins>=15?"#e74c3c":mins>=8?"#e67e22":Y, letterSpacing:1}}>
         {urgency}
        </div>
        <div style={{position:"absolute", top:-10, left:14, background:mins>=15?"#e74c3c":mins>=8?"#e67e22":Y, color:mins>=8?"#fff":"#111", borderRadius:20, padding:"2px 10px", fontSize:11, fontWeight:900}}>
         {`#${priority+1} · ${mins<1?"ahora":`${mins}m`}`}
        </div>

        {order.replacesId && (
         <div style={{background:"#0a1f0a", border:"1px solid #27ae6044", borderRadius:6, padding:"3px 10px", marginBottom:8, marginTop:6, fontSize:10, color:"#27ae60", fontWeight:800}}>
          🔄 REEMPLAZO de pedido anulado
         </div>
        )}

        {/* Cabecera: mesa + mesero */}
        <div style={{...s.row, marginBottom:6, marginTop:6}}>
         <span style={{fontFamily:"'Bebas Neue',cursive", fontSize:22, color:mins>=15?"#e74c3c":mins>=8?"#e67e22":Y}}>
          {order.orderType==="llevar"?`🥡 ${order.table||"Sin nombre"}`:`Mesa ${order.table}`}
         </span>
         {order._mesero && (
          <span style={{fontSize:11, color:"#888", fontWeight:700, background:"#1a1a1a", borderRadius:6, padding:"2px 8px", border:"1px solid #2a2a2a"}}>
           👤 {order._mesero}
          </span>
         )}
        </div>

        {/* Progreso */}
        {(() => {
         const kitchenItems = (order.items || []).filter(i => i.cat !== "Tapers" && i.id !== "TAPER");
         const totalPortions = kitchenItems.reduce((sum, item) => sum + item.qty, 0);
         const donePortions = kitchenItems.reduce((sum, item, i) => sum + (Number(checks[i]===true?item.qty:checks[i]) || 0), 0);
         return (
          <>
           <div style={{background:"#2a2a2a", borderRadius:4, height:5, marginBottom:12, overflow:"hidden"}}>
            <div style={{background:Y, height:"100%", width:`${totalPortions > 0 ? (donePortions/totalPortions)*100 : 0}%`, transition:"width .3s"}}/>
           </div>
           {kitchenItems.map((item, i) => {
            let doneQty = checks[i];
            if (doneQty === true) doneQty = item.qty;
            doneQty = Number(doneQty) || 0;
            const isDone = doneQty === item.qty;
            const validNotes = (item.individualNotes || []).filter(n => n.trim() !== "");
            return (
             <div key={i} onClick={() => toggleCheck(order, i)}
              style={{display:"flex", alignItems:"center", gap:10, padding:"9px 10px", marginBottom:5, borderRadius:8, background:isDone?"#0a2a0a":"#252525", border:`1px solid ${isDone?"#27ae6055":"#333"}`, cursor:"pointer", transition:"all .2s", opacity:isDone?0.6:1}}>
              <div style={{minWidth:26, height:26, borderRadius:6, border:`2px solid ${isDone?"#27ae60":"#555"}`, background:isDone?"#27ae60":"transparent", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, fontSize:13, color:isDone?"#fff":"#aaa", fontWeight:"bold"}}>
               {item.qty > 1 ? `${doneQty}/${item.qty}` : (isDone ? "✓" : "")}
              </div>
              <div style={{flex:1}}>
               <span style={{fontWeight:800, fontSize:isMobile?13:15, textDecoration:isDone?"line-through":"none", color:isDone?"#555":"#eee"}}>
                {item.qty>1&&<span style={{color:Y, marginRight:4}}>{item.qty}×</span>}
                {item.name}
                {item.isLlevar && <span style={{marginLeft:6, background:"#154360", color:"#3498db", borderRadius:4, padding:"1px 5px", fontSize:10}}> Llevar</span>}
                {item._isAdicion && <span style={{marginLeft:6, background:"#2d1a4a", color:"#c39bd3", borderRadius:4, padding:"1px 6px", fontSize:10, fontWeight:900}}>+ADICIONAL</span>}
               </span>
               {item.salsas?.length > 0 && <div style={{color:Y, fontSize:11, fontStyle:"italic", marginTop:2}}> {item.salsas.map(s => `${s.name} (${s.style})`).join(', ')}</div>}
               {item._comboNote && <div style={{color:"#3498db", fontSize:11, fontStyle:"italic", marginTop:2}}>🎯 {item._comboNote}</div>}
               {validNotes.map((n, idx) => <div key={idx} style={{fontSize:11, color:"#aaa", marginTop:3, fontStyle:"italic", whiteSpace:"pre-wrap"}}> Plato {idx+1}: {n}</div>)}
              </div>
             </div>
            );
           })}
          </>
         );
        })()}

        {order.notes && <div style={{marginTop:8, padding:"8px 10px", background:"#1a1500", borderRadius:8, border:"1px solid #3a3000", fontSize:12, color:"#e6c200", whiteSpace:"pre-wrap"}}> General: {order.notes}</div>}

        <div style={{display:"flex", justifyContent:"flex-end", gap:8, marginTop:10}}>
         <button style={{...s.btn("success"), padding:"7px 12px", fontSize:12}} onClick={() => markKitchenListo(order.id_pedido || order.id)}>
          Marcar pedido listo
         </button>
        </div>

        {/* Adicional footer: quién lo agregó */}
        {hasAdicion && order._adicionPor && (
         <div style={{marginTop:8, display:"flex", justifyContent:"flex-end"}}>
          <span style={{fontSize:11, color:"#c39bd3", background:"#1a0a2a", borderRadius:6, padding:"2px 10px", border:"1px solid #8e44ad44"}}>
           ➕ Adicional por {order._adicionPor}
          </span>
         </div>
        )}
       </div>
      );
     })}
    </div>
   </div>
  )}
 </div>
 );
}

// ═══════════════════════════════════════════════════════════════════
// MODAL EDITAR COBRO — Admin edita montos directamente en historial
// ═══════════════════════════════════════════════════════════════════
function EditCobroModal({ order, onSave, onClose, s, Y, fmt }) {
 const pe = order.payments?.efectivo || order.splitPayments?.reduce((s,sp)=>s+(sp.payments?.efectivo||0),0) || 0;
 const py = order.payments?.yape    || order.splitPayments?.reduce((s,sp)=>s+(sp.payments?.yape||0),0)    || 0;
 const pt = order.payments?.tarjeta || order.splitPayments?.reduce((s,sp)=>s+(sp.payments?.tarjeta||0),0) || 0;

 const [ef, setEf] = useState(String(pe));
 const [ya, setYa] = useState(String(py));
 const [ta, setTa] = useState(String(pt));
 const [newTotal, setNewTotal] = useState(String(order.total));
 const [motivo, setMotivo] = useState("");

 const sumPagos = (parseFloat(ef)||0) + (parseFloat(ya)||0) + (parseFloat(ta)||0);
 const totalVal = parseFloat(newTotal) || 0;
 const diff = Math.abs(sumPagos - totalVal);
 const ok = diff < 0.01 && totalVal > 0;

 return (
  <div style={s.modal} onClick={e=>e.stopPropagation()}>
   <div style={{...s.row, marginBottom:14}}>
    <div style={{color:Y, fontFamily:"'Bebas Neue',cursive", fontSize:20, letterSpacing:1}}>✏️ EDITAR COBRO</div>
    <CloseBtn onClose={onClose}/>
   </div>
   <div style={{background:"#111", borderRadius:8, padding:"10px 12px", marginBottom:14, fontSize:12, color:"#aaa"}}>
    <b style={{color:"#eee"}}>{order.orderType==="llevar"?`🥡 ${order.table||"S/nombre"}`:`🍽 Mesa ${order.table}`}</b>
    <span style={{marginLeft:8, color:"#666"}}>Cobro original: <span style={{color:Y, fontWeight:900}}>{fmt(order.total)}</span></span>
    {order.splitPayments?.length > 0 && <div style={{fontSize:10, color:"#e67e22", marginTop:4}}>⚠️ Este pedido tiene pagos divididos. Se editará el total consolidado.</div>}
   </div>
   <div style={{marginBottom:12}}>
    <label style={{fontSize:11, color:"#888", textTransform:"uppercase", letterSpacing:1, display:"block", marginBottom:6}}>Nuevo Total</label>
    <input type="number" style={{...s.input, fontWeight:900, fontSize:16, color:Y}} min="0" step="0.5" value={newTotal} onChange={e=>setNewTotal(e.target.value)}/>
   </div>
   <div style={{marginBottom:12}}>
    <label style={{fontSize:11, color:"#888", textTransform:"uppercase", letterSpacing:1, display:"block", marginBottom:6}}>Distribución de pagos</label>
    {[{label:"💵 Efectivo", val:ef, set:setEf},{label:"📱 Yape", val:ya, set:setYa},{label:"💳 Tarjeta", val:ta, set:setTa}].map(({label,val,set})=>(
     <div key={label} style={{display:"flex", alignItems:"center", gap:10, marginBottom:8}}>
      <span style={{width:100, fontSize:13, fontWeight:700}}>{label}</span>
      <input type="number" style={s.input} value={val} onChange={e=>set(e.target.value)} min="0" step="0.5"/>
     </div>
    ))}
    {!ok && sumPagos > 0 && <div style={{fontSize:12, color:"#e74c3c", fontWeight:700}}>⚠️ La suma de pagos ({fmt(sumPagos)}) no coincide con el total ({fmt(totalVal)})</div>}
   </div>
   <div style={{marginBottom:14}}>
    <label style={{fontSize:11, color:"#888", textTransform:"uppercase", letterSpacing:1, display:"block", marginBottom:4}}>Motivo de la corrección *</label>
    <input style={s.input} placeholder="Ej: Error al cobrar, cobro duplicado..." value={motivo} onChange={e=>setMotivo(e.target.value)} spellCheck="false"/>
   </div>
   <button style={{...s.btn("success"), width:"100%", padding:14, fontSize:15, opacity:(!ok||!motivo.trim())?0.4:1}}
    disabled={!ok||!motivo.trim()}
    onClick={()=>onSave({ payments:{efectivo:parseFloat(ef)||0, yape:parseFloat(ya)||0, tarjeta:parseFloat(ta)||0}, newTotal:totalVal, motivo })}>
    ✅ Guardar corrección
   </button>
  </div>
 );
}

// ═══════════════════════════════════════════════════════════════════
// MODAL SOLICITAR CORRECCIÓN DE COBRO — Cajero pide corrección
// ═══════════════════════════════════════════════════════════════════
function SolicitarCorreccionModal({ order, onSubmit, onClose, s, Y, fmt, getPay }) {
 const pe = getPay(order,"efectivo");
 const py = getPay(order,"yape");
 const pt = getPay(order,"tarjeta");

 const [ef, setEf] = useState(String(pe));
 const [ya, setYa] = useState(String(py));
 const [ta, setTa] = useState(String(pt));
 const [newTotal, setNewTotal] = useState(String(order.total));
 const [motivo, setMotivo] = useState("");

 const sumPagos = (parseFloat(ef)||0)+(parseFloat(ya)||0)+(parseFloat(ta)||0);
 const totalVal = parseFloat(newTotal)||0;
 const diff = Math.abs(sumPagos - totalVal);
 const ok = diff < 0.01 && totalVal > 0 && motivo.trim();

 return (
  <div style={s.modal} onClick={e=>e.stopPropagation()}>
   <div style={{...s.row, marginBottom:14}}>
    <div style={{color:"#8e44ad", fontFamily:"'Bebas Neue',cursive", fontSize:20, letterSpacing:1}}>📨 SOLICITAR CORRECCIÓN</div>
    <CloseBtn onClose={onClose}/>
   </div>
   <div style={{background:"#111", borderRadius:8, padding:"10px 12px", marginBottom:12, fontSize:12, color:"#aaa"}}>
    <b style={{color:"#eee"}}>{order.orderType==="llevar"?`🥡 ${order.table||"S/nombre"}`:`🍽 Mesa ${order.table}`}</b>
    <div style={{marginTop:6, display:"flex", gap:12, flexWrap:"wrap"}}>
     {pe>0&&<span>💵 Efectivo: <b style={{color:"#eee"}}>{fmt(pe)}</b></span>}
     {py>0&&<span>📱 Yape: <b style={{color:"#eee"}}>{fmt(py)}</b></span>}
     {pt>0&&<span>💳 Tarjeta: <b style={{color:"#eee"}}>{fmt(pt)}</b></span>}
    </div>
    <div style={{marginTop:4}}>Total actual: <b style={{color:Y}}>{fmt(order.total)}</b></div>
   </div>
   <div style={{background:"#1a0a2a", border:"1px solid #8e44ad44", borderRadius:8, padding:"10px 12px", marginBottom:14}}>
    <div style={{fontSize:11, color:"#8e44ad", fontWeight:800, textTransform:"uppercase", letterSpacing:1, marginBottom:8}}>Montos corregidos</div>
    <div style={{marginBottom:8}}>
     <label style={{fontSize:11, color:"#888", display:"block", marginBottom:4}}>Nuevo Total</label>
     <input type="number" style={{...s.input, fontWeight:900, color:Y}} min="0" step="0.5" value={newTotal} onChange={e=>setNewTotal(e.target.value)}/>
    </div>
    {[{label:"💵 Efectivo", val:ef, set:setEf},{label:"📱 Yape", val:ya, set:setYa},{label:"💳 Tarjeta", val:ta, set:setTa}].map(({label,val,set})=>(
     <div key={label} style={{display:"flex", alignItems:"center", gap:8, marginBottom:6}}>
      <span style={{width:95, fontSize:12, fontWeight:700}}>{label}</span>
      <input type="number" style={s.input} value={val} onChange={e=>set(e.target.value)} min="0" step="0.5"/>
     </div>
    ))}
    {!ok && sumPagos>0 && diff>0.01 && <div style={{fontSize:11, color:"#e74c3c", marginTop:4}}>⚠️ Suma ({fmt(sumPagos)}) ≠ total ({fmt(totalVal)})</div>}
   </div>
   <div style={{marginBottom:14}}>
    <label style={{fontSize:11, color:"#888", textTransform:"uppercase", letterSpacing:1, display:"block", marginBottom:4}}>Motivo del error *</label>
    <input style={s.input} placeholder="Ej: Cobré de más, método incorrecto..." value={motivo} onChange={e=>setMotivo(e.target.value)} spellCheck="false"/>
   </div>
   <button style={{...s.btn("blue"), width:"100%", padding:14, fontSize:14, opacity:!ok?0.4:1}} disabled={!ok}
    onClick={()=>onSubmit({
     newPayments:{efectivo:parseFloat(ef)||0, yape:parseFloat(ya)||0, tarjeta:parseFloat(ta)||0},
     newTotal: totalVal, motivo,
    })}>
    📨 Enviar solicitud al Administrador
   </button>
  </div>
 );
}

function HistorialComponent({ history, activeOrders, isMobile, s, Y, fmt, getPay, printOrder, isAdmin, currentUser, crearSolicitud, updateHistoryDoc }) {
 const [expandedDays, setExpandedDays] = useState([new Date().toLocaleDateString("es-PE")]);
 const [histDate, setHistDate] = useState("");
 const [editCobroModal, setEditCobroModal] = useState(null);
 const [correccionModal, setCorreccionModal] = useState(null);

 // ── Group orders by DATE (top level), then by session inside ──────
 // Exclude anulled orders from revenue totals
 const dayMap = {};
 history.forEach(o => {
  const dateObj = new Date(o.createdAt);
  const dateStr = dateObj.toLocaleDateString("es-PE");
  const sortKey = dateObj.getFullYear() + "-" + String(dateObj.getMonth()+1).padStart(2,'0') + "-" + String(dateObj.getDate()).padStart(2,'0');
  if (!dayMap[sortKey]) dayMap[sortKey] = { date:dateStr, sortKey, sessions:{}, orders:[], total:0, ef:0, ya:0, ta:0, cancelados:0 };

  dayMap[sortKey].orders.push(o);

  if (o.status === "pagado" && !o.anulado) {
   dayMap[sortKey].total += o.total;
   dayMap[sortKey].ef += getPay(o,"efectivo");
   dayMap[sortKey].ya += getPay(o,"yape");
   dayMap[sortKey].ta += getPay(o,"tarjeta");

   // Also track by session for the sub-breakdown
   const sid = o._cajaSessionId || "sin_sesion";
   if (!dayMap[sortKey].sessions[sid]) dayMap[sortKey].sessions[sid] = { sid, openedAt: o._cajaOpenedAt || o.createdAt, total:0, ef:0, ya:0, ta:0, count:0 };
   dayMap[sortKey].sessions[sid].total += o.total;
   dayMap[sortKey].sessions[sid].ef += getPay(o,"efectivo");
   dayMap[sortKey].sessions[sid].ya += getPay(o,"yape");
   dayMap[sortKey].sessions[sid].ta += getPay(o,"tarjeta");
   dayMap[sortKey].sessions[sid].count++;
  } else if (o.status === "cancelado" || o.anulado) {
   dayMap[sortKey].cancelados++;
  }
 });

 // Sort orders within each day: most recent first
 Object.values(dayMap).forEach(d => {
  d.orders.sort((a,b) => new Date(b.paidAt||b.cancelledAt||b.createdAt) - new Date(a.paidAt||a.cancelledAt||a.createdAt));
 });

 let daysList = Object.values(dayMap).sort((a,b) => b.sortKey.localeCompare(a.sortKey));
 if (histDate) daysList = daysList.filter(d => d.sortKey === histDate);

 const toggleDay = (sortKey) => setExpandedDays(prev => prev.includes(sortKey) ? prev.filter(s => s !== sortKey) : [...prev, sortKey]);

 return (
 <div>
 {editCobroModal && (
  <div style={s.overlay} onClick={()=>setEditCobroModal(null)}>
   <EditCobroModal order={editCobroModal} onClose={()=>setEditCobroModal(null)} s={s} Y={Y} fmt={fmt}
    onSave={async ({payments, newTotal, motivo})=>{
     if (!editCobroModal._fid) return;
     await updateHistoryDoc(editCobroModal._fid, { payments, total: newTotal, _correctedAt: new Date().toISOString(), _correctedBy: currentUser?.name, _correctedMotivo: motivo, ...(editCobroModal.splitPayments ? { splitPayments: undefined } : {}) });
     setEditCobroModal(null);
    }}
   />
  </div>
 )}
 {correccionModal && (
  <div style={s.overlay} onClick={()=>setCorreccionModal(null)}>
   <SolicitarCorreccionModal order={correccionModal} onClose={()=>setCorreccionModal(null)} s={s} Y={Y} fmt={fmt} getPay={getPay}
    onSubmit={async ({newPayments, newTotal, motivo})=>{
     const o = correccionModal;
     await crearSolicitud({
      type: "cobro",
      histFid: o._fid,
      orderId: o.id || o._fid,
      orderTable: o.table,
      orderType: o.orderType,
      orderTotal: o.total,
      orderItems: o.items,
      oldPayments: { efectivo: getPay(o,"efectivo"), yape: getPay(o,"yape"), tarjeta: getPay(o,"tarjeta") },
      newPayments,
      newTotal,
      motivo,
      requestedBy: currentUser?.userId || currentUser?.id,
      requestedByName: currentUser?.name,
     });
     setCorreccionModal(null);
    }}
   />
  </div>
 )}
 <div style={{...s.row, marginBottom:16}}>
 <div style={{...s.title, marginBottom:0}}> HISTORIAL DE VENTAS</div>
 <div style={{display:"flex", gap:8}}>
 <input 
 type="date" 
 style={{...s.input, padding:"8px 12px", width:"auto", cursor:"pointer"}} 
 value={histDate} 
 onChange={e => { 
 const val = e.target.value; 
 setHistDate(val); 
 const match = Object.values(dayMap).find(x => x.sortKey === val); 
 if (match && !expandedDays.includes(match.date)) setExpandedDays(prev => [...prev, match.date]); 
 }} 
 />
 {histDate && <button style={{...s.btn("secondary"), padding:"8px 12px"}} onClick={()=>{setHistDate("");}}>Ver Todos</button>}
 </div>
 </div>

 {daysList.length === 0 ? (
 <div style={{textAlign:"center", padding:60, color:"#444", background:"#1a1a1a", borderRadius:12}}>
 <div style={{fontSize:48, marginBottom:10}}></div>
 <div style={{fontSize:16, fontWeight:700}}>No hay registros para mostrar</div>
 </div>
 ) : (
 daysList.map(d => {
 const isExpanded = expandedDays.includes(d.sortKey);
 const sessionCount = Object.keys(d.sessions).length;
 return (
 <div key={d.sortKey} style={{background:"#1c1c1c", borderRadius:12, marginBottom:16, border:"1px solid #2a2a2a", overflow:"hidden", boxShadow:"0 4px 6px rgba(0,0,0,0.3)"}}>
 <div style={{padding:"16px 20px", display:"flex", justifyContent:"space-between", alignItems:"center", cursor:"pointer", background: isExpanded ? `linear-gradient(90deg, #1f1a00 0%, #1c1c1c 100%)` : "#1c1c1c", borderBottom: isExpanded ? `2px solid ${Y}55` : "none", transition:"all 0.2s"}}
  onClick={() => toggleDay(d.sortKey)}>
 <div style={{display:"flex", alignItems:"center", gap:12}}>
 <div style={{fontSize:24}}>📅</div>
 <div>
  <div style={{fontWeight:900, fontSize:18, color: isExpanded ? Y : "#eee", letterSpacing:0.5}}>{d.date}</div>
  <div style={{fontSize:12, color:"#888", marginTop:2}}>
   {d.orders.filter(x => x.status==="pagado" && !x.anulado).length} pedidos cobrados
   {d.cancelados > 0 && <span style={{color:"#e74c3c"}}> • {d.cancelados} anulados</span>}
   {sessionCount > 1 && <span style={{color:"#555"}}> · {sessionCount} sesiones de caja</span>}
  </div>
 </div>
 </div>
 <div style={{textAlign:"right", display:"flex", alignItems:"center", gap:16}}>
  <div style={{fontWeight:900, fontSize:22, color:"#27ae60"}}>{fmt(d.total)}</div>
  <div style={{background:"#2a2a2a", borderRadius:"50%", width:32, height:32, display:"flex", alignItems:"center", justifyContent:"center", color:Y, transition:"transform 0.3s", transform: isExpanded?"rotate(180deg)":"rotate(0deg)"}}>▼</div>
 </div>
 </div>

 {/* CUERPO DEL ACORDEÓN (Detalles de los pedidos) */}
 {isExpanded && (
 <div style={{padding:"20px", background:"#111"}}>

 {/* Multi-sesión breakdown si hay más de una sesión en el día */}
 {sessionCount > 1 && (
  <div style={{marginBottom:16, background:"#0a0a0a", borderRadius:10, padding:"12px 14px", border:"1px solid #2a2a2a"}}>
   <div style={{fontSize:11, color:"#555", textTransform:"uppercase", letterSpacing:1, marginBottom:8}}>Desglose por sesión de caja</div>
   {Object.values(d.sessions).sort((a,b)=>new Date(a.openedAt)-new Date(b.openedAt)).map((ses,idx) => (
    <div key={ses.sid} style={{display:"flex", justifyContent:"space-between", alignItems:"center", padding:"6px 0", borderBottom:"1px solid #1a1a1a"}}>
     <div style={{fontSize:12, color:"#888"}}>
      Sesión {idx+1}
      {ses.openedAt && <span style={{marginLeft:6, color:"#555"}}>{new Date(ses.openedAt).toLocaleTimeString("es-PE",{hour:"2-digit",minute:"2-digit"})}</span>}
      <span style={{marginLeft:8, color:"#444"}}>{ses.count} pedidos</span>
     </div>
     <span style={{color:Y, fontWeight:900, fontSize:13}}>{fmt(ses.total)}</span>
    </div>
   ))}
  </div>
 )}

 {/* Cajas de Métodos de Pago */}
 <div style={{display:"flex", gap:12, marginBottom:20, flexWrap:"wrap"}}>
 <div style={{flex:1, minWidth:100, background:"#1a2e1a", border:"1px solid #27ae6055", borderRadius:8, padding:"12px", textAlign:"center"}}>
 <div style={{color:"#27ae60", fontSize:11, fontWeight:800, marginBottom:4, letterSpacing:1}}> EFECTIVO</div>
 <div style={{color:"#fff", fontWeight:900, fontSize:18}}>{fmt(d.ef)}</div>
 </div>
 <div style={{flex:1, minWidth:100, background:"#2a1a3a", border:"1px solid #8e44ad55", borderRadius:8, padding:"12px", textAlign:"center"}}>
 <div style={{color:"#c39bd3", fontSize:11, fontWeight:800, marginBottom:4, letterSpacing:1}}> YAPE</div>
 <div style={{color:"#fff", fontWeight:900, fontSize:18}}>{fmt(d.ya)}</div>
 </div>
 <div style={{flex:1, minWidth:100, background:"#1a253a", border:"1px solid #2980b955", borderRadius:8, padding:"12px", textAlign:"center"}}>
 <div style={{color:"#5dade2", fontSize:11, fontWeight:800, marginBottom:4, letterSpacing:1}}> TARJETA</div>
 <div style={{color:"#fff", fontWeight:900, fontSize:18}}>{fmt(d.ta)}</div>
 </div>
 </div>

 {/* ── DOS COLUMNAS: Para Llevar | Mesas ── */}
 {(() => {
  const llevarOrds = d.orders.filter(o => o.orderType === "llevar");
  const mesaOrds   = d.orders.filter(o => o.orderType !== "llevar");
  const isNum = t => /^\d+$/.test(String(t || ""));
  // Mesas referenciadas por pedidos llevar ya archivados ese día
  const llevarTables = new Set(llevarOrds.filter(o => isNum(o.table)).map(o => String(o.table)));
  // Pedidos de mesa activos (aún no pagados) vinculados a esas mesas
  const pendingLinked = (activeOrders || []).filter(o =>
   o.orderType !== "llevar" && !o.isPaid && !o.anulado && llevarTables.has(String(o.table))
  );

  const renderOrderCard = (o, idx) => {
   const pe = getPay(o,"efectivo"); const py = getPay(o,"yape"); const pt = getPay(o,"tarjeta");
   const isCanceled = o.status === "cancelado";
   return (
    <div key={o._fid||o.id||idx} style={{background:"#1c1c1c", border:`1px solid ${isCanceled?"#e74c3c44":"#333"}`, borderRadius:10, padding:"14px", marginBottom:10, opacity:isCanceled?0.6:1}}>
     {/* Cabecera */}
     <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:"1px solid #2a2a2a", paddingBottom:10, marginBottom:10, flexWrap:"wrap", gap:8}}>
      <div style={{display:"flex", alignItems:"center", gap:8, flexWrap:"wrap"}}>
       <span style={{fontWeight:900, fontSize:15, color:isCanceled?"#e74c3c":"#eee"}}>
        {o.orderType==="llevar" ? `🥡 ${o.table||"Sin nombre"}` : `🍽 Mesa ${o.table}`}
       </span>
       <span style={{...s.tag(isCanceled?"#c0392b":"#1e5c2e"), fontSize:10}}>
        {isCanceled?"🚫 Anulado":o.splitPayments?.length>0?"✂️ Dividido":"✅ Pagado"}
       </span>
       {o._correctedAt && <span style={{...s.tag("#7d3c00","#e67e22"), fontSize:10}}>✏️ Corregido</span>}
       <span style={{color:"#666", fontSize:11}}>{timeStr(o.paidAt||o.cancelledAt||o.createdAt)}</span>
      </div>
      <div style={{display:"flex", alignItems:"center", gap:8}}>
       <div style={{textAlign:"right"}}>
        {o.descuentoPct>0&&!isCanceled&&<div style={{fontSize:10,color:"#888",textDecoration:"line-through"}}>{fmt(o.totalOriginal)}</div>}
        <span style={{color:isCanceled?"#888":o.descuentoPct>0?"#27ae60":Y, fontWeight:900, fontSize:17}}>
         {isCanceled?<del>{fmt(o.total)}</del>:fmt(o.total)}
        </span>
        {o.descuentoPct>0&&!isCanceled&&<div style={{fontSize:10,color:"#27ae60",fontWeight:700}}>🏷 −{o.descuentoPct}%</div>}
       </div>
       <div style={{display:"flex", gap:4, flexWrap:"wrap"}}>
        <button style={{...s.btn("secondary"),padding:"5px 9px",fontSize:11}} onClick={e=>{e.stopPropagation();printOrder(o);}}>🖨</button>
        {!isCanceled&&isAdmin&&o._fid&&<button style={{...s.btn("warn"),padding:"5px 9px",fontSize:11}} onClick={e=>{e.stopPropagation();setEditCobroModal(o);}}>✏️</button>}
        {!isCanceled&&!isAdmin&&o._fid&&<button style={{...s.btn("blue"),padding:"5px 9px",fontSize:11}} onClick={e=>{e.stopPropagation();setCorreccionModal(o);}}>📋</button>}
       </div>
      </div>
     </div>
     {/* Pago normal */}
     {!isCanceled&&!o.splitPayments?.length&&(
      <div style={{fontSize:11,color:"#aaa",marginBottom:10,background:"#0a0a0a",padding:"8px 12px",borderRadius:6}}>
       <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
        <span style={{fontWeight:800,color:"#777"}}>PAGO:</span>
        {[pe>0&&`💵 ${fmt(pe)}`,py>0&&`📱 Yape ${fmt(py)}`,pt>0&&`💳 ${fmt(pt)}`].filter(Boolean).join(" · ")}
       </div>
       {o.descuentoPct>0&&<div style={{marginTop:4,color:"#27ae60",fontWeight:700}}>🏷 −{o.descuentoPct}% {o.descuentoMotivo?`· ${o.descuentoMotivo}`:""}<span style={{color:"#555",marginLeft:6}}>| Original: {fmt(o.totalOriginal)}</span></div>}
       {o._correctedAt&&<div style={{marginTop:4,color:"#e67e22",fontWeight:700}}>✏️ Corregido por {o._correctedBy}{o._correctedMotivo&&` · "${o._correctedMotivo}"`}</div>}
      </div>
     )}
     {/* Pago dividido */}
     {!isCanceled&&o.splitPayments?.length>0&&(
      <div style={{marginBottom:10}}>
       <div style={{fontSize:11,color:"#aaa",fontWeight:800,marginBottom:6,textTransform:"uppercase",letterSpacing:1}}>✂️ Cobros por división:</div>
       {o.splitPayments.map((sp,i)=>{
        const ef=sp.payments?.efectivo||0,ya=sp.payments?.yape||0,ta=sp.payments?.tarjeta||0;
        return(
         <div key={i} style={{background:"#0a0a0a",border:"1px solid #2a2a2a",borderRadius:6,padding:"8px 12px",marginBottom:6}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
           <span style={{fontSize:11,fontWeight:800,color:"#888"}}>División {i+1} · {timeStr(sp.paidAt)}</span>
           <span style={{color:Y,fontWeight:900,fontSize:13}}>{fmt(sp.total)}</span>
          </div>
          <div style={{fontSize:10,color:"#666"}}>{[ef>0&&`💵 ${fmt(ef)}`,ya>0&&`📱 ${fmt(ya)}`,ta>0&&`💳 ${fmt(ta)}`].filter(Boolean).join(" · ")}</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:4,marginTop:6}}>
           {sp.items.map((item,ii)=><span key={ii} style={{background:"#1a1a1a",borderRadius:4,padding:"2px 7px",fontSize:10,color:"#ccc",border:"1px solid #333"}}>{item.qty}x {item.name}</span>)}
          </div>
         </div>
        );
       })}
       <div style={{display:"flex",justifyContent:"space-between",padding:"6px 12px",background:"#111",borderRadius:6,fontSize:11}}>
        <span style={{color:"#777",fontWeight:800}}>TOTAL COBRADO:</span>
        <span style={{color:Y,fontWeight:900}}>{fmt(o.splitPayments.reduce((s,sp)=>s+(sp.total||0),0))}</span>
       </div>
      </div>
     )}
     {/* Ítems */}
     <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
      {(o.items||[]).map((item,i)=>(
       <div key={i} style={{fontSize:12,color:"#ccc",padding:"7px 10px",background:"#222",borderRadius:6,borderLeft:`3px solid ${isCanceled?"#e74c3c":Y}`}}>
        <div style={{display:"flex",justifyContent:"space-between",fontWeight:700,gap:8}}>
         <span>{item.qty}x {item.name}{item.isLlevar&&<span style={{marginLeft:5,background:"#154360",color:"#3498db",borderRadius:4,padding:"1px 5px",fontSize:9}}>🥡</span>}</span>
         <span style={{color:"#888"}}>{fmt(item.price*item.qty)}</span>
        </div>
        {item.salsas?.length>0&&<div style={{color:Y,fontSize:10,fontStyle:"italic",marginTop:3}}>🌶 {item.salsas.map(sa=>`${sa.name} (${sa.style})`).join(', ')}</div>}
        {item._comboNote&&<div style={{color:"#3498db",fontSize:10,fontStyle:"italic",marginTop:3}}>🎯 {item._comboNote}</div>}
       </div>
      ))}
     </div>
    </div>
   );
  };

  const renderPendingCard = (o, idx) => (
   <div key={o.id||idx} style={{background:"#1a1500",border:"2px dashed #e67e2266",borderRadius:10,padding:"14px",marginBottom:10}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
     <span style={{fontWeight:900,fontSize:15,color:"#e67e22"}}>🍽 Mesa {o.table}</span>
     <span style={{background:"#e67e2222",color:"#e67e22",borderRadius:6,padding:"3px 10px",fontSize:11,fontWeight:800}}>⏳ Pago pendiente</span>
    </div>
    <div style={{fontSize:12,color:"#888",marginBottom:8}}>{o.items?.length||0} ítems · Total: {fmt(o.total)}</div>
    <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
     {(o.items||[]).map((item,i)=>(
      <span key={i} style={{background:"#222",borderRadius:4,padding:"2px 7px",fontSize:10,color:"#ccc",border:"1px solid #2a2a2a"}}>{item.qty}x {item.name}</span>
     ))}
    </div>
   </div>
  );

  return (
   <div style={{display:"grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap:20, alignItems:"start"}}>

    {/* ── COLUMNA IZQUIERDA: Para Llevar ── */}
    <div>
     <div style={{fontSize:11, color:"#3498db", textTransform:"uppercase", fontWeight:800, letterSpacing:1, marginBottom:12, paddingBottom:8, borderBottom:"2px solid #154360", display:"flex", alignItems:"center", gap:8}}>
      🥡 Para Llevar
      <span style={{background:"#154360", color:"#3498db", borderRadius:10, padding:"1px 8px", fontSize:10}}>{llevarOrds.length}</span>
     </div>
     {llevarOrds.length === 0
      ? <div style={{color:"#444", fontSize:12, padding:"16px", textAlign:"center", background:"#1a1a1a", borderRadius:8}}>Sin pedidos para llevar este día</div>
      : llevarOrds.map((o, idx) => renderOrderCard(o, idx))
     }
    </div>

    {/* ── COLUMNA DERECHA: Pedidos de Mesa ── */}
    <div>
     <div style={{fontSize:11, color:Y, textTransform:"uppercase", fontWeight:800, letterSpacing:1, marginBottom:12, paddingBottom:8, borderBottom:`2px solid ${Y}44`, display:"flex", alignItems:"center", gap:8}}>
      🍽️ Pedidos de Mesa
      <span style={{background:`${Y}22`, color:Y, borderRadius:10, padding:"1px 8px", fontSize:10}}>{mesaOrds.length + pendingLinked.length}</span>
     </div>
     {mesaOrds.length === 0 && pendingLinked.length === 0
      ? <div style={{color:"#444", fontSize:12, padding:"16px", textAlign:"center", background:"#1a1a1a", borderRadius:8}}>Sin pedidos de mesa este día</div>
      : <>
         {mesaOrds.map((o, idx) => renderOrderCard(o, idx))}
         {pendingLinked.map((o, idx) => renderPendingCard(o, idx))}
        </>
     }
    </div>

   </div>
  );
 })()}
 </div>
 )}
 </div>
 );
 })
 )}
 </div>
 );
}

function Inventario({ menu, orders, history, isMobile, s, Y, fmt }) {
 const localNow = new Date();
 const todayIso = localNow.getFullYear() + "-" + String(localNow.getMonth()+1).padStart(2,'0') + "-" + String(localNow.getDate()).padStart(2,'0');

 const [invCat, setInvCat] = useState("Todos");
 const [invPeriod, setInvPeriod] = useState("hoy");
 const [invDate, setInvDate] = useState(todayIso);
 const [invSortBy, setInvSortBy] = useState("cantidad");
 const [search, setSearch] = useState("");
 const invCats = [...new Set(menu.map(i => i.cat).filter(Boolean))];

 const now = new Date(); const todayStr = now.toDateString(); const weekAgo = new Date(now - 7*24*60*60*1000);

 const inPeriod = (iso) => {
 if (!iso) return false;
 const d = new Date(iso);
 if (invPeriod === "hoy") return d.toDateString() === todayStr;
 if (invPeriod === "semana") return d >= weekAgo;
 if (invPeriod === "fecha") {
 if (!invDate) return false;
 const dStr = d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,'0') + "-" + String(d.getDate()).padStart(2,'0');
 return dStr === invDate;
 }
 return true;
 };

 const counts={}, revenue={};
 history.filter(o=>o.status==="pagado"&&!o.anulado&&inPeriod(o.createdAt)).forEach(order=>{ order.items?.forEach(item=>{counts[item.id]=(counts[item.id]||0)+item.qty;revenue[item.id]=(revenue[item.id]||0)+item.price*item.qty;}); });
 if (invPeriod==="hoy"||invPeriod==="semana"||invPeriod==="fecha") { orders.filter(o=>o.isPaid&&!o.anulado&&inPeriod(o.createdAt)).forEach(order=>{ order.items?.forEach(item=>{counts[item.id]=(counts[item.id]||0)+item.qty;revenue[item.id]=(revenue[item.id]||0)+item.price*item.qty;}); }); }

 let items = menu.map(item=>({...item,qty:counts[item.id]||0,revenue:revenue[item.id]||0})).filter(item=>(invCat==="Todos"||item.cat===invCat)&&item.name.toLowerCase().includes(search.toLowerCase()));
 if (invSortBy==="cantidad") items=items.sort((a,b)=>b.qty-a.qty); else items=items.sort((a,b)=>a.name.localeCompare(b.name));

 const totalQty=items.reduce((s,i)=>s+i.qty,0); const totalRev=items.reduce((s,i)=>s+i.revenue,0); const maxQty=Math.max(...items.map(i=>i.qty),1);
 const periodLabel = invPeriod==="hoy" ? "hoy" : invPeriod==="semana" ? "esta semana" : invPeriod==="fecha" ? "esa fecha" : "histórico";

 return (
 <div>
 <div style={s.title}> INVENTARIO DE VENTAS</div>
 <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10, alignItems:"center"}}>
 {[["hoy"," Hoy"],["semana"," Semana"],["fecha"," Fecha"],["total"," Total"]].map(([v,l])=>(<button key={v} style={{...s.btn(invPeriod===v?"primary":"secondary"),fontSize:11}} onClick={()=>setInvPeriod(v)}>{l}</button>))}
 {invPeriod === "fecha" && <input type="date" style={{...s.input, width:"auto", padding:"4px 8px"}} value={invDate} onChange={e => setInvDate(e.target.value)} />}
 <div style={{width:1,background:"#333", height:20, margin:"0 4px"}}/>
 {[["cantidad","# Cantidad"],["nombre","A-Z Nombre"]].map(([v,l])=>(<button key={v} style={{...s.btn(invSortBy===v?"primary":"secondary"),fontSize:11}} onClick={()=>setInvSortBy(v)}>{l}</button>))}
 </div>
 <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:12}}>
 <div style={s.statCard}><div style={{...s.statNum,fontSize:isMobile?18:24}}>{totalQty}</div><div style={s.statLbl}>Items {periodLabel}</div></div>
 <div style={{...s.statCard,border:`1px solid ${Y}55`}}><div style={{...s.statNum,fontSize:isMobile?14:18}}>{fmt(totalRev)}</div><div style={s.statLbl}>Ingresos {periodLabel}</div></div>
 <div style={s.statCard}><div style={{...s.statNum,fontSize:isMobile?18:24}}>{items.filter(i=>i.qty>0).length}</div><div style={s.statLbl}>Platos distintos</div></div>
 </div>
 <input style={{...s.input,marginBottom:8}} placeholder="Buscar platillo..." value={search} onChange={e=>setSearch(e.target.value)}/>
 <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:12}}>
 {["Todos",...invCats].map(c=>(<button key={c} style={{...s.btn(invCat===c?"primary":"secondary"),fontSize:isMobile?9:10,padding:isMobile?"3px 6px":"4px 9px"}} onClick={()=>setInvCat(c)}>{c}</button>))}
 </div>
 {items.length===0 ? <div style={{textAlign:"center",padding:40,color:"#444"}}>Sin resultados</div> : items.map(item=>(
 <div key={item.id} style={{...s.card,marginBottom:6,padding:"10px 12px",opacity:item.qty===0?0.4:1}}>
 <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:item.qty>0?6:0}}>
 <div style={{display:"flex",alignItems:"center",gap:8,flex:1,minWidth:0}}><div style={{minWidth:0}}><div style={{fontWeight:800,fontSize:isMobile?12:14,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{item.name}</div><div style={{fontSize:10,color:"#555"}}>{item.cat} · {fmt(item.price)}</div></div></div>
 <div style={{textAlign:"right",flexShrink:0,marginLeft:8}}><div style={{fontWeight:900,fontSize:isMobile?16:20,color:item.qty>0?Y:"#444"}}>{item.qty>0?`×${item.qty}`:"—"}</div>{item.qty>0&&<div style={{fontSize:10,color:"#27ae60"}}>{fmt(item.revenue)}</div>}</div>
 </div>
 {item.qty>0&&(<div style={{background:"#222",borderRadius:4,height:5,overflow:"hidden"}}><div style={{background:`linear-gradient(90deg,${Y},#e6b800)`,height:"100%",width:`${(item.qty/maxQty)*100}%`,borderRadius:4,transition:"width .3s"}}/></div>)}
 </div>
 ))
 }
 </div>
 );
}

function CartaComponent({ menu, cartaCatFilter, setCartaCatFilter, showAdd, setShowAdd, newItem, setNewItem, addMenuItem, deleteMenuItem, isMobile, s, Y, fmt, ALL_CATS }) {
 return (
 <div>
 <div style={{...s.row, marginBottom:14}}>
 <div style={s.title}>CARTA ({menu.length})</div>
 <button style={s.btn()} onClick={() => setShowAdd(!showAdd)}>{showAdd ? " Cancelar" : "+ Agregar"}</button>
 </div>
 {showAdd && (
 <div style={{...s.cardHL, marginBottom:14}}>
 <div style={{fontWeight:800, color:Y, marginBottom:10}}>Nuevo platillo</div>
 <div style={{display:"grid", gridTemplateColumns:isMobile?"1fr":"2fr 1fr 1fr", gap:8, marginBottom:10}}>
 <input style={s.input} placeholder="Nombre del platillo" value={newItem.name} onChange={e => setNewItem(f => ({...f, name:e.target.value}))} spellCheck="false" />
 <select style={s.input} value={newItem.cat} onChange={e => setNewItem(f => ({...f, cat:e.target.value}))}>
 {ALL_CATS.map(c => <option key={c} value={c}>{c}</option>)}
 </select>
 <input style={s.input} type="number" placeholder="Precio S/." value={newItem.price} onChange={e => setNewItem(f => ({...f, price:e.target.value}))}/>
 </div>
 <button style={s.btn()} onClick={addMenuItem}>Guardar Platillo</button>
 </div>
 )}
 <div style={{display:"flex", gap:4, flexWrap:"wrap", marginBottom:10}}>
 {["Todos",...ALL_CATS].map(c => <button key={c} style={{...s.btn(cartaCatFilter===c ? "primary" : "secondary"), fontSize:isMobile?9:10, padding:isMobile?"3px 6px":"4px 9px"}} onClick={() => setCartaCatFilter(c)}>{c}</button>)}
 </div>
 {menu.filter(i => cartaCatFilter==="Todos" || i.cat===cartaCatFilter).map(item => (
 <div key={item.id} style={{...s.card, marginBottom:5, padding:isMobile?"8px 10px":"9px 12px"}}>
 <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
 <div><span style={{fontWeight:700, fontSize:isMobile?13:14}}>{item.name}</span></div>
 <div style={{display:"flex", alignItems:"center", gap:10}}>
 <span style={{color:Y, fontWeight:900}}>{fmt(item.price)}</span>
 {item.id.startsWith("CUSTOM_") && <button style={{...s.btn("danger"), padding:"2px 7px", fontSize:11}} onClick={() => deleteMenuItem(item.id)}></button>}
 </div>
 </div>
 </div>
 ))}
 </div>
 );
}

// ═══════════════════════════════════════════════════════════════════
// SOLICITUDES PANEL — Admin aprueba/rechaza en tiempo real
// ═══════════════════════════════════════════════════════════════════
function SolicitudesPanel({ solicitudes, onResolve, currentUser, isMobile, s, Y, fmt }) {
 const isAdmin = hasRole(currentUser, "admin");
 const [rejectModal, setRejectModal] = useState(null);
 const [rejectReason, setRejectReason] = useState("");
 const parsePayload = (payload) => typeof payload === "string" ? (() => { try { return JSON.parse(payload); } catch { return {}; } })() : (payload || {});
 const normalizeSol = (raw) => {
  const payload = parsePayload(raw.payload);
  const typeRaw = raw.type || raw.tipo || payload.type || "";
  const type = String(typeRaw).toLowerCase();
  const status = String(raw.status || raw.estado || "PENDIENTE").toLowerCase();
  return {
   ...payload,
   ...raw,
   payload,
   id: raw.id || raw.id_solicitud,
   type: type === "acceso_dispositivo" ? "acceso" : type,
   status: status === "aprobado" ? "aprobada" : status === "rechazado" ? "rechazada" : status,
   requestedBy: raw.requestedBy || raw.id_usuario_origen,
   requestedByName: raw.requestedByName || raw.nombre_origen || "Usuario",
   createdAt: raw.createdAt || raw.creado_en || new Date().toISOString(),
   rejectReason: raw.rejectReason || raw.motivo_rechazo,
  };
 };
 const visibleSols = (solicitudes || []).map(normalizeSol).filter(sol => isAdmin || sol.requestedBy === currentUser?.userId || sol.requestedBy === currentUser?.id);
 const pendientes = visibleSols.filter(x => x.status === "pendiente");
 const resueltas = visibleSols.filter(x => x.status !== "pendiente").slice(0, 20);
 const typeLabel = (t) => t === "acceso" ? "Acceso de equipo" : t === "anulacion" || t === "anulacion_pedido" ? "Anulacion" : t === "cobro" ? "Correccion de cobro" : t === "precio" || t === "cambio_precio" ? "Cambio de precio" : t || "Solicitud";
 const statusInfo = (st) => st === "aprobada" ? { label:"Aprobada", color:"#27ae60" } : st === "rechazada" ? { label:"Rechazada", color:"#e74c3c" } : { label:"Pendiente", color:"#f39c12" };
 const renderDetail = (sol) => {
  if (sol.type === "acceso") {
   return <div style={{fontSize:12,color:"#aaa"}}><b style={{color:"#eee"}}>Equipo:</b> {sol.payload?.nombre_equipo || sol.nombre_equipo || "Sin nombre"}<br/><span style={{color:"#666"}}>Dispositivo #{sol.payload?.id_dispositivo || sol.id_dispositivo}</span></div>;
  }
  if (sol.itemName || sol.newPrice) {
   return (
    <div style={{fontSize:12,color:"#aaa"}}>
     <b style={{color:"#eee"}}>{sol.itemName}</b>
     {sol.oldPrice !== undefined && (
      <span style={{textDecoration:"line-through",color:"#888",marginLeft:6}}>{fmt(sol.oldPrice)}</span>
     )}
     {sol.newPrice !== undefined && (
      <span style={{color:Y,fontWeight:900,marginLeft:6}}>{"-> "}{fmt(sol.newPrice)}</span>
     )}
    </div>
   );
  }
  if (sol.orderTable || sol.orderTotal) {
   const tableLabel = sol.orderType === "llevar" ? sol.orderTable : `Mesa ${sol.orderTable || ""}`;
   return (
    <div style={{fontSize:12,color:"#aaa"}}>
     {tableLabel}
     {Number(sol.orderTotal) > 0 && (
      <span style={{color:Y,marginLeft:8}}>{fmt(sol.orderTotal)}</span>
     )}
    </div>
   );
  }
  return <pre style={{margin:0,whiteSpace:"pre-wrap",fontSize:11,color:"#777"}}>{JSON.stringify(sol.payload || {}, null, 2)}</pre>;
 };
 return (
  <div>
   <div style={s.title}>SOLICITUDES DE APROBACION</div>
   {pendientes.length === 0 ? <div style={{...s.card,textAlign:"center",color:"#444",padding:"24px 0",fontSize:13}}>No hay solicitudes pendientes</div> : <>
    <div style={{fontSize:11,color:"#f39c12",textTransform:"uppercase",letterSpacing:1,marginBottom:10,fontWeight:800}}>{pendientes.length} pendiente{pendientes.length>1?"s":""}</div>
    {pendientes.map(sol => <div key={sol.id} style={{...s.card,border:"1px solid #f39c1255",marginBottom:10,padding:isMobile?10:14}}>
     <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}><div><div style={{fontWeight:900,fontSize:14,color:"#eee"}}>{typeLabel(sol.type)}</div><div style={{fontSize:11,color:"#888",marginTop:2}}>Solicitado por <b style={{color:"#ddd"}}>{sol.requestedByName}</b>{" - "}{new Date(sol.createdAt).toLocaleTimeString("es-PE",{hour:"2-digit",minute:"2-digit"})}</div></div></div>
     <div style={{background:"#111",borderRadius:8,padding:"8px 10px",marginBottom:10,border:"1px solid #2a2a2a"}}>{renderDetail(sol)}</div>
     {isAdmin ? <div style={{display:"flex",gap:8}}><button style={{...s.btn("success"),flex:2,padding:"10px 0",fontSize:13,fontWeight:900}} onClick={()=>onResolve(sol.id,"aprobada")}>Aprobar</button><button style={{...s.btn("danger"),flex:1,padding:"10px 0",fontSize:12}} onClick={()=>{setRejectModal({solId:sol.id});setRejectReason("");}}>Rechazar</button></div> : <div style={{fontSize:11,color:"#8e44ad",fontStyle:"italic",padding:"8px 0"}}>Esperando aprobacion del Administrador</div>}
    </div>)}
   </>}
   {resueltas.length > 0 && <div style={{marginTop:16}}><div style={{fontSize:11,color:"#555",textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>Historial reciente</div>{resueltas.map(sol => { const si = statusInfo(sol.status); return <div key={sol.id} style={{...s.card,marginBottom:6,padding:"8px 12px",opacity:0.65}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><span style={{fontSize:12,fontWeight:700}}>{typeLabel(sol.type)}</span><span style={{fontSize:10,color:"#666",marginLeft:8}}>por {sol.requestedByName}</span></div><span style={{...s.tag(si.color+"22", si.color),fontSize:10}}>{si.label}</span></div>{sol.rejectReason && <div style={{fontSize:10,color:"#e74c3c",marginTop:3,fontStyle:"italic"}}>Motivo: {sol.rejectReason}</div>}</div>; })}</div>}
   {rejectModal && <div style={s.overlay} onClick={()=>setRejectModal(null)}><div style={{...s.modal,maxWidth:360}} onClick={e=>e.stopPropagation()}><div style={{...s.row,marginBottom:14}}><div style={{color:"#e74c3c",fontFamily:"'Bebas Neue',cursive",fontSize:20,letterSpacing:1}}>RECHAZAR SOLICITUD</div><CloseBtn onClose={()=>setRejectModal(null)} /></div><div style={{fontSize:12,color:"#aaa",marginBottom:12}}>Motivo del rechazo (opcional):</div><input style={{...s.input,marginBottom:14}} placeholder="Ej: No autorizado" value={rejectReason} onChange={e=>setRejectReason(e.target.value)} spellCheck="false" /><div style={{display:"flex",gap:8}}><button style={{...s.btn("secondary"),flex:1,padding:12}} onClick={()=>setRejectModal(null)}>Cancelar</button><button style={{...s.btn("danger"),flex:2,padding:12,fontSize:14,fontWeight:900}} onClick={()=>{onResolve(rejectModal.solId,"rechazada",rejectReason);setRejectModal(null);}}>Confirmar rechazo</button></div></div></div>}
  </div>
 );
}

function ReportesComponent({ s, Y, fmt, isAdmin }) {
 const today = new Date().toISOString().slice(0, 10);
 const [desde, setDesde] = useState(today);
 const [hasta, setHasta] = useState(today);
 const [data, setData] = useState(null);
 const [factConfig, setFactConfig] = useState(null);
 const [auditoria, setAuditoria] = useState([]);
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState("");

 const load = useCallback(async () => {
  setLoading(true); setError("");
  try {
   const res = await API.reportes.ventas({ desde, hasta });
   setData(res);
   if (isAdmin) {
    setAuditoria(await API.reportes.auditoria({ desde, hasta, limite: 80 }).catch(() => []));
    setFactConfig(await API.facturacion.config().catch(() => null));
   }
  } catch (err) {
   setError(err.message || "No se pudo cargar reportes");
  }
  setLoading(false);
 }, [desde, hasta, isAdmin]);

 useEffect(() => { load(); }, [load]);

 const exportar = (formato) =>
  downloadWithAuth(API.reportes.exportUrl({ desde, hasta, formato }), `reporte-ventas.${formato === "pdf" ? "pdf" : "xlsx"}`);

 const resumen = data?.resumen || {};
 const comp = data?.comprobantes_resumen || {};

 return (
  <div>
   <div style={{...s.row, marginBottom:14}}>
    <div style={s.title}>REPORTES</div>
    <div style={{display:"flex", gap:8, flexWrap:"wrap"}}>
     <input type="date" style={{...s.input, width:150}} value={desde} onChange={e=>setDesde(e.target.value)} />
     <input type="date" style={{...s.input, width:150}} value={hasta} onChange={e=>setHasta(e.target.value)} />
     <button style={s.btn("secondary")} onClick={() => exportar("xlsx")}>Excel</button>
     <button style={s.btn("secondary")} onClick={() => exportar("pdf")}>PDF</button>
    </div>
   </div>
   {error && <div style={{...s.card, color:"#ffb4a8", border:"1px solid #e74c3c55"}}>{error}</div>}
   {loading ? <div style={s.card}>Cargando reportes...</div> : (
    <>
     <div style={s.grid(180)}>
      <div style={s.statCard}><div style={s.statNum}>{resumen.pedidos || 0}</div><div style={s.statLbl}>Pedidos cobrados</div></div>
      <div style={s.statCard}><div style={s.statNum}>{fmt(resumen.total || 0)}</div><div style={s.statLbl}>Ventas</div></div>
      <div style={s.statCard}><div style={s.statNum}>{fmt(resumen.ticket_promedio || 0)}</div><div style={s.statLbl}>Ticket promedio</div></div>
      <div style={s.statCard}><div style={s.statNum}>{comp.total || 0}</div><div style={s.statLbl}>Comprobantes</div></div>
     </div>
     <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))", gap:12, marginTop:12}}>
      <div style={s.cardHL}>
       <div style={{fontWeight:900, color:Y, marginBottom:10}}>Metodos de pago</div>
       {(data?.metodos || []).map(m => <div key={m.metodo_pago} style={{display:"flex", justifyContent:"space-between", padding:"7px 0", borderBottom:"1px solid #2a2a2a"}}><span>{m.metodo_pago}</span><b style={{color:Y}}>{fmt(m.total)}</b></div>)}
      </div>
      <div style={s.cardHL}>
       <div style={{fontWeight:900, color:Y, marginBottom:10}}>Productos mas vendidos</div>
       {(data?.productos || []).slice(0, 10).map(p => <div key={p.nombre} style={{display:"flex", justifyContent:"space-between", gap:10, padding:"7px 0", borderBottom:"1px solid #2a2a2a"}}><span style={{minWidth:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{p.nombre}</span><b style={{color:Y}}>{p.cantidad} · {fmt(p.total)}</b></div>)}
      </div>
      <div style={s.cardHL}>
       <div style={{fontWeight:900, color:Y, marginBottom:10}}>SUNAT</div>
       {[["Aceptados", comp.aceptados || 0, "#27ae60"],["Pendientes", comp.pendientes || 0, "#e67e22"],["Rechazados", comp.rechazados || 0, "#e74c3c"]].map(([label, value, color]) => (
        <div key={label} style={{display:"flex", justifyContent:"space-between", padding:"7px 0", borderBottom:"1px solid #2a2a2a"}}><span>{label}</span><b style={{color}}>{value}</b></div>
       ))}
       {(data?.comprobantes || []).slice(0, 8).map(c => (
        <div key={c.id_comprobante} style={{display:"flex", justifyContent:"space-between", gap:8, alignItems:"center", padding:"7px 0", borderBottom:"1px solid #2a2a2a", fontSize:12}}>
         <span>{c.serie}-{String(c.correlativo).padStart(8,"0")} · {c.estado_sunat}</span>
         {c.estado_sunat !== "ACEPTADO" && (
          <button style={{...s.btn("secondary"), padding:"3px 8px", fontSize:10}} onClick={async () => { await API.facturacion.enviar(c.id_comprobante); load(); }}>Reenviar</button>
         )}
        </div>
       ))}
      </div>
     </div>
     {isAdmin && (
      <div style={{...s.cardHL, marginTop:12}}>
       {factConfig && (
        <div style={{marginBottom:12, padding:"10px 12px", background:"#111", border:"1px solid #2a2a2a", borderRadius:8, fontSize:12}}>
         <b style={{color:Y}}>Configuracion SUNAT:</b> {factConfig.empresa?.ruc} · {factConfig.sunat?.modo} · Usuario {factConfig.sunat?.usuario_configurado ? "listo" : "pendiente"} · Clave {factConfig.sunat?.clave_configurada ? "lista" : "pendiente"}
        </div>
       )}
       <div style={{fontWeight:900, color:Y, marginBottom:10}}>Auditoria</div>
       {auditoria.length === 0 ? <div style={{color:"#666"}}>Sin eventos en el rango.</div> : auditoria.map(ev => (
        <div key={ev.id_evento} style={{display:"grid", gridTemplateColumns:"130px 1fr 1fr", gap:8, padding:"7px 0", borderBottom:"1px solid #2a2a2a", fontSize:12}}>
         <span style={{color:"#888"}}>{new Date(ev.creado_en).toLocaleString("es-PE", { hour:"2-digit", minute:"2-digit", day:"2-digit", month:"2-digit" })}</span>
         <b>{ev.accion}</b>
         <span style={{color:"#aaa"}}>{ev.usuario || "Sistema"} · {ev.entidad || ""} {ev.entidad_id || ""}</span>
        </div>
       ))}
      </div>
     )}
    </>
   )}
  </div>
 );
}

export default function App() {
 const width = useWindowWidth();
 const isMobile = width < 480;
 const isTablet = width >= 480 && width < 1024;
 const isDesktop = width >= 768;
 const isWide = width >= 1024;

 const [currentUser, setCurrentUser] = useState(null);
 const [restoringSession, setRestoringSession] = useState(true);
 const [tab, setTab] = useState("mesas");
 const [draft, setDraft] = useState(newDraft());
 const [cartaCatFilter, setCartaCatFilter] = useState("Todos");
 const [showAdd, setShowAdd] = useState(false);
 const [newItem, setNewItem] = useState({ name:"", cat:"Sin categoria", price:"" });
 const [splash, setSplash] = useState(true);
 const [toast, setToast] = useState(null);
 const [editingOrder, setEditingOrder] = useState(null);
 const [confirmDelete, setConfirmDelete] = useState(null);
 const [anulacionModal, setAnulacionModal] = useState(null);
 const [mesaModal, setMesaModal] = useState(null);
 const [cobrarTarget, setCobrarTarget] = useState(null);
 const [splitTarget, setSplitTarget] = useState(null);
 const [mergeModal, setMergeModal] = useState(null);
 const [mergeName, setMergeName] = useState("");
 const [soundConfig, setSoundConfig] = useState(() => {
  try { return JSON.parse(localStorage.getItem("papachos_sound_config")) || { volume:0.75, freq:880, beeps:3, type:"square" }; }
  catch { return { volume:0.75, freq:880, beeps:3, type:"square" }; }
 });

 useEffect(() => {
  localStorage.setItem("papachos_sound_config", JSON.stringify(soundConfig));
 }, [soundConfig]);

 useEffect(() => {
  let cancelled = false;
  const token = localStorage.getItem("token");
  const saved = localStorage.getItem("papachos_session_user");
  if (!token) {
   setRestoringSession(false);
   return () => { cancelled = true; };
  }

  if (saved) {
   try {
    const parsed = JSON.parse(saved);
    setCurrentUser(parsed);
    setSplash(false);
   } catch {
    localStorage.removeItem("papachos_session_user");
   }
  }

  API.auth.me()
   .then((res) => {
    if (cancelled) return;
    const restored = buildSessionUser(res.usuario);
    setCurrentUser(restored);
    localStorage.setItem("papachos_session_user", JSON.stringify(restored));
    setSplash(false);
   })
   .catch(() => {
    if (cancelled) return;
    localStorage.removeItem("token");
    localStorage.removeItem("papachos_session_user");
    setCurrentUser(null);
   })
   .finally(() => {
    if (!cancelled) setRestoringSession(false);
   });

  return () => { cancelled = true; };
 }, []);

 // ── Anti-double-cobro guard ─────────────────────────────────────────
 useEffect(() => {
  if (!splash || currentUser || restoringSession) return undefined;
  const timer = setTimeout(() => setSplash(false), 1600);
  return () => clearTimeout(timer);
 }, [splash, currentUser, restoringSession]);

 const cobrarProcessingRef = useRef(false);

 // ── Hook principal — reemplaza todos los onSnapshot de Firestore ────
 const {
  orders,
  history,
  menu,
  configData,
  mesasArr,
  solicitudesData: solicitudes,
  staffData:  staff,
  cajaData:   caja,
  loaded,
  loadError,
  refreshOrders,
  refreshHistory,
  refreshMenu,
  refreshMesas,
  refreshSolicitudes,
  refreshStaff,
  refreshCaja,
 } = useAppData(currentUser);
 const allCats = [...new Set(menu.map(i => i.cat).filter(Boolean))];
 const beverageCategories = getBeverageCategories(configData);
 const firstMenuCat = allCats[0] || "Sin categoria";

 // ordersRef — siempre actualizado para evitar stale closures
 const ordersRef = useRef([]);
 useEffect(() => { ordersRef.current = orders; }, [orders]);

 const cajaRef2 = useRef(null);
 useEffect(() => { cajaRef2.current = caja; }, [caja]);

 const showToast = (msg,color="#27ae60") => { setToast({msg,color}); setTimeout(()=>setToast(null),2800); };
 const updateCurrentUserAuthFlags = useCallback((patch) => {
  setCurrentUser(prev => {
   if (!prev) return prev;
   const next = { ...prev, ...patch };
   localStorage.setItem("papachos_session_user", JSON.stringify(next));
   return next;
  });
 }, []);

 const toggleItemCheck = async (order, itemIdx, isFood) => {
  const item = order.items[itemIdx];
  const maxQty = item.qty;
  const checks = order.itemChecks || {};
  let valAnterior = checks[itemIdx];
  if (valAnterior === true) valAnterior = maxQty;
  let next = (Number(valAnterior) || 0) + 1;
  if (next > maxQty) next = 0;
  const newItemChecks = { ...checks, [itemIdx]: next };
  const updatedOrder = { ...order, itemChecks: newItemChecks };
  if (isFood) {
   const nonKitchenCategories = asArray(pickConfig(configData, ["categorias_no_cocina", "nonKitchenCategories"], []));
   const kitchenItems = order.items.filter(i => !nonKitchenCategories.includes(i.cat));
   const isFullyDone = kitchenItems.length > 0 && kitchenItems.every((ki) => {
    const kiIdx = order.items.indexOf(ki);
    let val = (kiIdx === itemIdx) ? next : newItemChecks[kiIdx];
    return Number(val || 0) === ki.qty;
   });
   updatedOrder.kitchenStatus = isFullyDone ? "listo" : "pendiente";
  }
  try {
   await API.pedidos.actualizarChecks(order.id_pedido, {
    idx_item:      itemIdx,
    checks:        newItemChecks,
    kitchen_status: updatedOrder.kitchenStatus,
   });
   await refreshOrders();
  } catch (err) {
   showToast("No se pudo actualizar el check: " + err.message, "#e74c3c");
  }
 };

 // ── Caja ────────────────────────────────────────────────────────────
 const abrirCaja = async (fondoInicial) => {
  try {
   await API.caja.abrir(parseFloat(fondoInicial) || 0);
   await refreshCaja();
   const fecha = new Date().toLocaleDateString("es-PE",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
   const hora  = new Date().toLocaleTimeString("es-PE",{hour:"2-digit",minute:"2-digit"});
   showToast(`🟢 Caja abierta — ${fecha} · ${hora}`, "#27ae60");
  } catch (err) {
   showToast("⚠️ Error al abrir la caja: " + err.message, "#e74c3c");
  }
 };

 const cerrarCaja = async () => {
  try {
   const corte = await API.caja.cerrar();
   await refreshCaja();
   showToast("🔒 Caja cerrada correctamente", "#e67e22");
   return corte;
  } catch (err) {
   showToast("⚠️ Error al cerrar caja: " + err.message, "#e74c3c");
   return null;
  }
 };

 // ── Solicitudes ──────────────────────────────────────────────────────
 const crearSolicitud = async (solicitud) => {
  const existe = solicitudes.find(s =>
   s.estado === "PENDIENTE" &&
   s.tipo === solicitud.type?.toUpperCase() &&
   s.id_pedido === solicitud.orderId
  );
  if (existe) {
   showToast("⚠️ Ya existe una solicitud pendiente para este pedido", "#e67e22");
   return;
  }
  try {
   await API.solicitudes.crear({
    tipo:      solicitud.type?.toUpperCase(),
    id_pedido: solicitud.orderId || null,
    payload:   solicitud,
   });
   await refreshSolicitudes();
   showToast("📨 Solicitud enviada al Administrador", "#8e44ad");
  } catch (err) {
   showToast("⚠️ Error al enviar solicitud: " + err.message, "#e74c3c");
  }
 };

 const resolverSolicitud = async (solId, decision, rejectReason = "") => {
  try {
   await API.solicitudes.resolver(solId, {
    decision:       decision === "aprobada" ? "APROBADO" : "RECHAZADO",
    motivo_rechazo: rejectReason || undefined,
   });
   await refreshSolicitudes();
   if (decision === "aprobada") {
    showToast("✅ Solicitud aprobada y aplicada", "#27ae60");
   } else {
    showToast(`❌ Solicitud rechazada${rejectReason ? ": " + rejectReason : ""}`, "#e74c3c");
   }
  } catch (err) {
   showToast("⚠️ Error al resolver solicitud: " + err.message, "#e74c3c");
  }
 };

 // ── Menú ─────────────────────────────────────────────────────────────
 // ── Staff ────────────────────────────────────────────────────────────
 const createStaffUser = async (body) => {
  const saved = await API.staff.crear(body);
  await refreshStaff();
  return normalizeStaffUser(saved || body);
 };

 const updateStaffUser = async (id, body) => {
  await API.staff.actualizar(id, body);
  await refreshStaff();
 };

const resetStaffPin = async (id, newPin = null) => {
  await API.staff.resetPin(id, newPin);
  await refreshStaff();
 };

 const updateStaffAccess = async (id, body) => {
  const saved = await API.staff.actualizarAcceso(id, body);
  await refreshStaff();
  return normalizeStaffUser(saved || {});
 };

 const deleteStaffUser = async (id) => {
  await API.staff.eliminar(id);
  await refreshStaff();
 };

 // ── Mesas ────────────────────────────────────────────────────────────
 const addMesa = async () => {
  try {
   await API.mesas.agregar();
   await refreshMesas();
   showToast("🪑 Mesa agregada");
  } catch (err) {
   showToast("⚠️ " + err.message, "#e74c3c");
  }
 };

 const removeMesa = async () => {
  if (mesasArr.length === 0) return;
  const lastMesa = mesasArr[mesasArr.length - 1];
  const hasOrders = ordersRef.current.some(o =>
   String(o.table || "").trim() === String(lastMesa) && o.orderType === "mesa"
  );
  if (hasOrders) {
   showToast(`⚠️ La Mesa ${lastMesa} tiene pedidos activos. Cóbrelos primero.`, "#e74c3c");
   return;
  }
  try {
   const mesasRes = await API.mesas.listar();
   const mesa = mesasRes.find(m => m.numero === lastMesa);
   if (mesa) await API.mesas.eliminar(mesa.id_mesa);
   await refreshMesas();
   showToast("🪑 Mesa quitada", "#888");
  } catch (err) {
   showToast("⚠️ " + err.message, "#e74c3c");
  }
 };

 // ── Cocina ───────────────────────────────────────────────────────────
 const markKitchenListo = async (orderId) => {
  try {
   await API.pedidos.actualizarCocina(orderId, "LISTO");
   await refreshOrders();
  } catch (err) {
   showToast("No se pudo actualizar cocina: " + err.message, "#e74c3c");
  }
 };

 const finishPaidOrder = async (id) => {
  try {
  await API.pedidos.finalizar(id);
  await Promise.all([refreshOrders(), refreshHistory()]);
  showToast("✅ Pedido entregado y archivado");
  } catch (err) {
   showToast("No se pudo finalizar el pedido: " + err.message, "#e74c3c");
  }
 };

 const updateHistoryDoc = async () => {};

 const addItem = (item) => setDraft(d => {
 const cartIdToUse = item.cartId || item.id;
 const ex = d.items.find(i => i.cartId === cartIdToUse);
 if (ex) {
 return { ...d, items: d.items.map(i => i.cartId === cartIdToUse ? { ...i, qty: i.qty + 1, individualNotes: [...(i.individualNotes||[]), ""] } : i) };
 }
 return { ...d, items: [...d.items, { ...item, cartId: cartIdToUse, qty: 1, individualNotes: [""] }] };
 });

 const changeQty = (cartId, delta) => setDraft(d => {
 return {
 ...d,
 items: d.items.map(i => {
 if (i.cartId === cartId) {
 const newQty = i.qty + delta;
 let newNotes = [...(i.individualNotes || [])];
 if (delta > 0) newNotes.push("");
 else newNotes.pop();
 return { ...i, qty: newQty, individualNotes: newNotes };
 }
 return i;
 }).filter(i => i.qty > 0)
 };
 });

 const updateIndividualNote = (cartId, idx, note) => setDraft(d => {
 return {
 ...d,
 items: d.items.map(i => {
 if (i.cartId === cartId) {
 const newNotes = [...i.individualNotes];
 newNotes[idx] = note;
 return { ...i, individualNotes: newNotes };
 }
 return i;
 })
 };
 });

 const draftTotal = draft.items.reduce((s,i)=>s+i.price*i.qty,0);

 const mapOrderItemsForApi = (items = []) => items.map(i => ({
  id_producto:     i.id_producto || i.id,
  cantidad:        i.qty,
  precio_unitario: i.price,
  notas_plato:     [
   ...(i.individualNotes?.filter(Boolean) || []),
   ...(i.salsas ? Object.entries(i.salsas).map(([k,v]) => `${k}: ${v}`) : []),
   i._comboNote || "",
   i.notes || "",
  ].filter(Boolean).join(", ") || null,
  es_para_llevar: !!i.isLlevar,
 }));

 // ── Guard: caja debe estar abierta para operar ────────────────────
 const cajaAbierta = !!(caja?.isOpen);
 const submitOrder = async (forceMerge = null) => {
  if (!cajaAbierta) { showToast("🔴 Abre la caja antes de tomar pedidos", "#e74c3c"); return; }
  if (draft.orderType === "mesa" && !draft.table.trim()) return;
  if (!draft.items.length) return;

  const total = draft.items.reduce((s,i) => s + i.price * i.qty, 0);

  // ── MERGE: agregar ítems a pedido existente ──────────────────────
  if (forceMerge === "merge" && mergeModal) {
   const existing = mergeModal.existingOrder;
   try {
    await API.pedidos.agregarItems(existing.id_pedido, {
     items: mapOrderItemsForApi(mergeModal.newDraftData.items),
    });
    await refreshOrders();
    setDraft(newDraft()); setMergeModal(null); setMergeName("");
    showToast(`✅ Ítems agregados a Mesa ${existing.table}`);
    setTab("pedidos");
   } catch (err) {
    showToast("⚠️ Error al agregar ítems: " + err.message, "#e74c3c");
   }
   return;
  }

  // ── PEDIDO NUEVO separado ────────────────────────────────────────
  if (forceMerge === null && mergeModal) { setMergeModal(null); setMergeName(""); }

  // Verificar si ya existe pedido en esa mesa
  const existingMesaOrder = ordersRef.current.find(o =>
   o.table === draft.table?.trim() && o.orderType === "mesa" && !o.isPaid
  ) ?? null;

  if (existingMesaOrder && forceMerge === null && draft.orderType === "mesa") {
   setMergeModal({ existingOrder: existingMesaOrder, newDraftData: { ...draft, total } });
   setMergeName(""); return;
  }

  try {
   await API.pedidos.crear({
    tipo_pedido:           draft.orderType === "mesa" ? "MESA" : "LLEVAR",
    identificador_cliente: draft.orderType === "mesa" ? `Mesa ${draft.table}` : (draft.phone || "Para llevar"),
    notas_generales:       draft.notes || null,
    items:                 mapOrderItemsForApi(draft.items),
   });
   await refreshOrders();
   setDraft(newDraft());
   if (draft.orderType === "llevar") {
    showToast("🥡 Para llevar registrado — esperando cobro", "#3498db");
   } else {
    showToast("✅ Pedido enviado a cocina");
   }
   setTab("pedidos");
  } catch (err) {
   showToast("⚠️ Error al crear pedido: " + err.message, "#e74c3c");
  }
 };

const handleConfirmCobro = async (paymentData) => {
  if (!cobrarTarget) return;
  if (!cajaAbierta) { showToast("🔴 Abre la caja antes de cobrar", "#e74c3c"); setCobrarTarget(null); return; }
  if (cobrarProcessingRef.current) { showToast("⏳ Espera, procesando cobro anterior...", "#e67e22"); return; }
  cobrarProcessingRef.current = true;

  const target = cobrarTarget;
  setCobrarTarget(null);

  const getPrimaryMethod = (p) => {
   if (p.tarjeta > 0) return "TARJETA";
   if (p.yape > 0)    return "YAPE";
   return "EFECTIVO";
  };

  const payments = {
   efectivo: paymentData.efectivo || 0,
   yape:     paymentData.yape     || 0,
   tarjeta:  paymentData.tarjeta  || 0,
  };

  try {
   const id_pedido = target.data?.id_pedido || target.data?.id;
   let comprobanteMsg = "";

   await API.pedidos.cobrar(id_pedido, {
    metodo_pago:      getPrimaryMethod(payments),
    monto:            paymentData.totalFinal || target.data.total,
    descuento_pct:    paymentData.descuentoPct    || 0,
    descuento_motivo: paymentData.descuentoMotivo || "",
    payments,
   });

   if (paymentData.comprobante) {
    try {
     const comprobanteRes = await API.facturacion.emitir({
      id_pedido,
      tipo_comprobante: paymentData.comprobante.tipo_comprobante,
      cliente: paymentData.comprobante.cliente,
      monto_descuento: paymentData.descuentoAmt || 0,
     });
     const serie = comprobanteRes?.comprobante?.serie || comprobanteRes?.ticket?.serie;
     comprobanteMsg = serie ? ` Comprobante ${serie} preparado para SUNAT.` : " Comprobante preparado para SUNAT.";
    } catch (factErr) {
     comprobanteMsg = ` Comprobante pendiente: ${factErr.message}`;
    }
   }

   await Promise.all([refreshOrders(), refreshHistory(), refreshCaja()]);

   setDraft(newDraft());
   showToast(`Pedido cobrado y archivado.${comprobanteMsg}`, comprobanteMsg.includes("pendiente") ? "#e67e22" : "#27ae60");
   setTab("pedidos");
  } catch (err) {
   showToast("⚠️ Error al cobrar: " + err.message, "#e74c3c");
  }

  cobrarProcessingRef.current = false;
 };


 const cancelOrder = async (id) => {
  await API.pedidos.anular(id, { motivo: "Cancelado" });
  await Promise.all([refreshOrders(), refreshHistory()]);
  showToast("🚫 Pedido cancelado","#e74c3c");
 };

 const deleteOrderPermanent = async (id) => {
  await API.pedidos.anular(id, { motivo: "Eliminado" });
  await Promise.all([refreshOrders(), refreshHistory()]);
  setConfirmDelete(null); showToast("🗑 Pedido eliminado","#888");
 };

 // Anulación con reemplazo (solo admin o por solicitud aprobada)
 const anularPedido = async (order, items, motivo, skipSolicitudUpdate = false) => {
  try {
   await API.pedidos.anular(order.id_pedido || order.id, {
    motivo: motivo || "Sin motivo",
    items:  items  || [],
   });
   await Promise.all([refreshOrders(), refreshHistory()]);
   showToast("🗑 Pedido anulado", "#e74c3c");
   setAnulacionModal(null);
  } catch (err) {
   showToast("⚠️ Error al anular: " + err.message, "#e74c3c");
  }
 };

 const saveEditedOrder = async (updated) => {
 try {
 await API.pedidos.actualizar(updated.id_pedido || updated.id, {
  tipo_pedido:           updated.orderType === "mesa" ? "MESA" : "LLEVAR",
  identificador_cliente: updated.orderType === "mesa" ? `Mesa ${updated.table}` : (updated.phone || "Para llevar"),
  notas_generales:       updated.notes || null,
  items:                 mapOrderItemsForApi(updated.items || []),
 });
 await refreshOrders();
 setEditingOrder(null); showToast("✏️ Pedido actualizado","#f39c12");
 } catch (err) {
  showToast("No se pudo actualizar el pedido: " + err.message, "#e74c3c");
 }
 };

 const addMenuItem = async () => {
 if (!newItem.name.trim()||!newItem.price) return;
 const body = { nombre:newItem.name.trim(), cat:newItem.cat || firstMenuCat, precio:parseFloat(newItem.price), desc:"" };
 try {
  await API.menu.agregarItem(body);
  await refreshMenu();
  setNewItem({name:"",cat:firstMenuCat,price:""}); setShowAdd(false);
  showToast(`"${body.nombre}" agregado`);
 } catch (err) {
  showToast("Error al agregar platillo: " + err.message, "#e74c3c");
 }
 };
 const deleteMenuItem = async (id) => {
 try {
  await API.menu.eliminarItem(id);
  await refreshMenu();
  showToast("Platillo eliminado", "#e74c3c");
 } catch (err) {
  showToast("Error al eliminar platillo: " + err.message, "#e74c3c");
 }
 };

 const Y = "#FFD700";
 const [sidebarOpen, setSidebarOpen] = useState(!isMobile);

 const s = {
 app: {fontFamily:"'Nunito',sans-serif",background:"radial-gradient(circle at 20% 0%,#1b1b14 0,#0f0f0f 34%,#080808 100%)",color:"#eee",minHeight:"100vh",display:"flex",flexDirection:"row",overflow:"hidden"},
 
 header: {
   background:`linear-gradient(135deg,#fff3a0 0%,${Y} 34%,#c99a00 100%)`,
   color:"#111",
   padding:isMobile?"8px 12px":"0 20px", // Quitamos el padding vertical para centrar con flex
   display:"flex",
   alignItems:"center",
   justifyContent:"space-between",
   boxShadow:"0 8px 24px rgba(0,0,0,.35), 0 0 18px rgba(255,215,0,.28)", 
   position:"fixed", 
   top:0, left:0, right:0, 
   zIndex:1000, 
   height: 60, // Fijamos altura a 60px
   boxSizing: "border-box" // Crucial para que no se expanda
 },
 
 sidebar: (open) => ({
  width: open ? (isMobile ? "100vw" : 220) : (isMobile ? 0 : 64),
  minWidth: open ? (isMobile ? "100vw" : 220) : (isMobile ? 0 : 64),
  background:"linear-gradient(180deg,#121212 0%,#0b0b0b 100%)",
  borderRight:"1px solid #26210a",
  display:"flex", flexDirection:"column",
  transition:"width .22s cubic-bezier(.4,0,.2,1), min-width .22s cubic-bezier(.4,0,.2,1)",
  overflow:"hidden", flexShrink:0,
  position: isMobile ? "fixed" : "relative",
  top: isMobile ? 60 : 0, left:0, // Actualizado a 60
  height: isMobile ? "calc(100vh - 60px)" : "100%", // Actualizado a 60
  zIndex: isMobile ? 990 : 1,
  paddingTop: isMobile ? 0 : 60, // Actualizado a 60 para coincidir con el header
 }),
 
 navBtn: (active) => ({
  display:"flex", alignItems:"center", gap:12,
  padding: sidebarOpen ? "11px 18px" : "11px 0",
  justifyContent: sidebarOpen ? "flex-start" : "center",
  background: active ? `${Y}18` : "transparent",
  color: active ? Y : "#777",
  border:"none", borderLeft: active ? `3px solid ${Y}` : "3px solid transparent",
  cursor:"pointer", fontFamily:"'Nunito',sans-serif", fontWeight: active ? 800 : 600,
  fontSize:13, whiteSpace:"nowrap", transition:"all .15s", width:"100%",
  letterSpacing:0.3,
  boxShadow: active ? `inset 0 0 0 1px ${Y}22` : "none",
 }),
 
 content: {
   flex:1, 
   padding:isMobile?"10px 8px":isTablet?14:20, 
   maxWidth:isWide?1200:"100%", 
   margin:"0 auto", 
   width:"100%", 
   boxSizing:"border-box", 
   overflow:"auto", 
   marginTop:60 // Actualizado a 60 para que no choque con el header
 },
 card: {background:"linear-gradient(180deg,#202020 0%,#181818 100%)",borderRadius:8,padding:isMobile?10:14,marginBottom:10,border:"1px solid #303030",boxShadow:"0 10px 24px rgba(0,0,0,.22)"},
 cardHL: {background:"linear-gradient(180deg,#202018 0%,#181818 100%)",borderRadius:8,padding:isMobile?10:14,marginBottom:10,border:`1px solid ${Y}55`,boxShadow:`0 0 0 1px ${Y}11, 0 12px 26px rgba(0,0,0,.28)`},
 statCard:{background:"linear-gradient(180deg,#202020 0%,#171717 100%)",borderRadius:8,padding:isMobile?"12px 8px":"16px 12px",border:"1px solid #303030",textAlign:"center",boxShadow:"0 8px 18px rgba(0,0,0,.22)"},
 statNum: {fontSize:isMobile?22:28,fontWeight:900,color:Y,lineHeight:1},
 statLbl: {fontSize:isMobile?9:11,color:"#777",marginTop:5,textTransform:"uppercase",letterSpacing:1},
 btn: (v="primary")=>({padding:isMobile?"7px 10px":"8px 14px",background:v==="primary"?`linear-gradient(135deg,#fff176 0%,${Y} 52%,#caa300 100%)`:v==="danger"?"linear-gradient(135deg,#e74c3c,#922b21)":v==="success"?"linear-gradient(135deg,#2ecc71,#1e8449)":v==="blue"?"linear-gradient(135deg,#3498db,#1f618d)":v==="warn"?"linear-gradient(135deg,#f39c12,#a04000)":"linear-gradient(180deg,#333,#242424)",color:v==="primary"?"#111":"#fff",border:v==="primary"?`1px solid ${Y}`:"1px solid #3a3a3a",borderRadius:8,cursor:"pointer",fontWeight:800,fontSize:isMobile?11:12,fontFamily:"'Nunito',sans-serif",transition:"opacity .15s, transform .15s, border-color .15s",whiteSpace:"nowrap",boxShadow:v==="primary"?`0 0 12px ${Y}33`:"0 5px 14px rgba(0,0,0,.18)"}),
 input: {background:"linear-gradient(180deg,#252525,#1d1d1d)",border:"1px solid #444",borderRadius:8,padding:isMobile?"8px 10px":"9px 12px",color:"#eee",fontFamily:"'Nunito',sans-serif",fontSize:13,outline:"none",width:"100%",boxSizing:"border-box",boxShadow:"inset 0 1px 0 rgba(255,255,255,.04)"},
 tag: (bg, col)=>({display:"inline-block",padding:"2px 8px",borderRadius:10,fontSize:11,fontWeight:700,background:bg,color:col||"#eee"}),
 grid: (cols)=>({display:"grid",gridTemplateColumns:`repeat(auto-fit, minmax(${cols}px,1fr))`,gap:isMobile?8:10}),
 row: {display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8},
 title: {color:Y,fontFamily:"'Bebas Neue',cursive",fontSize:isMobile?18:22,marginBottom:isMobile?10:14,letterSpacing:1},
 overlay: {position:"fixed",inset:0,background:"rgba(0,0,0,.88)",zIndex:2000,display:"flex",alignItems:isMobile?"flex-end":"center",justifyContent:"center",padding:isMobile?0:16},
 modal: {background:"linear-gradient(180deg,#202020 0%,#171717 100%)",border:`1px solid ${Y}44`,borderRadius:isMobile?"14px 14px 0 0":10,padding:isMobile?"16px 12px 20px":20,width:"100%",maxWidth:isMobile?"100%":600,maxHeight:isMobile?"88vh":"85vh",overflowY:"auto",position:"relative",boxShadow:"0 24px 80px rgba(0,0,0,.55)"},
 };

 if (restoringSession && localStorage.getItem("token")) return <ErrorBoundary><div style={{background:"#111",color:"#FFD700",height:"100vh",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900}}>Restaurando sesión...</div></ErrorBoundary>;

 if (splash) return (
 <ErrorBoundary>
 <>
 <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Nunito:wght@400;700;900&display=swap" rel="stylesheet"/>
 <LandingScreen onEnter={() => setSplash(false)} Y={Y} isMobile={isMobile} />
 </>
 </ErrorBoundary>
 );

 if (!currentUser) return <ErrorBoundary><LoginScreen onLogin={(user) => {
   setCurrentUser(user);
   localStorage.setItem("papachos_session_user", JSON.stringify(user));
   const startTab = hasRole(user, "admin") ? "dashboard"
    : hasRole(user, "cocinero") ? "cocina"
    : hasRole(user, "cajero") ? "pedidos"
    : "mesas";
   setTab(startTab);
  }} s={s} Y={Y} isMobile={isMobile} /></ErrorBoundary>;
 if (currentUser.needsAliasSetup || currentUser.needsBiometricSetup) {
  return <ErrorBoundary><AuthSetupModal currentUser={currentUser} onUpdate={updateCurrentUserAuthFlags} s={s} Y={Y} isMobile={isMobile} /></ErrorBoundary>;
 }
 if (!loaded) return <ErrorBoundary><div style={{background:"#111",color:"#FFD700",height:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{textAlign:"center"}}><div style={{marginTop:12,fontWeight:700,letterSpacing:2}}>Cargando Sucursal...</div></div></div></ErrorBoundary>;

 const pendingSols = solicitudes.filter(x => String(x.status || x.estado || "").toLowerCase() === "pendiente").length;
 const allTabs = [
 {id:"dashboard",    label:"Inicio"},
 {id:"mesas",        label:"Mesas"},
 {id:"nuevo",        label:"Nuevo"},
 {id:"pedidos",      label:`Pedidos${orders.filter(o=>!o.anulado).length>0?" ("+orders.filter(o=>!o.anulado).length+")":""}` },
 {id:"cocina",       label:`Cocina${orders.filter(o=>o.kitchenStatus!=='listo'&&!o.anulado).length>0?" ("+orders.filter(o=>o.kitchenStatus!=='listo'&&!o.anulado).length+")":""}` },
 {id:"solicitudes",  label: hasRole(currentUser, "admin")
  ? `Solicitudes${pendingSols>0?" ("+pendingSols+")":""}` 
  : `Mis Solicitudes` },
 {id:"requerimientos", label:"Requerimientos"},
 {id:"historial",    label:"Historial"},
 {id:"reportes",     label:"Reportes"},
 {id:"inventario",   label:"Inventario"},
 {id:"carta",        label:"Carta"},
 {id:"personal",     label:"Personal"},
 ];

 const tabs = allTabs.filter(t => {
 if (hasRole(currentUser, "admin")) return true;
 const allowed = new Set();
 if (hasRole(currentUser, "cajero")) ['dashboard','pedidos','historial','reportes','solicitudes'].forEach(id => allowed.add(id));
 if (hasRole(currentUser, "mesero")) ['mesas','nuevo','pedidos','solicitudes'].forEach(id => allowed.add(id));
 if (hasRole(currentUser, "cocinero")) ['cocina','requerimientos'].forEach(id => allowed.add(id));
 return allowed.has(t.id);
 });

 // Badge en el tab solicitudes (llamar atención al admin)
 const myPendingSols = solicitudes.filter(x => String(x.status || x.estado || "").toLowerCase() === "pendiente" && ((x.requestedBy || x.id_usuario_origen) === currentUser.userId || (x.requestedBy || x.id_usuario_origen) === currentUser.id)).length;
 const SolBadge = pendingSols > 0 && hasRole(currentUser, "admin")
  ? null  // shown directly in header as 🔔 button — no floating badge needed
  : myPendingSols > 0 && !hasRole(currentUser, "admin")
  ? <div style={{position:"fixed",top:56,right:8,background:"#8e44ad",color:"#fff",borderRadius:12,padding:"2px 8px",fontSize:11,fontWeight:900,zIndex:1900,boxShadow:"0 2px 8px rgba(0,0,0,.5)"}}>⏳ {myPendingSols} solicitud{myPendingSols>1?"es":""} en revisión</div>
  : null;

 return (
 <ErrorBoundary>
 <>
 <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Nunito:wght@400;700;900&display=swap" rel="stylesheet"/>
 {SolBadge}
 <div style={s.app}>

 {/* ── HEADER fixed top bar ── */}
 <header style={s.header}>
  <div style={{display:"flex", alignItems:"center", gap:12}}>
   <button onClick={()=>setSidebarOpen(v=>!v)}
    style={{background:"transparent",border:"none",cursor:"pointer",padding:"4px 6px",display:"flex",flexDirection:"column",gap:4,flexShrink:0,zIndex:1}}>
    <span style={{display:"block",width:20,height:2,background:"#111",borderRadius:2,transition:"all .2s"}}/>
    <span style={{display:"block",width:14,height:2,background:"#111",borderRadius:2,transition:"all .2s"}}/>
    <span style={{display:"block",width:20,height:2,background:"#111",borderRadius:2,transition:"all .2s"}}/>
   </button>
   <h1 style={{fontFamily:"'Bebas Neue',cursive",fontSize:isMobile?16:22,letterSpacing:2,margin:0,color:"#111"}}>
    MR. PAPACHOS
   </h1>
   {!isMobile && <span style={{fontSize:10,color:"#333",fontWeight:700}}>· {currentUser.localName.toUpperCase()}</span>}
  </div>
  <div style={{display:"flex", gap:8, alignItems:"center"}}>
   {!isMobile && <span style={{fontSize:11,color:"#333",fontWeight:700}}>{currentUser.name} · {currentUser.label}</span>}
   {hasRole(currentUser, "admin") && pendingSols > 0 && (
    <button style={{background:"#e74c3c",color:"#fff",border:"none",borderRadius:8,padding:"4px 10px",fontWeight:900,fontSize:11,cursor:"pointer"}} onClick={()=>setTab("solicitudes")}>
     🔔 {pendingSols}
    </button>
   )}
   <button style={{background:"#c0392b",color:"#fff",border:"none",borderRadius:8,padding:"4px 10px",fontWeight:800,fontSize:11,cursor:"pointer"}} onClick={()=>{ localStorage.removeItem("token"); localStorage.removeItem("papachos_session_user"); setCurrentUser(null); }}>Salir</button>
  </div>
 </header>

 {/* Mobile backdrop */}
 {isMobile && sidebarOpen && <div style={{position:"fixed",inset:0,top:50,background:"rgba(0,0,0,.7)",zIndex:989}} onClick={()=>setSidebarOpen(false)}/>}

 <div style={s.sidebar(sidebarOpen)}>
  {/* Branding strip inside sidebar */}
  {!isMobile && (
   <div style={{padding: sidebarOpen ? "14px 18px 10px" : "14px 0 10px", textAlign: sidebarOpen?"left":"center", borderBottom:"1px solid #1e1e1e", flexShrink:0}}>
    {sidebarOpen
     ? <div style={{fontSize:11, color:"#444", textTransform:"uppercase", letterSpacing:1, fontWeight:700}}>{currentUser.name}<br/><span style={{color:"#333"}}>{currentUser.label}</span></div>
     : <div style={{width:8,height:8,borderRadius:"50%",background: caja?.isOpen ? "#27ae60":"#e74c3c",margin:"0 auto"}}/>
    }
   </div>
  )}

  <div style={{overflowY:"auto", flex:1, paddingTop:8, paddingBottom:isMobile?80:24}}>
  {tabs.map(t => {
   const icons = {dashboard:"🏠",mesas:"🍽",nuevo:"➕",pedidos:"📋",cocina:"👨‍🍳",solicitudes:"📨",requerimientos:"🧾",historial:"📅",reportes:"📊",inventario:"📦",carta:"📖",personal:"👥"};
   const hasCount = t.label.includes("(");
   const labelClean = t.label.replace(/\s*\(.*\)/, "");
   const count = hasCount ? t.label.match(/\((\d+)\)/)?.[1] : null;
   return (
    <button key={t.id} style={s.navBtn(tab===t.id)}
     onClick={()=>{ setTab(t.id); if(isMobile) setSidebarOpen(false); }}>
     <span style={{fontSize:18, flexShrink:0, width:22, textAlign:"center"}}>{icons[t.id]||"·"}</span>
     {sidebarOpen && (
      <span style={{display:"flex", alignItems:"center", gap:8, minWidth:0}}>
       <span style={{overflow:"hidden", textOverflow:"ellipsis"}}>{labelClean}</span>
       {count && <span style={{background:tab===t.id?"#e74c3c":`${Y}22`,color:tab===t.id?"#fff":Y,borderRadius:10,padding:"1px 7px",fontSize:10,fontWeight:900,flexShrink:0}}>{count}</span>}
      </span>
     )}
    </button>
   );
  })}
  </div>

  {/* Caja status strip at bottom */}
  {sidebarOpen && (
   <div style={{padding:"10px 18px",borderTop:"1px solid #1e1e1e",flexShrink:0}}>
    <div style={{display:"flex",alignItems:"center",gap:8}}>
     <div style={{width:8,height:8,borderRadius:"50%",background:caja?.isOpen?"#27ae60":"#e74c3c",flexShrink:0}}/>
     <span style={{fontSize:11,color:caja?.isOpen?"#27ae60":"#e74c3c",fontWeight:700}}>{caja?.isOpen?"Caja abierta":"Caja cerrada"}</span>
    </div>
    {!isMobile && <div style={{fontSize:10,color:"#333",marginTop:2}}>{new Date().toLocaleDateString("es-PE",{weekday:"short",day:"numeric",month:"short"})}</div>}
   </div>
  )}
 </div>

 {/* ── MAIN CONTENT ── */}
 <div style={{flex:1, display:"flex", flexDirection:"column", minWidth:0}}>
  <div style={s.content}>

  {toast&&(<div style={{position:"fixed",bottom:isMobile ? 90 : 20,left:"50%",transform:"translateX(-50%)",background:toast.color,color:"#fff",padding:"10px 20px",borderRadius:12,fontWeight:800,zIndex:9999,fontSize:14,boxShadow:"0 4px 20px rgba(0,0,0,.5)",whiteSpace:"nowrap"}}>{toast.msg}</div>)}
  {loadError&&(<div style={{background:"#3a1c1c",border:"1px solid #e74c3c55",color:"#ffb4a8",padding:"8px 12px",borderRadius:8,marginBottom:12,fontSize:12,fontWeight:700}}>Backend: {loadError.message || "No se pudieron cargar todos los datos"}</div>)}

  {cobrarTarget && <div style={s.overlay} onClick={()=>setCobrarTarget(null)}><CobrarModal orderContext={cobrarTarget.data} total={cobrarTarget.data.total} onConfirm={handleConfirmCobro} onClose={()=>setCobrarTarget(null)} s={s} Y={Y} /></div>}
  {splitTarget && <SplitBillModal order={splitTarget} onProceed={(items, total) => { setCobrarTarget({ type: 'split', data: { originalOrder: splitTarget, splitItems: items, total }}); setSplitTarget(null); }} onClose={() => setSplitTarget(null)} s={s} Y={Y} fmt={fmt} />}
  {editingOrder&&<div style={s.overlay} onClick={()=>setEditingOrder(null)}><EditOrderModal order={editingOrder} onSave={saveEditedOrder} onClose={()=>setEditingOrder(null)} menu={menu} appConfig={configData} isMobile={isMobile} s={s} Y={Y} isAdmin={hasRole(currentUser, "admin")} currentUser={currentUser} onRequestPrecio={crearSolicitud}/></div>}
  {mesaModal&&<div style={s.overlay} onClick={()=>setMesaModal(null)}><MesaModalComponent num={mesaModal} orders={orders} setDraft={setDraft} newDraft={newDraft} onClose={()=>setMesaModal(null)} setTab={setTab} setCobrarTarget={setCobrarTarget} setSplitTarget={setSplitTarget} setEditingOrder={setEditingOrder} setAnulacionModal={setAnulacionModal} printOrder={printOrder} isMobile={isMobile} s={s} Y={Y} fmt={fmt} currentUser={currentUser} crearSolicitud={crearSolicitud} isAdmin={hasRole(currentUser, "admin")} /></div>}
  
  {mergeModal && (
  <div style={s.overlay} onClick={() => setMergeModal(null)}>
  <div style={{...s.modal, maxWidth:400}} onClick={e => e.stopPropagation()}>
  <div style={{fontSize:36, textAlign:"center", marginBottom:10}}></div>
  <div style={{fontWeight:900, fontSize:18, marginBottom:6, color:Y, textAlign:"center", fontFamily:"'Bebas Neue',cursive", letterSpacing:1}}>MESA {mergeModal.existingOrder.table} YA TIENE PEDIDO</div>
  <div style={{color:"#aaa", fontSize:13, textAlign:"center", marginBottom:16}}>{mergeModal.newDraftData.orderType === "llevar" ? <>¿Deseas <b style={{color:"#3498db"}}>acoplar este pedido Para Llevar</b> a la mesa?</> : "¿Qué quieres hacer con los nuevos ítems?"}</div>
  {mergeModal.newDraftData.orderType === "llevar" && <div style={{marginBottom:14}}><input style={{...s.input, borderColor:"#3498db"}} placeholder="Nombre (Ej: Juan)" value={mergeName} onChange={e => setMergeName(e.target.value)} spellCheck="false" /></div>}
  <div style={{background:"#111", borderRadius:8, padding:10, marginBottom:12, border:"1px solid #2a2a2a"}}><div style={{fontSize:11, color:"#666", textTransform:"uppercase", letterSpacing:1, marginBottom:6}}>Pedido existente</div>{(mergeModal.existingOrder.items||[]).map((item,i) => (<div key={i} style={{display:"flex", justifyContent:"space-between", fontSize:12, color:"#888", padding:"2px 0"}}><span>{item.qty}x {item.name}</span><span>{fmt(item.price * item.qty)}</span></div>))}<div style={{borderTop:"1px solid #2a2a2a", marginTop:6, paddingTop:6, display:"flex", justifyContent:"space-between", fontWeight:900, fontSize:13}}><span>Subtotal</span><span style={{color:Y}}>{fmt(mergeModal.existingOrder.total)}</span></div></div>
  <div style={{background:"#0a1f0a", borderRadius:8, padding:10, marginBottom:16, border:"1px solid #27ae6044"}}><div style={{fontSize:11, color:"#27ae60", textTransform:"uppercase", letterSpacing:1, marginBottom:6}}>{mergeModal.newDraftData.orderType === "llevar" ? " Ítems Para Llevar a agregar" : "Nuevos ítems a agregar"}</div>{(mergeModal.newDraftData.items||[]).map((item,i) => (<div key={i} style={{display:"flex", justifyContent:"space-between", fontSize:12, color:"#aaa", padding:"2px 0"}}><span>{item.qty}x {item.name}</span><span>{fmt(item.price * item.qty)}</span></div>))}<div style={{borderTop:"1px solid #27ae6033", marginTop:6, paddingTop:6, display:"flex", justifyContent:"space-between", fontWeight:900, fontSize:13}}><span style={{color:"#27ae60"}}>+ Subtotal</span><span style={{color:"#27ae60"}}>{fmt(mergeModal.newDraftData.items.reduce((s,i)=>s+i.price*i.qty,0))}</span></div></div>
  <div style={{display:"flex", flexDirection:"column", gap:8}}><button style={{...s.btn("success"), padding:14, fontSize:14, width:"100%"}} onClick={() => submitOrder("merge")}> Agregar al pedido existente<div style={{fontSize:11, fontWeight:400, marginTop:2, opacity:0.8}}>Total: {fmt(mergeModal.existingOrder.total + mergeModal.newDraftData.items.reduce((s,i)=>s+i.price*i.qty,0))}</div></button><button style={{...s.btn("blue"), padding:12, fontSize:13, width:"100%"}} onClick={() => submitOrder("new")}> Crear pedido separado para Mesa {mergeModal.existingOrder.table}</button><button style={{...s.btn("secondary"), padding:10, fontSize:12, width:"100%"}} onClick={() => setMergeModal(null)}> Cancelar</button></div>
  </div>
  </div>
  )}

  {anulacionModal && (
  <div style={s.overlay} onClick={() => setAnulacionModal(null)}>
  <AnulacionModal order={anulacionModal}
   isAdmin={hasRole(currentUser, "admin")}
   currentUser={currentUser}
   onConfirm={(items, motivo) => anularPedido(anulacionModal, items, motivo)}
   onRequest={(sol) => crearSolicitud(sol)}
   onClose={() => setAnulacionModal(null)} menu={menu} s={s} Y={Y} fmt={fmt} />
  </div>
  )}

  {confirmDelete&&<div style={s.overlay} onClick={()=>setConfirmDelete(null)}><div style={{...s.modal,maxWidth:340,textAlign:"center"}} onClick={e=>e.stopPropagation()}><div style={{fontSize:42,marginBottom:12}}></div><div style={{fontWeight:900,fontSize:17,marginBottom:8,color:"#eee"}}>¿Eliminar pedido?</div><div style={{color:"#888",fontSize:13,marginBottom:20}}>Esta acción no se puede deshacer.</div><div style={{display:"flex",gap:10}}><button style={{...s.btn("secondary"),flex:1}} onClick={()=>setConfirmDelete(null)}>Cancelar</button><button style={{...s.btn("danger"),flex:1}} onClick={()=>deleteOrderPermanent(confirmDelete)}> Eliminar</button></div></div></div>}

  {tab==="dashboard" && <DashboardComponent orders={orders} history={history} fmt={fmt} setTab={setTab} finishPaidOrder={finishPaidOrder} setCobrarTarget={setCobrarTarget} isMobile={isMobile} s={s} Y={Y} caja={caja} abrirCaja={abrirCaja} cerrarCaja={cerrarCaja} currentUser={currentUser} getPay={getPay} soundConfig={soundConfig} setSoundConfig={setSoundConfig} />}
  {tab==="mesas" && <MesasComponent orders={orders} setDraft={setDraft} newDraft={newDraft} setTab={setTab} setMesaModal={setMesaModal} finishPaidOrder={finishPaidOrder} setCobrarTarget={setCobrarTarget} setSplitTarget={setSplitTarget} setEditingOrder={setEditingOrder} printOrder={printOrder} cancelOrder={cancelOrder} setAnulacionModal={setAnulacionModal} isMobile={isMobile} isTablet={isTablet} s={s} Y={Y} fmt={fmt} mesasArr={mesasArr} addMesa={addMesa} removeMesa={removeMesa} currentUser={currentUser} />}
  {tab==="nuevo" && <NuevoPedidoComponent draft={draft} setDraft={setDraft} menu={menu} appConfig={configData} addItem={addItem} changeQty={changeQty} updateIndividualNote={updateIndividualNote} draftTotal={draftTotal} fmt={fmt} submitOrder={submitOrder} newDraft={newDraft} s={s} Y={Y} isDesktop={isDesktop} isMobile={isMobile} isTablet={isTablet} mesasArr={mesasArr} cajaAbierta={cajaAbierta} currentUser={currentUser} />}
  {tab==="pedidos" && <PedidosComponent orders={orders} toggleItemCheck={toggleItemCheck} setTab={setTab} finishPaidOrder={finishPaidOrder} setCobrarTarget={setCobrarTarget} setSplitTarget={setSplitTarget} setEditingOrder={setEditingOrder} printOrder={printOrder} cancelOrder={cancelOrder} setConfirmDelete={setConfirmDelete} setAnulacionModal={setAnulacionModal} currentUser={currentUser} isMobile={isMobile} s={s} Y={Y} fmt={fmt} beverageCategories={beverageCategories} />}
{tab==="cocina" && <CocinaComponent orders={orders} toggleItemCheck={toggleItemCheck} markKitchenListo={markKitchenListo} isMobile={isMobile} isDesktop={isDesktop} s={s} Y={Y} soundConfig={soundConfig} />}
  {tab==="historial"    && <HistorialComponent history={history} activeOrders={orders} isMobile={isMobile} s={s} Y={Y} fmt={fmt} getPay={getPay} printOrder={printOrder} isAdmin={hasRole(currentUser, "admin")} currentUser={currentUser} crearSolicitud={crearSolicitud} updateHistoryDoc={updateHistoryDoc} />}
  {tab==="reportes"     && <ReportesComponent s={s} Y={Y} fmt={fmt} isAdmin={hasRole(currentUser, "admin")} />}
  {tab==="inventario"   && <Inventario menu={menu} orders={orders} history={history} isMobile={isMobile} s={s} Y={Y} fmt={fmt}/>}
  {tab==="carta"        && <CartaComponent menu={menu} cartaCatFilter={cartaCatFilter} setCartaCatFilter={setCartaCatFilter} showAdd={showAdd} setShowAdd={setShowAdd} newItem={newItem} setNewItem={setNewItem} addMenuItem={addMenuItem} deleteMenuItem={deleteMenuItem} isMobile={isMobile} s={s} Y={Y} fmt={fmt} ALL_CATS={allCats} />}
  {tab==="solicitudes"  && <SolicitudesPanel solicitudes={solicitudes} onResolve={resolverSolicitud} currentUser={currentUser} isMobile={isMobile} s={s} Y={Y} fmt={fmt} updateHistoryDoc={updateHistoryDoc} />}
  {tab==="requerimientos" && <RequerimientosComponent currentUser={currentUser} isMobile={isMobile} s={s} Y={Y} />}
  {tab==="personal"     && <StaffManager staff={staff} onCreateStaff={createStaffUser} onUpdateStaff={updateStaffUser} onUpdateAccess={updateStaffAccess} onResetPin={resetStaffPin} onDeleteStaff={deleteStaffUser} isMobile={isMobile} s={s} Y={Y} localName={currentUser?.localName} currentLocalId={currentUser?.localId} />}

  </div>
 </div>

 </div>
 </>
 </ErrorBoundary>
 )
}
