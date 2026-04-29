import { useCallback, useEffect, useState } from "react";
import * as API from "../../api";
import { downloadWithAuth } from "../../services/downloads";

export function RequerimientosComponent({ currentUser, isMobile, s, Y }) {
 const [lista, setLista] = useState([]);
 const [plantilla, setPlantilla] = useState([]);
 const [actual, setActual] = useState(null);
 const [loading, setLoading] = useState(true);
 const [saving, setSaving] = useState(false);
 const [toastLocal, setToastLocal] = useState(null);
 const [openSections, setOpenSections] = useState({});

 const toast_ = (msg, color="#27ae60") => {
  setToastLocal({ msg, color });
  setTimeout(() => setToastLocal(null), 2500);
 };

 const flattenPlantilla = (categorias) => {
  let counter = 1;
  return (categorias || []).flatMap(cat => (cat.items || []).map(producto => ({
   categoria: cat.nombre,
   item: counter++,
   producto,
   pedido: false,
   cantidad_pedida: "",
   cantidad_recibida: "",
   conforme: "",
   marca: "",
   observaciones: "",
  })));
 };

 const load = useCallback(async () => {
  setLoading(true);
  try {
   const [tpl, reqs] = await Promise.all([API.requerimientos.plantilla(), API.requerimientos.listar()]);
   setPlantilla(tpl.categorias || []);
   setLista(reqs || []);
  } catch (err) {
   toast_(err.message || "No se pudo cargar requerimientos", "#e74c3c");
  }
  setLoading(false);
 }, []);

 useEffect(() => { load(); }, [load]);

 const nuevo = () => {
  const items = flattenPlantilla(plantilla);
  const firstCategory = items[0]?.categoria || "";
  setActual({
   local_area: currentUser?.localName || "",
   responsable_cp: "",
   responsable_cr: "",
   fecha_requerimiento: new Date().toISOString().slice(0, 10),
   fecha_entrega: "",
   estado: "BORRADOR",
   items,
  });
  setOpenSections(firstCategory ? { [firstCategory]: true } : {});
 };

 const abrir = async (id) => {
  setLoading(true);
 try {
   const req = await API.requerimientos.obtener(id);
   const firstCategory = (req.items || [])[0]?.categoria || "";
   setActual(req);
   setOpenSections(firstCategory ? { [firstCategory]: true } : {});
  } catch (err) {
   toast_(err.message || "No se pudo abrir el requerimiento", "#e74c3c");
  }
  setLoading(false);
 };

 const updateMeta = (key, value) => setActual(prev => ({ ...prev, [key]: value }));
 const updateItem = (idx, key, value) => setActual(prev => ({
  ...prev,
  items: (prev.items || []).map((item, i) => i === idx ? { ...item, [key]: value } : item),
 }));

 const guardar = async () => {
  if (!actual) return;
  setSaving(true);
  try {
   const payload = {
    local_area: actual.local_area,
    responsable_cp: actual.responsable_cp,
    responsable_cr: actual.responsable_cr,
    fecha_requerimiento: actual.fecha_requerimiento,
    fecha_entrega: actual.fecha_entrega,
    items: actual.items || [],
   };
   const saved = actual.id_requerimiento
    ? await API.requerimientos.actualizar(actual.id_requerimiento, payload)
    : await API.requerimientos.crear(payload);
   setActual(saved);
   await load();
   toast_("Requerimiento guardado");
  } catch (err) {
   toast_(err.message || "No se pudo guardar", "#e74c3c");
  }
  setSaving(false);
 };

 const finalizar = async () => {
  if (!actual?.id_requerimiento) return;
  setSaving(true);
  try {
   const saved = await API.requerimientos.finalizar(actual.id_requerimiento);
   setActual(saved);
   await load();
   toast_("Requerimiento finalizado");
  } catch (err) {
   toast_(err.message || "No se pudo finalizar", "#e74c3c");
  }
  setSaving(false);
 };

 const descargar = async (formato) => {
  if (!actual?.id_requerimiento) return;
  try {
   await downloadWithAuth(
    API.requerimientos.exportUrl(actual.id_requerimiento, formato),
    `FO-MP-02-${actual.id_requerimiento}.${formato === "pdf" ? "pdf" : "xlsx"}`
   );
  } catch (err) {
   toast_(err.message || "No se pudo descargar", "#e74c3c");
  }
 };

 const disabled = actual?.estado === "FINALIZADO" || saving;
 const grouped = (actual?.items || []).reduce((acc, item, idx) => {
  const key = item.categoria || "SIN CATEGORIA";
  if (!acc[key]) acc[key] = [];
  acc[key].push({ ...item, _idx: idx });
  return acc;
 }, {});
 const categoryEntries = Object.entries(grouped);
 const itemRequested = (item) => Boolean(item.pedido) || Number(item.cantidad_pedida) > 0;
 const itemReceived = (item) => Number(item.cantidad_recibida) > 0;
 const itemConforme = (item) => item.conforme === true || item.conforme === "si" || item.conforme === "SI" || item.conforme === 1;
 const buildStats = (items = []) => ({
  total: items.length,
  pedidos: items.filter(itemRequested).length,
  recibidos: items.filter(itemReceived).length,
  conformes: items.filter(itemConforme).length,
 });
 const totalStats = buildStats(actual?.items || []);
 const toggleSection = (categoria) => setOpenSections(prev => ({ ...prev, [categoria]: !prev[categoria] }));

 return (
  <div>
   <div style={{...s.row, marginBottom:14}}>
    <div style={s.title}>LISTA DE REQUERIMIENTOS</div>
    <button style={{...s.btn("success"), padding:"8px 14px"}} onClick={nuevo}>Nuevo</button>
   </div>
   {toastLocal && <div style={{background:toastLocal.color,color:"#fff",padding:"8px 14px",borderRadius:8,fontSize:12,fontWeight:800,marginBottom:12}}>{toastLocal.msg}</div>}
   {loading && <div style={{...s.card,textAlign:"center",color:"#777"}}>Cargando...</div>}

   {!actual && !loading && (
    <div>
     {lista.length === 0 && <div style={{...s.card,textAlign:"center",color:"#777"}}>No hay requerimientos registrados</div>}
     {lista.map(req => (
      <button key={req.id_requerimiento} style={{...s.card, width:"100%", textAlign:"left", cursor:"pointer"}} onClick={() => abrir(req.id_requerimiento)}>
       <div style={{display:"flex",justifyContent:"space-between",gap:8}}>
        <div>
         <div style={{fontWeight:900,color:"#eee"}}>FO-MP-02 #{req.id_requerimiento}</div>
         <div style={{fontSize:11,color:"#777",marginTop:2}}>{req.local_area || currentUser?.localName} · {req.fecha_requerimiento ? new Date(req.fecha_requerimiento).toLocaleDateString("es-PE") : ""}</div>
        </div>
        <span style={{...s.tag(req.estado === "FINALIZADO" ? "#1e5c2e" : "#2a2a2a", req.estado === "FINALIZADO" ? "#27ae60" : Y)}}>{req.estado}</span>
       </div>
      </button>
     ))}
    </div>
   )}

   {actual && (
    <div>
     <div style={{...s.cardHL, marginBottom:12}}>
      <div style={{...s.row, marginBottom:10}}>
       <button style={{...s.btn("secondary"), padding:"6px 12px"}} onClick={() => setActual(null)}>Volver</button>
       <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        {actual.id_requerimiento && <button style={{...s.btn("secondary"), padding:"6px 12px"}} onClick={() => descargar("xlsx")}>Excel</button>}
        {actual.id_requerimiento && <button style={{...s.btn("secondary"), padding:"6px 12px"}} onClick={() => descargar("pdf")}>PDF</button>}
        {actual.id_requerimiento && actual.estado !== "FINALIZADO" && <button style={{...s.btn("warn"), padding:"6px 12px"}} onClick={finalizar} disabled={saving}>Finalizar</button>}
        <button style={{...s.btn("success"), padding:"6px 12px"}} onClick={guardar} disabled={disabled}>{saving ? "Guardando..." : "Guardar"}</button>
       </div>
      </div>
      <div style={s.grid(isMobile ? 150 : 190)}>
       <input style={s.input} disabled={disabled} placeholder="Local / Área" value={actual.local_area || ""} onChange={e => updateMeta("local_area", e.target.value)} />
       <input style={s.input} disabled={disabled} placeholder="Responsable CP" value={actual.responsable_cp || ""} onChange={e => updateMeta("responsable_cp", e.target.value)} />
       <input style={s.input} disabled={disabled} placeholder="Responsable CR" value={actual.responsable_cr || ""} onChange={e => updateMeta("responsable_cr", e.target.value)} />
       <input style={s.input} disabled={disabled} type="date" value={(actual.fecha_requerimiento || "").slice(0,10)} onChange={e => updateMeta("fecha_requerimiento", e.target.value)} />
       <input style={s.input} disabled={disabled} type="date" value={(actual.fecha_entrega || "").slice(0,10)} onChange={e => updateMeta("fecha_entrega", e.target.value)} />
      </div>
     </div>

     <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4, minmax(130px,1fr))",gap:10,marginBottom:12}}>
      {[
       ["Secciones", categoryEntries.length, "#5dade2"],
       ["Productos", totalStats.total, Y],
       ["Pedidos", totalStats.pedidos, "#e67e22"],
       ["Recibidos", totalStats.recibidos, "#27ae60"],
      ].map(([label, value, color]) => (
       <div key={label} style={{background:"#1a1a1a",border:`1px solid ${color}44`,borderRadius:8,padding:"12px 14px"}}>
        <div style={{fontSize:10,color:"#777",textTransform:"uppercase",letterSpacing:1,fontWeight:800}}>{label}</div>
        <div style={{fontSize:24,fontWeight:900,color,marginTop:4,lineHeight:1}}>{value}</div>
       </div>
      ))}
     </div>

     {categoryEntries.map(([categoria, items]) => {
      const stats = buildStats(items);
      const isOpen = Boolean(openSections[categoria]);
      return (
      <div key={categoria} style={{...s.card, padding:0, overflow:"hidden", border:`1px solid ${isOpen ? `${Y}66` : "#2a2a2a"}`}}>
       <button type="button" onClick={() => toggleSection(categoria)} style={{width:"100%",border:"none",background:isOpen?`${Y}12`:"#1a1a1a",color:"#eee",padding:isMobile?"12px 10px":"14px 16px",cursor:"pointer",textAlign:"left",display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,fontFamily:"'Nunito',sans-serif"}}>
        <div style={{minWidth:0}}>
         <div style={{fontWeight:900,color:Y,fontSize:isMobile?14:16,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{categoria}</div>
         <div style={{fontSize:11,color:"#777",marginTop:3}}>{stats.total} productos · {stats.pedidos} pedidos · {stats.recibidos} recibidos</div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
         <span style={{...s.tag(stats.conformes === stats.total && stats.total > 0 ? "#1e5c2e" : "#2a2a2a", stats.conformes === stats.total && stats.total > 0 ? "#27ae60" : "#aaa"),fontSize:10}}>{stats.conformes}/{stats.total}</span>
         <span style={{width:28,height:28,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",background:"#111",border:"1px solid #333",color:isOpen?Y:"#777",fontWeight:900}}>{isOpen ? "−" : "+"}</span>
        </div>
       </button>
       {isOpen && (
       <div style={{overflowX:"auto",padding:12}}>
        <div style={{minWidth:820}}>
        <div style={{display:"grid",gridTemplateColumns:"48px 1.5fr 70px 110px 110px 95px 120px 1.4fr",gap:6,fontSize:10,color:"#777",textTransform:"uppercase",letterSpacing:0.5,marginBottom:6}}>
         <div>Item</div><div>Producto</div><div>Pedido</div><div>Cant. pedida</div><div>Cant. recibida</div><div>Conforme</div><div>Marca</div><div>Observaciones</div>
        </div>
        {items.map(item => (
         <div key={`${categoria}-${item.item}-${item._idx}`} style={{display:"grid",gridTemplateColumns:"48px 1.5fr 70px 110px 110px 95px 120px 1.4fr",gap:6,alignItems:"center",marginBottom:6}}>
          <div style={{fontSize:12,color:"#888"}}>{item.item}</div>
          <div style={{fontSize:12,color:"#eee",fontWeight:700}}>{item.producto}</div>
          <input type="checkbox" disabled={disabled} checked={Boolean(item.pedido)} onChange={e => updateItem(item._idx, "pedido", e.target.checked)} />
          <input style={s.input} disabled={disabled} type="number" value={item.cantidad_pedida ?? ""} onChange={e => updateItem(item._idx, "cantidad_pedida", e.target.value)} />
          <input style={s.input} disabled={disabled} type="number" value={item.cantidad_recibida ?? ""} onChange={e => updateItem(item._idx, "cantidad_recibida", e.target.value)} />
          <select style={s.input} disabled={disabled} value={item.conforme === true ? "si" : item.conforme === false ? "no" : ""} onChange={e => updateItem(item._idx, "conforme", e.target.value === "" ? "" : e.target.value === "si")}>
           <option value=""></option>
           <option value="si">Sí</option>
           <option value="no">No</option>
          </select>
          <input style={s.input} disabled={disabled} value={item.marca || ""} onChange={e => updateItem(item._idx, "marca", e.target.value)} />
          <input style={s.input} disabled={disabled} value={item.observaciones || ""} onChange={e => updateItem(item._idx, "observaciones", e.target.value)} />
         </div>
        ))}
        </div>
       </div>
       )}
      </div>
      );
     })}
    </div>
   )}
  </div>
 );
}
