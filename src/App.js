import { useState, useEffect, useRef } from "react";
import { initializeApp, getApps } from "firebase/app";
import {
  getFirestore,
  doc, setDoc, getDoc,
  collection, getDocs, addDoc,
  query, orderBy, limit,
} from "firebase/firestore";

const FIREBASE_CONFIG = {
  apiKey:            process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain:        process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.REACT_APP_FIREBASE_APP_ID,
};

const _fbApp = getApps().length ? getApps()[0] : initializeApp(FIREBASE_CONFIG);
const db     = getFirestore(_fbApp);

const FS = {
  ordersRef:  () => doc(db, "mrpapachos", "orders"),
  menuRef:    () => doc(db, "mrpapachos", "customMenu"),
  historyCol: () => collection(db, "mrpapachos_historial"),
  async getOrders() {
    try { const s = await getDoc(FS.ordersRef()); return s.exists() ? (s.data().list ?? []) : []; } catch { return []; }
  },
  async saveOrders(list) {
    try { await setDoc(FS.ordersRef(), { list, ts: new Date().toISOString() }); } catch (e) { console.error(e); }
  },
  async getMenu() {
    try { const s = await getDoc(FS.menuRef()); return s.exists() ? (s.data().list ?? []) : []; } catch { return []; }
  },
  async saveMenu(list) {
    try { await setDoc(FS.menuRef(), { list, ts: new Date().toISOString() }); } catch (e) { console.error(e); }
  },
  async getHistory() {
    try {
      const q = query(FS.historyCol(), orderBy("createdAt", "desc"), limit(1000));
      const s = await getDocs(q);
      return s.docs.map(d => ({ _fid: d.id, ...d.data() }));
    } catch { return []; }
  },
  async addHistory(order) {
    try { await addDoc(FS.historyCol(), order); } catch (e) { console.error(e); }
  },
};

const MENU_BASE = [
  { id:"H01",  cat:"Hamburguesas",     icon:"🍔", name:"La Silvestre",              price:7    },
  { id:"H02",  cat:"Hamburguesas",     icon:"🍔", name:"La Piolin",                 price:8    },
  { id:"H03",  cat:"Hamburguesas",     icon:"🍔", name:"La Speedy Gonzales",        price:10   },
  { id:"H04",  cat:"Hamburguesas",     icon:"🍔", name:"La Cajacha",                price:12   },
  { id:"H05",  cat:"Hamburguesas",     icon:"🍔", name:"La Coyote",                 price:12   },
  { id:"H06",  cat:"Hamburguesas",     icon:"🍔", name:"La Super Cajacha",          price:14   },
  { id:"H07",  cat:"Hamburguesas",     icon:"🍔", name:"La Bugs Bunny",             price:14   },
  { id:"H08",  cat:"Hamburguesas",     icon:"🍔", name:"La Cajamarquesa",           price:14   },
  { id:"H09",  cat:"Hamburguesas",     icon:"🍔", name:"La Porky",                  price:15   },
  { id:"H10",  cat:"Hamburguesas",     icon:"🍔", name:"La Tazmania",               price:14   },
  { id:"H11",  cat:"Hamburguesas",     icon:"🍔", name:"La Papachos",               price:20   },
  { id:"S01",  cat:"Salchipapas",      icon:"🍟", name:"Clásica",                   price:8    },
  { id:"S02",  cat:"Salchipapas",      icon:"🍟", name:"Sencilla",                  price:10   },
  { id:"S03",  cat:"Salchipapas",      icon:"🍟", name:"Cajacha",                   price:12   },
  { id:"S04",  cat:"Salchipapas",      icon:"🍟", name:"Hawaiana",                  price:12   },
  { id:"S05",  cat:"Salchipapas",      icon:"🍟", name:"Salchipobre",               price:13   },
  { id:"S06",  cat:"Salchipapas",      icon:"🍟", name:"La Piernona",               price:15   },
  { id:"S07",  cat:"Salchipapas",      icon:"🍟", name:"Super Cajacha",             price:16   },
  { id:"S08",  cat:"Salchipapas",      icon:"🍟", name:"Salchibroster",             price:16   },
  { id:"S09",  cat:"Salchipapas",      icon:"🍟", name:"La Champi Quesera",         price:18   },
  { id:"S10",  cat:"Salchipapas",      icon:"🍟", name:"Salchi Nuggets",            price:20   },
  { id:"S11",  cat:"Salchipapas",      icon:"🍟", name:"Salchi Porky",              price:20   },
  { id:"S12",  cat:"Salchipapas",      icon:"🍟", name:"La Papacha",                price:22   },
  { id:"S13",  cat:"Salchipapas",      icon:"🍟", name:"Salchi Lomo",               price:25   },
  { id:"A01",  cat:"Alitas",           icon:"🍗", name:"Alitas 4 pzas",             price:14   },
  { id:"A02",  cat:"Alitas",           icon:"🍗", name:"Alitas 6 pzas",             price:20   },
  { id:"A03",  cat:"Alitas",           icon:"🍗", name:"Alitas 8 pzas",             price:26   },
  { id:"A04",  cat:"Alitas",           icon:"🍗", name:"Alitas 10 pzas",            price:30   },
  { id:"A05",  cat:"Alitas",           icon:"🍗", name:"Alitas 12 pzas",            price:36   },
  { id:"AC01", cat:"Alichaufa",        icon:"🍗", name:"Alichaufa 4 pzas",          price:18   },
  { id:"AC02", cat:"Alichaufa",        icon:"🍗", name:"Alichaufa 6 pzas",          price:24   },
  { id:"AC03", cat:"Alichaufa",        icon:"🍗", name:"Alichaufa 8 pzas",          price:30   },
  { id:"AC04", cat:"Alichaufa",        icon:"🍗", name:"Alichaufa 10 pzas",         price:36   },
  { id:"PB01", cat:"Pollo Broaster",   icon:"🍖", name:"Pollo 1/8 Clásico",         price:12   },
  { id:"PB02", cat:"Pollo Broaster",   icon:"🍖", name:"Pollo 1/4 Clásico",         price:18   },
  { id:"PB03", cat:"Pollo Broaster",   icon:"🍖", name:"Pollo 1/8 A lo Pobre",      price:16   },
  { id:"PB04", cat:"Pollo Broaster",   icon:"🍖", name:"Pollo 1/4 A lo Pobre",      price:22   },
  { id:"MB01", cat:"Mostrito Broaster",icon:"🍖", name:"Mostrito 1/8 Clásico",      price:14   },
  { id:"MB02", cat:"Mostrito Broaster",icon:"🍖", name:"Mostrito 1/4 Clásico",      price:22   },
  { id:"MB03", cat:"Mostrito Broaster",icon:"🍖", name:"Mostrito 1/8 A lo Pobre",   price:18   },
  { id:"MB04", cat:"Mostrito Broaster",icon:"🍖", name:"Mostrito 1/4 A lo Pobre",   price:25   },
  { id:"PE01", cat:"Platos Extras",    icon:"🍽️", name:"Caldo de Gallina",          price:14   },
  { id:"PE02", cat:"Platos Extras",    icon:"🍽️", name:"Arroz Chaufa",              price:14   },
  { id:"PE03", cat:"Platos Extras",    icon:"🍽️", name:"Arroz Chaufa a lo Pobre",   price:18   },
  { id:"PE04", cat:"Platos Extras",    icon:"🍽️", name:"Saltado de Pollo",          price:20   },
  { id:"PE05", cat:"Platos Extras",    icon:"🍽️", name:"Tallarín Saltado Carne",    price:22   },
  { id:"PE06", cat:"Platos Extras",    icon:"🍽️", name:"Tallarín Saltado Pollo",    price:18   },
  { id:"PE07", cat:"Platos Extras",    icon:"🍽️", name:"Mollejita a la Plancha",    price:18   },
  { id:"PE08", cat:"Platos Extras",    icon:"🍽️", name:"Saltado de Molleja",        price:18   },
  { id:"PE09", cat:"Platos Extras",    icon:"🍽️", name:"Pollo a la Plancha 1/4",    price:20   },
  { id:"PE10", cat:"Platos Extras",    icon:"🍽️", name:"Lomo Montado",              price:25   },
  { id:"PE11", cat:"Platos Extras",    icon:"🍽️", name:"Chuleta",                   price:22   },
  { id:"PE12", cat:"Platos Extras",    icon:"🍽️", name:"Lomo a lo Pobre",           price:25   },
  { id:"PE13", cat:"Platos Extras",    icon:"🍽️", name:"Lomo Saltado",              price:22   },
  { id:"MK01", cat:"Menú Kids",        icon:"🧒", name:"Bolipollos 6pz",            price:18   },
  { id:"MK02", cat:"Menú Kids",        icon:"🧒", name:"Boliquesos 6pz",            price:25   },
  { id:"MK03", cat:"Menú Kids",        icon:"🧒", name:"Nuggets 6pz",               price:18   },
  { id:"MK04", cat:"Menú Kids",        icon:"🧒", name:"Chicharrón de Pollo",       price:18   },
  { id:"C01",  cat:"Combos",           icon:"🎁", name:"Combo Personal",            price:9.90 },
  { id:"C02",  cat:"Combos",           icon:"🎁", name:"Combo Cajacho",             price:44.90},
  { id:"C03",  cat:"Combos",           icon:"🎁", name:"Combo Familiar",            price:80.90},
  { id:"C04",  cat:"Combos",           icon:"🎁", name:"Combo Papachos",            price:110.90},
  { id:"R01",  cat:"Rondas",           icon:"🔄", name:"Rondas de Sabores 20pz",    price:68   },
  { id:"R02",  cat:"Rondas",           icon:"🔄", name:"Ronda de Sabores XL 30pz",  price:99   },
  { id:"B01",  cat:"Bebidas",          icon:"🥤", name:"Chicha Morada Normal 1L",   price:10   },
  { id:"B02",  cat:"Bebidas",          icon:"🥤", name:"Chicha Morada Normal 1/2L", price:5    },
  { id:"B03",  cat:"Bebidas",          icon:"🥤", name:"Chicha Morada Normal Vaso", price:2.50 },
  { id:"B04",  cat:"Bebidas",          icon:"🧊", name:"Chicha Morada Frozen 1L",   price:18   },
  { id:"B05",  cat:"Bebidas",          icon:"🧊", name:"Chicha Morada Frozen 1/2L", price:9    },
  { id:"B06",  cat:"Bebidas",          icon:"🥤", name:"Limonada Normal 1L",        price:10   },
  { id:"B07",  cat:"Bebidas",          icon:"🥤", name:"Limonada Normal 1/2L",      price:5    },
  { id:"B08",  cat:"Bebidas",          icon:"🥤", name:"Limonada Normal Vaso",      price:2.50 },
  { id:"B09",  cat:"Bebidas",          icon:"🧊", name:"Limonada Frozen 1L",        price:18   },
  { id:"B10",  cat:"Bebidas",          icon:"🧊", name:"Limonada Frozen 1/2L",      price:9    },
  { id:"B11",  cat:"Bebidas",          icon:"🥤", name:"Maracuyá Normal 1L",        price:10   },
  { id:"B12",  cat:"Bebidas",          icon:"🥤", name:"Maracuyá Normal 1/2L",      price:5    },
  { id:"B13",  cat:"Bebidas",          icon:"🥤", name:"Maracuyá Normal Vaso",      price:2.50 },
  { id:"B14",  cat:"Bebidas",          icon:"🧊", name:"Maracuyá Frozen 1L",        price:18   },
  { id:"B15",  cat:"Bebidas",          icon:"🧊", name:"Maracuyá Frozen 1/2L",      price:9    },
  { id:"CV01", cat:"Cervezas",         icon:"🍺", name:"Cristal",                   price:10   },
  { id:"CV02", cat:"Cervezas",         icon:"🍺", name:"Pilsen",                    price:10   },
  { id:"CV03", cat:"Cervezas",         icon:"🍺", name:"Heineken",                  price:10   },
  { id:"CV04", cat:"Cervezas",         icon:"🍺", name:"Cusqueña",                  price:12   },
  { id:"CV05", cat:"Cervezas",         icon:"🍺", name:"Corona",                    price:10   },
  { id:"G01",  cat:"Gaseosas",         icon:"🥤", name:"Inka Cola 2L",              price:15   },
  { id:"G02",  cat:"Gaseosas",         icon:"🥤", name:"Coca Cola 2L",              price:15   },
  { id:"G03",  cat:"Gaseosas",         icon:"🥤", name:"Inca Kola 1L",              price:8    },
  { id:"G04",  cat:"Gaseosas",         icon:"🥤", name:"Coca Cola 1L",              price:8    },
  { id:"G05",  cat:"Gaseosas",         icon:"🥤", name:"Gordita",                   price:5    },
  { id:"G06",  cat:"Gaseosas",         icon:"🥤", name:"Coca Cola Personal",        price:2.50 },
  { id:"G07",  cat:"Gaseosas",         icon:"🥤", name:"Inka Cola Personal",        price:2.50 },
  { id:"G08",  cat:"Gaseosas",         icon:"🥤", name:"Agua Mineral",              price:3    },
  { id:"G09",  cat:"Gaseosas",         icon:"🥤", name:"Inca Kola 600ml",           price:4    },
  { id:"G10",  cat:"Gaseosas",         icon:"🥤", name:"Coca Cola 600ml",           price:4    },
  { id:"O01",  cat:"Otros",            icon:"☕", name:"Café Pasado",               price:4    },
  { id:"O02",  cat:"Otros",            icon:"🍵", name:"Infusiones",                price:3    },
  { id:"B16",  cat:"Bebidas",          icon:"🥤", name:"Piña Normal 1L",            price:10   },
  { id:"B17",  cat:"Bebidas",          icon:"🥤", name:"Piña Normal 1/2L",          price:5    },
  { id:"B18",  cat:"Bebidas",          icon:"🥤", name:"Piña Normal Vaso",          price:2.50 },
  { id:"B19",  cat:"Bebidas",          icon:"🧊", name:"Piña Frozen 1L",            price:18   },
  { id:"B20",  cat:"Bebidas",          icon:"🧊", name:"Piña Frozen 1/2L",          price:9    },
  { id:"B21",  cat:"Bebidas",          icon:"🥤", name:"Cebada Normal 1L",          price:10   },
  { id:"B22",  cat:"Bebidas",          icon:"🥤", name:"Cebada Normal 1/2L",        price:5    },
  { id:"B23",  cat:"Bebidas",          icon:"🥤", name:"Cebada Normal Vaso",        price:2.50 },
  { id:"B24",  cat:"Bebidas",          icon:"🧊", name:"Cebada Frozen 1L",          price:18   },
  { id:"B25",  cat:"Bebidas",          icon:"🧊", name:"Cebada Frozen 1/2L",        price:9    },
  { id:"B26",  cat:"Bebidas",          icon:"🥤", name:"Fresa Normal 1L",           price:10   },
  { id:"B27",  cat:"Bebidas",          icon:"🥤", name:"Fresa Normal 1/2L",         price:5    },
  { id:"B28",  cat:"Bebidas",          icon:"🥤", name:"Fresa Normal Vaso",         price:2.50 },
  { id:"B29",  cat:"Bebidas",          icon:"🧊", name:"Fresa Frozen 1L",           price:18   },
  { id:"B30",  cat:"Bebidas",          icon:"🧊", name:"Fresa Frozen 1/2L",         price:9    },
  { id:"CH01", cat:"Chilcanos",        icon:"🍹", name:"Chilcano Limón Vaso",       price:15   },
  { id:"CH02", cat:"Chilcanos",        icon:"🍹", name:"Chilcano Limón Jarra",      price:30   },
  { id:"CH03", cat:"Chilcanos",        icon:"🍹", name:"Chilcano Maracuyá Vaso",    price:15   },
  { id:"CH04", cat:"Chilcanos",        icon:"🍹", name:"Chilcano Maracuyá Jarra",   price:30   },
  { id:"CH05", cat:"Chilcanos",        icon:"🍹", name:"Chilcano Fresa Vaso",       price:15   },
  { id:"CH06", cat:"Chilcanos",        icon:"🍹", name:"Chilcano Fresa Jarra",      price:30   },
  { id:"CH07", cat:"Chilcanos",        icon:"🍹", name:"Chilcano Aguaimanto Vaso",  price:15   },
  { id:"CH08", cat:"Chilcanos",        icon:"🍹", name:"Chilcano Aguaimanto Jarra", price:30   },
  { id:"CH09", cat:"Chilcanos",        icon:"🍹", name:"Chilcano Tuna Vaso",        price:15   },
  { id:"CH10", cat:"Chilcanos",        icon:"🍹", name:"Chilcano Tuna Jarra",       price:30   },
  { id:"CH11", cat:"Chilcanos",        icon:"🍹", name:"Chilcano Mango Vaso",       price:15   },
  { id:"CH12", cat:"Chilcanos",        icon:"🍹", name:"Chilcano Mango Jarra",      price:30   },
  // BEBIDAS extra sabores
  { id:"B16",  cat:"Bebidas",          icon:"🥤", name:"Piña Normal 1L",            price:10   },
  { id:"B17",  cat:"Bebidas",          icon:"🥤", name:"Piña Normal 1/2L",          price:5    },
  { id:"B18",  cat:"Bebidas",          icon:"🥤", name:"Piña Normal Vaso",          price:2.50 },
  { id:"B19",  cat:"Bebidas",          icon:"🧊", name:"Piña Frozen 1L",            price:18   },
  { id:"B20",  cat:"Bebidas",          icon:"🧊", name:"Piña Frozen 1/2L",          price:9    },
  { id:"B21",  cat:"Bebidas",          icon:"🥤", name:"Cebada Normal 1L",          price:10   },
  { id:"B22",  cat:"Bebidas",          icon:"🥤", name:"Cebada Normal 1/2L",        price:5    },
  { id:"B23",  cat:"Bebidas",          icon:"🥤", name:"Cebada Normal Vaso",        price:2.50 },
  { id:"B24",  cat:"Bebidas",          icon:"🧊", name:"Cebada Frozen 1L",          price:18   },
  { id:"B25",  cat:"Bebidas",          icon:"🧊", name:"Cebada Frozen 1/2L",        price:9    },
  { id:"B26",  cat:"Bebidas",          icon:"🥤", name:"Fresa Normal 1L",           price:10   },
  { id:"B27",  cat:"Bebidas",          icon:"🥤", name:"Fresa Normal 1/2L",         price:5    },
  { id:"B28",  cat:"Bebidas",          icon:"🥤", name:"Fresa Normal Vaso",         price:2.50 },
  { id:"B29",  cat:"Bebidas",          icon:"🧊", name:"Fresa Frozen 1L",           price:18   },
  { id:"B30",  cat:"Bebidas",          icon:"🧊", name:"Fresa Frozen 1/2L",         price:9    },
  // CHILCANOS
  { id:"CH01", cat:"Chilcanos",        icon:"🍹", name:"Chilcano Limón Vaso",       price:15   },
  { id:"CH02", cat:"Chilcanos",        icon:"🍹", name:"Chilcano Limón Jarra",      price:30   },
  { id:"CH03", cat:"Chilcanos",        icon:"🍹", name:"Chilcano Maracuyá Vaso",    price:15   },
  { id:"CH04", cat:"Chilcanos",        icon:"🍹", name:"Chilcano Maracuyá Jarra",   price:30   },
  { id:"CH05", cat:"Chilcanos",        icon:"🍹", name:"Chilcano Fresa Vaso",       price:15   },
  { id:"CH06", cat:"Chilcanos",        icon:"🍹", name:"Chilcano Fresa Jarra",      price:30   },
  { id:"CH07", cat:"Chilcanos",        icon:"🍹", name:"Chilcano Aguaimanto Vaso",  price:15   },
  { id:"CH08", cat:"Chilcanos",        icon:"🍹", name:"Chilcano Aguaimanto Jarra", price:30   },
  { id:"CH09", cat:"Chilcanos",        icon:"🍹", name:"Chilcano Tuna Vaso",        price:15   },
  { id:"CH10", cat:"Chilcanos",        icon:"🍹", name:"Chilcano Tuna Jarra",       price:30   },
  { id:"CH11", cat:"Chilcanos",        icon:"🍹", name:"Chilcano Mango Vaso",       price:15   },
  { id:"CH12", cat:"Chilcanos",        icon:"🍹", name:"Chilcano Mango Jarra",      price:30   },
];

const ALL_CATS = [...new Set(MENU_BASE.map(i => i.cat))];
const fmt      = (n) => `S/.${Number(n).toFixed(2)}`;
const newDraft = () => ({ table:"", items:[], payment:"efectivo", notes:"", phone:"", orderType:"mesa", taperCost:0 });
const MESAS    = [1, 2, 3, 4, 5, 6];

function useWindowWidth() {
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1024);
  useEffect(() => {
    const h = () => setW(window.innerWidth);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return w;
}

// ═══════════════════════════════════════════════════════════════════
//  MODAL DE EDICIÓN — fuera del App para arreglar bug de notas
// ═══════════════════════════════════════════════════════════════════
function EditOrderModal({ order, onSave, onClose, menu, isMobile, s, Y }) {
  const [eTable,     setETable]     = useState(order.table);
  const [eItems,     setEItems]     = useState(order.items.map(i => ({ ...i })));
  const [ePay,       setEPay]       = useState(order.payment);
  const [eNotes,     setENotes]     = useState(order.notes || "");
  const [ePhone,     setEPhone]     = useState(order.phone || "");
  const [eOrderType, setEOrderType] = useState(order.orderType || "mesa");
  const [eTaperCost, setETaperCost] = useState(order.taperCost || 0);
  const [eCat,       setECat]       = useState("Todos");
  const [eSearch,    setESearch]    = useState("");

  const eTotal = eItems.reduce((sum, i) => sum + i.price * i.qty, 0) + (eOrderType === "llevar" ? Number(eTaperCost) || 0 : 0);

  const eAddItem = (item) => setEItems(prev => {
    const ex = prev.find(i => i.id === item.id);
    return ex ? prev.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i)
              : [...prev, { ...item, qty: 1 }];
  });
  const eChangeQty = (id, d) => setEItems(prev =>
    prev.map(i => i.id === id ? { ...i, qty: i.qty + d } : i).filter(i => i.qty > 0)
  );
  const filtE = menu.filter(i =>
    (eCat === "Todos" || i.cat === eCat) &&
    i.name.toLowerCase().includes(eSearch.toLowerCase())
  );
  const handleSave = () => {
    if (!eTable.trim() || !eItems.length) return;
    onSave({ ...order, table: eTable, items: eItems, payment: ePay, notes: eNotes, phone: ePhone, total: eTotal, orderType: eOrderType, taperCost: eTaperCost });
  };

  return (
    <div style={s.modal} onClick={e => e.stopPropagation()}>
      <div style={{ ...s.row, marginBottom:14 }}>
        <div style={{ color:Y, fontFamily:"'Bebas Neue',cursive", fontSize:20, letterSpacing:1 }}>✏️ EDITAR PEDIDO</div>
        <button style={{ ...s.btn("secondary"), padding:"4px 10px" }} onClick={onClose}>✕</button>
      </div>

      <div style={{ marginBottom:10 }}>
        <label style={{ fontSize:11, color:"#888", textTransform:"uppercase", letterSpacing:1 }}>Tipo de pedido</label>
        <div style={{ display:"flex", gap:6, marginTop:4 }}>
          {["mesa","llevar"].map(t => (
            <button key={t} style={{ ...s.btn(eOrderType===t?"primary":"secondary"), flex:1 }}
              onClick={() => { setEOrderType(t); setETaperCost(0); }}>
              {t==="mesa"?"🪑 Mesa":"🥡 Para llevar"}
            </button>
          ))}
        </div>
        <input style={{ ...s.input, marginTop:6 }} value={eTable} onChange={e => setETable(e.target.value)}
          placeholder={eOrderType==="mesa"?"Ej: Mesa 5":"Nombre del cliente"} />
      </div>

      {eOrderType === "llevar" && (
        <div style={{ marginBottom:10 }}>
          <label style={{ fontSize:11, color:"#888", textTransform:"uppercase", letterSpacing:1 }}>Teléfono</label>
          <input style={{ ...s.input, marginTop:4 }} value={ePhone} onChange={e => setEPhone(e.target.value)}
            placeholder="Ej: 9 87654321" />
        </div>
      )}

      {eOrderType === "llevar" && (
        <div style={{ marginBottom:10 }}>
          <label style={{ fontSize:11, color:"#888", textTransform:"uppercase", letterSpacing:1 }}>Costo taper/bolsa (S/.)</label>
          <input style={{ ...s.input, marginTop:4 }} type="number" min="0" step="0.50" placeholder="Ej: 1.00"
            value={eTaperCost || ""} onChange={e => setETaperCost(e.target.value)} />
        </div>
      )}

      <div style={{ marginBottom:10 }}>
        <label style={{ fontSize:11, color:"#888", textTransform:"uppercase", letterSpacing:1 }}>Forma de pago</label>
        <div style={{ display:"flex", gap:6, marginTop:4 }}>
          {[["efectivo","💵"],["yape","💜"],["tarjeta","💳"]].map(([p,ic]) => (
            <button key={p} style={{ ...s.btn(ePay===p?"primary":"secondary"), flex:1 }} onClick={() => setEPay(p)}>
              {ic} {p}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom:10 }}>
        <label style={{ fontSize:11, color:"#888", textTransform:"uppercase", letterSpacing:1 }}>Notas</label>
        <input style={{ ...s.input, marginTop:4 }} value={eNotes}
          onChange={e => setENotes(e.target.value)} placeholder="Sin cebolla, extra salsa..." />
      </div>

      <div style={{ marginBottom:12 }}>
        <label style={{ fontSize:11, color:"#888", textTransform:"uppercase", letterSpacing:1 }}>Productos del pedido</label>
        {eItems.length === 0
          ? <div style={{ textAlign:"center", color:"#444", padding:"12px 0", fontSize:12 }}>Agrega productos desde abajo</div>
          : eItems.map(item => (
            <div key={item.id} style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 0", borderBottom:"1px solid #252525" }}>
              <div style={{ flex:1, fontSize:13, fontWeight:700 }}>{item.name}</div>
              <button style={{ ...s.btn("danger"), padding:"2px 7px", fontSize:13 }} onClick={() => eChangeQty(item.id,-1)}>−</button>
              <span style={{ fontWeight:900, minWidth:18, textAlign:"center" }}>{item.qty}</span>
              <button style={{ ...s.btn(), padding:"2px 7px", fontSize:13 }} onClick={() => eChangeQty(item.id,1)}>+</button>
              <span style={{ color:Y, fontWeight:900, fontSize:13, minWidth:52, textAlign:"right" }}>{fmt(item.price*item.qty)}</span>
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
              <div key={item.id} onClick={() => eAddItem(item)} style={{ ...s.card, cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4, padding:"7px 10px", border: inE ? `1px solid ${Y}55` : "1px solid #2a2a2a" }}>
                <span style={{ fontSize:13 }}>{item.icon} {item.name}</span>
                <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                  <span style={{ color:Y, fontWeight:900, fontSize:12 }}>{fmt(item.price)}</span>
                  {inE
                    ? <span style={{ background:Y, color:"#111", borderRadius:10, padding:"1px 7px", fontSize:11, fontWeight:900 }}>×{inE.qty}</span>
                    : <span style={{ background:"#2a2a2a", borderRadius:"50%", width:20, height:20, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, color:"#aaa", fontSize:14 }}>+</span>
                  }
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <button style={{ ...s.btn("warn"), width:"100%", padding:12, fontSize:14, opacity:(!eTable||!eItems.length)?0.4:1 }}
        onClick={handleSave} disabled={!eTable||!eItems.length}>
        💾 Guardar Cambios
      </button>
    </div>
  );
}

// ── Componente NuevoPedido extraído para evitar re-renders ───────
function NuevoPedidoComponent({ draft, setDraft, filteredMenu, addItem, changeQty, draftTotal, fmt, search, setSearch, catFilter, setCatFilter, ALL_CATS, s, Y, isDesktop, isMobile, submitOrder, newDraft }) {
  return (
    <div style={{ display:"grid", gridTemplateColumns: isDesktop ? "1fr 300px" : "1fr", gap: isMobile ? 12 : 14 }}>
      <div>
        <div style={s.title}>🍔 CARTA</div>
        <input style={{ ...s.input, marginBottom:8 }} placeholder="Buscar platillo..." value={search} onChange={e => setSearch(e.target.value)} />
        <div style={{ display:"flex", gap:4, flexWrap:"wrap", marginBottom:10 }}>
          {["Todos",...ALL_CATS].map(c => (
            <button key={c} style={{ ...s.btn(catFilter===c?"primary":"secondary"), fontSize: isMobile?9:10, padding: isMobile?"3px 6px":"4px 10px" }} onClick={() => setCatFilter(c)}>{c}</button>
          ))}
        </div>
        <div>
          {filteredMenu.length === 0 && <div style={{ color:"#555", textAlign:"center", padding:20 }}>Sin resultados</div>}
          {filteredMenu.map(item => {
            const inDraft = draft.items.find(i => i.id === item.id);
            return (
              <div key={item.id} onClick={() => addItem(item)}
                style={{ ...s.card, cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center", border: inDraft?`1px solid ${Y}66`:"1px solid #2a2a2a", marginBottom:5, padding: isMobile?"8px 10px":"10px 12px" }}>
                <div style={{ flex:1 }}>
                  <span style={{ marginRight:6 }}>{item.icon}</span>
                  <span style={{ fontWeight:700, fontSize: isMobile?13:14 }}>{item.name}</span>
                  {!isMobile && <span style={{ ...s.tag("#252525"), marginLeft:8, fontSize:10 }}>{item.cat}</span>}
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                  <span style={{ color:Y, fontWeight:900, fontSize: isMobile?13:14 }}>{fmt(item.price)}</span>
                  {inDraft
                    ? <span style={{ background:Y, color:"#111", borderRadius:12, padding:"1px 8px", fontSize:12, fontWeight:900 }}>×{inDraft.qty}</span>
                    : <span style={{ background:"#2a2a2a", borderRadius:"50%", width:22, height:22, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, fontSize:16, color:"#aaa" }}>+</span>
                  }
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <div style={{ ...s.cardHL, position: isDesktop ? "sticky" : "static", top:8 }}>
          <div style={{ ...s.title, fontSize:18, marginBottom:12 }}>📋 PEDIDO</div>

          <div style={{ marginBottom:10 }}>
            <label style={{ fontSize:11, color:"#888", textTransform:"uppercase", letterSpacing:1 }}>Tipo de pedido</label>
            <div style={{ display:"flex", gap:6, marginTop:4 }}>
              {["mesa","llevar"].map(t => (
                <button key={t} style={{ ...s.btn(draft.orderType===t?"primary":"secondary"), flex:1 }}
                  onClick={() => setDraft(d => ({...d, orderType:t, taperCost:0}))}>
                  {t==="mesa"?"🪑 Mesa":"🥡 Para llevar"}
                </button>
              ))}
            </div>
            <input style={{ ...s.input, marginTop:6 }}
              placeholder={draft.orderType==="mesa"?"Ej: Mesa 5":"Nombre del cliente"}
              value={draft.table} onChange={e => setDraft(d => ({...d,table:e.target.value}))} />
          </div>

          {draft.orderType === "llevar" && (
            <div style={{ marginBottom:10 }}>
              <label style={{ fontSize:11, color:"#888", textTransform:"uppercase", letterSpacing:1 }}>Costo taper/bolsa (S/.)</label>
              <input style={{ ...s.input, marginTop:4 }} type="number" min="0" step="0.50" placeholder="Ej: 1.00"
                value={draft.taperCost || ""} onChange={e => setDraft(d => ({...d, taperCost: e.target.value}))} />
            </div>
          )}

          {draft.orderType === "llevar" && (
            <div style={{ marginBottom:10 }}>
              <label style={{ fontSize:11, color:"#888", textTransform:"uppercase", letterSpacing:1 }}>Teléfono</label>
              <input style={{ ...s.input, marginTop:4 }} value={draft.phone || ""} onChange={e => setDraft(d => ({...d, phone: e.target.value}))}
                placeholder="Ej: 9 87654321" />
            </div>
          )}

          <div style={{ marginBottom:10 }}>
            <label style={{ fontSize:11, color:"#888", textTransform:"uppercase", letterSpacing:1 }}>Forma de pago</label>
            <div style={{ display:"flex", gap:6, marginTop:4 }}>
              {[["efectivo","💵"],["yape","💜"],["tarjeta","💳"]].map(([p,ic]) => (
                <button key={p} style={{ ...s.btn(draft.payment===p?"primary":"secondary"), flex:1 }} onClick={() => setDraft(d => ({...d,payment:p}))}>
                  {ic} {p}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom:12 }}>
            <label style={{ fontSize:11, color:"#888", textTransform:"uppercase", letterSpacing:1 }}>Notas</label>
            <input style={{ ...s.input, marginTop:4 }} value={draft.notes} onChange={e => setDraft(d => ({...d, notes: e.target.value}))} placeholder="Sin cebolla, extra salsa..." />
          </div>

          {draft.items.length === 0
            ? <div style={{ textAlign:"center", color:"#444", padding:"20px 0", fontSize:13 }}>Toca un platillo para agregarlo →</div>
            : <div style={{ maxHeight: isDesktop ? 240 : 180, overflowY:"auto", marginBottom:8 }}>
                {draft.items.map(item => (
                  <div key={item.id} style={{ display:"flex", alignItems:"center", gap:6, marginBottom:6, padding:"6px 0", borderBottom:"1px solid #252525" }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:700, fontSize:13 }}>{item.name}</div>
                      <div style={{ fontSize:11, color:"#666" }}>{fmt(item.price)} c/u</div>
                    </div>
                    <button style={{ ...s.btn("danger"), padding:"2px 7px" }} onClick={() => changeQty(item.id,-1)}>−</button>
                    <span style={{ fontWeight:900, minWidth:18, textAlign:"center" }}>{item.qty}</span>
                    <button style={{ ...s.btn(), padding:"2px 7px" }} onClick={() => changeQty(item.id,1)}>+</button>
                    <span style={{ color:Y, fontWeight:900, fontSize:13, minWidth:50, textAlign:"right" }}>{fmt(item.price*item.qty)}</span>
                  </div>
                ))}
              </div>
          }

          <div style={{ display:"flex", justifyContent:"space-between", padding:"10px 0", borderTop:`2px solid ${Y}55`, marginBottom:12 }}>
            <span style={{ fontWeight:900, fontSize:17 }}>TOTAL</span>
            <span style={{ fontWeight:900, fontSize:17, color:Y }}>{fmt(draftTotal + (draft.orderType==="llevar"?Number(draft.taperCost)||0:0))}</span>
          </div>

          <button style={{ ...s.btn(), width:"100%", padding:12, fontSize:15, opacity:(!draft.table||!draft.items.length)?0.4:1 }}
            onClick={submitOrder} disabled={!draft.table||!draft.items.length}>
            ✅ Confirmar Pedido
          </button>
          <button style={{ ...s.btn("secondary"), width:"100%", padding:8, marginTop:6, fontSize:12 }} onClick={() => { setDraft(newDraft()); }}>
            🗑️ Limpiar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Impresión para cocina ─────────────────────────────────────────
function printOrder(order) {
  const win = window.open("", "_blank", "width=220,height=600");
  const items = order.items.map(i =>
    `<tr>
      <td class="qty">${i.qty}x</td>
      <td class="item">${i.name}</td>
      <td class="price">S/.${(i.price * i.qty).toFixed(2)}</td>
    </tr>`
  ).join("");
  const notes = order.notes
    ? `<div class="notes">📝 ${order.notes}</div>`
    : "";
  const tipo  = order.orderType === "llevar"
    ? `🥡 LLEVAR — ${order.table}`
    : `MESA ${order.table}`;
  const hora  = new Date().toLocaleTimeString("es-PE", { hour:"2-digit", minute:"2-digit" });
  const fecha = new Date().toLocaleDateString("es-PE", { day:"2-digit", month:"2-digit", year:"2-digit" });

  win.document.write(`<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<title>Pedido</title>
<style>
  @page {
    size: 50mm auto;
    margin: 0;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Courier New', monospace;
    font-size: 11px;
    width: 50mm;
    padding-top: 10mm;
    padding-left: 2mm;
    padding-right: 2mm;
    padding-bottom: 4mm;
    background: #fff;
    color: #000;
  }
  .logo {
    text-align: center;
    font-size: 13px;
    font-weight: bold;
    letter-spacing: 1px;
    margin-bottom: 1mm;
  }
  .sub {
    text-align: center;
    font-size: 9px;
    margin-bottom: 2mm;
    color: #333;
  }
  .divider {
    border-top: 1px dashed #000;
    margin: 2mm 0;
  }
  .mesa {
    text-align: center;
    font-size: 16px;
    font-weight: bold;
    margin: 2mm 0;
    letter-spacing: 1px;
  }
  .hora {
    text-align: center;
    font-size: 9px;
    color: #444;
    margin-bottom: 2mm;
  }
  table {
    width: 100%;
    border-collapse: collapse;
  }
  td { padding: 1mm 0; vertical-align: top; }
  .qty  { width: 7mm; font-weight: bold; }
  .item { width: auto; }
  .price {
    width: 16mm;
    text-align: right;
    white-space: nowrap;
  }
  .total-row {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
    font-weight: bold;
    margin-top: 2mm;
    padding-top: 1mm;
    border-top: 1px solid #000;
  }
  .notes {
    font-size: 10px;
    font-style: italic;
    margin-top: 2mm;
    padding: 1mm;
    border: 1px dashed #999;
  }
  .footer {
    text-align: center;
    font-size: 9px;
    margin-top: 3mm;
    color: #555;
  }
</style>
</head>
<body>
  <div class="logo">MR. PAPACHOS</div>
  <div class="sub">¡Sabe a Cajacho!</div>
  <div class="divider"></div>
  <div class="mesa">${tipo}</div>
  <div class="hora">${fecha} — ${hora}</div>
  <div class="divider"></div>
  <table>${items}</table>
  ${notes}
  <div class="divider"></div>
  <div class="total-row">
    <span>TOTAL</span>
    <span>S/.${order.total.toFixed(2)}</span>
  </div>
  <div class="footer">— Cocina —</div>
  <script>
    window.onload = function() {
      window.print();
      setTimeout(function(){ window.close(); }, 500);
    };
  <\/script>
</body></html>`);
  win.document.close();
}

// ═══════════════════════════════════════════════════════════════════
//  APP PRINCIPAL
// ═══════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════
//  INVENTARIO — componente independiente para evitar re-renders de App
// ═══════════════════════════════════════════════════════════════════
function Inventario({ menu, orders, history, isMobile, s, Y, ALL_CATS, fmt }) {
  const [invCat,    setInvCat]    = useState("Todos");
  const [invPeriod, setInvPeriod] = useState("hoy");
  const [invSortBy, setInvSortBy] = useState("cantidad");
  const [search,    setSearch]    = useState("");

  const now      = new Date();
  const todayStr = now.toDateString();
  const weekAgo  = new Date(now - 7 * 24 * 60 * 60 * 1000);

  const inPeriod = (iso) => {
    if (!iso) return false;
    const d = new Date(iso);
    if (invPeriod === "hoy")    return d.toDateString() === todayStr;
    if (invPeriod === "semana") return d >= weekAgo;
    return true;
  };

  const counts = {};
  const revenue = {};

  history.filter(o => o.status === "pagado" && inPeriod(o.paidAt)).forEach(order => {
    order.items?.forEach(item => {
      counts[item.id]  = (counts[item.id]  || 0) + item.qty;
      revenue[item.id] = (revenue[item.id] || 0) + item.price * item.qty;
    });
  });

  if (invPeriod === "hoy" || invPeriod === "semana") {
    orders.filter(o => inPeriod(o.createdAt)).forEach(order => {
      order.items?.forEach(item => {
        counts[item.id]  = (counts[item.id]  || 0) + item.qty;
        revenue[item.id] = (revenue[item.id] || 0) + item.price * item.qty;
      });
    });
  }

  let items = menu
    .map(item => ({ ...item, qty: counts[item.id] || 0, revenue: revenue[item.id] || 0 }))
    .filter(item =>
      (invCat === "Todos" || item.cat === invCat) &&
      item.name.toLowerCase().includes(search.toLowerCase())
    );

  if (invSortBy === "cantidad") items = items.sort((a, b) => b.qty - a.qty);
  else                          items = items.sort((a, b) => a.name.localeCompare(b.name));

  const totalQty    = items.reduce((s, i) => s + i.qty, 0);
  const totalRev    = items.reduce((s, i) => s + i.revenue, 0);
  const maxQty      = Math.max(...items.map(i => i.qty), 1);
  const periodLabel = invPeriod === "hoy" ? "hoy" : invPeriod === "semana" ? "esta semana" : "histórico";

  return (
    <div>
      <div style={s.title}>📦 INVENTARIO DE VENTAS</div>

      <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:10 }}>
        {[["hoy","📅 Hoy"],["semana","📆 Semana"],["total","🗂️ Total"]].map(([v,l]) => (
          <button key={v} style={{ ...s.btn(invPeriod===v?"primary":"secondary"), fontSize:11 }} onClick={() => setInvPeriod(v)}>{l}</button>
        ))}
        <div style={{ width:1, background:"#333" }} />
        {[["cantidad","# Cantidad"],["nombre","A-Z Nombre"]].map(([v,l]) => (
          <button key={v} style={{ ...s.btn(invSortBy===v?"primary":"secondary"), fontSize:11 }} onClick={() => setInvSortBy(v)}>{l}</button>
        ))}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:12 }}>
        <div style={s.statCard}><div style={{ ...s.statNum, fontSize:isMobile?18:24 }}>{totalQty}</div><div style={s.statLbl}>Items {periodLabel}</div></div>
        <div style={{ ...s.statCard, border:`1px solid ${Y}55` }}><div style={{ ...s.statNum, fontSize:isMobile?14:18 }}>{fmt(totalRev)}</div><div style={s.statLbl}>Ingresos {periodLabel}</div></div>
        <div style={s.statCard}><div style={{ ...s.statNum, fontSize:isMobile?18:24 }}>{items.filter(i=>i.qty>0).length}</div><div style={s.statLbl}>Platos distintos</div></div>
      </div>

      <input
        style={{ ...s.input, marginBottom:8 }}
        placeholder="Buscar platillo..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />
      <div style={{ display:"flex", gap:4, flexWrap:"wrap", marginBottom:12 }}>
        {["Todos", ...ALL_CATS].map(c => (
          <button key={c} style={{ ...s.btn(invCat===c?"primary":"secondary"), fontSize:isMobile?9:10, padding:isMobile?"3px 6px":"4px 9px" }} onClick={() => setInvCat(c)}>{c}</button>
        ))}
      </div>

      {items.length === 0
        ? <div style={{ textAlign:"center", padding:40, color:"#444" }}>Sin resultados</div>
        : items.map(item => (
          <div key={item.id} style={{ ...s.card, marginBottom:6, padding:"10px 12px", opacity: item.qty === 0 ? 0.4 : 1 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom: item.qty > 0 ? 6 : 0 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, flex:1, minWidth:0 }}>
                <span style={{ fontSize:18 }}>{item.icon}</span>
                <div style={{ minWidth:0 }}>
                  <div style={{ fontWeight:800, fontSize:isMobile?12:14, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{item.name}</div>
                  <div style={{ fontSize:10, color:"#555" }}>{item.cat} · {fmt(item.price)}</div>
                </div>
              </div>
              <div style={{ textAlign:"right", flexShrink:0, marginLeft:8 }}>
                <div style={{ fontWeight:900, fontSize:isMobile?16:20, color: item.qty > 0 ? Y : "#444" }}>
                  {item.qty > 0 ? `×${item.qty}` : "—"}
                </div>
                {item.qty > 0 && <div style={{ fontSize:10, color:"#27ae60" }}>{fmt(item.revenue)}</div>}
              </div>
            </div>
            {item.qty > 0 && (
              <div style={{ background:"#222", borderRadius:4, height:5, overflow:"hidden" }}>
                <div style={{ background:`linear-gradient(90deg,${Y},#e6b800)`, height:"100%", width:`${(item.qty/maxQty)*100}%`, borderRadius:4, transition:"width .3s" }} />
              </div>
            )}
          </div>
        ))
      }
    </div>
  );
}

export default function App() {
  const width     = useWindowWidth();
  const isMobile  = width < 480;
  const isTablet  = width >= 480 && width < 768;
  const isDesktop = width >= 768;
  const isWide    = width >= 1024;

  const [tab,           setTab]           = useState("dashboard");
  const [orders,        setOrders]        = useState([]);
  const [history,       setHistory]       = useState([]);
  const [menu,          setMenu]          = useState(MENU_BASE);
  const [draft,         setDraft]         = useState(newDraft());
  const [catFilter,     setCatFilter]     = useState("Todos");
  const [search,        setSearch]        = useState("");
  const [showAdd,       setShowAdd]       = useState(false);
  const [newItem,       setNewItem]       = useState({ name:"", cat:"Hamburguesas", price:"" });
  const [loaded,        setLoaded]        = useState(false);
  const [splash,        setSplash]        = useState(true);
  const [toast,         setToast]         = useState(null);
  const [editingOrder,  setEditingOrder]  = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [mesaModal,     setMesaModal]     = useState(null);
  const [kitchenChecks, setKitchenChecks] = useState({});

  useEffect(() => {
    const t = setTimeout(() => setSplash(false), 2200);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    (async () => {
      const [o, h, m] = await Promise.all([FS.getOrders(), FS.getHistory(), FS.getMenu()]);
      if (o?.length) setOrders(o);
      if (h?.length) setHistory(h);
      if (m?.length) setMenu([...MENU_BASE, ...m]);
      setLoaded(true);
    })();
  }, []);

  const showToast = (msg, color = "#27ae60") => {
    setToast({ msg, color });
    setTimeout(() => setToast(null), 2800);
  };

  const saveOrders = async (v) => { setOrders(v); await FS.saveOrders(v); };
  const saveMenu   = async (v) => { setMenu(v);   await FS.saveMenu(v.filter(i => i.id.startsWith("CUSTOM_"))); };

  const addItem = (item) => setDraft(d => {
    const ex = d.items.find(i => i.id === item.id);
    return ex
      ? { ...d, items: d.items.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i) }
      : { ...d, items: [...d.items, { ...item, qty: 1 }] };
  });
  const changeQty = (id, delta) => setDraft(d => ({
    ...d, items: d.items.map(i => i.id === id ? { ...i, qty: i.qty + delta } : i).filter(i => i.qty > 0),
  }));
  const draftTotal = draft.items.reduce((s, i) => s + i.price * i.qty, 0);

  const submitOrder = async () => {
    if (!draft.table.trim() || !draft.items.length) return;
    const total = draftTotal + (draft.orderType === "llevar" ? Number(draft.taperCost) || 0 : 0);
    const order = { id: Date.now().toString(), ...draft, total, status:"pendiente", createdAt: new Date().toISOString() };
    await saveOrders([...orders, order]);
    setDraft(d => ({ ...newDraft(), notes: d.notes, phone: d.phone }));
    showToast(`✅ Pedido ${draft.orderType==="llevar"?`Para llevar - ${draft.table}`:`Mesa ${draft.table}`} creado`);
    setTab("pedidos");
  };

  const markPaid = async (id) => {
    const o = orders.find(x => x.id === id);
    if (!o) return;
    const finished = { ...o, status:"pagado", paidAt: new Date().toISOString(), createdAt: o.createdAt || new Date().toISOString() };
    await FS.addHistory(finished);
    setHistory(h => [finished, ...h]);
    await saveOrders(orders.filter(x => x.id !== id));
    showToast(`💰 ${o.orderType==="llevar"?`Para llevar`:`Mesa ${o.table}`} pagada — ${fmt(o.total)}`);
  };

  const cancelOrder = async (id) => {
    const o = orders.find(x => x.id === id);
    if (!o) return;
    const finished = { ...o, status:"cancelado", cancelledAt: new Date().toISOString(), createdAt: o.createdAt || new Date().toISOString() };
    await FS.addHistory(finished);
    setHistory(h => [finished, ...h]);
    await saveOrders(orders.filter(x => x.id !== id));
    showToast("❌ Pedido cancelado", "#e74c3c");
  };

  const deleteOrderPermanent = async (id) => {
    await saveOrders(orders.filter(x => x.id !== id));
    setConfirmDelete(null);
    showToast("🗑️ Pedido eliminado", "#888");
  };

  const saveEditedOrder = async (updated) => {
    const newOrders = orders.map(o => o.id === updated.id ? updated : o);
    await saveOrders(newOrders);
    setEditingOrder(null);
    showToast(`✏️ Pedido actualizado`, "#f39c12");
  };

  const addMenuItem = async () => {
    if (!newItem.name.trim() || !newItem.price) return;
    const item = { id:"CUSTOM_" + Date.now(), cat: newItem.cat, icon:"⭐", name: newItem.name, price: parseFloat(newItem.price) };
    await saveMenu([...menu, item]);
    setNewItem({ name:"", cat:"Hamburguesas", price:"" });
    setShowAdd(false);
    showToast(`⭐ "${item.name}" agregado`);
  };

  const deleteMenuItem = async (id) => {
    await saveMenu(menu.filter(i => i.id !== id));
    showToast("🗑️ Platillo eliminado", "#e74c3c");
  };

  const today     = new Date().toDateString();
  const paidToday = history.filter(o => o.status === "pagado" && new Date(o.paidAt).toDateString() === today);
  const todayRev  = paidToday.reduce((s, o) => s + o.total, 0);
  const totalRev  = history.filter(o => o.status === "pagado").reduce((s, o) => s + o.total, 0);
  const cashRev   = paidToday.filter(o => o.payment === "efectivo").reduce((s, o) => s + o.total, 0);
  const yapeRev   = paidToday.filter(o => o.payment === "yape").reduce((s, o) => s + o.total, 0);
  const cardRev   = paidToday.filter(o => o.payment === "tarjeta").reduce((s, o) => s + o.total, 0);
  const filteredMenu = menu.filter(i => (catFilter === "Todos" || i.cat === catFilter) && i.name.toLowerCase().includes(search.toLowerCase()));
  const timeStr    = (iso) => { if (!iso) return ""; const d = new Date(iso); return d.toLocaleTimeString("es-PE",{hour:"2-digit",minute:"2-digit"}) + " · " + d.toLocaleDateString("es-PE"); };
  const minutesAgo = (iso) => { const m = Math.floor((Date.now()-new Date(iso))/60000); if(m<1)return"ahora"; if(m<60)return`hace ${m}m`; return`hace ${Math.floor(m/60)}h ${m%60}m`; };

  // ── Splash ───────────────────────────────────────────────────
  if (splash) return (
    <div style={{ background:"#111", height:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:20 }}>
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Nunito:wght@400;700;900&display=swap" rel="stylesheet" />
      <div style={{ fontSize:90 }}>🍔</div>
      <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:36, color:"#FFD700", letterSpacing:4 }}>MR. PAPACHOS</div>
      <div style={{ fontFamily:"'Nunito',sans-serif", color:"#555", fontSize:13, letterSpacing:3, textTransform:"uppercase" }}>Cajamarca</div>
    </div>
  );

  if (!loaded) return (
    <div style={{ background:"#111", color:"#FFD700", height:"100vh", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"sans-serif" }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:52 }}>🍔</div>
        <div style={{ marginTop:12, fontWeight:700, letterSpacing:2 }}>Cargando...</div>
      </div>
    </div>
  );

  const Y = "#FFD700";
  const s = {
    app:     { fontFamily:"'Nunito',sans-serif", background:"#0f0f0f", color:"#eee", minHeight:"100vh", display:"flex", flexDirection:"column" },
    header:  { background:`linear-gradient(135deg,${Y} 0%,#e6b800 100%)`, color:"#111", padding: isMobile ? "8px 12px" : "10px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", boxShadow:"0 2px 12px rgba(255,215,0,.3)" },
    logo:    { fontFamily:"'Bebas Neue',cursive", fontSize: isMobile ? 17 : isTablet ? 22 : 28, letterSpacing: isMobile ? 1 : 3, margin:0, lineHeight:1.1 },
    nav:     { display:"flex", background:"#1a1a1a", borderBottom:`2px solid ${Y}33`, overflowX:"auto", scrollbarWidth:"none" },
    navBtn:  (a) => ({ padding: isMobile ? "9px 7px" : "10px 14px", background:a?Y:"transparent", color:a?"#111":"#999", border:"none", cursor:"pointer", fontFamily:"'Nunito',sans-serif", fontWeight:700, fontSize: isMobile ? 9 : 12, whiteSpace:"nowrap", transition:"all .2s", borderBottom:a?`3px solid #e6b800`:"3px solid transparent" }),
    content: { flex:1, padding: isMobile ? "10px 8px" : isTablet ? 14 : 20, maxWidth: isWide ? 1200 : "100%", margin:"0 auto", width:"100%", boxSizing:"border-box" },
    card:    { background:"#1c1c1c", borderRadius: isMobile ? 10 : 12, padding: isMobile ? 10 : 14, marginBottom:10, border:"1px solid #2a2a2a" },
    cardHL:  { background:"#1c1c1c", borderRadius: isMobile ? 10 : 12, padding: isMobile ? 10 : 14, marginBottom:10, border:`1px solid ${Y}44` },
    statCard:{ background:"#1c1c1c", borderRadius: isMobile ? 10 : 12, padding: isMobile ? "12px 8px" : "16px 12px", border:"1px solid #2a2a2a", textAlign:"center" },
    statNum: { fontSize: isMobile ? 22 : 28, fontWeight:900, color:Y, lineHeight:1 },
    statLbl: { fontSize: isMobile ? 9 : 11, color:"#777", marginTop:5, textTransform:"uppercase", letterSpacing:1 },
    btn:     (v="primary") => ({ padding: isMobile ? "7px 10px" : "8px 14px", background:v==="primary"?Y:v==="danger"?"#c0392b":v==="success"?"#27ae60":v==="blue"?"#2980b9":v==="warn"?"#d35400":"#2a2a2a", color:v==="primary"?"#111":"#fff", border:"none", borderRadius:8, cursor:"pointer", fontWeight:800, fontSize: isMobile ? 11 : 12, fontFamily:"'Nunito',sans-serif", transition:"opacity .15s", whiteSpace:"nowrap" }),
    input:   { background:"#222", border:"1px solid #383838", borderRadius:8, padding: isMobile ? "8px 10px" : "9px 12px", color:"#eee", fontFamily:"'Nunito',sans-serif", fontSize:13, outline:"none", width:"100%", boxSizing:"border-box" },
    tag:     (c) => ({ display:"inline-block", padding:"2px 8px", borderRadius:10, fontSize:11, fontWeight:700, background:c, color:c===Y?"#111":"#eee" }),
    grid:    (cols) => ({ display:"grid", gridTemplateColumns:`repeat(auto-fit, minmax(${cols}px,1fr))`, gap: isMobile ? 8 : 10 }),
    row:     { display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:8 },
    title:   { color:Y, fontFamily:"'Bebas Neue',cursive", fontSize: isMobile ? 18 : 22, marginBottom: isMobile ? 10 : 14, letterSpacing:1 },
    overlay: { position:"fixed", inset:0, background:"rgba(0,0,0,.85)", zIndex:200, display:"flex", alignItems: isMobile ? "flex-end" : "center", justifyContent:"center", padding: isMobile ? 0 : 16 },
    modal:   { background:"#1a1a1a", border:`1px solid ${Y}44`, borderRadius: isMobile ? "16px 16px 0 0" : 14, padding: isMobile ? "16px 12px" : 20, width:"100%", maxWidth: isMobile ? "100%" : 600, maxHeight: isMobile ? "92vh" : "88vh", overflowY:"auto" },
  };

  // ── Dashboard ─────────────────────────────────────────────────
  const Dashboard = () => (
    <div>
      <div style={s.title}>📊 RESUMEN DEL DÍA</div>
      <div style={s.grid(isMobile ? 130 : 140)}>
        <div style={s.statCard}><div style={s.statNum}>{orders.length}</div><div style={s.statLbl}>Activos</div></div>
        <div style={s.statCard}><div style={s.statNum}>{paidToday.length}</div><div style={s.statLbl}>Pagados hoy</div></div>
        <div style={{ ...s.statCard, border:`1px solid ${Y}55` }}><div style={{ ...s.statNum, fontSize: isMobile?16:20 }}>{fmt(todayRev)}</div><div style={s.statLbl}>Recaudado hoy</div></div>
        <div style={s.statCard}><div style={{ ...s.statNum, fontSize: isMobile?16:20 }}>{fmt(totalRev)}</div><div style={s.statLbl}>Total histórico</div></div>
      </div>
      {paidToday.length > 0 && (
        <div style={{ ...s.card, marginTop:4 }}>
          <div style={{ fontWeight:800, marginBottom:8, color:"#aaa", fontSize:11, textTransform:"uppercase", letterSpacing:1 }}>Desglose hoy</div>
          <div style={s.row}>
            <div style={{ textAlign:"center" }}>
              <div style={{ color:"#27ae60", fontWeight:900, fontSize: isMobile?13:16 }}>💵 {fmt(cashRev)}</div>
              <div style={{ fontSize:10, color:"#666" }}>Efectivo</div>
            </div>
            <div style={{ width:1, background:"#333", height:36 }} />
            <div style={{ textAlign:"center" }}>
              <div style={{ color:"#8e44ad", fontWeight:900, fontSize: isMobile?13:16 }}>💜 {fmt(yapeRev)}</div>
              <div style={{ fontSize:10, color:"#666" }}>Yape</div>
            </div>
            <div style={{ width:1, background:"#333", height:36 }} />
            <div style={{ textAlign:"center" }}>
              <div style={{ color:"#2980b9", fontWeight:900, fontSize: isMobile?13:16 }}>💳 {fmt(cardRev)}</div>
              <div style={{ fontSize:10, color:"#666" }}>Tarjeta</div>
            </div>
          </div>
        </div>
      )}
      {orders.length > 0 ? (
        <>
          <div style={{ ...s.title, fontSize: isMobile?14:16, marginTop:14 }}>🔥 PEDIDOS ACTIVOS</div>
          {orders.slice(0,4).map(o => (
            <div key={o.id} style={s.card}>
              <div style={s.row}>
                <div>
                  <span style={{ fontWeight:900, fontSize: isMobile?15:17 }}>{o.orderType==="llevar"?`🥡 ${o.table}`:`Mesa ${o.table}`}</span>
                  <span style={{ ...s.tag("#252525"), marginLeft:8, fontSize:10 }}>{minutesAgo(o.createdAt)}</span>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ color:Y, fontWeight:900 }}>{fmt(o.total)}</span>
                  <button style={{ ...s.btn("success"), padding: isMobile?"6px 9px":"8px 12px" }} onClick={() => markPaid(o.id)}>✅ Cobrar</button>
                </div>
              </div>
            </div>
          ))}
          {orders.length > 4 && <button style={{ ...s.btn("secondary"), marginTop:4 }} onClick={() => setTab("pedidos")}>Ver todos ({orders.length}) →</button>}
        </>
      ) : (
        <div style={{ textAlign:"center", padding: isMobile?36:50, color:"#444" }}>
          <div style={{ fontSize:52 }}>🍔</div>
          <div style={{ marginTop:8, color:"#666" }}>Sin pedidos activos</div>
          <button style={{ ...s.btn(), marginTop:14, padding:"10px 24px" }} onClick={() => setTab("mesas")}>Ver Mesas</button>
        </div>
      )}
    </div>
  );

  // ── Mesas ─────────────────────────────────────────────────────
  const Mesas = () => {
    const llevarOrders = orders.filter(o => o.orderType === "llevar");
    return (
      <div>
        <div style={{ ...s.row, marginBottom:14 }}>
          <div style={s.title}>🪑 MESAS</div>
          <button style={s.btn()} onClick={() => { setDraft({ ...newDraft(), orderType:"llevar" }); setTab("nuevo"); }}>🥡 Para llevar</button>
        </div>
        <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(3, 1fr)", gap:12, marginBottom:20 }}>
          {MESAS.map(num => {
            const mesaOrders = orders.filter(o => o.table === String(num) && o.orderType !== "llevar");
            const ocupada    = mesaOrders.length > 0;
            const total      = mesaOrders.reduce((s, o) => s + o.total, 0);
            return (
              <div key={num} onClick={() => setMesaModal(num)} style={{ background: ocupada?`${Y}15`:"#1c1c1c", border:`2px solid ${ocupada?Y:"#2a2a2a"}`, borderRadius:14, padding:16, cursor:"pointer", textAlign:"center", transition:"all .2s", position:"relative" }}>
                {ocupada && <div style={{ position:"absolute", top:8, right:8, width:10, height:10, borderRadius:"50%", background:"#27ae60" }} />}
                <div style={{ fontSize:36, marginBottom:6 }}>🪑</div>
                <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:22, color: ocupada?Y:"#555", letterSpacing:1 }}>MESA {num}</div>
                <div style={{ fontSize:11, color: ocupada?"#aaa":"#444", marginTop:4 }}>
                  {ocupada ? `${mesaOrders.length} pedido${mesaOrders.length>1?"s":""} · ${fmt(total)}` : "Libre"}
                </div>
              </div>
            );
          })}
        </div>
        {llevarOrders.length > 0 && (
          <div>
            <div style={{ ...s.title, fontSize:16 }}>🥡 PARA LLEVAR ({llevarOrders.length})</div>
            {llevarOrders.map(o => (
              <div key={o.id} style={{ ...s.card, borderLeft:`4px solid #3498db` }}>
                <div style={s.row}>
                  <span style={{ fontWeight:900 }}>🥡 {o.table}</span>
                  <span style={{ color:Y, fontWeight:900 }}>{fmt(o.total)}</span>
                </div>
                <div style={{ display:"flex", gap:6, marginTop:8, flexWrap:"wrap" }}>
                  <button style={{ ...s.btn("success"), flex:1 }} onClick={() => markPaid(o.id)}>✅ Cobrar</button>
                  <button style={{ ...s.btn("warn"), flex:1 }} onClick={() => setEditingOrder(o)}>✏️ Editar</button>
                  <button style={s.btn("secondary")} onClick={() => printOrder(o)}>🖨️</button>
                  <button style={{ ...s.btn("danger"), padding:"7px 10px" }} onClick={() => cancelOrder(o.id)}>❌</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ── Modal de Mesa ─────────────────────────────────────────────
  const MesaModal = ({ num, onClose }) => {
    const mesaOrders = orders.filter(o => o.table === String(num) && o.orderType !== "llevar");
    return (
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        <div style={{ ...s.row, marginBottom:14 }}>
          <div style={{ color:Y, fontFamily:"'Bebas Neue',cursive", fontSize:22 }}>🪑 MESA {num}</div>
          <button style={{ ...s.btn("secondary"), padding:"4px 10px" }} onClick={onClose}>✕</button>
        </div>
        {mesaOrders.length === 0
          ? <div style={{ textAlign:"center", padding:30, color:"#555" }}>
              <div style={{ fontSize:32 }}>🟢</div>
              <div style={{ marginTop:8 }}>Mesa libre</div>
            </div>
          : mesaOrders.map(o => (
            <div key={o.id} style={{ ...s.card, borderLeft:`3px solid ${Y}` }}>
              <div style={s.row}>
                <span style={{ fontSize:12, color:"#888" }}>{minutesAgo(o.createdAt)}</span>
                <span style={{ color:Y, fontWeight:900 }}>{fmt(o.total)}</span>
              </div>
              <div style={{ margin:"8px 0" }}>
                {o.items.map((item,i) => (
                  <div key={i} style={{ display:"flex", justifyContent:"space-between", fontSize:13, padding:"3px 0", borderBottom:"1px solid #222" }}>
                    <span>{item.qty}x {item.name}</span>
                    <span style={{ color:"#888" }}>{fmt(item.price*item.qty)}</span>
                  </div>
                ))}
              </div>
              {o.notes && <div style={{ fontSize:11, color:"#888", fontStyle:"italic", marginBottom:8 }}>📝 {o.notes}</div>}
              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                <button style={{ ...s.btn("success"), flex:1 }} onClick={() => { markPaid(o.id); onClose(); }}>✅ Cobrar</button>
                <button style={{ ...s.btn("warn"), flex:1 }} onClick={() => { setEditingOrder(o); onClose(); }}>✏️ Editar</button>
                <button style={s.btn("secondary")} onClick={() => printOrder(o)}>🖨️</button>
                <button style={{ ...s.btn("danger"), padding:"7px 10px" }} onClick={() => { cancelOrder(o.id); onClose(); }}>❌</button>
              </div>
            </div>
          ))
        }
        <button style={{ ...s.btn(), width:"100%", padding:12, marginTop:8 }}
          onClick={() => { setDraft({ ...newDraft(), table: String(num), orderType:"mesa" }); onClose(); setTab("nuevo"); }}>
          + Agregar pedido a Mesa {num}
        </button>
      </div>
    );
  };

  // ── Nuevo Pedido ──────────────────────────────────────────────
  // ── Pedidos ───────────────────────────────────────────────────
  const Pedidos = () => (
    <div>
      <div style={{ ...s.row, marginBottom:14 }}>
        <div style={s.title}>🍽️ PEDIDOS ACTIVOS ({orders.length})</div>
        <button style={s.btn()} onClick={() => setTab("nuevo")}>+ Nuevo</button>
      </div>
      {orders.length === 0
        ? <div style={{ textAlign:"center", padding:60, color:"#444" }}><div style={{ fontSize:48 }}>🕐</div><div>Sin pedidos activos</div></div>
        : orders.map(o => (
            <div key={o.id} style={{ ...s.card, borderLeft:`4px solid ${Y}` }}>
              <div style={{ ...s.row, marginBottom:8 }}>
                <div>
                  <span style={{ fontFamily:"'Bebas Neue',cursive", fontSize: isMobile?18:22 }}>{o.orderType==="llevar"?`🥡 ${o.table}`:`Mesa ${o.table}`}</span>
                  <span style={{ ...s.tag(o.payment==="efectivo"?"#1a3a2a":o.payment==="yape"?"#3a1a5c":"#1a2a3a"), marginLeft:8 }}>{o.payment==="efectivo"?"💵":o.payment==="yape"?"💜":"💳"} {!isMobile && o.payment}</span>
                </div>
                <span style={{ color:Y, fontWeight:900, fontSize: isMobile?16:19 }}>{fmt(o.total)}</span>
              </div>
              <div style={{ color:"#666", fontSize:11, marginBottom:8 }}>🕐 {timeStr(o.createdAt)} · {minutesAgo(o.createdAt)}</div>
              <div style={{ marginBottom:8 }}>
                {o.items.map((item,i) => (
                  <div key={i} style={{ display:"flex", justifyContent:"space-between", fontSize: isMobile?12:13, padding:"3px 0", borderBottom:"1px solid #222" }}>
                    <span>{item.qty}x {item.name}</span>
                    <span style={{ color:"#888" }}>{fmt(item.price*item.qty)}</span>
                  </div>
                ))}
              </div>
              {o.notes && <div style={{ fontSize:11, color:"#888", fontStyle:"italic", marginBottom:8 }}>📝 {o.notes}</div>}
              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                <button style={{ ...s.btn("success"), flex:1, minWidth: isMobile?0:90 }} onClick={() => markPaid(o.id)}>✅ Cobrar</button>
                <button style={{ ...s.btn("warn"), flex:1, minWidth: isMobile?0:80 }} onClick={() => setEditingOrder(o)}>✏️ Editar</button>
                <button style={s.btn("secondary")} onClick={() => printOrder(o)} title="Imprimir para cocina">🖨️</button>
                <button style={{ ...s.btn("danger"), padding: isMobile?"7px 10px":"8px 12px" }} onClick={() => cancelOrder(o.id)}>❌</button>
                <button style={{ ...s.btn("secondary"), padding: isMobile?"7px 10px":"8px 12px" }} onClick={() => setConfirmDelete(o.id)}>🗑️</button>
              </div>
            </div>
          ))
      }
    </div>
  );

  // ── Historial ─────────────────────────────────────────────────
  const Historial = () => {
    const [filterDate, setFilterDate] = useState("");
    const [filterPay,  setFilterPay]  = useState("todos");
    const filtered = history.filter(o => {
      const dateMatch = !filterDate || new Date(o.paidAt||o.cancelledAt||o.createdAt).toLocaleDateString("es-PE") === new Date(filterDate).toLocaleDateString("es-PE");
      const payMatch  = filterPay==="todos" || o.payment===filterPay;
      return dateMatch && payMatch;
    });
    const filteredRev = filtered.filter(o=>o.status==="pagado").reduce((s,o)=>s+o.total,0);
    return (
      <div>
        <div style={s.title}>📋 HISTORIAL</div>
        <div style={{ display:"flex", gap:8, marginBottom:12, flexWrap:"wrap" }}>
          <input type="date" style={{ ...s.input, width: isMobile?"100%":160 }} value={filterDate} onChange={e=>setFilterDate(e.target.value)} />
          {["todos","efectivo","yape","tarjeta"].map(p => (
            <button key={p} style={{ ...s.btn(filterPay===p?"primary":"secondary"), fontSize:11 }} onClick={()=>setFilterPay(p)}>{p}</button>
          ))}
          {(filterDate||filterPay!=="todos") && <button style={{ ...s.btn("danger"), fontSize:11 }} onClick={()=>{setFilterDate("");setFilterPay("todos")}}>✕</button>}
        </div>
        {filtered.length > 0 && (
          <div style={{ ...s.card, marginBottom:12, display:"flex", gap:16 }}>
            <div><span style={{ color:Y, fontWeight:900, fontSize:16 }}>{filtered.filter(o=>o.status==="pagado").length}</span><span style={{ color:"#666", fontSize:11, marginLeft:4 }}>pagados</span></div>
            <div><span style={{ color:Y, fontWeight:900, fontSize:16 }}>{fmt(filteredRev)}</span><span style={{ color:"#666", fontSize:11, marginLeft:4 }}>recaudado</span></div>
          </div>
        )}
        {filtered.length === 0
          ? <div style={{ textAlign:"center", padding:60, color:"#444" }}><div style={{ fontSize:48 }}>📋</div><div>Sin registros</div></div>
          : filtered.map((o,idx) => (
              <div key={o._fid||o.id||idx} style={{ ...s.card, opacity:o.status==="cancelado"?0.5:1, borderLeft:`4px solid ${o.status==="pagado"?"#27ae60":"#c0392b"}` }}>
                <div style={{ ...s.row, marginBottom:4 }}>
                  <div>
                    <span style={{ fontWeight:900 }}>{o.orderType==="llevar"?`🥡 ${o.table}`:`Mesa ${o.table}`}</span>
                    <span style={{ ...s.tag(o.status==="pagado"?"#1e5c2e":"#5c1e1e"), marginLeft:8 }}>{o.status==="pagado"?"✅ Pagado":"❌ Cancelado"}</span>
                    <span style={{ ...s.tag(o.payment==="efectivo"?"#1a3a2a":o.payment==="yape"?"#3a1a5c":"#1a2a3a"), marginLeft:6 }}>{o.payment==="efectivo"?"💵":o.payment==="yape"?"💜":"💳"} {!isMobile && o.payment}</span>
                  </div>
                  <span style={{ color:Y, fontWeight:900 }}>{fmt(o.total)}</span>
                </div>
                <div style={{ color:"#555", fontSize:11, marginBottom:6 }}>
                  {o.status==="pagado" ? `💰 ${timeStr(o.paidAt)}` : `🚫 ${timeStr(o.cancelledAt)}`}
                </div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
                  {o.items.map((item,i) => (
                    <span key={i} style={{ ...s.tag("#252525"), fontSize:11 }}>{item.qty}x {item.name}</span>
                  ))}
                </div>
              </div>
            ))
        }
      </div>
    );
  };

  // ── Carta ─────────────────────────────────────────────────────
  const Carta = () => (
    <div>
      <div style={{ ...s.row, marginBottom:14 }}>
        <div style={s.title}>🍔 CARTA ({menu.length})</div>
        <button style={s.btn()} onClick={() => setShowAdd(!showAdd)}>{showAdd?"✕ Cancelar":"+ Agregar"}</button>
      </div>
      {showAdd && (
        <div style={{ ...s.cardHL, marginBottom:14 }}>
          <div style={{ fontWeight:800, color:Y, marginBottom:10 }}>Nuevo platillo</div>
          <div style={{ display:"grid", gridTemplateColumns: isMobile?"1fr":"2fr 1fr 1fr", gap:8, marginBottom:10 }}>
            <input style={s.input} placeholder="Nombre del platillo" value={newItem.name} onChange={e=>setNewItem(f=>({...f,name:e.target.value}))} />
            <select style={s.input} value={newItem.cat} onChange={e=>setNewItem(f=>({...f,cat:e.target.value}))}>
              {ALL_CATS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input style={s.input} type="number" placeholder="Precio S/." value={newItem.price} onChange={e=>setNewItem(f=>({...f,price:e.target.value}))} />
          </div>
          <button style={s.btn()} onClick={addMenuItem}>Guardar Platillo</button>
        </div>
      )}
      <div style={{ display:"flex", gap:4, flexWrap:"wrap", marginBottom:10 }}>
        {["Todos",...ALL_CATS].map(c => (
          <button key={c} style={{ ...s.btn(catFilter===c?"primary":"secondary"), fontSize: isMobile?9:10, padding: isMobile?"3px 6px":"4px 9px" }} onClick={()=>setCatFilter(c)}>{c}</button>
        ))}
      </div>
      {menu.filter(i => catFilter==="Todos"||i.cat===catFilter).map(item => (
        <div key={item.id} style={{ ...s.card, display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:5, padding: isMobile?"8px 10px":"9px 12px" }}>
          <div>
            <span style={{ marginRight:6 }}>{item.icon}</span>
            <span style={{ fontWeight:700, fontSize: isMobile?13:14 }}>{item.name}</span>
            {!isMobile && <span style={{ ...s.tag("#252525"), marginLeft:8, fontSize:10 }}>{item.cat}</span>}
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ color:Y, fontWeight:900 }}>{fmt(item.price)}</span>
            {item.id.startsWith("CUSTOM_") && (
              <button style={{ ...s.btn("danger"), padding:"2px 7px", fontSize:11 }} onClick={()=>deleteMenuItem(item.id)}>✕</button>
            )}
          </div>
        </div>
      ))}
    </div>
  );


  // ── Cocina ────────────────────────────────────────────────────
  const Cocina = () => {
    const sorted = [...orders].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    const toggleCheck = (orderId, itemIdx) => {
      setKitchenChecks(prev => {
        const orderChecks = prev[orderId] || {};
        const updated = { ...orderChecks, [itemIdx]: !orderChecks[itemIdx] };
        return { ...prev, [orderId]: updated };
      });
    };

    const allDone = (order) => {
      const checks = kitchenChecks[order.id] || {};
      return order.items.every((_, i) => checks[i]);
    };

    const resetOrder = (orderId) => {
      setKitchenChecks(prev => ({ ...prev, [orderId]: {} }));
    };

    if (sorted.length === 0) return (
      <div style={{ textAlign:"center", padding:60, color:"#444" }}>
        <div style={{ fontSize:56 }}>👨‍🍳</div>
        <div style={{ marginTop:12, fontSize:16 }}>Sin pedidos en cocina</div>
      </div>
    );

    return (
      <div>
        <div style={{ ...s.row, marginBottom:14 }}>
          <div style={s.title}>👨‍🍳 COCINA — {sorted.length} pedido{sorted.length!==1?"s":""}</div>
          <div style={{ fontSize:11, color:"#666" }}>Más antiguo = mayor prioridad</div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns: isDesktop ? "1fr 1fr" : "1fr", gap:12 }}>
          {sorted.map((order, priority) => {
            const checks   = kitchenChecks[order.id] || {};
            const done     = allDone(order);
            const checkedN = order.items.filter((_, i) => checks[i]).length;
            const mins     = Math.floor((Date.now() - new Date(order.createdAt)) / 60000);
            const urgent   = mins >= 15 && !done;
            const warn     = mins >= 8 && mins < 15 && !done;

            return (
              <div key={order.id} style={{
                background: done ? "#0d1f0d" : urgent ? "#1f0d0d" : warn ? "#1f180d" : "#1c1c1c",
                borderRadius:14,
                border: `2px solid ${done ? "#27ae60" : urgent ? "#e74c3c" : warn ? "#e67e22" : "#FFD700"}`,
                padding:14,
                position:"relative",
                transition:"all .3s"
              }}>
                {/* Priority badge */}
                <div style={{ position:"absolute", top:-10, left:14, background: done?"#27ae60": urgent?"#e74c3c": warn?"#e67e22":"#FFD700", color: done||urgent||warn?"#fff":"#111", borderRadius:20, padding:"2px 10px", fontSize:11, fontWeight:900 }}>
                  {done ? "✅ LISTO" : `#${priority + 1} · ${mins < 1 ? "ahora" : `${mins}m`}`}
                </div>

                <div style={{ ...s.row, marginBottom:10, marginTop:6 }}>
                  <div>
                    <span style={{ fontFamily:"'Bebas Neue',cursive", fontSize:22, color: done?"#27ae60": urgent?"#e74c3c": warn?"#e67e22":"#FFD700" }}>
                      {order.orderType === "llevar" ? `🥡 ${order.table}` : `Mesa ${order.table}`}
                    </span>
                  </div>
                  <div style={{ fontSize:12, color:"#666" }}>
                    {new Date(order.createdAt).toLocaleTimeString("es-PE",{hour:"2-digit",minute:"2-digit"})}
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{ background:"#2a2a2a", borderRadius:4, height:5, marginBottom:12, overflow:"hidden" }}>
                  <div style={{ background: done?"#27ae60":"#FFD700", height:"100%", width:`${(checkedN/order.items.length)*100}%`, transition:"width .3s" }} />
                </div>

                {/* Items */}
                <div>
                  {order.items.map((item, i) => (
                    <div key={i} onClick={() => toggleCheck(order.id, i)} style={{
                      display:"flex", alignItems:"center", gap:10,
                      padding:"9px 10px", marginBottom:5, borderRadius:8,
                      background: checks[i] ? "#0a2a0a" : "#252525",
                      border: `1px solid ${checks[i] ? "#27ae6055" : "#333"}`,
                      cursor:"pointer", transition:"all .2s",
                      opacity: checks[i] ? 0.6 : 1
                    }}>
                      <div style={{
                        width:22, height:22, borderRadius:6,
                        border: `2px solid ${checks[i] ? "#27ae60" : "#555"}`,
                        background: checks[i] ? "#27ae60" : "transparent",
                        display:"flex", alignItems:"center", justifyContent:"center",
                        flexShrink:0, fontSize:13, transition:"all .2s"
                      }}>
                        {checks[i] && "✓"}
                      </div>
                      <div style={{ flex:1 }}>
                        <span style={{ fontWeight:800, fontSize: isMobile?13:15, textDecoration: checks[i]?"line-through":"none", color: checks[i]?"#555":"#eee" }}>
                          {item.qty > 1 && <span style={{ color:"#FFD700", marginRight:4 }}>{item.qty}×</span>}
                          {item.name}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Notas */}
                {order.notes && (
                  <div style={{ marginTop:8, padding:"8px 10px", background:"#1a1500", borderRadius:8, border:"1px solid #3a3000", fontSize:12, color:"#e6c200" }}>
                    📝 {order.notes}
                  </div>
                )}

                {/* Reset */}
                {checkedN > 0 && (
                  <button onClick={() => resetOrder(order.id)} style={{ ...s.btn("secondary"), width:"100%", marginTop:10, fontSize:11, padding:"6px" }}>
                    ↺ Reiniciar checks
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const tabs = [
    { id:"dashboard", label: isMobile ? "📊" : "📊 Inicio" },
    { id:"mesas",     label: isMobile ? "🪑" : "🪑 Mesas" },
    { id:"nuevo",     label: isMobile ? "➕" : "➕ Nuevo" },
    { id:"pedidos",   label: isMobile ? `🍽️${orders.length>0?` ${orders.length}`:""}` : `🍽️ Pedidos${orders.length>0?` (${orders.length})`:""}` },
    { id:"cocina",    label: isMobile ? `👨‍🍳${orders.length>0?` ${orders.length}`:""}` : `👨‍🍳 Cocina${orders.length>0?` (${orders.length})`:""}` },
    { id:"historial",   label: isMobile ? "📋" : "📋 Historial" },
    { id:"inventario",  label: isMobile ? "📦" : "📦 Inventario" },
    { id:"carta",       label: isMobile ? "🍔" : "🍔 Carta" },
  ];

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Nunito:wght@400;700;900&display=swap" rel="stylesheet" />
      <div style={s.app}>
        <header style={s.header}>
          <div>
            <h1 style={s.logo}>🍔 MR. PAPACHOS · CAJAMARCA</h1>
            {!isMobile && <div style={{ fontSize:11, color:"#555", fontWeight:700 }}>Sistema de Pedidos</div>}
          </div>
          {!isMobile && <div style={{ fontSize:11, color:"#333", fontWeight:700, textAlign:"right" }}>
            <div>{new Date().toLocaleDateString("es-PE",{weekday:"long",day:"numeric",month:"long"})}</div>
          </div>}
        </header>

        <nav style={s.nav}>
          {tabs.map(t => (
            <button key={t.id} style={{ ...s.navBtn(tab===t.id), flex: isMobile ? 1 : "none" }} onClick={() => setTab(t.id)}>{t.label}</button>
          ))}
        </nav>

        {toast && (
          <div style={{ position:"fixed", bottom: isMobile?70:20, left:"50%", transform:"translateX(-50%)", background:toast.color, color:"#fff", padding:"10px 20px", borderRadius:12, fontWeight:800, zIndex:999, fontSize:14, boxShadow:"0 4px 20px rgba(0,0,0,.5)", whiteSpace:"nowrap" }}>
            {toast.msg}
          </div>
        )}

        {editingOrder && (
          <div style={s.overlay} onClick={() => setEditingOrder(null)}>
            <EditOrderModal order={editingOrder} onSave={saveEditedOrder} onClose={() => setEditingOrder(null)} menu={menu} isMobile={isMobile} s={s} Y={Y} />
          </div>
        )}

        {mesaModal && (
          <div style={s.overlay} onClick={() => setMesaModal(null)}>
            <MesaModal num={mesaModal} onClose={() => setMesaModal(null)} />
          </div>
        )}

        {confirmDelete && (
          <div style={s.overlay} onClick={() => setConfirmDelete(null)}>
            <div style={{ ...s.modal, maxWidth:340, textAlign:"center" }} onClick={e => e.stopPropagation()}>
              <div style={{ fontSize:42, marginBottom:12 }}>🗑️</div>
              <div style={{ fontWeight:900, fontSize:17, marginBottom:8, color:"#eee" }}>¿Eliminar pedido?</div>
              <div style={{ color:"#888", fontSize:13, marginBottom:20 }}>Esta acción no se puede deshacer.</div>
              <div style={{ display:"flex", gap:10 }}>
                <button style={{ ...s.btn("secondary"), flex:1 }} onClick={() => setConfirmDelete(null)}>Cancelar</button>
                <button style={{ ...s.btn("danger"), flex:1 }} onClick={() => deleteOrderPermanent(confirmDelete)}>🗑️ Eliminar</button>
              </div>
            </div>
          </div>
        )}

        <div style={s.content}>
          {tab==="dashboard" && <Dashboard />}
          {tab==="mesas"     && <Mesas />}
          {tab==="nuevo"     && <NuevoPedidoComponent draft={draft} setDraft={setDraft} filteredMenu={filteredMenu} addItem={addItem} changeQty={changeQty} draftTotal={draftTotal} fmt={fmt} search={search} setSearch={setSearch} catFilter={catFilter} setCatFilter={setCatFilter} ALL_CATS={ALL_CATS} s={s} Y={Y} isDesktop={isDesktop} isMobile={isMobile} submitOrder={submitOrder} newDraft={newDraft} />}
          {tab==="pedidos"   && <Pedidos />}
          {tab==="cocina"      && <Cocina />}
          {tab==="historial"   && <Historial />}
          {tab==="inventario"  && <Inventario menu={menu} orders={orders} history={history} isMobile={isMobile} s={s} Y={Y} ALL_CATS={ALL_CATS} fmt={fmt} />}
          {tab==="carta"       && <Carta />}
        </div>
      </div>
    </>
  );
}