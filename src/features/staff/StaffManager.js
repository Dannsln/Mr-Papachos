import { useEffect, useState } from "react";
import * as API from "../../api";
const ROLE_INFO = { admin:{label:"Administrador",color:"#FFD700"}, cajero:{label:"Cajero",color:"#3498db"}, mesero:{label:"Atención al cliente",color:"#27ae60"}, cocinero:{label:"Cocina",color:"#e67e22"} };

function EditUserInline({ user, allRoles, allLocales = [], toggleRole, onUpdateRoles, onUpdateName, onUpdateDni, onUpdateLocales, onUpdateAccess, onResetPin, onDelete, s, Y }) {
 const [editingName, setEditingName] = useState(false);
 const [nameVal, setNameVal] = useState(user.name);
 const [editingDni, setEditingDni] = useState(false);
 const [dniVal, setDniVal] = useState(user.numero_documento || "");
 const selectedLocales = (user.locales || []).map(l => Number(l.id_local));
 const toggleLocal = (idLocal) => {
  const next = selectedLocales.includes(idLocal)
   ? selectedLocales.filter(id => id !== idLocal)
   : [...selectedLocales, idLocal];
  if (next.length) onUpdateLocales(user.id, next);
 };

 return (
  <div style={{borderTop:"1px solid #2a2a2a", paddingTop:10}}>
   {/* Nombre editable */}
   <div style={{marginBottom:10}}>
    <div style={{fontSize:11, color:"#888", marginBottom:5, textTransform:"uppercase", letterSpacing:1}}>Nombre</div>
    {editingName ? (
     <div style={{display:"flex", gap:6}}>
      <input style={{...s.input, flex:1, fontSize:13, padding:"6px 10px"}}
       value={nameVal} onChange={e => setNameVal(e.target.value)}
       onKeyDown={e => { if(e.key==="Enter"){ onUpdateName(user.id, nameVal.trim()||user.name); setEditingName(false); } if(e.key==="Escape") setEditingName(false); }}
       autoFocus spellCheck="false" />
      <button style={{...s.btn("success"), padding:"6px 12px", fontSize:12}}
       onClick={() => { onUpdateName(user.id, nameVal.trim()||user.name); setEditingName(false); }}>✓</button>
      <button style={{...s.btn("secondary"), padding:"6px 10px", fontSize:12}}
       onClick={() => { setNameVal(user.name); setEditingName(false); }}>✕</button>
     </div>
    ) : (
     <div style={{display:"flex", alignItems:"center", gap:8}}>
      <span style={{fontSize:14, fontWeight:700, color:"#eee"}}>{user.name}</span>
      <button style={{...s.btn("secondary"), padding:"2px 8px", fontSize:10}}
       onClick={() => setEditingName(true)}>✏️ Editar</button>
     </div>
    )}
   </div>

   <div style={{marginBottom:10}}>
    <div style={{fontSize:11, color:"#888", marginBottom:5, textTransform:"uppercase", letterSpacing:1}}>Usuario automático</div>
    <div style={{fontSize:13, color:Y, fontWeight:900}}>{user.codigo_usuario || user.id}</div>
    <div style={{display:"flex", gap:6, marginTop:8, flexWrap:"wrap"}}>
     <button style={{...s.btn("secondary"), padding:"4px 9px", fontSize:10}} onClick={() => navigator.clipboard?.writeText(user.codigo_usuario || String(user.id))}>Copiar</button>
     <button style={{...s.btn("warn"), padding:"4px 9px", fontSize:10}} onClick={() => onUpdateAccess(user.id, { regenerar_codigo:true })}>Regenerar</button>
    </div>
    <div style={{display:"flex", gap:6, marginTop:8, flexWrap:"wrap"}}>
     <span style={{fontSize:10, fontWeight:900, color:user.tiene_nombre_clave ? "#27ae60" : "#e67e22", background:user.tiene_nombre_clave ? "#092414" : "#2a1a00", borderRadius:8, padding:"3px 7px"}}>
      {user.tiene_nombre_clave ? "Nombre en clave listo" : "Falta nombre en clave"}
     </span>
     <span style={{fontSize:10, fontWeight:900, color:user.biometria_registrada ? "#27ae60" : "#e67e22", background:user.biometria_registrada ? "#092414" : "#2a1a00", borderRadius:8, padding:"3px 7px"}}>
      {user.biometria_registrada ? "Huella lista" : "Falta huella"}
     </span>
    </div>
    <div style={{display:"flex", gap:6, marginTop:8, flexWrap:"wrap"}}>
     <button style={{...s.btn("secondary"), padding:"4px 9px", fontSize:10}} onClick={() => onUpdateAccess(user.id, { regenerar_codigo:false, reset_nombre_clave:true })}>Reset nombre en clave</button>
     <button style={{...s.btn("secondary"), padding:"4px 9px", fontSize:10}} onClick={() => onUpdateAccess(user.id, { regenerar_codigo:false, reset_biometria:true })}>Reset huella</button>
    </div>
   </div>

   <div style={{marginBottom:10}}>
    <div style={{fontSize:11, color:"#888", marginBottom:5, textTransform:"uppercase", letterSpacing:1}}>DNI</div>
    {editingDni ? (
     <div style={{display:"flex", gap:6}}>
      <input style={{...s.input, flex:1, fontSize:13, padding:"6px 10px"}}
       value={dniVal} onChange={e => setDniVal(e.target.value.replace(/\D/g,"").slice(0,15))}
       onKeyDown={e => { if(e.key==="Enter"){ onUpdateDni(user.id, dniVal.trim()); setEditingDni(false); } if(e.key==="Escape") setEditingDni(false); }}
       autoFocus spellCheck="false" />
      <button style={{...s.btn("success"), padding:"6px 12px", fontSize:12}}
       onClick={() => { onUpdateDni(user.id, dniVal.trim()); setEditingDni(false); }}>✓</button>
      <button style={{...s.btn("secondary"), padding:"6px 10px", fontSize:12}}
       onClick={() => { setDniVal(user.numero_documento || ""); setEditingDni(false); }}>✕</button>
     </div>
    ) : (
     <div style={{display:"flex", alignItems:"center", gap:8}}>
      <span style={{fontSize:14, fontWeight:700, color:"#eee"}}>{user.numero_documento || "Sin DNI"}</span>
      <button style={{...s.btn("secondary"), padding:"2px 8px", fontSize:10}}
       onClick={() => setEditingDni(true)}>Editar</button>
     </div>
    )}
   </div>

   {/* Roles */}
   <div style={{fontSize:11, color:"#888", marginBottom:5, textTransform:"uppercase", letterSpacing:1}}>Roles</div>
   <div style={{display:"flex", gap:6, flexWrap:"wrap", marginBottom:10}}>
    {allRoles.map(role => {
     const info = ROLE_INFO[role]; const active = user.roles.includes(role);
     return (
      <button key={role} onClick={() => onUpdateRoles(user.id, toggleRole(user.roles, role))}
       style={{...s.btn(active?"primary":"secondary"), fontSize:10, border:active?`1px solid ${info.color}`:"1px solid #333"}}>
       {info.icon} {info.label}
      </button>
     );
    })}
   </div>

   {allLocales.length > 0 && (
    <>
     <div style={{fontSize:11, color:"#888", marginBottom:5, textTransform:"uppercase", letterSpacing:1}}>Locales habilitados</div>
     <div style={{display:"flex", gap:6, flexWrap:"wrap", marginBottom:10}}>
      {allLocales.map(local => {
       const active = selectedLocales.includes(Number(local.id_local));
       return (
        <button key={local.id_local} onClick={() => toggleLocal(Number(local.id_local))}
         style={{...s.btn(active?"primary":"secondary"), fontSize:10, border:active?`1px solid ${Y}`:"1px solid #333"}}>
         {local.nombre}
        </button>
       );
      })}
     </div>
    </>
   )}

   {/* Acciones */}
   <div style={{display:"flex", gap:6}}>
    <button style={{...s.btn("warn"), flex:1, fontSize:11, padding:"6px 0"}}
     onClick={onResetPin}>🔑 Resetear PIN</button>
    {!user.roles.includes("admin") && (
     <button style={{...s.btn("danger"), flex:1, fontSize:11, padding:"6px 0"}}
      onClick={onDelete}>🗑 Eliminar</button>
    )}
   </div>
  </div>
 );
}

// ═══════════════════════════════════════════════════════════════════
// STAFF MANAGER — Gestión de personal y PINs (solo admin)
// ═══════════════════════════════════════════════════════════════════
export function StaffManager({ staff, onCreateStaff, onUpdateStaff, onUpdateAccess, onResetPin, onDeleteStaff, isMobile, s, Y, currentLocalId }) {
 const [editing, setEditing]   = useState(null);
 const [showAdd, setShowAdd]   = useState(false);
 const [newName, setNewName]   = useState("");
 const [newDni, setNewDni]     = useState("");
 const [newRoles, setNewRoles] = useState(["mesero"]);
 const [newLocalIds, setNewLocalIds] = useState([]);
 const [allLocales, setAllLocales] = useState([]);
 const [resetTarget, setResetTarget] = useState(null);
 const [localToast, setLocalToast]   = useState(null);

 const toast_ = (msg,color="#27ae60") => { setLocalToast({msg,color}); setTimeout(()=>setLocalToast(null),2500); };
 const allRoles = ["admin","cajero","mesero","cocinero"];
 const toggleRole = (arr, role) => arr.includes(role) ? arr.filter(r=>r!==role) : [...arr, role];

 useEffect(() => {
  API.staff.listarLocales()
   .then(locales => {
    setAllLocales(locales || []);
    const current = (locales || []).find(l => Number(l.id_local) === Number(currentLocalId));
    setNewLocalIds([Number(current?.id_local || locales?.[0]?.id_local)].filter(Boolean));
   })
   .catch(() => setAllLocales([]));
 }, [currentLocalId]);

 const handleAdd = async () => {
  if (!newName.trim() || !newRoles.length) return;
  const user = await onCreateStaff({ nombre: newName.trim(), numero_documento: newDni.trim(), roles: newRoles, locales: newLocalIds });
  const u = user;
  setNewName(""); setNewDni(""); setNewRoles(["mesero"]); setShowAdd(false);
  toast_(`✅ ${u.name} agregado`);
 };

 const handleResetPin = async (userId) => {
  await onResetPin(userId, null);
  setResetTarget(null);
  toast_("🔑 PIN reseteado", "#e67e22");
 };

 const handleDelete = async (userId) => {
  await onDeleteStaff(userId);
  toast_("🗑 Usuario eliminado", "#e74c3c");
 };

 const handleUpdateRoles = async (userId, roles) => {
  if (!roles.length) return;
  await onUpdateStaff(userId, { roles });
 };

 return (
  <div>
   <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14}}>
    <div style={s.title}>👥 GESTIÓN DE PERSONAL</div>
    <button style={{...s.btn("success"), padding:"6px 14px", fontSize:12}} onClick={() => setShowAdd(v=>!v)}>
     {showAdd ? "Cancelar" : "+ Agregar"}
    </button>
   </div>

   {localToast && <div style={{background:localToast.color,color:"#fff",padding:"8px 14px",borderRadius:8,fontSize:12,fontWeight:800,marginBottom:12}}>{localToast.msg}</div>}

   {showAdd && (
    <div style={{...s.cardHL, marginBottom:14, padding:isMobile?10:14}}>
     <div style={{fontWeight:900, color:Y, marginBottom:10}}>Nuevo integrante</div>
     <input style={{...s.input, marginBottom:8}} placeholder="Nombre (Ej: María, Carlos...)"
      value={newName} onChange={e => setNewName(e.target.value)} spellCheck="false" />
     <input style={{...s.input, marginBottom:8}} placeholder="DNI"
      value={newDni} onChange={e => setNewDni(e.target.value.replace(/\D/g,"").slice(0,15))} spellCheck="false" />
     <div style={{fontSize:11, color:"#888", marginBottom:6, textTransform:"uppercase", letterSpacing:1}}>Roles asignados</div>
     <div style={{display:"flex", gap:6, flexWrap:"wrap", marginBottom:12}}>
      {allRoles.map(role => {
       const info = ROLE_INFO[role]; const active = newRoles.includes(role);
       return (
        <button key={role} onClick={() => setNewRoles(r => toggleRole(r, role))}
         style={{...s.btn(active?"primary":"secondary"), fontSize:11, border:active?`1px solid ${info.color}`:"1px solid #333"}}>
         {info.icon} {info.label}
        </button>
       );
     })}
     </div>
     {allLocales.length > 0 && (
      <>
       <div style={{fontSize:11, color:"#888", marginBottom:6, textTransform:"uppercase", letterSpacing:1}}>Locales habilitados</div>
       <div style={{display:"flex", gap:6, flexWrap:"wrap", marginBottom:12}}>
        {allLocales.map(local => {
         const id = Number(local.id_local);
         const active = newLocalIds.includes(id);
         return (
          <button key={id} onClick={() => setNewLocalIds(ids => active ? ids.filter(x => x !== id) : [...ids, id])}
           style={{...s.btn(active?"primary":"secondary"), fontSize:11, border:active?`1px solid ${Y}`:"1px solid #333"}}>
           {local.nombre}
          </button>
         );
        })}
       </div>
      </>
     )}
     <button style={{...s.btn("success"), width:"100%"}} onClick={handleAdd}
      disabled={!newName.trim() || !newRoles.length}>Guardar integrante</button>
    </div>
   )}

   {staff.map(user => {
    const isEdit = editing?.id === user.id;
    return (
     <div key={user.id} style={{...s.card, marginBottom:8, padding:isMobile?10:12}}>
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:isEdit?10:0}}>
       <div>
        <div style={{fontWeight:900, fontSize:14}}>{user.name}</div>
        <div style={{fontSize:10, color:"#555", marginTop:2}}>
         {user.roles.map(r=>`${ROLE_INFO[r]?.icon} ${ROLE_INFO[r]?.label||r}`).join(" · ")}
         {" · "}<span style={{color:user.pinHash?"#27ae60":"#e74c3c"}}>{user.pinHash?"PIN activo ✓":"Sin PIN"}</span>
        </div>
       </div>
       <button style={{...s.btn("secondary"), fontSize:11, padding:"4px 10px"}}
        onClick={() => setEditing(isEdit ? null : user)}>
        {isEdit ? "Cerrar" : "Editar"}
       </button>
      </div>
      {isEdit && (
       <EditUserInline
        user={user}
        allRoles={allRoles}
        allLocales={allLocales}
        toggleRole={toggleRole}
        onUpdateRoles={handleUpdateRoles}
         onUpdateName={async (uid, name) => {
          await onUpdateStaff(uid, { nombre: name });
         toast_(`✅ Nombre actualizado`);
        }}
        onUpdateDni={async (uid, dni) => {
         await onUpdateStaff(uid, { numero_documento: dni });
         toast_("DNI actualizado");
        }}
        onUpdateLocales={async (uid, locales) => {
         await onUpdateStaff(uid, { locales });
         toast_("Locales actualizados");
        }}
        onUpdateAccess={async (uid, body) => {
         const updated = await onUpdateAccess(uid, body);
         toast_(`Acceso actualizado ${updated.codigo_usuario || ""}`, "#e67e22");
        }}
        onResetPin={() => setResetTarget(user.id)}
        onDelete={() => handleDelete(user.id)}
        s={s} Y={Y}
       />
      )}
     </div>
    );
   })}

   {resetTarget && (
    <div style={s.overlay} onClick={() => setResetTarget(null)}>
     <div style={{...s.modal, maxWidth:300, textAlign:"center"}} onClick={e => e.stopPropagation()}>
      <div style={{fontSize:36, marginBottom:10}}>🔑</div>
      <div style={{fontWeight:900, fontSize:16, marginBottom:8}}>¿Resetear PIN?</div>
      <div style={{color:"#888", fontSize:12, marginBottom:20}}>El usuario creará un nuevo PIN la próxima vez que entre.</div>
      <div style={{display:"flex", gap:8}}>
       <button style={{...s.btn("secondary"), flex:1}} onClick={() => setResetTarget(null)}>Cancelar</button>
       <button style={{...s.btn("warn"), flex:2, fontWeight:900}} onClick={() => handleResetPin(resetTarget)}>Resetear</button>
      </div>
     </div>
    </div>
   )}
  </div>
 );
}

// ═══════════════════════════════════════════════════════════════════
// APP COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════
