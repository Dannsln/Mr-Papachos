/* eslint-disable */
import { useState, useEffect, useRef, Component } from "react";
import { initializeApp, getApps } from "firebase/app";
import {
 getFirestore, doc, setDoc, getDoc, collection, addDoc, query, orderBy, limit, onSnapshot
} from "firebase/firestore";

const FIREBASE_CONFIG = {
 apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
 authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
 projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
 storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
 messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
 appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

const _fbApp = getApps().length ? getApps()[0] : initializeApp(FIREBASE_CONFIG);
const db = getFirestore(_fbApp);

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
async function sha256(str) {
 if (!str) return "";
 const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
 return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,"0")).join("");
}

// ─── MOTOR MULTI-LOCAL ────────────────────────────────────────────────────────
const FS = (localId) => ({
 _localId: localId,
 ordersRef:      () => doc(db, `mrpapachos_${localId}`, "orders"),
 menuRef:        () => doc(db, `mrpapachos_${localId}`, "customMenu"),
 configRef:      () => doc(db, `mrpapachos_${localId}`, "config"),
 staffRef:       () => doc(db, `mrpapachos_${localId}`, "staff"),
 solicitudesRef: () => doc(db, `mrpapachos_${localId}`, "solicitudes"),
 cajaRef:        () => doc(db, `mrpapachos_${localId}`, "caja"),
 historyCol:     () => collection(db, `mrpapachos_${localId}_historial`),
 
 async getOrders() {
 try { const s = await getDoc(this.ordersRef()); return s.exists() ? (s.data().list ?? []) : []; } catch { return []; }
 },
 async saveOrders(list) {
 try { await setDoc(this.ordersRef(), { list, ts: new Date().toISOString() }); } catch (e) { console.error(e); }
 },
 async getMenu() {
 try { const s = await getDoc(this.menuRef()); return s.exists() ? (s.data().list ?? []) : []; } catch { return []; }
 },
 async saveMenu(list) {
 try { await setDoc(this.menuRef(), { list, ts: new Date().toISOString() }); } catch (e) { console.error(e); }
 },
 async saveConfig(data) {
 try { await setDoc(this.configRef(), data, { merge: true }); } catch (e) { console.error(e); }
 },
 async addHistory(order) {
 try { await addDoc(this.historyCol(), order); } catch (e) { console.error(e); }
 },
 async getStaff() {
  try {
   const s = await getDoc(this.staffRef());
   if (!s.exists()) return null;          // null = doc no existe (primera vez)
   const users = s.data().users ?? [];
   return users;                           // puede ser [] si alguien borró todo
  } catch(e) {
   console.error("getStaff error:", e);
   return undefined;                       // undefined = error de red/permisos
  }
 },
 async saveStaff(users) {
  // GUARD: nunca guardar array vacío ni sin admin
  if (!Array.isArray(users) || users.length === 0) {
   console.error("saveStaff: rejected empty array");
   return false;
  }
  if (!users.some(u => u.roles?.includes("admin"))) {
   console.error("saveStaff: rejected — no admin in list");
   return false;
  }
  try {
   await setDoc(this.staffRef(), { users, ts: new Date().toISOString() });
   // Backup en localStorage (por sucursal)
   try { localStorage.setItem(`staff_backup_${this._localId}`, JSON.stringify({ users, ts: new Date().toISOString() })); } catch(_) {}
   return true;
  } catch(e) {
   console.error("saveStaff write error:", e);
   return false;
  }
 },
 getStaffBackup() {
  try {
   const raw = localStorage.getItem(`staff_backup_${this._localId}`);
   if (!raw) return null;
   const parsed = JSON.parse(raw);
   return parsed?.users?.length ? parsed.users : null;
  } catch { return null; }
 },
 async getSolicitudes() {
 try { const s = await getDoc(this.solicitudesRef()); return s.exists() ? (s.data().list ?? []) : []; } catch { return []; }
 },
 async saveSolicitudes(list) {
 try { await setDoc(this.solicitudesRef(), { list, ts: new Date().toISOString() }); } catch(e) { console.error(e); }
 },
 async updateHistory(fid, data) {
 try { await setDoc(doc(db, `mrpapachos_${this._localId}_historial`, fid), data, { merge: true }); } catch(e) { console.error(e); }
 }
});

const MENU_BASE = [
 { id:"H01", cat:"Hamburguesas", name:"La Silvestre", price:7, desc:"Carne, papa frita, ensalada" },
 { id:"H02", cat:"Hamburguesas", name:"La Piolin", price:8, desc:"Carne o pollo, huevo, papa frita, ensalada" },
 { id:"H03", cat:"Hamburguesas", name:"La Speedy Gonzales", price:10, desc:"Carne, huevo, hot dog, papa frita, ensalada" },
 { id:"H04", cat:"Hamburguesas", name:"La Cajacha", price:12, desc:"Carne, huevo, queso, hot dog, papa frita, ensalada" },
 { id:"H05", cat:"Hamburguesas", name:"La Coyote", price:12, desc:"Carne, huevo, plátano, jamón, papa frita, ensalada" },
 { id:"H06", cat:"Hamburguesas", name:"La Super Cajacha", price:14, desc:"Carne, queso, chorizo artesanal, tocino, papa frita, ensalada" },
 { id:"H07", cat:"Hamburguesas", name:"La Bugs Bunny", price:14, desc:"Carne, huevo, hot dog, chorizo artesanal, jamón, papa frita, ensalada" },
 { id:"H08", cat:"Hamburguesas", name:"La Cajamarquesa", price:14, desc:"Carne, champiñones, queso, tocino, papas fritas, ensalada" },
 { id:"H09", cat:"Hamburguesas", name:"La Porky", price:15, desc:"Carne, huevo, hot dog, chorizo artesanal, tocino, papa frita, ensalada" },
 { id:"H10", cat:"Hamburguesas", name:"La Tazmania", price:14, desc:"Carne, queso, piña, hot dog, jamón, papa frita, ensalada" },
 { id:"H11", cat:"Hamburguesas", name:"La Papachos", price:20, desc:"Doble carne, huevo, doble queso, hot dog, chorizo artesanal, jamón, tocino, papa frita, ensalada" },
 { id:"S01", cat:"Salchipapas", name:"Salchipapa Clásica", price:8, desc:"Papa, hot dog" },
 { id:"S02", cat:"Salchipapas", name:"Salchipapa Sencilla", price:10, desc:"Papa, hot dog, huevo" },
 { id:"S03", cat:"Salchipapas", name:"Salchipapa Cajacha", price:12, desc:"Papa, hot dog, chorizo artesanal, queso" },
 { id:"S04", cat:"Salchipapas", name:"Salchipapa Hawaiana", price:12, desc:"Papa, hot dog, jamón, piña, queso" },
 { id:"S05", cat:"Salchipapas", name:"Salchipobre", price:13, desc:"Papa, hot dog, huevo, plátano, jamón" },
 { id:"S06", cat:"Salchipapas", name:"Salchi Piernona", price:15, desc:"Papa, hot dog, pierna broster" },
 { id:"S07", cat:"Salchipapas", name:"Salchi Super Cajacha", price:16, desc:"Papa, hot dog, chorizo artesanal, doble queso, tocino" },
 { id:"S08", cat:"Salchipapas", name:"Salchibroster", price:16, desc:"Papa, hot dog, huevo, pollo broaster" },
 { id:"S09", cat:"Salchipapas", name:"Salchi Champi Quesera", price:18, desc:"Papa, hot dog, chorizo artesanal, doble queso, tocino, champiñones" },
 { id:"S10", cat:"Salchipapas", name:"Salchi Nuggets", price:20, desc:"Papa, nuggets, hot dog, chorizo artesanal, queso, ensalada" },
 { id:"S11", cat:"Salchipapas", name:"Salchi Porky", price:20, desc:"Papa, chorizo artesanal, hot dog, trozos de chicharrón" },
 { id:"S12", cat:"Salchipapas", name:"La Papacha", price:22, desc:"Papa, hot dog, chorizo artesanal, huevo, queso, tocino, 2 alitas y trozos de pollo broaster" },
 { id:"S13", cat:"Salchipapas", name:"Salchi Lomo", price:25, desc:"(Pollo o carne) Papa, hot dog, chorizo artesanal, plátano, 2 alitas, ensalada" },
 { id:"A01", cat:"Alitas", name:"Alitas 4 pzas", price:14, desc:"4 alitas + papas fritas + ensalada" },
 { id:"A02", cat:"Alitas", name:"Alitas 6 pzas", price:20, desc:"6 alitas + papas fritas + ensalada" },
 { id:"A03", cat:"Alitas", name:"Alitas 8 pzas", price:26, desc:"8 alitas + papas fritas + ensalada" },
 { id:"A04", cat:"Alitas", name:"Alitas 10 pzas", price:30, desc:"10 alitas + papas fritas + ensalada" },
 { id:"A05", cat:"Alitas", name:"Alitas 12 pzas", price:36, desc:"12 alitas + papas fritas + ensalada" },
 { id:"AC01", cat:"Alichaufa", name:"Alichaufa 4 pzas", price:18, desc:"4 alitas + papas fritas + chaufa + ensalada" },
 { id:"AC02", cat:"Alichaufa", name:"Alichaufa 6 pzas", price:24, desc:"6 alitas + papas fritas + chaufa + ensalada" },
 { id:"AC03", cat:"Alichaufa", name:"Alichaufa 8 pzas", price:30, desc:"8 alitas + papas fritas + chaufa + ensalada" },
 { id:"AC04", cat:"Alichaufa", name:"Alichaufa 10 pzas", price:36, desc:"10 alitas + papas fritas + chaufa + ensalada" },
 { id:"PB01", cat:"Pollo Broaster", name:"Pollo 1/8 Clásico", price:12, desc:"1/8 de pollo broaster clásico" },
 { id:"PB02", cat:"Pollo Broaster", name:"Pollo 1/4 Clásico", price:18, desc:"1/4 de pollo broaster clásico" },
 { id:"PB03", cat:"Pollo Broaster", name:"Pollo 1/8 A lo Pobre", price:16, desc:"1/8 de pollo broaster a lo pobre" },
 { id:"PB04", cat:"Pollo Broaster", name:"Pollo 1/4 A lo Pobre", price:22, desc:"1/4 de pollo broaster a lo pobre" },
 { id:"MB01", cat:"Mostrito Broaster", name:"Mostrito 1/8 Clásico", price:14, desc:"1/8 de mostrito broaster clásico" },
 { id:"MB02", cat:"Mostrito Broaster", name:"Mostrito 1/4 Clásico", price:22, desc:"1/4 de mostrito broaster clásico" },
 { id:"MB03", cat:"Mostrito Broaster", name:"Mostrito 1/8 A lo Pobre", price:18, desc:"1/8 de mostrito broaster a lo pobre" },
 { id:"MB04", cat:"Mostrito Broaster", name:"Mostrito 1/4 A lo Pobre", price:25, desc:"1/4 de mostrito broaster a lo pobre" },
 { id:"PE01", cat:"Platos Extras", name:"Caldo de Gallina", price:14, desc:"Caldo de gallina tradicional" },
 { id:"PE02", cat:"Platos Extras", name:"Arroz Chaufa", price:14, desc:"Arroz chaufa estilo chifa" },
 { id:"PE03", cat:"Platos Extras", name:"Arroz Chaufa a lo Pobre", price:18, desc:"Arroz chaufa con huevo, plátano y más" },
 { id:"PE04", cat:"Platos Extras", name:"Saltado de Pollo", price:20, desc:"Saltado de pollo al wok con verduras" },
 { id:"PE05", cat:"Platos Extras", name:"Tallarín Saltado Carne", price:22, desc:"Tallarín saltado con carne al wok" },
 { id:"PE06", cat:"Platos Extras", name:"Tallarín Saltado Pollo", price:18, desc:"Tallarín saltado con pollo al wok" },
 { id:"PE07", cat:"Platos Extras", name:"Mollejita a la Plancha", price:18, desc:"Mollejas de pollo a la plancha" },
 { id:"PE08", cat:"Platos Extras", name:"Saltado de Molleja", price:18, desc:"Mollejas saltadas al wok con verduras" },
 { id:"PE09", cat:"Platos Extras", name:"Pollo a la Plancha 1/4", price:20, desc:"1/4 de pollo a la plancha" },
 { id:"PE10", cat:"Platos Extras", name:"Lomo Montado", price:25, desc:"Lomo fino montado con huevo y arroz" },
 { id:"PE11", cat:"Platos Extras", name:"Chuleta", price:22, desc:"Chuleta de cerdo a la plancha" },
 { id:"PE12", cat:"Platos Extras", name:"Lomo a lo Pobre", price:25, desc:"Lomo fino a lo pobre con huevo y plátano" },
 { id:"PE13", cat:"Platos Extras", name:"Lomo Saltado", price:22, desc:"Lomo saltado al wok con verduras y papas" },
 { id:"MK01", cat:"Menú Kids", name:"Bolipollos 6pz", price:18, desc:"6 piezas de bolipollos para los más pequeños" },
 { id:"MK02", cat:"Menú Kids", name:"Boliquesos 6pz", price:25, desc:"6 piezas de boliquesos para los más pequeños" },
 { id:"MK03", cat:"Menú Kids", name:"Nuggets 6pz", price:18, desc:"6 nuggets de pollo crujientes" },
 { id:"MK04", cat:"Menú Kids", name:"Chicharrón de Pollo", price:18, desc:"Chicharrón de pollo crujiente" },
 { id:"C01", cat:"Combos", name:"Combo Personal", price:9.90, desc:"Hamburguesa Piolín o Salchipapa Sencilla + Vaso de bebida" },
 { id:"C02", cat:"Combos", name:"Combo Cajacho", price:44.90,desc:"Hamburguesa Cajacha + 6pz Alitas + Papas fritas nativas + Porción de Chaufa + 1L Bebida" },
 { id:"C03", cat:"Combos", name:"Combo Familiar", price:80.90,desc:"2 Hamburguesas Speedy Gonzales + 14pz Alitas + Papas fritas nativas + Arroz Chaufa + 1.5L de bebida" },
 { id:"C04", cat:"Combos", name:"Combo Papachos", price:110.90,desc:"2 Hamburguesas La Porky + 20pz de Alitas + Papas fritas nativas + Arroz Chaufa + 2L de Bebida" },
 { id:"R01", cat:"Rondas", name:"Rondas de Sabores 20pz", price:68, desc:"20 pz de alitas + papas fritas nativas + ensalada + 1L de bebida" },
 { id:"R02", cat:"Rondas", name:"Ronda de Sabores XL 30pz", price:99, desc:"30 pz de alitas + papas fritas nativas + ensalada + 1.5L de bebida" },
 { id:"B01", cat:"Bebidas", name:"Chicha Morada Normal 1L", price:10, desc:"Chicha morada preparada, 1 litro" },
 { id:"B02", cat:"Bebidas", name:"Chicha Morada Normal 1/2L", price:5, desc:"Chicha morada preparada, medio litro" },
 { id:"B03", cat:"Bebidas", name:"Chicha Morada Normal Vaso", price:2.50, desc:"Chicha morada preparada, vaso" },
 { id:"B04", cat:"Bebidas", name:"Chicha Morada Frozen 1L", price:18, desc:"Chicha morada frozen, 1 litro" },
 { id:"B05", cat:"Bebidas", name:"Chicha Morada Frozen 1/2L", price:9, desc:"Chicha morada frozen, medio litro" },
 { id:"B06", cat:"Bebidas", name:"Limonada Normal 1L", price:10, desc:"Limonada natural, 1 litro" },
 { id:"B07", cat:"Bebidas", name:"Limonada Normal 1/2L", price:5, desc:"Limonada natural, medio litro" },
 { id:"B08", cat:"Bebidas", name:"Limonada Normal Vaso", price:2.50, desc:"Limonada natural, vaso" },
 { id:"B09", cat:"Bebidas", name:"Limonada Frozen 1L", price:18, desc:"Limonada frozen, 1 litro" },
 { id:"B10", cat:"Bebidas", name:"Limonada Frozen 1/2L", price:9, desc:"Limonada frozen, medio litro" },
 { id:"B11", cat:"Bebidas", name:"Maracuyá Normal 1L", price:10, desc:"Maracuyá natural, 1 litro" },
 { id:"B12", cat:"Bebidas", name:"Maracuyá Normal 1/2L", price:5, desc:"Maracuyá natural, medio litro" },
 { id:"B13", cat:"Bebidas", name:"Maracuyá Normal Vaso", price:2.50, desc:"Maracuyá natural, vaso" },
 { id:"B14", cat:"Bebidas", name:"Maracuyá Frozen 1L", price:18, desc:"Maracuyá frozen, 1 litro" },
 { id:"B15", cat:"Bebidas", name:"Maracuyá Frozen 1/2L", price:9, desc:"Maracuyá frozen, medio litro" },
 { id:"B16", cat:"Bebidas", name:"Piña Normal 1L", price:10, desc:"Piña natural, 1 litro" },
 { id:"B17", cat:"Bebidas", name:"Piña Normal 1/2L", price:5, desc:"Piña natural, medio litro" },
 { id:"B18", cat:"Bebidas", name:"Piña Normal Vaso", price:2.50, desc:"Piña natural, vaso" },
 { id:"B19", cat:"Bebidas", name:"Piña Frozen 1L", price:18, desc:"Piña frozen, 1 litro" },
 { id:"B20", cat:"Bebidas", name:"Piña Frozen 1/2L", price:9, desc:"Piña frozen, medio litro" },
 { id:"B21", cat:"Bebidas", name:"Cebada Normal 1L", price:10, desc:"Cebada natural, 1 litro" },
 { id:"B22", cat:"Bebidas", name:"Cebada Normal 1/2L", price:5, desc:"Cebada natural, medio litro" },
 { id:"B23", cat:"Bebidas", name:"Cebada Normal Vaso", price:2.50, desc:"Cebada natural, vaso" },
 { id:"B24", cat:"Bebidas", name:"Cebada Frozen 1L", price:18, desc:"Cebada frozen, 1 litro" },
 { id:"B25", cat:"Bebidas", name:"Cebada Frozen 1/2L", price:9, desc:"Cebada frozen, medio litro" },
 { id:"B26", cat:"Bebidas", name:"Fresa Normal 1L", price:10, desc:"Fresa natural, 1 litro" },
 { id:"B27", cat:"Bebidas", name:"Fresa Normal 1/2L", price:5, desc:"Fresa natural, medio litro" },
 { id:"B28", cat:"Bebidas", name:"Fresa Normal Vaso", price:2.50, desc:"Fresa natural, vaso" },
 { id:"B29", cat:"Bebidas", name:"Fresa Frozen 1L", price:18, desc:"Fresa frozen, 1 litro" },
 { id:"B30", cat:"Bebidas", name:"Fresa Frozen 1/2L", price:9, desc:"Fresa frozen, medio litro" },
 { id:"CV01", cat:"Cervezas", name:"Cristal", price:10, desc:"Cerveza Cristal" },
 { id:"CV02", cat:"Cervezas", name:"Pilsen", price:10, desc:"Cerveza Pilsen Callao" },
 { id:"CV03", cat:"Cervezas", name:"Heineken", price:10, desc:"Cerveza Heineken importada" },
 { id:"CV04", cat:"Cervezas", name:"Cusqueña", price:12, desc:"Cerveza Cusqueña dorada" },
 { id:"CV05", cat:"Cervezas", name:"Corona", price:10, desc:"Cerveza Corona importada" },
 { id:"CH01", cat:"Chilcanos", name:"Chilcano Limón Vaso", price:15, desc:"Chilcano de pisco con limón, vaso" },
 { id:"CH02", cat:"Chilcanos", name:"Chilcano Limón Jarra", price:30, desc:"Chilcano de pisco con limón, jarra" },
 { id:"CH03", cat:"Chilcanos", name:"Chilcano Maracuyá Vaso", price:15, desc:"Chilcano de pisco con maracuyá, vaso" },
 { id:"CH04", cat:"Chilcanos", name:"Chilcano Maracuyá Jarra", price:30, desc:"Chilcano de pisco con maracuyá, jarra" },
 { id:"CH05", cat:"Chilcanos", name:"Chilcano Fresa Vaso", price:15, desc:"Chilcano de pisco con fresa, vaso" },
 { id:"CH06", cat:"Chilcanos", name:"Chilcano Fresa Jarra", price:30, desc:"Chilcano de pisco con fresa, jarra" },
 { id:"CH07", cat:"Chilcanos", name:"Chilcano Aguaimanto Vaso", price:15, desc:"Chilcano de pisco con aguaimanto, vaso" },
 { id:"CH08", cat:"Chilcanos", name:"Chilcano Aguaimanto Jarra", price:30, desc:"Chilcano de pisco con aguaimanto, jarra" },
 { id:"CH09", cat:"Chilcanos", name:"Chilcano Tuna Vaso", price:15, desc:"Chilcano de pisco con tuna, vaso" },
 { id:"CH10", cat:"Chilcanos", name:"Chilcano Tuna Jarra", price:30, desc:"Chilcano de pisco con tuna, jarra" },
 { id:"CH11", cat:"Chilcanos", name:"Chilcano Mango Vaso", price:15, desc:"Chilcano de pisco con mango, vaso" },
 { id:"CH12", cat:"Chilcanos", name:"Chilcano Mango Jarra", price:30, desc:"Chilcano de pisco con mango, jarra" },
 { id:"G01", cat:"Gaseosas", name:"Inka Cola 2L", price:15, desc:"Inka Cola 2 litros" },
 { id:"G02", cat:"Gaseosas", name:"Coca Cola 2L", price:15, desc:"Coca Cola 2 litros" },
 { id:"G03", cat:"Gaseosas", name:"Inca Kola 1L", price:8, desc:"Inca Kola 1 litro" },
 { id:"G04", cat:"Gaseosas", name:"Coca Cola 1L", price:8, desc:"Coca Cola 1 litro" },
 { id:"G05", cat:"Gaseosas", name:"Gordita", price:5, desc:"Gaseosa gordita" },
 { id:"G06", cat:"Gaseosas", name:"Coca Cola Personal", price:2.50, desc:"Coca Cola personal" },
 { id:"G07", cat:"Gaseosas", name:"Inka Cola Personal", price:2.50, desc:"Inka Cola personal" },
 { id:"G08", cat:"Gaseosas", name:"Agua Mineral", price:3, desc:"Agua mineral sin gas" },
 { id:"G09", cat:"Gaseosas", name:"Inca Kola 600ml", price:4, desc:"Inca Kola 600ml" },
 { id:"G10", cat:"Gaseosas", name:"Coca Cola 600ml", price:4, desc:"Coca Cola 600ml" },
 { id:"O01", cat:"Otros", name:"Café Pasado", price:4, desc:"Café pasado tradicional" },
 { id:"O02", cat:"Otros", name:"Infusiones", price:3, desc:"Variedad de infusiones calientes" },
 { id:"EX01", cat:"Extras", name:"Porción de Papas", price:6, desc:"Porción extra de papas fritas" },
 { id:"EX02", cat:"Extras", name:"Porción de Ensalada", price:4, desc:"Porción extra de ensalada" },
 { id:"EX03", cat:"Extras", name:"Porción de Chaufa", price:6, desc:"Porción extra de arroz chaufa" },
 { id:"EX04", cat:"Extras", name:"Arroz Blanco en Molde", price:3, desc:"Porción de arroz blanco" },
 // ── TAPERS ──────────────────────────────────────────────────────────
 { id:"TP01", cat:"Tapers", name:"Taper Pequeño", price:1.00, desc:"Taper pequeño para llevar" },
 { id:"TP02", cat:"Tapers", name:"Taper Mediano", price:1.50, desc:"Taper mediano para llevar" },
 { id:"TP03", cat:"Tapers", name:"Taper Grande", price:2.00, desc:"Taper grande para llevar" },
 { id:"TP04", cat:"Tapers", name:"Bolsa Pequeña", price:0.50, desc:"Bolsa pequeña para llevar" },
 { id:"TP05", cat:"Tapers", name:"Bolsa Grande", price:1.00, desc:"Bolsa grande para llevar" },
];

const ALL_CATS = [...new Set(MENU_BASE.map(i => i.cat))];
const SALSAS_ALITAS = ["Clásica", "Maracuyá", "BBQ", "Picante", "Huancaina", "Mango Abanero", "Broaster", "Hawaiana", "Acevichada", "Maracumango", "Aguaimanto"];

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
 [ Toca la pantalla para entrar ]
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

// ═══════════════════════════════════════════════════════════════════
// STAFF POR DEFECTO (primer arranque)
// ═══════════════════════════════════════════════════════════════════
const DEFAULT_STAFF = [
 { id:"u_admin",   name:"Administrador", roles:["admin"],            pinHash:null },
 { id:"u_cajero",  name:"Cajero",        roles:["cajero"],           pinHash:null },
 { id:"u_mesero1", name:"Mesero 1",      roles:["mesero"],           pinHash:null },
 { id:"u_cocina",  name:"Cocina",        roles:["cocinero"],         pinHash:null },
];

const ROLE_INFO = {
 admin:    { label:"Administrador", color:"#FFD700", icon:"👑" },
 cajero:   { label:"Cajero",        color:"#3498db", icon:"💰" },
 mesero:   { label:"Mesero",        color:"#27ae60", icon:"🍽" },
 cocinero: { label:"Cocina",        color:"#e67e22", icon:"👨‍🍳" },
};

// ═══════════════════════════════════════════════════════════════════
// DEV PANEL — acceso master sin PIN (solo desarrollador)
// ═══════════════════════════════════════════════════════════════════
const DEV_SECRET = "dev2024papachos"; // Código secreto del desarrollador

function DevPanel({ onClose, onDevLogin, s, Y, isMobile }) {
 const locales = [
  { id:"amazonas", nombre:"Amazonas" },
  { id:"sanmartin", nombre:"San Martín" },
  { id:"belen", nombre:"Belén" },
 ];
 const [selectedLocal, setSelectedLocal] = useState("amazonas");
 const [staff, setStaff] = useState([]);
 const [loading, setLoading] = useState(false);
 const [editingUser, setEditingUser] = useState(null);
 const [newPin, setNewPin] = useState("");
 const [localToast, setLocalToast] = useState(null);
 const [activeTab, setActiveTab] = useState("acceso"); // "acceso" | "staff"

 const toast_ = (msg, color="#27ae60") => { setLocalToast({msg,color}); setTimeout(()=>setLocalToast(null),2500); };

 const loadLocal = async (id) => {
  setLoading(true); setStaff([]); setEditingUser(null);
  const fs = FS(id);
  let users = await fs.getStaff();
  if (users === undefined || users === null) {
   // Try backup first
   const backup = fs.getStaffBackup();
   users = backup || DEFAULT_STAFF;
  } else if (users.length === 0) {
   const backup = fs.getStaffBackup();
   users = (backup && backup.length > 0) ? backup : DEFAULT_STAFF;
  }
  setStaff(users);
  setLoading(false);
 };

 useEffect(() => { loadLocal(selectedLocal); }, [selectedLocal]);

 const safeUpdateStaff = async (updaterFn) => {
  // Always read fresh from Firebase, apply change, then write back
  const fs = FS(selectedLocal);
  let fresh = await fs.getStaff();
  if (!fresh || fresh === undefined || fresh.length === 0) {
   fresh = staff; // fallback to local state if Firebase read fails
  }
  const updated = updaterFn(fresh);
  setStaff(updated);
  const ok = await fs.saveStaff(updated);
  if (!ok) toast_("⚠️ Error al guardar — intenta de nuevo", "#e74c3c");
  return ok;
 };

 const handleResetPin = async (userId) => {
  await safeUpdateStaff(users => users.map(u => u.id === userId ? {...u, pinHash: null} : u));
  toast_("🔑 PIN reseteado", "#e67e22");
 };

 const handleForcePin = async (userId) => {
  if (newPin.length < 4) return;
  const hash = await sha256(newPin);
  await safeUpdateStaff(users => users.map(u => u.id === userId ? {...u, pinHash: hash} : u));
  setNewPin(""); setEditingUser(null);
  toast_("✅ PIN actualizado");
 };

 const handleDeleteUser = async (userId) => {
  await safeUpdateStaff(users => users.filter(u => u.id !== userId));
  toast_("🗑 Usuario eliminado", "#e74c3c");
 };

 const handleDevEnter = (user, role) => {
  const locName = locales.find(l=>l.id===selectedLocal)?.nombre || selectedLocal;
  onDevLogin({
   id: role, label: ROLE_INFO[role]?.label || role,
   name: `[DEV] ${user.name}`, userId: user.id,
   activeRole: role, roles: user.roles,
   localId: selectedLocal, localName: locName,
   _isDev: true,
  });
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
 const [devInput, setDevInput] = useState("");
 const [showDev, setShowDev] = useState(false);
 const [step, setStep]               = useState("local");
 const [selectedLocal, setSelectedLocal] = useState("amazonas");
 const [selectedRole, setSelectedRole] = useState(null);
 const [staff, setStaff]             = useState([]);
 const [loadingStaff, setLoadingStaff] = useState(false);
 const [selectedUser, setSelectedUser] = useState(null);
 const [pin, setPin]                 = useState("");
 const [error, setError]             = useState("");
 const [checking, setChecking]       = useState(false);
 const [devClickCount, setDevClickCount] = useState(0);

 const locales = [
  { id:"amazonas",  nombre:"Amazonas"  },
  { id:"sanmartin", nombre:"San Martín" },
  { id:"belen",     nombre:"Belén"     },
 ];

 const roleOrder = ["admin","cajero","mesero","cocinero"];

 const loadStaff = async (localId, retries = 2) => {
  setLoadingStaff(true);
  const fs = FS(localId);

  let users = await fs.getStaff(); // null=new doc, undefined=error, []=exists but empty

  if (users === undefined) {
   // Network/permission error → try backup
   const backup = fs.getStaffBackup();
   if (backup) {
    console.warn("loadStaff: using localStorage backup due to Firebase error");
    users = backup;
   } else if (retries > 0) {
    // Retry after brief delay
    await new Promise(r => setTimeout(r, 1200));
    setLoadingStaff(false);
    return loadStaff(localId, retries - 1);
   } else {
    // Complete failure — show error, do NOT overwrite Firebase
    setLoadingStaff(false);
    setError("No se pudo cargar el personal. Revisa tu conexión.");
    return;
   }
  }

  if (users === null) {
   // Document truly doesn't exist → seed DEFAULT_STAFF (first time only)
   users = DEFAULT_STAFF;
   await fs.saveStaff(users);
  } else if (users.length === 0) {
   // Document exists but users array empty → try backup before touching Firebase
   const backup = fs.getStaffBackup();
   if (backup && backup.length > 0) {
    console.warn("loadStaff: users array empty in Firebase, restoring from backup");
    users = backup;
    await fs.saveStaff(users); // restore
   } else {
    // Truly empty (e.g., dev wiped it) → seed defaults
    users = DEFAULT_STAFF;
    await fs.saveStaff(users);
   }
  }

  setStaff(users);
  setLoadingStaff(false);
 };

 const handleSelectLocal = async (localId) => {
  setSelectedLocal(localId);
  await loadStaff(localId);
  setStep("role");
 };

 const handleSelectRole = (role) => {
  setSelectedRole(role);
  setStep("user");
 };

 const handleSelectUser = (user) => {
  setSelectedUser(user); setPin(""); setError(""); setStep("pin");
 };

 const handlePinDigit = (d) => { if (pin.length < 6) setPin(p => p + d); };
 const handlePinDel   = ()  => setPin(p => p.slice(0, -1));

 const handlePinSubmit = async () => {
  if (pin.length < 4) return;
  setChecking(true); setError("");
  const hash = await sha256(pin);
  const fs = FS(selectedLocal);
  if (!selectedUser.pinHash) {
   // Read fresh from Firebase before writing to avoid overwriting other users
   let freshUsers = await fs.getStaff();
   if (!freshUsers || freshUsers === undefined) freshUsers = staff; // fallback to cached
   const updated = (freshUsers || staff).map(u => u.id === selectedUser.id ? { ...u, pinHash: hash } : u);
   await fs.saveStaff(updated);
   setStaff(updated);
   proceedLogin({ ...selectedUser, pinHash: hash });
  } else if (hash === selectedUser.pinHash) {
   proceedLogin(selectedUser);
  } else {
   setError("PIN incorrecto — inténtalo de nuevo");
   setPin("");
  }
  setChecking(false);
 };

 const proceedLogin = (user) => {
  // Si tiene múltiples roles y el rol seleccionado es uno de ellos, usar directo
  if (user.roles.includes(selectedRole)) {
   finishLogin(user, selectedRole);
  } else if (user.roles.length > 1) {
   setStep("role_final");
  } else {
   finishLogin(user, user.roles[0]);
  }
 };

 const finishLogin = (user, role) => {
  const locName = locales.find(l => l.id === selectedLocal)?.nombre || selectedLocal;
  onLogin({
   id: role, label: ROLE_INFO[role]?.label || role,
   name: user.name, userId: user.id,
   activeRole: role, roles: user.roles,
   localId: selectedLocal, localName: locName,
  });
 };

 // Usuarios filtrados por el rol seleccionado
 const filteredStaff = staff.filter(u => u.roles.includes(selectedRole));

 const cardBtn = { ...s.btn("secondary"), padding:"14px 20px", fontSize:15, fontWeight:900,
  textAlign:"left", display:"flex", alignItems:"center", gap:12,
  border:"1px solid #2a2a2a", width:"100%", cursor:"pointer" };

 // Hidden dev mode: triple-tap on subtitle
 const handleDevTap = () => {
  const next = devClickCount + 1;
  setDevClickCount(next);
  if (next >= 7) { setShowDev(true); setDevClickCount(0); }
 };

 if (showDev) return <DevPanel onClose={() => setShowDev(false)} onDevLogin={onLogin} s={s} Y={Y} isMobile={isMobile} />;

 return (
  <div style={{background:"#111",minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",color:"#fff",padding:20}}>
   <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:38,color:Y,letterSpacing:3,marginBottom:4}}>MR. PAPACHOS</div>
   <div onClick={handleDevTap} style={{fontSize:10,color:"#333",letterSpacing:2,marginBottom:36,textTransform:"uppercase",cursor:"default",userSelect:"none"}}>
    Sistema de Gestión · Cajamarca
   </div>

   {/* ── PASO: SUCURSAL ── */}
   {step === "local" && (
    <div style={{width:"100%",maxWidth:320}}>
     <div style={{fontSize:11,color:"#666",textTransform:"uppercase",letterSpacing:1,marginBottom:14,textAlign:"center"}}>Selecciona tu sucursal</div>
     <div style={{display:"flex",flexDirection:"column",gap:10}}>
      {locales.map(loc => (
       <button key={loc.id} onClick={() => handleSelectLocal(loc.id)}
        style={{...cardBtn, justifyContent:"center", fontSize:17, padding:18}}>
        {loc.nombre}
       </button>
      ))}
     </div>
    </div>
   )}

   {/* ── PASO: ROL ── */}
   {step === "role" && (
    <div style={{width:"100%",maxWidth:320}}>
     <button onClick={() => setStep("local")} style={{...s.btn("secondary"),marginBottom:16,fontSize:11,padding:"4px 12px"}}>← Sucursal</button>
     <div style={{fontSize:11,color:"#666",textTransform:"uppercase",letterSpacing:1,marginBottom:14,textAlign:"center"}}>
      ¿Con qué rol ingresas?
     </div>
     {loadingStaff
      ? <div style={{textAlign:"center",color:"#555",padding:20}}>Cargando...</div>
      : <div style={{display:"flex",flexDirection:"column",gap:10}}>
         {roleOrder.filter(role => staff.some(u => u.roles.includes(role))).map(role => {
          const info = ROLE_INFO[role];
          const count = staff.filter(u => u.roles.includes(role)).length;
          return (
           <button key={role} onClick={() => handleSelectRole(role)}
            style={{...cardBtn, border:`2px solid ${info.color}33`, padding:"16px 20px"}}>
            <div>
             <div style={{color:info.color,fontWeight:900,fontSize:15}}>{info.label}</div>
             <div style={{fontSize:10,color:"#555",marginTop:2}}>{count} usuario{count!==1?"s":""} disponible{count!==1?"s":""}</div>
            </div>
           </button>
          );
         })}
        </div>
     }
    </div>
   )}

   {/* ── PASO: USUARIO (filtrado por rol) ── */}
   {step === "user" && (
    <div style={{width:"100%",maxWidth:320}}>
     <button onClick={() => setStep("role")} style={{...s.btn("secondary"),marginBottom:16,fontSize:11,padding:"4px 12px"}}>← Roles</button>
     <div style={{fontSize:11,color:"#666",textTransform:"uppercase",letterSpacing:1,marginBottom:14,textAlign:"center"}}>
      {ROLE_INFO[selectedRole]?.label} — ¿Quién eres?
     </div>
     <div style={{display:"flex",flexDirection:"column",gap:8}}>
      {filteredStaff.map(user => (
       <button key={user.id} onClick={() => handleSelectUser(user)} style={cardBtn}>
        <div style={{width:38,height:38,borderRadius:10,background:`${ROLE_INFO[selectedRole]?.color}22`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:18}}>
         {user.name.charAt(0).toUpperCase()}
        </div>
        <div>
         <div style={{fontSize:15,fontWeight:900,color:"#eee"}}>{user.name}</div>
         <div style={{fontSize:10,color:"#555",marginTop:2}}>
          {!user.pinHash && <span style={{color:"#e67e22"}}>Sin PIN (primera vez)</span>}
          {user.pinHash && <span style={{color:"#27ae60"}}>PIN activo ✓</span>}
         </div>
        </div>
       </button>
      ))}
     </div>
    </div>
   )}

   {/* ── PASO: PIN ── */}
   {step === "pin" && selectedUser && (
    <div style={{width:"100%",maxWidth:290,textAlign:"center"}}>
     <button onClick={() => { setStep("user"); setPin(""); setError(""); }}
      style={{...s.btn("secondary"),marginBottom:16,fontSize:11,padding:"4px 12px"}}>← Volver</button>
     <div style={{fontSize:19,fontWeight:900,marginBottom:3}}>{selectedUser.name}</div>
     <div style={{fontSize:11,color:"#555",marginBottom:!selectedUser.pinHash?8:20}}>
      {selectedUser.pinHash ? "Ingresa tu PIN" : "🔑 Primera vez — crea tu PIN"}
     </div>
     {!selectedUser.pinHash && (
      <div style={{fontSize:10,color:"#e67e22",marginBottom:18,padding:"6px 12px",background:"#120e00",borderRadius:8,border:"1px solid #e67e2233"}}>
       Elige un PIN de 4 a 6 dígitos. Lo usarás cada vez que entres.
      </div>
     )}
     <div style={{display:"flex",justifyContent:"center",gap:10,marginBottom:22}}>
      {Array.from({length:6}).map((_,i) => (
       <div key={i} style={{width:13,height:13,borderRadius:"50%",transition:"all .15s",
        background: i < pin.length ? Y : "transparent",
        border: `2px solid ${i < pin.length ? Y : "#444"}`}} />
      ))}
     </div>
     <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:14}}>
      {["1","2","3","4","5","6","7","8","9","","0","⌫"].map((d,i) => (
       <button key={i} onClick={() => d === "⌫" ? handlePinDel() : d ? handlePinDigit(d) : null}
        disabled={!d && d !== "0"}
        style={{height:54,borderRadius:12,fontSize:d==="⌫"?18:22,fontWeight:700,cursor:d===""?"default":"pointer",
         background:d==="⌫"?"#222":d===""?"transparent":"#1e1e1e",
         border:d===""?"none":"1px solid #333",color:"#eee",opacity:d===""?0:1}}>
        {d}
       </button>
      ))}
     </div>
     {error && <div style={{color:"#e74c3c",fontSize:12,fontWeight:700,marginBottom:10}}>{error}</div>}
     <button onClick={handlePinSubmit}
      disabled={pin.length < 4 || checking}
      style={{...s.btn("primary"),width:"100%",padding:14,fontSize:16,opacity:pin.length<4?0.4:1}}>
      {checking ? "Verificando..." : selectedUser.pinHash ? "Entrar" : "Crear PIN y entrar"}
     </button>
    </div>
   )}
  </div>
 );
}

// ═══════════════════════════════════════════════════════════════════
// BOTÓN DE CIERRE UNIVERSAL — visible, hover rojo, fácil de tocar
// ═══════════════════════════════════════════════════════════════════
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
const BEBIDAS_SABORES = ["Chicha Morada","Limonada","Maracuyá","Piña","Cebada","Fresa"];
const BEBIDAS_ESTILOS = ["Normal","Frozen"];

// Ítems que requieren personalización
const ITEMS_CON_ELECCION = {
 "H02": { // Hamburguesa Piolín
  steps: [
   { key:"proteina", label:"¿Carne o Pollo?", options:["Carne","Pollo"] },
  ]
 },
 "C01": { // Combo Personal
  steps: [
   { key:"plato", label:"¿Qué plato deseas?", options:["Hamburguesa Piolín","Salchipapa Sencilla"] },
   { key:"bebida_sabor", label:"¿Sabor de la bebida (vaso)?", options: BEBIDAS_SABORES },
  ]
 },
 "C02": { // Combo Cajacho
  steps: [
   { key:"bebida_sabor", label:"¿Sabor de la bebida (1L)?", options: BEBIDAS_SABORES },
   { key:"bebida_estilo", label:"¿Normal o Frozen?", options: BEBIDAS_ESTILOS },
  ]
 },
 "C03": { // Combo Familiar
  steps: [
   { key:"bebida_sabor", label:"¿Sabor de la bebida (1.5L)?", options: BEBIDAS_SABORES },
   { key:"bebida_estilo", label:"¿Normal o Frozen?", options: BEBIDAS_ESTILOS },
  ]
 },
 "C04": { // Combo Papachos
  steps: [
   { key:"bebida_sabor", label:"¿Sabor de la bebida (2L)?", options: BEBIDAS_SABORES },
   { key:"bebida_estilo", label:"¿Normal o Frozen?", options: BEBIDAS_ESTILOS },
  ]
 },
 "R01": { // Ronda de Sabores 20pz
  steps: [
   { key:"bebida_sabor", label:"¿Sabor de la bebida (1L)?", options: BEBIDAS_SABORES },
   { key:"bebida_estilo", label:"¿Normal o Frozen?", options: BEBIDAS_ESTILOS },
  ]
 },
 "R02": { // Ronda de Sabores XL 30pz
  steps: [
   { key:"bebida_sabor", label:"¿Sabor de la bebida (1.5L)?", options: BEBIDAS_SABORES },
   { key:"bebida_estilo", label:"¿Normal o Frozen?", options: BEBIDAS_ESTILOS },
  ]
 },
};

function ComboCustomizacionModal({ item, onConfirm, onClose, s, Y }) {
 const config = ITEMS_CON_ELECCION[item.id];
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
   const noteStr = Object.entries(newSel)
    .map(([k, v]) => {
     if (k === "proteina") return `Proteína: ${v}`;
     if (k === "plato") return `Plato: ${v}`;
     if (k === "bebida_sabor") return `Bebida: ${v}`;
     if (k === "bebida_estilo") return v;
     return v;
    })
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
function SalsasModalComponent({ initialSalsas = [], onSave, onClose, s, Y }) {
 const [selected, setSelected] = useState(initialSalsas);

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
 {SALSAS_ALITAS.map(salsa => {
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
function EditOrderModal({ order, onSave, onClose, menu, isMobile, s, Y, isAdmin=true, currentUser, onRequestPrecio }) {
 const [eTable, setETable] = useState(order.table);
 const [eItems, setEItems] = useState(order.items.map(i => ({ ...i, individualNotes: i.individualNotes || Array(i.qty).fill("") })));
 const [eNotes, setENotes] = useState(order.notes || "");
 const [ePhone, setEPhone] = useState(order.phone || "");
 const [eOrderType, setEOrderType] = useState(order.orderType || "mesa");

 const [eCat, setECat] = useState("Todos");
 const [eSearch, setESearch] = useState("");
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
 if (ITEMS_CON_ELECCION[item.id]) {
 setEComboModal(item);
 } else if (["Alitas", "Alichaufa", "Rondas"].includes(item.cat)) {
 setSalsasModal({ itemToAdd: item, salsas: [] });
 } else {
 eAddItem(item);
 }
 };

 return (
 <div style={s.modal} onClick={e => e.stopPropagation()}>
 {eComboModal && (
 <ComboCustomizacionModal item={eComboModal} s={s} Y={Y}
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
 <button key={t} style={{ ...s.btn(eOrderType===t?"primary":"secondary"), flex:1 }}
 onClick={() => { setEOrderType(t); }}>
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
 {["Alitas", "Alichaufa", "Rondas"].includes(item.cat) && (
 <button style={{...s.btn("secondary"), padding:"2px 6px", fontSize:10, marginLeft:6}} onClick={() => setSalsasModal({cartId: item.cartId, salsas: item.salsas || []})}>
 Salsas
 </button>
 )}
 {eOrderType === "mesa" && (
 <button
  style={{...s.btn(item.isLlevar?"blue":"secondary"), padding:"2px 8px", fontSize:10, marginLeft:6}}
  onClick={() => setEItems(prev=>prev.map(i=>i.cartId===item.cartId?{...i,isLlevar:!i.isLlevar}:i))}>
  {item.isLlevar?"🥡 Llevar":"🍽 Mesa"}
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
 {["Todos",...ALL_CATS].map(c => (
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
  onConfirm({
   efectivo: Number(ef||0), yape: Number(ya||0), tarjeta: Number(ta||0),
   descuentoPct: descMode === "pct" ? (Number(descPct)||0) : 0,
   descuentoAmt: totalDescuento,
   descuentoMotivo: descMotivo,
   totalOriginal: total, totalFinal,
   itemDiscounts: hasItemDiscounts ? itemDiscounts : undefined,
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
  style={{...s.btn("success"), width:"100%", padding:14, fontSize:16, opacity: Math.abs(diff)>0.01 ? 0.45 : 1}}
  onClick={handleConfirm} disabled={Math.abs(diff)>0.01}>
  ✅ Confirmar Cobro {totalDescuento > 0 ? `(ahorro −${fmt(totalDescuento)})` : ""}
 </button>
 </div>
 )
}

// ═══════════════════════════════════════════════════════════════════
// NUEVO PEDIDO (Carrito)
// ═══════════════════════════════════════════════════════════════════
function NuevoPedidoComponent({ draft, setDraft, menu, addItem, changeQty, updateIndividualNote, draftTotal, fmt, submitOrder, newDraft, s, Y, isDesktop, isMobile, isTablet, mesasArr, cajaAbierta }) {
 const [search, setSearch] = useState("");
 const [catFilter, setCatFilter] = useState("Todos");
 const [showCartModal, setShowCartModal] = useState(false);
 const [salsasModal, setSalsasModal] = useState(null);
 const [comboModal, setComboModal] = useState(null); // item requiring customization

 const filteredMenu = menu.filter(i => (catFilter === "Todos" || i.cat === catFilter) && i.name.toLowerCase().includes(search.toLowerCase()));
 const itemCount = draft.items.reduce((sum, i) => sum + i.qty, 0);

 const handleCartaClick = (item) => {
 if (ITEMS_CON_ELECCION[item.id]) {
 setComboModal(item);
 } else if (["Alitas", "Alichaufa", "Rondas"].includes(item.cat)) {
 setSalsasModal({ itemToAdd: item, salsas: [] });
 } else {
 addItem(item);
 }
 };

 const CartContent = () => (
 <div style={{ ...s.cardHL, position: isDesktop ? "sticky" : "static", top:8, background: isMobile ? "#1a1a1a" : "#1c1c1c", border: isMobile ? "none" : `1px solid ${Y}44`, padding: isMobile ? 0 : 14, display: isDesktop ? "flex" : "block", flexDirection: "column", maxHeight: isDesktop ? "calc(100vh - 120px)" : "none", overflowY: isDesktop ? "hidden" : "auto" }}>
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
 <ComboCustomizacionModal item={comboModal} s={s} Y={Y}
  onClose={() => setComboModal(null)}
  onConfirm={(item, selections, noteStr) => {
   const cartId = `${item.id}-${Date.now()}`;
   addItem({ ...item, cartId, _comboNote: noteStr });
   setComboModal(null);
  }}
 />
 )}

 <div style={{ flexShrink: 0 }}>
 <div style={{ ...s.title, fontSize:22, marginBottom:12, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
 <span>🛒 PEDIDO ACTUAL</span>
 {isMobile && <CloseBtn onClose={() => setShowCartModal(false)} />}
 </div>

 <div style={{ marginBottom:10 }}>
 <label style={{ fontSize:11, color:"#888", textTransform:"uppercase", letterSpacing:1 }}>Tipo de pedido</label>
 <div style={{ display:"flex", gap:6, marginTop:4 }}>
 {["mesa","llevar"].map(t => (
 <button key={t} style={{ ...s.btn(draft.orderType===t?"primary":"secondary"), flex:1 }}
 onClick={() => setDraft(d => ({...d, orderType:t, taperCost:0, payTiming: t==="llevar"?"ahora":"despues", table:"", phone:"", deliveryAddress:""}))}>
 {t==="mesa"?"Mesa":"Para llevar"}
 </button>
 ))}
 </div>

 {draft.orderType === "mesa" ? (
 <select style={{ ...s.input, marginTop:6 }}
 value={draft.table}
 onChange={e => setDraft(d => ({...d, table: e.target.value}))}>
 <option value="">-- Seleccionar Mesa --</option>
 {(mesasArr||[]).map(n => (
 <option key={n} value={String(n)}>Mesa {n}</option>
 ))}
 </select>
 ) : (
 <div style={{marginTop:6, display:"flex", flexDirection:"column", gap:6}}>
 <input style={s.input}
 placeholder="Nombre del cliente (opcional)"
 value={draft.table || ""}
 onChange={e => setDraft(d => ({...d, table: e.target.value}))}
 spellCheck="false" />
 <input style={s.input}
 placeholder="Número de teléfono (opcional)"
 value={draft.phone || ""}
 onChange={e => setDraft(d => ({...d, phone: e.target.value}))}
 spellCheck="false" />
 <input style={s.input}
 placeholder="Dirección de entrega (opcional)"
 value={draft.deliveryAddress || ""}
 onChange={e => setDraft(d => ({...d, deliveryAddress: e.target.value}))}
 spellCheck="false" />
 </div>
 )}
 </div>

 <div style={{ marginBottom:10 }}>
 <label style={{ fontSize:11, color:"#888", textTransform:"uppercase", letterSpacing:1 }}>Momento del Cobro</label>
 <div style={{ display:"flex", gap:6, marginTop:4 }}>
 <button style={{ ...s.btn(draft.payTiming==="despues"?"primary":"secondary"), flex:1 }} onClick={() => setDraft(d => ({...d,payTiming:"despues"}))}> Pagar después</button>
 <button style={{ ...s.btn(draft.payTiming==="ahora"?"primary":"secondary"), flex:1 }} onClick={() => setDraft(d => ({...d,payTiming:"ahora"}))}> Pagar ahora</button>
 </div>
 </div>

 <div style={{ marginBottom:12 }}>
 <label style={{ fontSize:11, color:"#888", textTransform:"uppercase", letterSpacing:1 }}>Notas Generales</label>
 <textarea style={{ ...s.input, marginTop:4, resize:"vertical", minHeight:60, fontFamily:"inherit" }} value={draft.notes}
 onChange={e => setDraft(d => ({...d, notes: e.target.value}))} placeholder="Sin cebolla en general..." spellCheck="false" />
 </div>
 </div>

 {draft.items.length === 0
 ? <div style={{ textAlign:"center", color:"#444", padding:"20px 0", fontSize:13 }}>Toca un platillo para agregarlo →</div>
 : <div style={{ flexGrow: isDesktop ? 1 : 0, maxHeight: isDesktop ? "none" : "none", overflowY: "auto", marginBottom:8, minHeight: 0 }}>
 {draft.items.map(item => (
 <div key={item.cartId} style={{ marginBottom:10, padding:"10px", background:"#0a0a0a", borderRadius:8, border:"1px solid #222" }}>
 <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:8, paddingBottom:8, borderBottom:"1px solid #252525" }}>
 <div style={{ flex:1 }}>
 <div style={{ fontWeight:700, fontSize:14 }}>
 {item.name} 
 {["Alitas", "Alichaufa", "Rondas"].includes(item.cat) && (
 <button style={{...s.btn("secondary"), padding:"2px 6px", fontSize:10, marginLeft:6}} onClick={() => setSalsasModal({cartId: item.cartId, salsas: item.salsas || []})}>
 Salsas
 </button>
 )}
 </div>
 {draft.orderType === "mesa" && (
 <button
  style={{...s.btn(item.isLlevar?"blue":"secondary"), padding:"2px 8px", fontSize:10, marginTop:4}}
  onClick={() => setDraft(d => ({...d, items: d.items.map(i => i.cartId===item.cartId ? {...i, isLlevar:!i.isLlevar} : i)}))}>
  {item.isLlevar ? "🥡 Para llevar" : "🍽 Para mesa"}
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
 </div>
 }

 <div style={{ flexShrink: 0 }}>
 <div style={{ display:"flex", justifyContent:"space-between", padding:"10px 0", borderTop:`2px solid ${Y}55`, marginBottom:12 }}><span style={{ fontWeight:900, fontSize:17 }}>TOTAL</span><span style={{ fontWeight:900, fontSize:17, color:Y }}>{fmt(draftTotal)}</span></div>

 <button style={{ ...s.btn(), width:"100%", padding:16, fontSize:16, opacity:((!cajaAbierta) || (draft.orderType==="mesa" && !draft.table || !draft.items.length))?0.4:1 }}
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
 onSave={(salsas) => {
 const customizedItem = { ...salsasModal.itemToAdd, cartId: `${salsasModal.itemToAdd.id}-${Date.now()}`, salsas };
 addItem(customizedItem);
 setSalsasModal(null);
 }} 
 onClose={() => setSalsasModal(null)} s={s} Y={Y} 
 />
 )}
 {comboModal && !comboModal._fromCart && (
 <ComboCustomizacionModal item={comboModal} s={s} Y={Y}
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
 {["Todos",...ALL_CATS].map(c => <button key={c} style={{ ...s.btn(catFilter===c?"primary":"secondary"), fontSize: isMobile?9:10, padding: isMobile?"3px 6px":"4px 10px" }} onClick={() => setCatFilter(c)}>{c}</button>)}
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
 <script>window.onload=()=>window.print()<\/script>
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
 <script>window.onload=()=>window.print()<\/script>
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
 const isAdmin = currentUser?.id === "admin";
 const [fondoInput, setFondoInput] = useState("");
 const [showCierreModal, setShowCierreModal] = useState(false);
 const [cierreData, setCierreData] = useState(null);
 const [showSoundPanel, setShowSoundPanel] = useState(false);

 const testSound = () => { playBeeps(soundConfig); speak("Prueba de sonido"); };

 // Usar paidAt para agrupar el día (si pagó hoy, cuenta hoy aunque creado ayer)
 const today = new Date().toDateString();
 const paidArchivedToday = history.filter(o =>
  o.status==="pagado" && new Date(o.paidAt || o.createdAt).toDateString()===today
 );
 // Only count orders still in active list (not yet archived to history)
 const paidActiveToday = orders.filter(o =>
  o.isPaid && new Date(o.paidAt || o.createdAt).toDateString()===today
 );
 const allPaidToday = [...paidArchivedToday, ...paidActiveToday];
 // Total en caja efectivo = fondo inicial + efectivo cobrado
 
 // 1. Primero declara e inicializa las bases
const cashRev = allPaidToday.reduce((s,o) => s + getPay(o,"efectivo"), 0);
const todayRev = allPaidToday.reduce((s,o) => s + o.total, 0);
const yapeRev = allPaidToday.reduce((s,o) => s + getPay(o,"yape"), 0);
const cardRev = allPaidToday.reduce((s,o) => s + getPay(o,"tarjeta"), 0);

const totalRev = history.filter(o => o.status==="pagado").reduce((s,o) => s + o.total, 0)
               + paidActiveToday.reduce((s,o) => s + o.total, 0);

// 2. Luego usa cashRev de forma segura
// Total en caja efectivo = fondo inicial + efectivo cobrado
const totalEnCaja = (caja?.fondoInicial||0) + cashRev;

 const handleCerrar = async () => {
  const corte = await cerrarCaja();
  if (corte) { setCierreData(corte); setShowCierreModal(true); }
 };

 return (
 <div>
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
        placeholder="Fondo S/."
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
    {caja?.isOpen && allPaidToday.length > 0 && (
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
      {caja.cortes.slice(-3).reverse().map((c,i) => (
       <div key={i} style={{display:"flex", justifyContent:"space-between", fontSize:11, color:"#777", padding:"3px 0", borderBottom:"1px solid #1a1a1a"}}>
        <span>{new Date(c.cierreAt).toLocaleTimeString("es-PE",{hour:"2-digit",minute:"2-digit"})} · {c.cerradoBy}</span>
        <span style={{color:"#aaa", fontWeight:700}}>S/.{c.total.toFixed(2)} · {c.pedidosCobrados} pedidos</span>
       </div>
      ))}
     </div>
    )}
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
  {allPaidToday.length > 0 && (
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
       <span style={{color:"#888"}}>Fondo inicial</span>
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
 
 return (
 <div>
 <div style={{...s.row, marginBottom:14}}>
 <div style={{display:"flex", alignItems:"center", gap:12}}>
 <div style={s.title}> MESAS ({mesasArr.length})</div>
 {/* Solo el Admin puede agregar o quitar mesas */}
 {currentUser?.id === 'admin' && (
 <div style={{display:"flex", gap:4, marginBottom:10}}>
 <button style={{...s.btn("danger"), padding:"4px 12px", fontSize:18}} onClick={removeMesa}>-</button>
 <button style={{...s.btn("success"), padding:"4px 12px", fontSize:18}} onClick={addMesa}>+</button>
 </div>
 )}
 </div>
 <button style={s.btn()} onClick={() => { setDraft({...newDraft(), orderType:"llevar", payTiming:"ahora"}); setTab("nuevo"); }}>Para llevar</button>
 </div>

 <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr 1fr":"repeat(3, 1fr)", gridAutoRows: isTablet ? "minmax(25vh, auto)" : "auto", gap: isMobile ? 12 : 20, marginBottom:20 }}>
 {mesasArr.map(num => {
 const mesaOrders = orders.filter(o => o.table===String(num) && o.orderType!=="llevar");
 const ocupada = mesaOrders.length > 0;
 const total = mesaOrders.reduce((sum,o) => sum + o.total, 0);
 const hasMixto = mesaOrders.some(o => (o.items||[]).some(i=>i.isLlevar));
 return (
 <div key={num} onClick={() => setMesaModal(num)} style={{ background:ocupada?`${Y}15`:"#1c1c1c", border:`2px solid ${ocupada?Y:"#2a2a2a"}`, borderRadius:14, padding: "24px 16px", minHeight: isMobile ? 140 : isTablet ? "25vh" : 160, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", cursor:"pointer", textAlign:"center", position:"relative" }}>
 {ocupada && <div style={{position:"absolute", top:10, right:10, width:12, height:12, borderRadius:"50%", background:"#27ae60", boxShadow:"0 0 8px #27ae60"}}/>}
 {hasMixto && <div style={{position:"absolute", top:10, left:10, background:"#154360", color:"#3498db", borderRadius:6, padding:"1px 7px", fontSize:10, fontWeight:800}}>🥡 Mixto</div>}
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
 {llevarOrders.map(o => (
 <div key={o.id} style={{...s.card, borderLeft:`4px solid #3498db`}}>
 <div style={s.row}>
 <div><span style={{fontWeight:900}}> {o.table}</span>{o.isPaid&&<span style={{...s.tag("#1e5c2e"), marginLeft:6}}> Pagado</span>}</div>
 <span style={{color:Y, fontWeight:900}}>{fmt(o.total)}</span>
 </div>
 <div style={{display:"flex", gap:6, marginTop:8, flexWrap:"wrap"}}>
 {o.isPaid ? (
 <button style={{...s.btn("blue"), flex:1}} onClick={() => finishPaidOrder(o.id)}>✅ Entregado</button>
 ) : (
 <button style={{...s.btn("success"), flex:1}} onClick={() => setCobrarTarget({type:'existing', data:o})}>💰 Cobrar</button>
 )}
 {currentUser?.id === 'admin' && !o.isPaid && (
 <button style={{...s.btn("warn"), flex:1}} onClick={() => setEditingOrder(o)}>✏️ Editar</button>
 )}
 <button style={s.btn("secondary")} onClick={() => printOrder(o)}>🖨</button>
 {currentUser?.id === 'admin' && !o.isPaid && (
 <button style={{...s.btn("danger"), padding:"7px 10px"}} onClick={() => setAnulacionModal(o)}>🚫 Anular</button>
 )}
 </div>
 </div>
 ))}
 </div>
 )}
 </div>
 );
}

function MesaModalComponent({ num, orders, setDraft, newDraft, onClose, setTab, setCobrarTarget, setSplitTarget, setEditingOrder, setAnulacionModal, printOrder, isMobile, s, Y, fmt, currentUser, crearSolicitud, isAdmin }) {
 const mesaOrders = orders.filter(o => o.table===String(num) && o.orderType!=="llevar" && !o.anulado)
  .sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)); // más reciente arriba
 const isMesero = currentUser?.id === 'mesero';
 const canCobrar = isAdmin || currentUser?.id === 'cajero';
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
 {validNotes.map((n, idx) => <div key={idx} style={{fontSize:11, color:"#999", fontStyle:"italic", paddingLeft:4, marginTop:2, whiteSpace:"pre-wrap"}}>└ Plato {idx+1}: {n}</div>)}
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

function PedidosComponent({ orders, setTab, finishPaidOrder, setCobrarTarget, setSplitTarget, setEditingOrder, printOrder, cancelOrder, setConfirmDelete, setAnulacionModal, currentUser, isMobile, s, Y, fmt }) {
 const [splitOpenId, setSplitOpenId] = useState(null);
 const isAdmin = currentUser?.id === 'admin';
 const isCajero = currentUser?.id === 'cajero';
 const isMesero = currentUser?.id === 'mesero';
 const canCobrar = isAdmin || isCajero;
 const canDelete = isAdmin;
 const canAnular = true; // non-admins get "Solicitar" flow via AnulacionModal
 const [showAnulados, setShowAnulados] = useState(false);

 const handleInlineProceed = (order, items, total) => {
 setSplitOpenId(null);
 setCobrarTarget({ type:'split', data: { originalOrder: order, splitItems: items, total } });
 };

 const activeOrders = orders.filter(o => !o.anulado)
  .sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)); // más reciente arriba
 const anuladosOrders = orders.filter(o => o.anulado);

 return (
 <div>
 <style>{`.pedido-card{transition:box-shadow .15s}.pedido-card:hover{box-shadow:0 4px 20px rgba(255,215,0,.08)}`}</style>
 <div style={{...s.row, marginBottom:14}}>
 <div style={s.title}>PEDIDOS ACTIVOS</div>
 {(isAdmin || isMesero) && <button style={s.btn()} onClick={() => setTab("nuevo")}>+ Nuevo</button>}
 </div>
 {activeOrders.length === 0
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
 <div style={{marginBottom:8, paddingLeft:2}}>
 {(o.items||[]).map((item,i) => {
 const notes = (item.individualNotes||[]).filter(n=>n.trim());
 return (
 <div key={i} style={{marginBottom:4}}>
 <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", fontSize:isMobile?12:13, padding:"3px 0", borderBottom:"1px solid #1e1e1e"}}>
 <span style={{color:"#ccc"}}>
  <span style={{color:"#888", marginRight:4}}>{item.qty}×</span>
  {item.name}
  {item.isLlevar && <span style={{marginLeft:6,background:"#154360",color:"#3498db",borderRadius:4,padding:"1px 5px",fontSize:9,fontWeight:700}}>Llevar</span>}
  {item._isAdicion && <span style={{marginLeft:6,background:"#2d1a4a",color:"#c39bd3",borderRadius:4,padding:"1px 5px",fontSize:9,fontWeight:900}}>+ADICIONAL</span>}
 </span>
 <span style={{color:"#FFD700", fontWeight:900, fontSize:12, marginLeft:8, whiteSpace:"nowrap"}}>{fmt(item.price*item.qty)}</span>
 </div>
 {item.salsas?.length>0 && <div style={{fontSize:10,color:Y,paddingLeft:8,marginTop:1,fontStyle:"italic"}}>↳ {item.salsas.map(sa=>`${sa.name} (${sa.style})`).join(', ')}</div>}
 {item._comboNote && <div style={{fontSize:10,color:"#3498db",paddingLeft:8,marginTop:1,fontStyle:"italic"}}>🎯 {item._comboNote}</div>}
 {item.priceNote && <div style={{fontSize:10,color:"#e67e22",paddingLeft:8,marginTop:1}}>✏️ {item.priceNote}</div>}
 {notes.map((n,idx)=><div key={idx} style={{fontSize:10,color:"#777",fontStyle:"italic",paddingLeft:8,marginTop:1}}>└ Plato {idx+1}: {n}</div>)}
 </div>
 );
 })}
 </div>
 {o.notes && <div style={{fontSize:11,color:"#888",fontStyle:"italic",marginBottom:8,padding:"4px 8px",background:"#1a1a1a",borderRadius:4}}>"{o.notes}"</div>}
 {/* Botones según rol */}
 <div style={{display:"flex", gap:5, flexWrap:"wrap", marginTop:4}}>
 {canCobrar && (o.isPaid
 ? <button style={{...s.btn("blue"),flex:1}} onClick={()=>finishPaidOrder(o.id)}>Entregado</button>
 : <>
 <button style={{...s.btn("success"),flex:2,fontWeight:900}} onClick={()=>setCobrarTarget({type:'existing',data:o})}>💰 Cobrar</button>
 <button style={{...s.btn(splitOpen?"primary":"secondary"), flex:1}} onClick={()=>setSplitOpenId(splitOpen?null:o.id)}>
 {splitOpen ? "▲" : "✂️ Dividir"}
 </button>
 </>
 )}
 {!o.isPaid && !isMesero && (
 <button style={{...s.btn("warn"),flex:1}} onClick={()=>setEditingOrder(o)}>✏️ Editar</button>
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

function CocinaComponent({ orders, kitchenChecks, setKitchenChecks, markKitchenListo, isMobile, isDesktop, s, Y, soundConfig }) {
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
 }, [orders]);

 // Clean expired flashes
 useEffect(() => {
  const timer = setInterval(() => {
   setAnuladoFlash(p => p.filter(x => x.expiresAt > Date.now()));
  }, 1000);
  return () => clearInterval(timer);
 }, []);

 const toggleCheck = (order, itemIdx, maxQty) => {
  const orderId = order.id;
  setKitchenChecks(prev => {
   const oc = prev[orderId] || {};
   let valAnterior = oc[itemIdx];
   if (valAnterior === true) valAnterior = maxQty;
   let next = (Number(valAnterior) || 0) + 1;
   if (next > maxQty) next = 0;
   const newOrderChecks = {...oc, [itemIdx]: next};
   const kitchenItems = (order.items || []).filter(i => i.cat !== "Tapers" && i.id !== "TAPER");
   const isFullyDone = kitchenItems.length > 0 && kitchenItems.every((item, i) => {
    let val = (i === itemIdx) ? next : newOrderChecks[i];
    if (val === true) val = item.qty;
    return Number(val || 0) === item.qty;
   });
   if (isFullyDone) { setTimeout(() => markKitchenListo(orderId), 500); }
   return {...prev, [orderId]: newOrderChecks};
  });
 };

 const activeOrders = sorted.filter(order => order.kitchenStatus !== 'listo' && !order.anulado);

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
      const checks = kitchenChecks[order.id] || {};
      const mins = Math.floor((Date.now() - new Date(order.createdAt))/60000);
      const hasAdicion = (order.items||[]).some(i=>i._isAdicion);

      return (
       <div key={order.id} style={{background:mins>=15?"#1f0d0d":mins>=8?"#1f180d":"#1c1c1c", borderRadius:14, border:`2px solid ${mins>=15?"#e74c3c":mins>=8?"#e67e22":order.replacesId?"#27ae60":Y}`, padding:14, position:"relative", transition:"all .3s"}}>
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
             <div key={i} onClick={() => toggleCheck(order, i, item.qty)}
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

function HistorialComponent({ history, isMobile, s, Y, fmt, getPay, printOrder, isAdmin, currentUser, crearSolicitud, updateHistoryDoc }) {
 const [expandedSessions, setExpandedSessions] = useState(["__today__"]);
 const [histDate, setHistDate] = useState("");
 const [editCobroModal, setEditCobroModal] = useState(null);
 const [correccionModal, setCorreccionModal] = useState(null);

 // ── Agrupar por sesión de caja (_cajaSessionId) ──────────────────
 // Pedidos sin sessionId (legacy) se agrupan por fecha de creación
 const sessionMap = {};

 history.forEach(o => {
  const sid = o._cajaSessionId || ("date_" + (() => {
   const d = new Date(o.createdAt);
   return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,'0') + "-" + String(d.getDate()).padStart(2,'0');
  })());

  if (!sessionMap[sid]) {
   const isSession = o._cajaSessionId;
   // Use openedAt stored in order, or fall back to createdAt of first order
   const refDate = new Date(o._cajaOpenedAt || o.createdAt);
   const dateStr = refDate.toLocaleDateString("es-PE");
   const sortKey = refDate.getFullYear() + "-" + String(refDate.getMonth()+1).padStart(2,'0') + "-" + String(refDate.getDate()).padStart(2,'0');
   sessionMap[sid] = {
    sid,
    isSession,
    date: dateStr,
    sortKey,
    openedAt: o._cajaOpenedAt || o.createdAt,
    orders: [], total: 0, ef: 0, ya: 0, ta: 0, cancelados: 0
   };
  }
  sessionMap[sid].orders.push(o);
  if (o.status === "pagado") {
   sessionMap[sid].total += o.total;
   sessionMap[sid].ef += getPay(o,"efectivo");
   sessionMap[sid].ya += getPay(o,"yape");
   sessionMap[sid].ta += getPay(o,"tarjeta");
  } else if (o.status === "cancelado") { sessionMap[sid].cancelados += 1; }
 });

 // Sort within each session: most recent first
 Object.values(sessionMap).forEach(d => {
  d.orders.sort((a,b) => {
   const ta = new Date(a.paidAt || a.cancelledAt || a.createdAt).getTime();
   const tb = new Date(b.paidAt || b.cancelledAt || b.createdAt).getTime();
   return tb - ta;
  });
  // Update date label from earliest order if openedAt not stamped
  if (d.orders.length && !d.openedAt) {
   const earliest = [...d.orders].sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt))[0];
   const ref = new Date(earliest.createdAt);
   d.date = ref.toLocaleDateString("es-PE");
   d.sortKey = ref.getFullYear() + "-" + String(ref.getMonth()+1).padStart(2,'0') + "-" + String(ref.getDate()).padStart(2,'0');
  }
 });

 let sessionList = Object.values(sessionMap).sort((a,b) => b.sortKey.localeCompare(a.sortKey) || b.sid.localeCompare(a.sid));
 if (histDate) sessionList = sessionList.filter(d => d.sortKey === histDate);

 const toggleSession = (sid) => setExpandedSessions(prev => prev.includes(sid) ? prev.filter(s => s !== sid) : [...prev, sid]);

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
 const match = Object.values(historyByDay).find(x => x.sortKey === val); 
 if (match && !expandedDays.includes(match.date)) setExpandedDays(prev => [...prev, match.date]); 
 }} 
 />
 {histDate && <button style={{...s.btn("secondary"), padding:"8px 12px"}} onClick={()=>{setHistDate("");}}>Ver Todos</button>}
 </div>
 </div>

 {sessionList.length === 0 ? (
 <div style={{textAlign:"center", padding:60, color:"#444", background:"#1a1a1a", borderRadius:12}}>
 <div style={{fontSize:48, marginBottom:10}}></div>
 <div style={{fontSize:16, fontWeight:700}}>No hay registros para mostrar</div>
 </div>
 ) : (
 sessionList.map(d => {
 const isExpanded = expandedSessions.includes(d.sid);
 // Label: date + "Sesión de caja" if session-tagged
 const sessionLabel = d.isSession
  ? `${d.date} · Sesión ${new Date(d.openedAt).toLocaleTimeString("es-PE",{hour:"2-digit",minute:"2-digit"})}`
  : d.date;
 return (
 <div key={d.sid} style={{background:"#1c1c1c", borderRadius:12, marginBottom:16, border:"1px solid #2a2a2a", overflow:"hidden", boxShadow:"0 4px 6px rgba(0,0,0,0.3)"}}>
 <div 
 style={{padding:"16px 20px", display:"flex", justifyContent:"space-between", alignItems:"center", cursor:"pointer", background: isExpanded ? `linear-gradient(90deg, #1f1a00 0%, #1c1c1c 100%)` : "#1c1c1c", borderBottom: isExpanded ? `2px solid ${Y}55` : "none", transition:"all 0.2s"}} 
 onClick={() => toggleSession(d.sid)}
 >
 <div style={{display:"flex", alignItems:"center", gap:12}}>
 <div style={{fontSize:24}}>{d.isSession ? "🗂" : ""}</div>
 <div>
 <div style={{fontWeight:900, fontSize:18, color: isExpanded ? Y : "#eee", letterSpacing:0.5}}>{sessionLabel}</div>
 <div style={{fontSize:12, color:"#888", marginTop:2}}>
  {d.orders.filter(x => x.status==="pagado").length} pedidos cobrados {d.cancelados > 0 && <span style={{color:"#e74c3c"}}> • {d.cancelados} anulados</span>}
  {d.isSession && <span style={{color:"#555", marginLeft:6}}>· Sesión de caja</span>}
 </div>
 </div>
 </div>
 <div style={{textAlign:"right", display:"flex", alignItems:"center", gap:16}}>
 <div style={{fontWeight:900, fontSize:22, color:"#27ae60"}}>{fmt(d.total)}</div>
 <div style={{background:"#2a2a2a", borderRadius:"50%", width:32, height:32, display:"flex", alignItems:"center", justifyContent:"center", color:Y, transition:"transform 0.3s", transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)"}}>▼</div>
 </div>
 </div>

 {/* CUERPO DEL ACORDEÓN (Detalles de los pedidos) */}
 {isExpanded && (
 <div style={{padding:"20px", background:"#111"}}>
 
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

 {/* Lista de Tickets del Día */}
 <div style={{display:"flex", flexDirection:"column", gap:12}}>
 {d.orders.map((o,idx) => {
 const pe = getPay(o, "efectivo"); 
 const py = getPay(o, "yape"); 
 const pt = getPay(o, "tarjeta");
 const isCanceled = o.status === "cancelado";

 return (
 <div key={o._fid||o.id||idx} style={{background:"#1c1c1c", border:`1px solid ${isCanceled ? '#e74c3c44' : '#333'}`, borderRadius:10, padding:"14px", opacity: isCanceled ? 0.6 : 1}}>
 
 {/* Cabecera del Ticket */}
 <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:"1px solid #2a2a2a", paddingBottom:10, marginBottom:10, flexWrap:"wrap", gap:10}}>
 <div style={{display:"flex", alignItems:"center", gap:10}}>
 <span style={{fontWeight:900, fontSize:16, color: isCanceled ? "#e74c3c" : "#eee"}}>{o.orderType==="llevar" ? `🥡 ${o.table||"Sin nombre"}` : `🍽 Mesa ${o.table}`}</span>
 <span style={{...s.tag(isCanceled ? "#c0392b" : "#1e5c2e"), fontSize:10}}>{isCanceled ? "🚫 Anulado" : o.splitPayments?.length > 0 ? "✂️ Dividido" : "✅ Pagado"}</span>
 {o._correctedAt && <span style={{...s.tag("#7d3c00", "#e67e22"), fontSize:10}}>✏️ Corregido</span>}
 <span style={{color:"#666", fontSize:12}}>{timeStr(o.paidAt || o.cancelledAt || o.createdAt)}</span>
 </div>
 <div style={{display:"flex", alignItems:"center", gap:12}}>
 <div style={{textAlign:"right"}}>
 {o.descuentoPct > 0 && !isCanceled && (
 <div style={{fontSize:11, color:"#888", textDecoration:"line-through"}}>{fmt(o.totalOriginal)}</div>
 )}
 <span style={{color: isCanceled ? "#888" : o.descuentoPct > 0 ? "#27ae60" : Y, fontWeight:900, fontSize:18}}>
 {isCanceled ? <del>{fmt(o.total)}</del> : fmt(o.total)}
 </span>
 {o.descuentoPct > 0 && !isCanceled && (
 <div style={{fontSize:10, color:"#27ae60", fontWeight:700}}>🏷 −{o.descuentoPct}%</div>
 )}
 </div>
 <div style={{display:"flex", gap:6, flexWrap:"wrap"}}>
  <button style={{...s.btn("secondary"), padding:"6px 10px", fontSize:11}} onClick={(e) => { e.stopPropagation(); printOrder(o); }}>🖨 Ticket</button>
  {!isCanceled && isAdmin && o._fid && (
   <button style={{...s.btn("warn"), padding:"6px 10px", fontSize:11}} onClick={(e)=>{e.stopPropagation(); setEditCobroModal(o);}}>✏️ Editar cobro</button>
  )}
  {!isCanceled && !isAdmin && o._fid && (
   <button style={{...s.btn("blue"), padding:"6px 10px", fontSize:11}} onClick={(e)=>{e.stopPropagation(); setCorreccionModal(o);}}>📋 Solicitar corrección</button>
  )}
 </div>
 </div>
 </div>

 {/* Detalle de Pagos - Normal */}
 {!isCanceled && !o.splitPayments?.length && (
 <div style={{fontSize:11, color:"#aaa", marginBottom:10, background:"#0a0a0a", padding:"8px 12px", borderRadius:6}}>
 <div style={{display:"flex", gap:12, flexWrap:"wrap"}}>
 <span style={{fontWeight:800, color:"#777"}}>MEDIO DE PAGO:</span>
 {[pe>0&&`💵 Efectivo: ${fmt(pe)}`, py>0&&`📱 Yape: ${fmt(py)}`, pt>0&&`💳 Tarjeta: ${fmt(pt)}`].filter(Boolean).join(" | ")}
 </div>
 {o.descuentoPct > 0 && (
 <div style={{marginTop:5, color:"#27ae60", fontWeight:700}}>
 🏷 Descuento {o.descuentoPct}%: −{fmt(o.descuentoAmt)} {o.descuentoMotivo ? `· ${o.descuentoMotivo}` : ""}
 <span style={{color:"#555", marginLeft:6}}>| Precio original: {fmt(o.totalOriginal)}</span>
 </div>
 )}
 {o._correctedAt && (
 <div style={{marginTop:5, color:"#e67e22", fontWeight:700, display:"flex", alignItems:"center", gap:6}}>
 ✏️ Cobro corregido por {o._correctedBy}
 {o._correctedMotivo && <span style={{fontStyle:"italic", color:"#888"}}>· "{o._correctedMotivo}"</span>}
 </div>
 )}
 </div>
 )}

 {/* Detalle de Pagos - Dividido */}
 {!isCanceled && o.splitPayments?.length > 0 && (
 <div style={{marginBottom:10}}>
 <div style={{fontSize:11, color:"#aaa", fontWeight:800, marginBottom:6, textTransform:"uppercase", letterSpacing:1}}>✂️ Cobros por división:</div>
 {o.splitPayments.map((sp, idx) => {
 const spEf = sp.payments?.efectivo || 0;
 const spYa = sp.payments?.yape || 0;
 const spTa = sp.payments?.tarjeta || 0;
 return (
 <div key={idx} style={{background:"#0a0a0a", border:"1px solid #2a2a2a", borderRadius:6, padding:"8px 12px", marginBottom:6}}>
 <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4}}>
 <span style={{fontSize:11, fontWeight:800, color:"#888"}}>División {idx+1} · {timeStr(sp.paidAt)}</span>
 <span style={{color:Y, fontWeight:900, fontSize:13}}>{fmt(sp.total)}</span>
 </div>
 <div style={{fontSize:10, color:"#666"}}>
 {[spEf>0&&`💵 Efectivo: ${fmt(spEf)}`, spYa>0&&`📱 Yape: ${fmt(spYa)}`, spTa>0&&`💳 Tarjeta: ${fmt(spTa)}`].filter(Boolean).join(" · ")}
 </div>
 <div style={{display:"flex", flexWrap:"wrap", gap:4, marginTop:6}}>
 {sp.items.map((item, ii) => (
 <span key={ii} style={{background:"#1a1a1a", borderRadius:4, padding:"2px 7px", fontSize:10, color:"#ccc", border:"1px solid #333"}}>
 {item.qty}x {item.name}
 </span>
 ))}
 </div>
 </div>
 );
 })}
 <div style={{display:"flex", justifyContent:"space-between", padding:"6px 12px", background:"#111", borderRadius:6, fontSize:11}}>
 <span style={{color:"#777", fontWeight:800}}>TOTAL COBRADO:</span>
 <span style={{color:Y, fontWeight:900}}>{fmt(o.splitPayments.reduce((s,sp)=>s+(sp.total||0),0))}</span>
 </div>
 </div>
 )}

 {/* Platos del Ticket */}
 <div style={{display:"grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap:8}}>
 {(o.items||[]).map((item,i) => (
 <div key={i} style={{fontSize:12, color:"#ccc", padding:"8px 12px", background:"#222", borderRadius:6, borderLeft:`3px solid ${isCanceled ? '#e74c3c' : Y}`}}>
 <div style={{display:"flex", justifyContent:"space-between", fontWeight:700}}>
  <span>{item.qty}x {item.name} {item.isLlevar && <span style={{marginLeft:6, background:"#154360", color:"#3498db", borderRadius:4, padding:"1px 5px", fontSize:9}}>🥡 Llevar</span>}</span>
  <span style={{color:"#888"}}>{fmt(item.price * item.qty)}</span>
 </div>
 {item.salsas?.length > 0 && <div style={{color:Y, fontSize:10, fontStyle:"italic", marginTop:4}}>🌶 {item.salsas.map(s => `${s.name} (${s.style})`).join(', ')}</div>}
 {item._comboNote && <div style={{color:"#3498db", fontSize:10, fontStyle:"italic", marginTop:4}}>🎯 {item._comboNote}</div>}
 </div>
 ))}
 </div>
 </div>
 )
 })}
 </div>
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
 history.filter(o=>o.status==="pagado"&&inPeriod(o.createdAt)).forEach(order=>{ order.items?.forEach(item=>{counts[item.id]=(counts[item.id]||0)+item.qty;revenue[item.id]=(revenue[item.id]||0)+item.price*item.qty;}); });
 if (invPeriod==="hoy"||invPeriod==="semana"||invPeriod==="fecha") { orders.filter(o=>o.isPaid&&inPeriod(o.createdAt)).forEach(order=>{ order.items?.forEach(item=>{counts[item.id]=(counts[item.id]||0)+item.qty;revenue[item.id]=(revenue[item.id]||0)+item.price*item.qty;}); }); }

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
 {["Todos",...ALL_CATS].map(c=>(<button key={c} style={{...s.btn(invCat===c?"primary":"secondary"),fontSize:isMobile?9:10,padding:isMobile?"3px 6px":"4px 9px"}} onClick={()=>setInvCat(c)}>{c}</button>))}
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
function SolicitudesPanel({ solicitudes, onResolve, currentUser, isMobile, s, Y, fmt, updateHistoryDoc }) {
 const isAdmin = currentUser?.id === 'admin';
 const visibleSols = isAdmin
  ? solicitudes
  : solicitudes.filter(x => x.requestedBy === currentUser?.userId || x.requestedBy === currentUser?.id);
 const [rejectModal, setRejectModal] = useState(null);
 const [rejectReason, setRejectReason] = useState("");
 const [expandedId, setExpandedId] = useState(null);
 // Admin can further edit a "cobro" solicitud before approving
 const [editingSol, setEditingSol] = useState(null); // { sol, ef, ya, ta, total }

 const pendientes = visibleSols.filter(x => x.status === "pendiente");
 const resueltas  = visibleSols.filter(x => x.status !== "pendiente").slice(0, 20);

 const typeLabel  = (t) => t === "anulacion" ? "🚫 Anulación" : t === "cobro" ? "💰 Corrección de cobro" : "✏️ Cambio de precio";
 const statusInfo = (st) => st === "aprobada"  ? { label:"Aprobada",  color:"#27ae60" }
                           : st === "rechazada" ? { label:"Rechazada", color:"#e74c3c" }
                           : { label:"Pendiente", color:"#f39c12" };

 return (
  <div>
   <div style={s.title}>📨 SOLICITUDES DE APROBACIÓN</div>

   {pendientes.length === 0
    ? <div style={{...s.card, textAlign:"center", color:"#444", padding:"24px 0", fontSize:13}}>✅ No hay solicitudes pendientes</div>
    : <>
       <div style={{fontSize:11, color:"#f39c12", textTransform:"uppercase", letterSpacing:1, marginBottom:10, fontWeight:800}}>
        {pendientes.length} pendiente{pendientes.length>1?"s":""} — requieren tu aprobación
       </div>
       {pendientes.map(sol => {
        const isEditingThis = editingSol?.sol?.id === sol.id;
        return (
        <div key={sol.id} style={{...s.card, border:"1px solid #f39c1255", marginBottom:10, padding:isMobile?10:14}}>
         <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8}}>
          <div>
           <div style={{fontWeight:900, fontSize:14, color:"#eee"}}>{typeLabel(sol.type)}</div>
           <div style={{fontSize:11, color:"#888", marginTop:2}}>
            Solicitado por <b style={{color:"#ddd"}}>{sol.requestedByName}</b>
            {" · "}{new Date(sol.createdAt).toLocaleTimeString("es-PE",{hour:"2-digit",minute:"2-digit"})}
           </div>
          </div>
          <button style={{...s.btn("secondary"), fontSize:10, padding:"3px 8px"}}
           onClick={() => setExpandedId(expandedId === sol.id ? null : sol.id)}>
           {expandedId === sol.id ? "Ocultar" : "Ver detalle"}
          </button>
         </div>

         {/* Detalle según tipo */}
         <div style={{background:"#111", borderRadius:8, padding:"8px 10px", marginBottom:10, border:"1px solid #2a2a2a"}}>
          <div style={{fontWeight:900, fontSize:13, marginBottom:4}}>
           {sol.orderType==="llevar" ? `🥡 ${sol.orderTable}` : `🍽️ Mesa ${sol.orderTable}`}
           <span style={{color:Y, marginLeft:8}}>{fmt(sol.orderTotal)}</span>
          </div>
          {sol.type === "anulacion" && sol.motivo && (
           <div style={{fontSize:11, color:"#e67e22", fontStyle:"italic", marginBottom:4}}>Motivo: "{sol.motivo}"</div>
          )}
          {sol.type === "precio" && (
           <div style={{fontSize:12, color:"#aaa"}}>
            <b style={{color:"#eee"}}>{sol.itemName}</b>:
            <span style={{textDecoration:"line-through", color:"#888", marginLeft:6}}>{fmt(sol.oldPrice)}</span>
            <span style={{color:Y, fontWeight:900, marginLeft:6}}>→ {fmt(sol.newPrice)}</span>
            {sol.priceMotivo && <span style={{color:"#e67e22", fontStyle:"italic", marginLeft:6}}>"{sol.priceMotivo}"</span>}
           </div>
          )}
          {sol.type === "cobro" && (
           <div style={{fontSize:12, color:"#aaa"}}>
            <div style={{marginBottom:4}}>
             <span style={{color:"#888"}}>Cobro actual:</span>
             {sol.oldPayments?.efectivo>0&&<span style={{marginLeft:6}}>💵 {fmt(sol.oldPayments.efectivo)}</span>}
             {sol.oldPayments?.yape>0&&<span style={{marginLeft:6}}>📱 {fmt(sol.oldPayments.yape)}</span>}
             {sol.oldPayments?.tarjeta>0&&<span style={{marginLeft:6}}>💳 {fmt(sol.oldPayments.tarjeta)}</span>}
             <span style={{marginLeft:6, color:"#888"}}>= <b style={{color:"#eee"}}>{fmt(sol.orderTotal)}</b></span>
            </div>
            <div style={{color:"#27ae60"}}>
             <span>Corrección solicitada:</span>
             {sol.newPayments?.efectivo>0&&<span style={{marginLeft:6}}>💵 {fmt(sol.newPayments.efectivo)}</span>}
             {sol.newPayments?.yape>0&&<span style={{marginLeft:6}}>📱 {fmt(sol.newPayments.yape)}</span>}
             {sol.newPayments?.tarjeta>0&&<span style={{marginLeft:6}}>💳 {fmt(sol.newPayments.tarjeta)}</span>}
             <span style={{marginLeft:6}}>= <b style={{color:Y}}>{fmt(sol.newTotal)}</b></span>
            </div>
            {sol.motivo && <div style={{fontSize:11, color:"#e67e22", marginTop:4, fontStyle:"italic"}}>Motivo: "{sol.motivo}"</div>}
           </div>
          )}
          {expandedId === sol.id && sol.orderItems && (
           <div style={{marginTop:8, borderTop:"1px solid #2a2a2a", paddingTop:8}}>
            {sol.orderItems.map((it,i) => (
             <div key={i} style={{display:"flex", justifyContent:"space-between", fontSize:11, color:"#777", padding:"1px 0"}}>
              <span>{it.qty}× {it.name}</span><span>{fmt(it.price*it.qty)}</span>
             </div>
            ))}
           </div>
          )}
         </div>

         {/* Admin: editar montos del cobro antes de aprobar */}
         {isAdmin && sol.type === "cobro" && isEditingThis && (
          <div style={{background:"#0d1a0d", border:`1px solid ${Y}44`, borderRadius:8, padding:"10px 12px", marginBottom:10}}>
           <div style={{fontSize:11, color:"#888", textTransform:"uppercase", letterSpacing:1, marginBottom:8}}>Editar montos antes de aprobar</div>
           <div style={{marginBottom:8}}>
            <label style={{fontSize:11, color:"#888", display:"block", marginBottom:3}}>Nuevo Total</label>
            <input type="number" style={{...s.input, color:Y, fontWeight:900}} min="0" step="0.5"
             value={editingSol.total} onChange={e=>setEditingSol(p=>({...p,total:e.target.value}))}/>
           </div>
           {[{label:"💵 Efectivo", key:"ef"},{label:"📱 Yape", key:"ya"},{label:"💳 Tarjeta", key:"ta"}].map(({label,key})=>(
            <div key={key} style={{display:"flex", alignItems:"center", gap:8, marginBottom:6}}>
             <span style={{width:90, fontSize:12, fontWeight:700}}>{label}</span>
             <input type="number" style={s.input} min="0" step="0.5"
              value={editingSol[key]} onChange={e=>setEditingSol(p=>({...p,[key]:e.target.value}))}/>
            </div>
           ))}
           {Math.abs((parseFloat(editingSol.ef)||0)+(parseFloat(editingSol.ya)||0)+(parseFloat(editingSol.ta)||0)-(parseFloat(editingSol.total)||0))>0.01 && (
            <div style={{fontSize:11, color:"#e74c3c", marginTop:4}}>⚠️ La suma de pagos no coincide con el total</div>
           )}
          </div>
         )}

         <div style={{display:"flex", gap:8}}>
          {isAdmin ? (<>
           {sol.type === "cobro" && !isEditingThis && (
            <button style={{...s.btn("secondary"), padding:"8px 0", fontSize:12, flex:1}}
             onClick={()=>setEditingSol({sol, ef:String(sol.newPayments?.efectivo||0), ya:String(sol.newPayments?.yape||0), ta:String(sol.newPayments?.tarjeta||0), total:String(sol.newTotal||sol.orderTotal)})}>
             ✏️ Editar montos
            </button>
           )}
           <button style={{...s.btn("success"), flex:2, padding:"10px 0", fontSize:13, fontWeight:900}}
            onClick={async () => {
             if (sol.type === "cobro") {
              const finalEf = isEditingThis ? parseFloat(editingSol.ef)||0 : sol.newPayments?.efectivo||0;
              const finalYa = isEditingThis ? parseFloat(editingSol.ya)||0 : sol.newPayments?.yape||0;
              const finalTa = isEditingThis ? parseFloat(editingSol.ta)||0 : sol.newPayments?.tarjeta||0;
              const finalTotal = isEditingThis ? parseFloat(editingSol.total)||sol.newTotal : sol.newTotal;
              if (sol.histFid && updateHistoryDoc) {
               await updateHistoryDoc(sol.histFid, {
                payments: {efectivo:finalEf, yape:finalYa, tarjeta:finalTa},
                total: finalTotal,
                _correctedAt: new Date().toISOString(),
                _correctedBy: currentUser.name,
                _correctedMotivo: sol.motivo,
               });
              }
              setEditingSol(null);
             }
             onResolve(sol.id, "aprobada");
            }}>✅ Aprobar</button>
           <button style={{...s.btn("danger"), flex:1, padding:"10px 0", fontSize:12}}
            onClick={() => { setRejectModal({ solId: sol.id }); setRejectReason(""); }}>❌ Rechazar</button>
          </>) : (
           <div style={{fontSize:11, color:"#8e44ad", fontStyle:"italic", padding:"8px 0"}}>⏳ Esperando aprobación del Administrador</div>
          )}
         </div>
        </div>
        );
       })}
      </>
   }

   {resueltas.length > 0 && (
    <div style={{marginTop:16}}>
     <div style={{fontSize:11, color:"#555", textTransform:"uppercase", letterSpacing:1, marginBottom:8}}>Historial reciente</div>
     {resueltas.map(sol => {
      const si = statusInfo(sol.status);
      return (
       <div key={sol.id} style={{...s.card, marginBottom:6, padding:"8px 12px", opacity:0.65}}>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
         <div>
          <span style={{fontSize:12, fontWeight:700}}>{typeLabel(sol.type)}</span>
          <span style={{fontSize:10, color:"#666", marginLeft:8}}>por {sol.requestedByName}</span>
         </div>
         <span style={{...s.tag(si.color+"22", si.color), fontSize:10}}>{si.label}</span>
        </div>
        {sol.rejectReason && <div style={{fontSize:10, color:"#e74c3c", marginTop:3, fontStyle:"italic"}}>Motivo: {sol.rejectReason}</div>}
       </div>
      );
     })}
    </div>
   )}

   {rejectModal && (
    <div style={s.overlay} onClick={() => setRejectModal(null)}>
     <div style={{...s.modal, maxWidth:360}} onClick={e => e.stopPropagation()}>
      <div style={{...s.row, marginBottom:14}}>
       <div style={{color:"#e74c3c", fontFamily:"'Bebas Neue',cursive", fontSize:20, letterSpacing:1}}>RECHAZAR SOLICITUD</div>
       <CloseBtn onClose={() => setRejectModal(null)} />
      </div>
      <div style={{fontSize:12, color:"#aaa", marginBottom:12}}>Motivo del rechazo (opcional):</div>
      <input style={{...s.input, marginBottom:14}} placeholder="Ej: No autorizado..."
       value={rejectReason} onChange={e => setRejectReason(e.target.value)} spellCheck="false" />
      <div style={{display:"flex", gap:8}}>
       <button style={{...s.btn("secondary"), flex:1, padding:12}} onClick={() => setRejectModal(null)}>Cancelar</button>
       <button style={{...s.btn("danger"), flex:2, padding:12, fontSize:14, fontWeight:900}}
        onClick={() => { onResolve(rejectModal.solId, "rechazada", rejectReason); setRejectModal(null); }}>
        ❌ Confirmar Rechazo
       </button>
      </div>
     </div>
    </div>
   )}
  </div>
 );
}

// ═══════════════════════════════════════════════════════════════════
// EDIT USER INLINE — sub-componente para editar cada usuario
// ═══════════════════════════════════════════════════════════════════
function EditUserInline({ user, allRoles, toggleRole, onUpdateRoles, onUpdateName, onResetPin, onDelete, s, Y }) {
 const [editingName, setEditingName] = useState(false);
 const [nameVal, setNameVal] = useState(user.name);

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
function StaffManager({ staff, onSaveStaff, isMobile, s, Y }) {
 const [editing, setEditing]   = useState(null);
 const [showAdd, setShowAdd]   = useState(false);
 const [newName, setNewName]   = useState("");
 const [newRoles, setNewRoles] = useState(["mesero"]);
 const [resetTarget, setResetTarget] = useState(null);
 const [localToast, setLocalToast]   = useState(null);

 const toast_ = (msg,color="#27ae60") => { setLocalToast({msg,color}); setTimeout(()=>setLocalToast(null),2500); };
 const allRoles = ["admin","cajero","mesero","cocinero"];
 const toggleRole = (arr, role) => arr.includes(role) ? arr.filter(r=>r!==role) : [...arr, role];

 const handleAdd = () => {
  if (!newName.trim() || !newRoles.length) return;
  const u = { id:`u_${Date.now()}`, name:newName.trim(), roles:newRoles, pinHash:null };
  onSaveStaff([...staff, u]);
  setNewName(""); setNewRoles(["mesero"]); setShowAdd(false);
  toast_(`✅ ${u.name} agregado`);
 };

 const handleResetPin = (userId) => {
  onSaveStaff(staff.map(u => u.id===userId ? {...u, pinHash:null} : u));
  setResetTarget(null);
  toast_("🔑 PIN reseteado", "#e67e22");
 };

 const handleDelete = (userId) => {
  onSaveStaff(staff.filter(u => u.id !== userId));
  toast_("🗑 Usuario eliminado", "#e74c3c");
 };

 const handleUpdateRoles = (userId, roles) => {
  if (!roles.length) return;
  onSaveStaff(staff.map(u => u.id===userId ? {...u, roles} : u));
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
        toggleRole={toggleRole}
        onUpdateRoles={handleUpdateRoles}
        onUpdateName={(uid, name) => {
         onSaveStaff(staff.map(u => u.id===uid ? {...u, name} : u));
         toast_(`✅ Nombre actualizado`);
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
export default function App() {
 const width = useWindowWidth();
 const isMobile = width < 480;
 const isTablet = width >= 480 && width < 1024;
 const isDesktop = width >= 768;
 const isWide = width >= 1024;

 const [currentUser, setCurrentUser] = useState(null); 

 const [tab, setTab] = useState("mesas");
 const [orders, setOrders] = useState([]);
 const ordersRef = useRef([]); // always current, avoids stale closures in async functions
 useEffect(() => { ordersRef.current = orders; }, [orders]);
 const [history, setHistory] = useState([]);
 const [menu, setMenu] = useState(MENU_BASE);
 const [draft, setDraft] = useState(newDraft());
 const [cartaCatFilter, setCartaCatFilter] = useState("Todos");
 const [showAdd, setShowAdd] = useState(false);
 const [newItem, setNewItem] = useState({ name:"", cat:"Hamburguesas", price:"" });
 const [loaded, setLoaded] = useState(false);
 const [splash, setSplash] = useState(true);
 const [toast, setToast] = useState(null);
 
 const [editingOrder, setEditingOrder] = useState(null);
 const [confirmDelete, setConfirmDelete] = useState(null);
 const [anulacionModal, setAnulacionModal] = useState(null); // order to annul
 const [mesaModal, setMesaModal] = useState(null);
 const [kitchenChecks, setKitchenChecks] = useState({});
 const [solicitudes, setSolicitudes] = useState([]);
 const [staff, setStaff] = useState([]);
 const [caja, setCaja] = useState(null); // null = no abierta
 const [cobrarTarget, setCobrarTarget] = useState(null);
 const [splitTarget, setSplitTarget] = useState(null); 
 const [mergeModal, setMergeModal] = useState(null);
 const [mergeName, setMergeName] = useState("");
 const [mesasArr, setMesasArr] = useState([]);
 const [soundConfig, setSoundConfig] = useState({ volume:0.75, freq:880, beeps:3, type:"square" });

 useEffect(() => {
 if (!currentUser) return;
 setLoaded(false);
 const localFS = FS(currentUser.localId);
 
 // All unsub vars declared in outer scope so cleanup can reference them
 let unsubOrders, unsubHistory, unsubMenu, unsubConfig, unsubSolicitudes, unsubStaff, unsubCaja;

 const setupListeners = () => {
  unsubOrders = onSnapshot(localFS.ordersRef(), (docSnap) => {
   if (docSnap.exists()) setOrders(docSnap.data().list || []); else setOrders([]);
  });
  unsubMenu = onSnapshot(localFS.menuRef(), (docSnap) => {
   if (docSnap.exists()) setMenu([...MENU_BASE, ...(docSnap.data().list || [])]); else setMenu(MENU_BASE);
  });
  unsubHistory = onSnapshot(query(localFS.historyCol(), orderBy("createdAt", "desc"), limit(1000)), (snapshot) => {
   setHistory(snapshot.docs.map(d => ({ _fid: d.id, ...d.data() })));
  });
  unsubConfig = onSnapshot(localFS.configRef(), (docSnap) => {
   if (docSnap.exists() && docSnap.data().mesas) setMesasArr(docSnap.data().mesas);
   else setMesasArr([1, 2, 3, 4, 5, 6]);
  });
  unsubSolicitudes = onSnapshot(localFS.solicitudesRef(), (docSnap) => {
   if (docSnap.exists()) setSolicitudes(docSnap.data().list || []);
   else setSolicitudes([]);
  });
  unsubStaff = onSnapshot(localFS.staffRef(), (docSnap) => {
   if (docSnap.exists()) {
    const incoming = docSnap.data().users;
    if (Array.isArray(incoming) && incoming.length > 0) {
     setStaff(incoming);
     // Keep localStorage backup fresh
     try { localStorage.setItem(`staff_backup_${currentUser.localId}`, JSON.stringify({ users: incoming, ts: new Date().toISOString() })); } catch(_) {}
    }
    // If incoming is empty, keep current state (don't overwrite with [])
   }
   // If doc doesn't exist, also keep current state (may be mid-write)
  });
  unsubCaja = onSnapshot(localFS.cajaRef(), (docSnap) => {
   if (docSnap.exists()) setCaja(docSnap.data());
   else setCaja(null);
  });
  setLoaded(true);
 };

 setupListeners();
 return () => {
  [unsubOrders, unsubHistory, unsubMenu, unsubConfig, unsubSolicitudes, unsubStaff, unsubCaja]
   .forEach(fn => { try { if (fn) fn(); } catch(e) {} });
 };
 }, [currentUser]);

 const showToast = (msg,color="#27ae60") => { setToast({msg,color}); setTimeout(()=>setToast(null),2800); };
 
 const saveOrders = async (v) => { await FS(currentUser.localId).saveOrders(v); };
 const saveMenu = async (v) => { setMenu(v); await FS(currentUser.localId).saveMenu(v.filter(i=>i.id.startsWith("CUSTOM_")||i.id.startsWith("TP")&&!["TP01","TP02","TP03","TP04","TP05"].includes(i.id))); };
 const addHistory = async (o) => { await FS(currentUser.localId).addHistory(o); };
 const saveSolicitudes = async (list) => {
  const threshold = Date.now() - 48 * 60 * 60 * 1000;
  const cleaned = list.filter(s => s.status === "pendiente" || new Date(s.resolvedAt || s.createdAt).getTime() > threshold);
  await FS(currentUser.localId).saveSolicitudes(cleaned);
 };

 const updateHistoryDoc = async (fid, data) => {
  try {
   await setDoc(doc(db, `mrpapachos_${currentUser.localId}_historial`, fid), data, { merge: true });
  } catch(e) { console.error("updateHistoryDoc error:", e); }
 };

 const cajaRef2 = useRef(null); // mirror of caja state for sync access in async closures
 useEffect(() => { cajaRef2.current = caja; }, [caja]);

 const saveCaja = async (data) => {
  await setDoc(FS(currentUser.localId).cajaRef(), data);
 };

 const abrirCaja = async (fondoInicial) => {
  const sessionId = `caja_${Date.now()}`;
  const data = {
   isOpen: true,
   sessionId,
   openedAt: new Date().toISOString(),
   openedBy: currentUser.name,
   fondoInicial: parseFloat(fondoInicial) || 0,
   cortes: caja?.cortes || [],
  };
  setCaja(data);
  await saveCaja(data);
  showToast(`✅ Caja abierta con fondo S/.${(parseFloat(fondoInicial)||0).toFixed(2)}`, "#27ae60");
 };

 const cerrarCaja = async () => {
  if (!caja?.isOpen) return;
  const sessionId = caja.sessionId;
  // Todos los pedidos de esta sesión de caja (con _cajaSessionId)
  const pagadosSesion = sessionId
   ? history.filter(o => o.status === "pagado" && o._cajaSessionId === sessionId)
   : history.filter(o => o.status === "pagado" && new Date(o.paidAt || o.createdAt).toDateString() === new Date(caja.openedAt).toDateString());
  const activosSesion = sessionId
   ? ordersRef.current.filter(o => o.isPaid && o._cajaSessionId === sessionId)
   : ordersRef.current.filter(o => o.isPaid && new Date(o.paidAt || o.createdAt).toDateString() === new Date(caja.openedAt).toDateString());
  const todosSesion = [...pagadosSesion, ...activosSesion];
  const efectivo  = todosSesion.reduce((s,o) => s + getPay(o,"efectivo"), 0);
  const yape      = todosSesion.reduce((s,o) => s + getPay(o,"yape"), 0);
  const tarjeta   = todosSesion.reduce((s,o) => s + getPay(o,"tarjeta"), 0);
  const total     = todosSesion.reduce((s,o) => s + o.total, 0);
  const corte = {
   cierreAt: new Date().toISOString(),
   cerradoBy: currentUser.name,
   fondoInicial: caja.fondoInicial,
   openedAt: caja.openedAt,
   sessionId,
   efectivo, yape, tarjeta, total,
   totalEnCaja: caja.fondoInicial + efectivo,
   pedidosCobrados: todosSesion.length,
  };
  const data = {
   isOpen: false,
   sessionId,
   openedAt: caja.openedAt,
   openedBy: caja.openedBy,
   fondoInicial: caja.fondoInicial,
   closedAt: corte.cierreAt,
   closedBy: currentUser.name,
   cortes: [...(caja.cortes || []), corte],
   ultimoCorte: corte,
  };
  setCaja(data);
  await saveCaja(data);
  showToast("🔒 Caja cerrada", "#e67e22");
  return corte;
 };
 const saveStaff = async (users) => {
  if (!Array.isArray(users) || users.length === 0) {
   showToast("⚠️ No se puede guardar: lista vacía", "#e74c3c");
   return;
  }
  if (!users.some(u => u.roles?.includes("admin"))) {
   showToast("⚠️ No se puede guardar: debe haber al menos un Administrador", "#e74c3c");
   return;
  }
  // Optimistic update on UI
  setStaff(users);
  // Write to Firebase with validation guard built in
  const ok = await FS(currentUser.localId).saveStaff(users);
  if (!ok) {
   showToast("⚠️ Error al guardar personal — intenta de nuevo", "#e74c3c");
   // Revert optimistic update by re-reading Firebase
   const fresh = await FS(currentUser.localId).getStaff();
   if (fresh && fresh.length > 0) setStaff(fresh);
  }
 };

 // Crear solicitud de aprobación (para no-admins)
 const crearSolicitud = async (solicitud) => {
  // Evitar duplicados: si ya hay una solicitud pendiente del mismo tipo para el mismo pedido
  const existe = solicitudes.find(s =>
   s.status === "pendiente" &&
   s.type === solicitud.type &&
   s.orderId === solicitud.orderId &&
   (solicitud.type !== "precio" || s.cartId === solicitud.cartId)
  );
  if (existe) {
   showToast("⚠️ Ya existe una solicitud pendiente para este pedido", "#e67e22");
   return;
  }
  const newSol = { ...solicitud, id: `sol_${Date.now()}`, status:"pendiente", createdAt: new Date().toISOString() };
  const updated = [...solicitudes, newSol];
  setSolicitudes(updated);
  await saveSolicitudes(updated);
  showToast("📨 Solicitud enviada al Administrador", "#8e44ad");
 };

 // Resolver solicitud (admin aprueba o rechaza)
 const resolverSolicitud = async (solId, decision, rejectReason="") => {
  const curSols = solicitudes; // capture current value
  const sol = curSols.find(s => s.id === solId);
  if (!sol) return;
  const updated = curSols.map(s => s.id === solId
   ? { ...s, status: decision, resolvedAt: new Date().toISOString(), resolvedBy: currentUser.name, rejectReason }
   : s
  );
  setSolicitudes(updated);
  await saveSolicitudes(updated);

  if (decision === "aprobada") {
   if (sol.type === "anulacion") {
    await anularPedido(
     ordersRef.current.find(o => o.id === sol.orderId) || sol.orderSnapshot,
     sol.replacementItems || [],
     sol.motivo,
     true // skipSolicitudUpdate
    );
   } else if (sol.type === "precio") {
    const cur = ordersRef.current;
    const orderExists = cur.find(o => o.id === sol.orderId);
    if (!orderExists) {
     showToast("⚠️ El pedido ya no existe (pudo haberse cobrado)", "#e67e22");
    } else {
     const newOrders = cur.map(o => {
      if (o.id !== sol.orderId) return o;
      const newItems = o.items.map(i => i.cartId === sol.cartId ? { ...i, price: sol.newPrice, priceNote: `Admin: ${sol.priceMotivo||"ajuste"}` } : i);
      return { ...o, items: newItems, total: newItems.reduce((s,i)=>s+i.price*i.qty,0) };
     });
     setOrders(newOrders);
     await saveOrders(newOrders);
     showToast(`✅ Precio de "${sol.itemName}" actualizado a S/.${sol.newPrice?.toFixed(2)}`, "#27ae60");
    }
   } else if (sol.type === "cobro") {
    // The actual Firestore update is handled inside SolicitudesPanel before calling onResolve
    showToast(`✅ Corrección de cobro aplicada · Mesa ${sol.orderTable}`, "#27ae60");
   }
  } else {
   showToast(`❌ Solicitud rechazada${rejectReason ? `: ${rejectReason}` : ""}`, "#e74c3c");
   // The non-admin will see it in their solicitudes tab
  }
 };

 const addMesa = async () => {
 const newMesas = [...mesasArr, mesasArr.length > 0 ? Math.max(...mesasArr) + 1 : 1];
 setMesasArr(newMesas);
 await FS(currentUser.localId).saveConfig({ mesas: newMesas });
 showToast(" Mesa agregada con éxito");
 };

 const removeMesa = async () => {
 if (mesasArr.length === 0) return;
 const lastMesa = mesasArr[mesasArr.length - 1];
 
 const hasOrders = ordersRef.current.some(o => o.table === String(lastMesa) && o.orderType !== "llevar");
 if (hasOrders) {
 showToast(` La Mesa ${lastMesa} tiene pedidos activos. Cóbrelos primero.`, "#e74c3c");
 return;
 }

 const newMesas = mesasArr.slice(0, -1);
 setMesasArr(newMesas);
 await FS(currentUser.localId).saveConfig({ mesas: newMesas });
 showToast(" Mesa quitada", "#888");
 };

 const markKitchenListo = async (orderId) => {
 const newOrders = ordersRef.current.map(o => o.id === orderId ? {...o, kitchenStatus:'listo'} : o);
 setOrders(newOrders);
 await saveOrders(newOrders);
 };

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

 // ── Guard: caja debe estar abierta para operar ────────────────────
 const cajaAbierta = !!cajaRef2.current?.isOpen;
 const requireCaja = (fn) => (...args) => {
  if (!cajaAbierta) { showToast("🔴 Abre la caja antes de operar", "#e74c3c"); return; }
  return fn(...args);
 };

 const submitOrder = async (forceMerge = null) => {
 if (!cajaAbierta) { showToast("🔴 Abre la caja antes de tomar pedidos", "#e74c3c"); return; }
 if (draft.orderType === "mesa" && !draft.table.trim()) return;
 if (!draft.items.length) return;
 const total = draftTotal;
 const existingMesaOrder = ordersRef.current.find(o => o.table === draft.table.trim() && o.orderType === "mesa" && !o.isPaid) ?? null;

 if (existingMesaOrder && forceMerge === null) {
 setMergeModal({ existingOrder: existingMesaOrder, newDraftData: { ...draft, total } });
 setMergeName(""); return;
 }

 let finalItems = forceMerge === "merge" ? [...mergeModal.newDraftData.items] : [...draft.items];

 if (forceMerge === "merge" && mergeModal) {
 const existing = mergeModal.existingOrder;
 const isLlevarDraft = mergeModal.newDraftData.orderType === "llevar";
 const newItems = finalItems.map(i => {
 let nameTag = mergeName.trim() ? `[Llevar: ${mergeName.trim()}]` : "";
 return { ...i, _isAdicion: true, ...(isLlevarDraft ? { isLlevar: true } : {}), individualNotes: isLlevarDraft && nameTag ? i.individualNotes.map(n => n ? `${nameTag} ${n}` : nameTag) : i.individualNotes }
 });
 const mergedItems = [...existing.items];
 newItems.forEach(newItem => {
 if (newItem.isLlevar) { newItem.cartId = `${newItem.cartId}-LLEVAR-${Date.now()}`; mergedItems.push(newItem); } 
 else {
 const idx = mergedItems.findIndex(i => i.cartId === newItem.cartId && !i.isLlevar && JSON.stringify(i.salsas) === JSON.stringify(newItem.salsas));
 if (idx >= 0) { mergedItems[idx] = { ...mergedItems[idx], qty: mergedItems[idx].qty + newItem.qty, individualNotes: [...(mergedItems[idx].individualNotes || []), ...(newItem.individualNotes || [])] }; } 
 else { mergedItems.push(newItem); }
 }
 });
 const updated = { ...existing, items: mergedItems, total: mergedItems.reduce((s, i) => s + i.price * i.qty, 0), notes: [existing.notes, mergeModal.newDraftData.notes].filter(Boolean).join(" | "), taperCost: 0, kitchenStatus: 'pendiente', _cajaSessionId: existing._cajaSessionId || cajaRef2.current?.sessionId || null, _adicionPor: currentUser?.name || null, _adicionAt: new Date().toISOString() };
 const mergedList = ordersRef.current.map(o => o.id === existing.id ? updated : o);
 setOrders(mergedList);
 await saveOrders(mergedList);
 setDraft(newDraft()); setMergeModal(null); setMergeName(""); showToast(` Ítems agregados a Mesa ${existing.table}`); setTab("pedidos"); return;
 }

 if (mergeModal) { setMergeModal(null); setMergeName(""); }
 const finalDraft = { ...draft, items: finalItems, taperCost: 0 }; 

 if (draft.payTiming === "ahora") {
 setCobrarTarget({ type: 'new', data: { id:Date.now().toString(), ...finalDraft, total, createdAt:new Date().toISOString(), _cajaSessionId: cajaRef2.current?.sessionId || null } });
 } else {
 const order = { id:Date.now().toString(), ...finalDraft, total, isPaid: false, status:"pendiente", kitchenStatus:"pendiente", createdAt:new Date().toISOString(), _cajaSessionId: cajaRef2.current?.sessionId || null, _mesero: currentUser?.name || null };
 const newOrders = [...ordersRef.current, order];
 setOrders(newOrders); await saveOrders(newOrders);
 setDraft(newDraft()); showToast(` Pedido enviado a cocina`); setTab("pedidos");
 }
 };

 const handleConfirmCobro = async (paymentData) => {
 if (!cobrarTarget) return;
 if (!cajaAbierta) { showToast("🔴 Abre la caja antes de cobrar", "#e74c3c"); setCobrarTarget(null); return; }
 const cur = ordersRef.current; // always fresh, no stale closure
 const target = cobrarTarget; setCobrarTarget(null);
 const payments = { efectivo: paymentData.efectivo, yape: paymentData.yape, tarjeta: paymentData.tarjeta };
 const descuentoData = paymentData.descuentoPct > 0 ? {
 descuentoPct: paymentData.descuentoPct,
 descuentoAmt: paymentData.descuentoAmt,
 descuentoMotivo: paymentData.descuentoMotivo || "",
 totalOriginal: paymentData.totalOriginal,
 } : {};

 if (target.type === 'split') {
 const originalOrder = target.data.originalOrder;
 const splitItems = target.data.splitItems;
 const paidItems = splitItems.map(si => ({...si, qty: si.splitQty}));
 const thisSplitRecord = { items: paidItems, total: target.data.total, payments, paidAt: new Date().toISOString() };
 const accumulatedSplits = [...(originalOrder.splitPayments || []), thisSplitRecord];
 let remainingItems = originalOrder.items.map(origItem => {
 const splitItem = splitItems.find(si => si.cartId === origItem.cartId);
 if (splitItem) return { ...origItem, qty: origItem.qty - splitItem.splitQty, individualNotes: origItem.individualNotes.slice(splitItem.splitQty) };
 return origItem;
 }).filter(i => i.qty > 0);
 if (remainingItems.length === 0) {
 // Sumar todos los pagos y el total real de todas las divisiones
 const totalEf = accumulatedSplits.reduce((s,sp) => s + (sp.payments?.efectivo || 0), 0);
 const totalYa = accumulatedSplits.reduce((s,sp) => s + (sp.payments?.yape || 0), 0);
 const totalTa = accumulatedSplits.reduce((s,sp) => s + (sp.payments?.tarjeta || 0), 0);
 const totalCobrado = accumulatedSplits.reduce((s,sp) => s + (sp.total || 0), 0);
 // Recuperar ítems originales si fueron guardados, sino usar los acumulados de splits
 const allItems = originalOrder.originalItems || [
 ...accumulatedSplits.flatMap(sp => sp.items || []),
 ...remainingItems
 ];
 const finalOrder = {
 ...originalOrder,
 isPaid: true,
 status: "pagado",
 payments: { efectivo: totalEf, yape: totalYa, tarjeta: totalTa },
 splitPayments: accumulatedSplits,
 paidAt: new Date().toISOString(),
 total: totalCobrado,
 items: allItems,
 ...descuentoData,
 _cajaSessionId: originalOrder._cajaSessionId || cajaRef2.current?.sessionId || null,
 _cajaOpenedAt: originalOrder._cajaOpenedAt || cajaRef2.current?.openedAt || null,
 };
 const newOrders = cur.filter(x => x.id !== originalOrder.id);
 setOrders(newOrders);
 await Promise.all([addHistory(finalOrder), saveOrders(newOrders)]);
 showToast("✅ Cuenta completa cobrada y archivada");
 } else {
 const newTotal = remainingItems.reduce((s,i) => s+i.price*i.qty, 0);
 // Guardar ítems originales la primera vez que se hace una división
 const originalItems = originalOrder.originalItems || originalOrder.items;
 const updatedOriginal = { ...originalOrder, items:remainingItems, total:newTotal, splitPayments:accumulatedSplits, originalItems };
 const newOrders = cur.map(o => o.id === originalOrder.id ? updatedOriginal : o);
 setOrders(newOrders);
 await saveOrders(newOrders);
 showToast(`✅ División cobrada · Quedan ${fmt(newTotal)}`);
 }
 setTab("pedidos"); return;
 }

 if (target.type === 'new') {
 const order = {
 ...target.data,
 isPaid:true, status:"pendiente", kitchenStatus:"pendiente",
 payments, paidAt:new Date().toISOString(),
 ...descuentoData,
 ...(paymentData.descuentoPct > 0 ? { total: paymentData.totalFinal } : {}),
 _cajaSessionId: target.data._cajaSessionId || cajaRef2.current?.sessionId || null,
 _cajaOpenedAt: target.data._cajaOpenedAt || cajaRef2.current?.openedAt || null,
 };
 const newOrders = [...cur, order];
 setOrders(newOrders); await saveOrders(newOrders);
 setDraft(newDraft()); showToast("✅ Pedido cobrado y enviado a cocina"); setTab("pedidos");
 } else if (target.type === 'existing') {
 const o = target.data;
 const hasSplits = o.splitPayments && o.splitPayments.length > 0;
 let finished;
 const sessionStamp = { _cajaSessionId: o._cajaSessionId || cajaRef2.current?.sessionId || null, _cajaOpenedAt: o._cajaOpenedAt || cajaRef2.current?.openedAt || null };
 if (hasSplits) {
 const thisFinalRecord = { items: o.items, total: paymentData.totalFinal, payments, paidAt: new Date().toISOString() };
 const allSplits = [...o.splitPayments, thisFinalRecord];
 const totalEf = allSplits.reduce((s, sp) => s + (sp.payments?.efectivo || 0), 0);
 const totalYa = allSplits.reduce((s, sp) => s + (sp.payments?.yape || 0), 0);
 const totalTa = allSplits.reduce((s, sp) => s + (sp.payments?.tarjeta || 0), 0);
 const totalCobrado = allSplits.reduce((s, sp) => s + (sp.total || 0), 0);
 const allItems = o.originalItems || o.items;
 finished = { ...o, isPaid: true, status: "pagado", payments: { efectivo: totalEf, yape: totalYa, tarjeta: totalTa }, splitPayments: allSplits, paidAt: new Date().toISOString(), total: totalCobrado, items: allItems, ...descuentoData, ...sessionStamp };
 } else {
 finished = { ...o, isPaid:true, status:"pagado", payments, paidAt:new Date().toISOString(), ...descuentoData, ...(paymentData.totalFinal !== undefined ? { total: paymentData.totalFinal } : {}), ...sessionStamp };
 }
 const newOrders = cur.filter(x => x.id !== o.id);
 setOrders(newOrders);
 await Promise.all([addHistory(finished), saveOrders(newOrders)]);
 showToast("✅ Pedido cobrado y archivado");
 }
 };

 const finishPaidOrder = async (id) => {
 const cur = ordersRef.current;
 const o = cur.find(x=>x.id===id); if (!o) return;
 const newOrders = cur.filter(x=>x.id!==id);
 setOrders(newOrders);
 const finished = { ...o, status:"pagado" };
 await Promise.all([addHistory(finished), saveOrders(newOrders)]);
 showToast("✅ Pedido entregado y archivado");
 };

 const cancelOrder = async (id) => {
 const cur = ordersRef.current;
 const o = cur.find(x=>x.id===id); if (!o) return;
 const newOrders = cur.filter(x=>x.id!==id);
 setOrders(newOrders);
 const finished = {...o, status:"cancelado", cancelledAt:new Date().toISOString(), createdAt:o.createdAt||new Date().toISOString()};
 await Promise.all([addHistory(finished), saveOrders(newOrders)]);
 showToast("🚫 Pedido cancelado","#e74c3c");
 };

 const deleteOrderPermanent = async (id) => {
 const newOrders = ordersRef.current.filter(x=>x.id!==id);
 setOrders(newOrders); await saveOrders(newOrders);
 setConfirmDelete(null); showToast("🗑 Pedido eliminado","#888");
 };

 // Anulación con reemplazo (solo admin o por solicitud aprobada)
 const anularPedido = async (originalOrder, replacementItems, motivo, _skip=false) => {
 const cur = ordersRef.current;
 const now = new Date().toISOString();
 const newId = Date.now().toString();
 const hasReplacement = replacementItems && replacementItems.length > 0;
 const anuladoOrder = { ...originalOrder, anulado:true, status:"anulado", anuladoAt:now, motivoAnulacion:motivo||"", replacedById:hasReplacement?newId:null };
 let updatedOrders = cur.map(o => o.id === originalOrder.id ? anuladoOrder : o);
 if (hasReplacement) {
 const repTotal = replacementItems.reduce((s,i) => s+i.price*i.qty, 0);
 const replacementOrder = { id:newId, table:originalOrder.table, orderType:originalOrder.orderType, phone:originalOrder.phone||"", deliveryAddress:originalOrder.deliveryAddress||"", notes:originalOrder.notes||"", items:replacementItems, total:repTotal, isPaid:false, status:"pendiente", kitchenStatus:"pendiente", createdAt:now, replacesId:originalOrder.id, taperCost:0 };
 updatedOrders = [...updatedOrders, replacementOrder];
 }
 setOrders(updatedOrders);
 await saveOrders(updatedOrders);
 setAnulacionModal(null);
 showToast("🚫 Pedido anulado" + (hasReplacement ? " · Reemplazo enviado a cocina" : ""), "#e74c3c");
 };

 const saveEditedOrder = async (updated) => {
 const cur = ordersRef.current;
 const newOrders = cur.map(o=>o.id===updated.id?updated:o);
 setOrders(newOrders); await saveOrders(newOrders);
 setEditingOrder(null); showToast("✏️ Pedido actualizado","#f39c12");
 };

 const addMenuItem = async () => {
 if (!newItem.name.trim()||!newItem.price) return;
 const item = {id:"CUSTOM_"+Date.now(),cat:newItem.cat,name:newItem.name,price:parseFloat(newItem.price),desc:""};
 await saveMenu([...menu,item]);
 setNewItem({name:"",cat:"Hamburguesas",price:""}); setShowAdd(false);
 showToast(` "${item.name}" agregado`);
 };
 const deleteMenuItem = async (id) => { await saveMenu(menu.filter(i=>i.id!==id)); showToast(" Platillo eliminado","#e74c3c"); };

 const Y = "#FFD700";
 const s = {
 app: {fontFamily:"'Nunito',sans-serif",background:"#0f0f0f",color:"#eee",minHeight:"100vh",display:"flex",flexDirection:"column",overflow:"visible"},
 header: {background:`linear-gradient(135deg,${Y} 0%,#e6b800 100%)`,color:"#111",padding:isMobile?"8px 12px":"10px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",boxShadow:"0 2px 12px rgba(255,215,0,.3)"},
 logo: {fontFamily:"'Bebas Neue',cursive",fontSize:isMobile?17:isTablet?22:28,letterSpacing:isMobile?1:3,margin:0,lineHeight:1.1},
 nav: {display:"flex",background:"#1a1a1a",borderBottom:`2px solid ${Y}33`,overflowX:"auto",scrollbarWidth:"none"},
 navBtn: (a)=>({padding:isMobile?"9px 7px":"10px 14px",background:a?Y:"transparent",color:a?"#111":"#999",border:"none",cursor:"pointer",fontFamily:"'Nunito',sans-serif",fontWeight:700,fontSize:isMobile?9:12,whiteSpace:"nowrap",transition:"all .2s",borderBottom:a?`3px solid #e6b800`:"3px solid transparent"}),
 content: {flex:1,padding:isMobile?"10px 8px":isTablet?14:20,maxWidth:isWide?1200:"100%",margin:"0 auto",width:"100%",boxSizing:"border-box",overflow:"visible"},
 card: {background:"#1c1c1c",borderRadius:isMobile?10:12,padding:isMobile?10:14,marginBottom:10,border:"1px solid #2a2a2a"},
 cardHL: {background:"#1c1c1c",borderRadius:isMobile?10:12,padding:isMobile?10:14,marginBottom:10,border:`1px solid ${Y}44`},
 statCard:{background:"#1c1c1c",borderRadius:isMobile?10:12,padding:isMobile?"12px 8px":"16px 12px",border:"1px solid #2a2a2a",textAlign:"center"},
 statNum: {fontSize:isMobile?22:28,fontWeight:900,color:Y,lineHeight:1},
 statLbl: {fontSize:isMobile?9:11,color:"#777",marginTop:5,textTransform:"uppercase",letterSpacing:1},
 btn: (v="primary")=>({padding:isMobile?"7px 10px":"8px 14px",background:v==="primary"?Y:v==="danger"?"#c0392b":v==="success"?"#27ae60":v==="blue"?"#2980b9":v==="warn"?"#d35400":"#2a2a2a",color:v==="primary"?"#111":"#fff",border:"none",borderRadius:8,cursor:"pointer",fontWeight:800,fontSize:isMobile?11:12,fontFamily:"'Nunito',sans-serif",transition:"opacity .15s",whiteSpace:"nowrap"}),
 input: {background:"#222",border:"1px solid #383838",borderRadius:8,padding:isMobile?"8px 10px":"9px 12px",color:"#eee",fontFamily:"'Nunito',sans-serif",fontSize:13,outline:"none",width:"100%",boxSizing:"border-box"},
 tag: (bg, col)=>({display:"inline-block",padding:"2px 8px",borderRadius:10,fontSize:11,fontWeight:700,background:bg,color:col||"#eee"}),
 grid: (cols)=>({display:"grid",gridTemplateColumns:`repeat(auto-fit, minmax(${cols}px,1fr))`,gap:isMobile?8:10}),
 row: {display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8},
 title: {color:Y,fontFamily:"'Bebas Neue',cursive",fontSize:isMobile?18:22,marginBottom:isMobile?10:14,letterSpacing:1},
 overlay: {position:"fixed",inset:0,background:"rgba(0,0,0,.85)",zIndex:200,display:"flex",alignItems:isMobile?"flex-end":"center",justifyContent:"center",padding:isMobile?0:16},
 modal: {background:"#1a1a1a",border:`1px solid ${Y}44`,borderRadius:isMobile?"16px 16px 0 0":14,padding:isMobile?"16px 12px":20,width:"100%",maxWidth:isMobile?"100%":600,maxHeight:isMobile?"92vh":"88vh",overflowY:"auto"},
 };

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
   const startTab = user.id==='cocinero' ? 'cocina'
    : user.id==='cajero' ? 'pedidos'
    : user.id==='mesero' ? 'mesas'
    : 'dashboard';
   setTab(startTab);
  }} s={s} Y={Y} isMobile={isMobile} /></ErrorBoundary>;
 if (!loaded) return <ErrorBoundary><div style={{background:"#111",color:"#FFD700",height:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{textAlign:"center"}}><div style={{marginTop:12,fontWeight:700,letterSpacing:2}}>Cargando Sucursal...</div></div></div></ErrorBoundary>;

 const pendingSols = solicitudes.filter(x => x.status === "pendiente").length;
 const allTabs = [
 {id:"dashboard",    label:"Inicio"},
 {id:"mesas",        label:"Mesas"},
 {id:"nuevo",        label:"Nuevo"},
 {id:"pedidos",      label:`Pedidos${orders.filter(o=>!o.anulado).length>0?" ("+orders.filter(o=>!o.anulado).length+")":""}` },
 {id:"cocina",       label:`Cocina${orders.filter(o=>o.kitchenStatus!=='listo'&&!o.anulado).length>0?" ("+orders.filter(o=>o.kitchenStatus!=='listo'&&!o.anulado).length+")":""}` },
 {id:"solicitudes",  label: currentUser?.id==="admin"
  ? `Solicitudes${pendingSols>0?" ("+pendingSols+")":""}` 
  : `Mis Solicitudes` },
 {id:"historial",    label:"Historial"},
 {id:"inventario",   label:"Inventario"},
 {id:"carta",        label:"Carta"},
 {id:"personal",     label:"Personal"},
 ];

 const tabs = allTabs.filter(t => {
 if (currentUser.id === 'admin') return true;
 if (currentUser.id === 'cajero') return ['dashboard','pedidos','historial','solicitudes'].includes(t.id);
 if (currentUser.id === 'mesero') return ['mesas','nuevo','pedidos','solicitudes'].includes(t.id);
 if (currentUser.id === 'cocinero') return ['cocina'].includes(t.id);
 return false;
 });

 // Badge en el tab solicitudes (llamar atención al admin)
 const myPendingSols = solicitudes.filter(x => x.status === "pendiente" && (x.requestedBy === currentUser.userId || x.requestedBy === currentUser.id)).length;
 const SolBadge = pendingSols > 0 && currentUser.id === 'admin'
  ? <div style={{position:"fixed",top:42,right:8,background:"#e74c3c",color:"#fff",borderRadius:12,padding:"2px 8px",fontSize:11,fontWeight:900,zIndex:9990,boxShadow:"0 2px 8px rgba(0,0,0,.5)",cursor:"pointer"}} onClick={()=>setTab("solicitudes")}>{pendingSols} solicitud{pendingSols>1?"es":""} pendiente{pendingSols>1?"s":""}</div>
  : myPendingSols > 0 && currentUser.id !== 'admin'
  ? <div style={{position:"fixed",top:42,right:8,background:"#8e44ad",color:"#fff",borderRadius:12,padding:"2px 8px",fontSize:11,fontWeight:900,zIndex:9990,boxShadow:"0 2px 8px rgba(0,0,0,.5)"}}>⏳ {myPendingSols} solicitud{myPendingSols>1?"es":""} en revisión</div>
  : null;

 return (
 <ErrorBoundary>
 <>
 <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Nunito:wght@400;700;900&display=swap" rel="stylesheet"/>
 <div style={s.app}>
 <header style={s.header}>
 <div>
 <h1 style={s.logo}>MR. PAPACHOS · CAJAMARCA</h1>
 {!isMobile&&<div style={{fontSize:11,color:"#555",fontWeight:700}}>{currentUser.name} · {currentUser.label} | {currentUser.localName.toUpperCase()}</div>}
 </div>
 <div style={{display:"flex", gap:10, alignItems:"center"}}>
 {!isMobile&&<div style={{fontSize:11,color:"#333",fontWeight:700,textAlign:"right"}}>{new Date().toLocaleDateString("es-PE",{weekday:"long",day:"numeric",month:"long"})}</div>}
 {currentUser?.id==="admin" && pendingSols > 0 && (
  <button style={{...s.btn("warn"), fontSize:10, padding:"4px 10px", position:"relative"}} onClick={()=>setTab("solicitudes")}>
   🔔 {pendingSols}
  </button>
 )}
 <button style={{...s.btn("danger"), fontSize:10, padding:"4px 8px"}} onClick={()=>setCurrentUser(null)}>Salir</button>
 </div>
 </header>

 <nav style={s.nav}>{tabs.map(t=>(<button key={t.id} style={{...s.navBtn(tab===t.id),flex:isMobile?1:"none"}} onClick={()=>setTab(t.id)}>{t.label}</button>))}</nav>
 {SolBadge}

 {toast&&(<div style={{position:"fixed",bottom:isMobile ? 90 : 20,left:"50%",transform:"translateX(-50%)",background:toast.color,color:"#fff",padding:"10px 20px",borderRadius:12,fontWeight:800,zIndex:9999,fontSize:14,boxShadow:"0 4px 20px rgba(0,0,0,.5)",whiteSpace:"nowrap"}}>{toast.msg}</div>)}

 {cobrarTarget && <div style={s.overlay} onClick={()=>setCobrarTarget(null)}><CobrarModal orderContext={cobrarTarget.data} total={cobrarTarget.data.total} onConfirm={handleConfirmCobro} onClose={()=>setCobrarTarget(null)} s={s} Y={Y} /></div>}
 {splitTarget && <SplitBillModal order={splitTarget} onProceed={(items, total) => { setCobrarTarget({ type: 'split', data: { originalOrder: splitTarget, splitItems: items, total }}); setSplitTarget(null); }} onClose={() => setSplitTarget(null)} s={s} Y={Y} fmt={fmt} />}
 {editingOrder&&<div style={s.overlay} onClick={()=>setEditingOrder(null)}><EditOrderModal order={editingOrder} onSave={saveEditedOrder} onClose={()=>setEditingOrder(null)} menu={menu} isMobile={isMobile} s={s} Y={Y} isAdmin={currentUser?.id==="admin"} currentUser={currentUser} onRequestPrecio={crearSolicitud}/></div>}
 {mesaModal&&<div style={s.overlay} onClick={()=>setMesaModal(null)}><MesaModalComponent num={mesaModal} orders={orders} setDraft={setDraft} newDraft={newDraft} onClose={()=>setMesaModal(null)} setTab={setTab} setCobrarTarget={setCobrarTarget} setSplitTarget={setSplitTarget} setEditingOrder={setEditingOrder} setAnulacionModal={setAnulacionModal} printOrder={printOrder} isMobile={isMobile} s={s} Y={Y} fmt={fmt} currentUser={currentUser} crearSolicitud={crearSolicitud} isAdmin={currentUser?.id==="admin"} /></div>}
 
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
  isAdmin={currentUser?.id === 'admin'}
  currentUser={currentUser}
  onConfirm={(items, motivo) => anularPedido(anulacionModal, items, motivo)}
  onRequest={(sol) => crearSolicitud(sol)}
  onClose={() => setAnulacionModal(null)} menu={menu} s={s} Y={Y} fmt={fmt} />
 </div>
 )}

 {confirmDelete&&<div style={s.overlay} onClick={()=>setConfirmDelete(null)}><div style={{...s.modal,maxWidth:340,textAlign:"center"}} onClick={e=>e.stopPropagation()}><div style={{fontSize:42,marginBottom:12}}></div><div style={{fontWeight:900,fontSize:17,marginBottom:8,color:"#eee"}}>¿Eliminar pedido?</div><div style={{color:"#888",fontSize:13,marginBottom:20}}>Esta acción no se puede deshacer.</div><div style={{display:"flex",gap:10}}><button style={{...s.btn("secondary"),flex:1}} onClick={()=>setConfirmDelete(null)}>Cancelar</button><button style={{...s.btn("danger"),flex:1}} onClick={()=>deleteOrderPermanent(confirmDelete)}> Eliminar</button></div></div></div>}

 <div style={s.content}>
 {tab==="dashboard" && <DashboardComponent orders={orders} history={history} fmt={fmt} setTab={setTab} finishPaidOrder={finishPaidOrder} setCobrarTarget={setCobrarTarget} isMobile={isMobile} s={s} Y={Y} caja={caja} abrirCaja={abrirCaja} cerrarCaja={cerrarCaja} currentUser={currentUser} getPay={getPay} soundConfig={soundConfig} setSoundConfig={setSoundConfig} />}
 {tab==="mesas" && <MesasComponent orders={orders} setDraft={setDraft} newDraft={newDraft} setTab={setTab} setMesaModal={setMesaModal} finishPaidOrder={finishPaidOrder} setCobrarTarget={setCobrarTarget} setSplitTarget={setSplitTarget} setEditingOrder={setEditingOrder} printOrder={printOrder} cancelOrder={cancelOrder} setAnulacionModal={setAnulacionModal} isMobile={isMobile} isTablet={isTablet} s={s} Y={Y} fmt={fmt} mesasArr={mesasArr} addMesa={addMesa} removeMesa={removeMesa} currentUser={currentUser} />}
 {tab==="nuevo" && <NuevoPedidoComponent draft={draft} setDraft={setDraft} menu={menu} addItem={addItem} changeQty={changeQty} updateIndividualNote={updateIndividualNote} draftTotal={draftTotal} fmt={fmt} submitOrder={submitOrder} newDraft={newDraft} s={s} Y={Y} isDesktop={isDesktop} isMobile={isMobile} isTablet={isTablet} mesasArr={mesasArr} cajaAbierta={cajaAbierta} />}
 {tab==="pedidos" && <PedidosComponent orders={orders} setTab={setTab} finishPaidOrder={finishPaidOrder} setCobrarTarget={setCobrarTarget} setSplitTarget={setSplitTarget} setEditingOrder={setEditingOrder} printOrder={printOrder} cancelOrder={cancelOrder} setConfirmDelete={setConfirmDelete} setAnulacionModal={setAnulacionModal} currentUser={currentUser} isMobile={isMobile} s={s} Y={Y} fmt={fmt} />}
 {tab==="cocina" && <CocinaComponent orders={orders} kitchenChecks={kitchenChecks} setKitchenChecks={setKitchenChecks} markKitchenListo={markKitchenListo} isMobile={isMobile} isDesktop={isDesktop} s={s} Y={Y} soundConfig={soundConfig} />}
 {tab==="historial"    && <HistorialComponent history={history} isMobile={isMobile} s={s} Y={Y} fmt={fmt} getPay={getPay} printOrder={printOrder} isAdmin={currentUser?.id==="admin"} currentUser={currentUser} crearSolicitud={crearSolicitud} updateHistoryDoc={updateHistoryDoc} />}
 {tab==="inventario"   && <Inventario menu={menu} orders={orders} history={history} isMobile={isMobile} s={s} Y={Y} fmt={fmt}/>}
 {tab==="carta"        && <CartaComponent menu={menu} cartaCatFilter={cartaCatFilter} setCartaCatFilter={setCartaCatFilter} showAdd={showAdd} setShowAdd={setShowAdd} newItem={newItem} setNewItem={setNewItem} addMenuItem={addMenuItem} deleteMenuItem={deleteMenuItem} isMobile={isMobile} s={s} Y={Y} fmt={fmt} ALL_CATS={ALL_CATS} />}
 {tab==="solicitudes"  && <SolicitudesPanel solicitudes={solicitudes} onResolve={resolverSolicitud} currentUser={currentUser} isMobile={isMobile} s={s} Y={Y} fmt={fmt} updateHistoryDoc={updateHistoryDoc} />}
 {tab==="personal"     && <StaffManager staff={staff} onSaveStaff={saveStaff} isMobile={isMobile} s={s} Y={Y} localName={currentUser?.localName} />}
 </div>
 </div>
 </>
 </ErrorBoundary>
 )
}