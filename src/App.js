import { useState, useEffect, useRef } from "react";
import { initializeApp, getApps } from "firebase/app";
import {
  getFirestore,
  doc, setDoc, getDoc, deleteDoc,
  collection, getDocs, addDoc,
  query, orderBy, limit,
  onSnapshot
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
  gastosCol:  () => collection(db, "mrpapachos_gastos"),
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
  async addHistory(order) {
    try { await addDoc(FS.historyCol(), order); } catch (e) { console.error(e); }
  },
  async addGasto(gasto) {
    try { await addDoc(FS.gastosCol(), gasto); } catch (e) { console.error(e); }
  },
  async deleteGasto(id) {
    try { await deleteDoc(doc(db, "mrpapachos_gastos", id)); } catch (e) { console.error(e); }
  }
};

// ─── MENÚ BASE — con descripciones ────────────────────────────────────────────
const MENU_BASE = [
  { id:"H01",  cat:"Hamburguesas",      icon:"🍔", name:"La Silvestre",             price:7,    desc:"Carne, papa frita, ensalada" },
  { id:"H02",  cat:"Hamburguesas",      icon:"🍔", name:"La Piolin",                 price:8,    desc:"Carne o pollo, huevo, papa frita, ensalada" },
  { id:"H03",  cat:"Hamburguesas",      icon:"🍔", name:"La Speedy Gonzales",        price:10,   desc:"Carne, huevo, hot dog, papa frita, ensalada" },
  { id:"H04",  cat:"Hamburguesas",      icon:"🍔", name:"La Cajacha",                price:12,   desc:"Carne, huevo, queso, hot dog, papa frita, ensalada" },
  { id:"H05",  cat:"Hamburguesas",      icon:"🍔", name:"La Coyote",                 price:12,   desc:"Carne, huevo, plátano, jamón, papa frita, ensalada" },
  { id:"H06",  cat:"Hamburguesas",      icon:"🍔", name:"La Super Cajacha",          price:14,   desc:"Carne, queso, chorizo artesanal, tocino, papa frita, ensalada" },
  { id:"H07",  cat:"Hamburguesas",      icon:"🍔", name:"La Bugs Bunny",             price:14,   desc:"Carne, huevo, hot dog, chorizo artesanal, jamón, papa frita, ensalada" },
  { id:"H08",  cat:"Hamburguesas",      icon:"🍔", name:"La Cajamarquesa",           price:14,   desc:"Carne, champiñones, queso, tocino, papas fritas, ensalada" },
  { id:"H09",  cat:"Hamburguesas",      icon:"🍔", name:"La Porky",                  price:15,   desc:"Carne, huevo, hot dog, chorizo artesanal, tocino, papa frita, ensalada" },
  { id:"H10",  cat:"Hamburguesas",      icon:"🍔", name:"La Tazmania",               price:14,   desc:"Carne, queso, piña, hot dog, jamón, papa frita, ensalada" },
  { id:"H11",  cat:"Hamburguesas",      icon:"🍔", name:"La Papachos",               price:20,   desc:"Doble carne, huevo, doble queso, hot dog, chorizo artesanal, jamón, tocino, papa frita, ensalada" },
  { id:"S01",  cat:"Salchipapas",       icon:"🍟", name:"Clásica",                   price:8,    desc:"Papa, hot dog" },
  { id:"S02",  cat:"Salchipapas",       icon:"🍟", name:"Sencilla",                  price:10,   desc:"Papa, hot dog, huevo" },
  { id:"S03",  cat:"Salchipapas",       icon:"🍟", name:"Cajacha",                   price:12,   desc:"Papa, hot dog, chorizo artesanal, queso" },
  { id:"S04",  cat:"Salchipapas",       icon:"🍟", name:"Hawaiana",                  price:12,   desc:"Papa, hot dog, jamón, piña, queso" },
  { id:"S05",  cat:"Salchipapas",       icon:"🍟", name:"Salchipobre",               price:13,   desc:"Papa, hot dog, huevo, plátano, jamón" },
  { id:"S06",  cat:"Salchipapas",       icon:"🍟", name:"La Piernona",               price:15,   desc:"Papa, hot dog, pierna broster" },
  { id:"S07",  cat:"Salchipapas",       icon:"🍟", name:"Super Cajacha",             price:16,   desc:"Papa, hot dog, chorizo artesanal, doble queso, tocino" },
  { id:"S08",  cat:"Salchipapas",       icon:"🍟", name:"Salchibroster",             price:16,   desc:"Papa, hot dog, huevo, pollo broaster" },
  { id:"S09",  cat:"Salchipapas",       icon:"🍟", name:"La Champi Quesera",         price:18,   desc:"Papa, hot dog, chorizo artesanal, doble queso, tocino, champiñones" },
  { id:"S10",  cat:"Salchipapas",       icon:"🍟", name:"Salchi Nuggets",            price:20,   desc:"Papa, nuggets, hot dog, chorizo artesanal, queso, ensalada" },
  { id:"S11",  cat:"Salchipapas",       icon:"🍟", name:"Salchi Porky",              price:20,   desc:"Papa, chorizo artesanal, hot dog, trozos de chicharrón" },
  { id:"S12",  cat:"Salchipapas",       icon:"🍟", name:"La Papacha",                price:22,   desc:"Papa, hot dog, chorizo artesanal, huevo, queso, tocino, 2 alitas y trozos de pollo broaster" },
  { id:"S13",  cat:"Salchipapas",       icon:"🍟", name:"Salchi Lomo",               price:25,   desc:"(Pollo o carne) Papa, hot dog, chorizo artesanal, plátano, 2 alitas, ensalada" },
  { id:"A01",  cat:"Alitas",            icon:"🍗", name:"Alitas 4 pzas",             price:14,   desc:"4 alitas + papas fritas + ensalada" },
  { id:"A02",  cat:"Alitas",            icon:"🍗", name:"Alitas 6 pzas",             price:20,   desc:"6 alitas + papas fritas + ensalada" },
  { id:"A03",  cat:"Alitas",            icon:"🍗", name:"Alitas 8 pzas",             price:26,   desc:"8 alitas + papas fritas + ensalada" },
  { id:"A04",  cat:"Alitas",            icon:"🍗", name:"Alitas 10 pzas",            price:30,   desc:"10 alitas + papas fritas + ensalada" },
  { id:"A05",  cat:"Alitas",            icon:"🍗", name:"Alitas 12 pzas",            price:36,   desc:"12 alitas + papas fritas + ensalada" },
  { id:"AC01", cat:"Alichaufa",         icon:"🍗", name:"Alichaufa 4 pzas",          price:18,   desc:"4 alitas + papas fritas + chaufa + ensalada" },
  { id:"AC02", cat:"Alichaufa",         icon:"🍗", name:"Alichaufa 6 pzas",          price:24,   desc:"6 alitas + papas fritas + chaufa + ensalada" },
  { id:"AC03", cat:"Alichaufa",         icon:"🍗", name:"Alichaufa 8 pzas",          price:30,   desc:"8 alitas + papas fritas + chaufa + ensalada" },
  { id:"AC04", cat:"Alichaufa",         icon:"🍗", name:"Alichaufa 10 pzas",         price:36,   desc:"10 alitas + papas fritas + chaufa + ensalada" },
  { id:"PB01", cat:"Pollo Broaster",    icon:"🍖", name:"Pollo 1/8 Clásico",         price:12,   desc:"1/8 de pollo broaster clásico" },
  { id:"PB02", cat:"Pollo Broaster",    icon:"🍖", name:"Pollo 1/4 Clásico",         price:18,   desc:"1/4 de pollo broaster clásico" },
  { id:"PB03", cat:"Pollo Broaster",    icon:"🍖", name:"Pollo 1/8 A lo Pobre",      price:16,   desc:"1/8 de pollo broaster a lo pobre" },
  { id:"PB04", cat:"Pollo Broaster",    icon:"🍖", name:"Pollo 1/4 A lo Pobre",      price:22,   desc:"1/4 de pollo broaster a lo pobre" },
  { id:"MB01", cat:"Mostrito Broaster", icon:"🍖", name:"Mostrito 1/8 Clásico",      price:14,   desc:"1/8 de mostrito broaster clásico" },
  { id:"MB02", cat:"Mostrito Broaster", icon:"🍖", name:"Mostrito 1/4 Clásico",      price:22,   desc:"1/4 de mostrito broaster clásico" },
  { id:"MB03", cat:"Mostrito Broaster", icon:"🍖", name:"Mostrito 1/8 A lo Pobre",   price:18,   desc:"1/8 de mostrito broaster a lo pobre" },
  { id:"MB04", cat:"Mostrito Broaster", icon:"🍖", name:"Mostrito 1/4 A lo Pobre",   price:25,   desc:"1/4 de mostrito broaster a lo pobre" },
  { id:"PE01", cat:"Platos Extras",     icon:"🍽️", name:"Caldo de Gallina",          price:14,   desc:"Caldo de gallina tradicional" },
  { id:"PE02", cat:"Platos Extras",     icon:"🍽️", name:"Arroz Chaufa",              price:14,   desc:"Arroz chaufa estilo chifa" },
  { id:"PE03", cat:"Platos Extras",     icon:"🍽️", name:"Arroz Chaufa a lo Pobre",   price:18,   desc:"Arroz chaufa con huevo, plátano y más" },
  { id:"PE04", cat:"Platos Extras",     icon:"🍽️", name:"Saltado de Pollo",          price:20,   desc:"Saltado de pollo al wok con verduras" },
  { id:"PE05", cat:"Platos Extras",     icon:"🍽️", name:"Tallarín Saltado Carne",    price:22,   desc:"Tallarín saltado con carne al wok" },
  { id:"PE06", cat:"Platos Extras",     icon:"🍽️", name:"Tallarín Saltado Pollo",    price:18,   desc:"Tallarín saltado con pollo al wok" },
  { id:"PE07", cat:"Platos Extras",     icon:"🍽️", name:"Mollejita a la Plancha",    price:18,   desc:"Mollejas de pollo a la plancha" },
  { id:"PE08", cat:"Platos Extras",     icon:"🍽️", name:"Saltado de Molleja",        price:18,   desc:"Mollejas saltadas al wok con verduras" },
  { id:"PE09", cat:"Platos Extras",     icon:"🍽️", name:"Pollo a la Plancha 1/4",    price:20,   desc:"1/4 de pollo a la plancha" },
  { id:"PE10", cat:"Platos Extras",     icon:"🍽️", name:"Lomo Montado",              price:25,   desc:"Lomo fino montado con huevo y arroz" },
  { id:"PE11", cat:"Platos Extras",     icon:"🍽️", name:"Chuleta",                   price:22,   desc:"Chuleta de cerdo a la plancha" },
  { id:"PE12", cat:"Platos Extras",     icon:"🍽️", name:"Lomo a lo Pobre",           price:25,   desc:"Lomo fino a lo pobre con huevo y plátano" },
  { id:"PE13", cat:"Platos Extras",     icon:"🍽️", name:"Lomo Saltado",              price:22,   desc:"Lomo saltado al wok con verduras y papas" },
  { id:"MK01", cat:"Menú Kids",         icon:"🧒", name:"Bolipollos 6pz",            price:18,   desc:"6 piezas de bolipollos para los más pequeños" },
  { id:"MK02", cat:"Menú Kids",         icon:"🧒", name:"Boliquesos 6pz",            price:25,   desc:"6 piezas de boliquesos para los más pequeños" },
  { id:"MK03", cat:"Menú Kids",         icon:"🧒", name:"Nuggets 6pz",               price:18,   desc:"6 nuggets de pollo crujientes" },
  { id:"MK04", cat:"Menú Kids",         icon:"🧒", name:"Chicharrón de Pollo",       price:18,   desc:"Chicharrón de pollo crujiente" },
  { id:"C01",  cat:"Combos",            icon:"🎁", name:"Combo Personal",            price:9.90, desc:"Hamburguesa Piolín o Salchipapa Sencilla + Vaso de bebida" },
  { id:"C02",  cat:"Combos",            icon:"🎁", name:"Combo Cajacho",             price:44.90,desc:"Hamburguesa Cajacha + 6pz Alitas + Papas fritas nativas + Porción de Chaufa + 1L Bebida" },
  { id:"C03",  cat:"Combos",            icon:"🎁", name:"Combo Familiar",            price:80.90,desc:"2 Hamburguesas Speedy Gonzales + 14pz Alitas + Papas fritas nativas + Arroz Chaufa + 1.5L de bebida" },
  { id:"C04",  cat:"Combos",            icon:"🎁", name:"Combo Papachos",            price:110.90,desc:"2 Hamburguesas La Porky + 20pz de Alitas + Papas fritas nativas + Arroz Chaufa + 2L de Bebida" },
  { id:"R01",  cat:"Rondas",            icon:"🔄", name:"Rondas de Sabores 20pz",    price:68,   desc:"20 pz de alitas + papas fritas nativas + ensalada + 1L de bebida" },
  { id:"R02",  cat:"Rondas",            icon:"🔄", name:"Ronda de Sabores XL 30pz",  price:99,   desc:"30 pz de alitas + papas fritas nativas + ensalada + 1.5L de bebida" },
  { id:"B01",  cat:"Bebidas",           icon:"🥤", name:"Chicha Morada Normal 1L",   price:10,   desc:"Chicha morada preparada, 1 litro" },
  { id:"B02",  cat:"Bebidas",           icon:"🥤", name:"Chicha Morada Normal 1/2L", price:5,    desc:"Chicha morada preparada, medio litro" },
  { id:"B03",  cat:"Bebidas",           icon:"🥤", name:"Chicha Morada Normal Vaso", price:2.50, desc:"Chicha morada preparada, vaso" },
  { id:"B04",  cat:"Bebidas",           icon:"🧊", name:"Chicha Morada Frozen 1L",   price:18,   desc:"Chicha morada frozen, 1 litro" },
  { id:"B05",  cat:"Bebidas",           icon:"🧊", name:"Chicha Morada Frozen 1/2L", price:9,    desc:"Chicha morada frozen, medio litro" },
  { id:"B06",  cat:"Bebidas",           icon:"🥤", name:"Limonada Normal 1L",        price:10,   desc:"Limonada natural, 1 litro" },
  { id:"B07",  cat:"Bebidas",           icon:"🥤", name:"Limonada Normal 1/2L",      price:5,    desc:"Limonada natural, medio litro" },
  { id:"B08",  cat:"Bebidas",           icon:"🥤", name:"Limonada Normal Vaso",      price:2.50, desc:"Limonada natural, vaso" },
  { id:"B09",  cat:"Bebidas",           icon:"🧊", name:"Limonada Frozen 1L",        price:18,   desc:"Limonada frozen, 1 litro" },
  { id:"B10",  cat:"Bebidas",           icon:"🧊", name:"Limonada Frozen 1/2L",      price:9,    desc:"Limonada frozen, medio litro" },
  { id:"B11",  cat:"Bebidas",           icon:"🥤", name:"Maracuyá Normal 1L",        price:10,   desc:"Maracuyá natural, 1 litro" },
  { id:"B12",  cat:"Bebidas",           icon:"🥤", name:"Maracuyá Normal 1/2L",      price:5,    desc:"Maracuyá natural, medio litro" },
  { id:"B13",  cat:"Bebidas",           icon:"🥤", name:"Maracuyá Normal Vaso",      price:2.50, desc:"Maracuyá natural, vaso" },
  { id:"B14",  cat:"Bebidas",           icon:"🧊", name:"Maracuyá Frozen 1L",        price:18,   desc:"Maracuyá frozen, 1 litro" },
  { id:"B15",  cat:"Bebidas",           icon:"🧊", name:"Maracuyá Frozen 1/2L",      price:9,    desc:"Maracuyá frozen, medio litro" },
  { id:"B16",  cat:"Bebidas",           icon:"🥤", name:"Piña Normal 1L",            price:10,   desc:"Piña natural, 1 litro" },
  { id:"B17",  cat:"Bebidas",           icon:"🥤", name:"Piña Normal 1/2L",          price:5,    desc:"Piña natural, medio litro" },
  { id:"B18",  cat:"Bebidas",           icon:"🥤", name:"Piña Normal Vaso",          price:2.50, desc:"Piña natural, vaso" },
  { id:"B19",  cat:"Bebidas",           icon:"🧊", name:"Piña Frozen 1L",            price:18,   desc:"Piña frozen, 1 litro" },
  { id:"B20",  cat:"Bebidas",           icon:"🧊", name:"Piña Frozen 1/2L",          price:9,    desc:"Piña frozen, medio litro" },
  { id:"B21",  cat:"Bebidas",           icon:"🥤", name:"Cebada Normal 1L",          price:10,   desc:"Cebada natural, 1 litro" },
  { id:"B22",  cat:"Bebidas",           icon:"🥤", name:"Cebada Normal 1/2L",        price:5,    desc:"Cebada natural, medio litro" },
  { id:"B23",  cat:"Bebidas",           icon:"🥤", name:"Cebada Normal Vaso",        price:2.50, desc:"Cebada natural, vaso" },
  { id:"B24",  cat:"Bebidas",           icon:"🧊", name:"Cebada Frozen 1L",          price:18,   desc:"Cebada frozen, 1 litro" },
  { id:"B25",  cat:"Bebidas",           icon:"🧊", name:"Cebada Frozen 1/2L",        price:9,    desc:"Cebada frozen, medio litro" },
  { id:"B26",  cat:"Bebidas",           icon:"🥤", name:"Fresa Normal 1L",           price:10,   desc:"Fresa natural, 1 litro" },
  { id:"B27",  cat:"Bebidas",           icon:"🥤", name:"Fresa Normal 1/2L",         price:5,    desc:"Fresa natural, medio litro" },
  { id:"B28",  cat:"Bebidas",           icon:"🥤", name:"Fresa Normal Vaso",         price:2.50, desc:"Fresa natural, vaso" },
  { id:"B29",  cat:"Bebidas",           icon:"🧊", name:"Fresa Frozen 1L",           price:18,   desc:"Fresa frozen, 1 litro" },
  { id:"B30",  cat:"Bebidas",           icon:"🧊", name:"Fresa Frozen 1/2L",         price:9,    desc:"Fresa frozen, medio litro" },
  { id:"CV01", cat:"Cervezas",          icon:"🍺", name:"Cristal",                   price:10,   desc:"Cerveza Cristal" },
  { id:"CV02", cat:"Cervezas",          icon:"🍺", name:"Pilsen",                    price:10,   desc:"Cerveza Pilsen Callao" },
  { id:"CV03", cat:"Cervezas",          icon:"🍺", name:"Heineken",                  price:10,   desc:"Cerveza Heineken importada" },
  { id:"CV04", cat:"Cervezas",          icon:"🍺", name:"Cusqueña",                  price:12,   desc:"Cerveza Cusqueña dorada" },
  { id:"CV05", cat:"Cervezas",          icon:"🍺", name:"Corona",                    price:10,   desc:"Cerveza Corona importada" },
  { id:"CH01", cat:"Chilcanos",         icon:"🍹", name:"Chilcano Limón Vaso",       price:15,   desc:"Chilcano de pisco con limón, vaso" },
  { id:"CH02", cat:"Chilcanos",         icon:"🍹", name:"Chilcano Limón Jarra",      price:30,   desc:"Chilcano de pisco con limón, jarra" },
  { id:"CH03", cat:"Chilcanos",         icon:"🍹", name:"Chilcano Maracuyá Vaso",    price:15,   desc:"Chilcano de pisco con maracuyá, vaso" },
  { id:"CH04", cat:"Chilcanos",         icon:"🍹", name:"Chilcano Maracuyá Jarra",   price:30,   desc:"Chilcano de pisco con maracuyá, jarra" },
  { id:"CH05", cat:"Chilcanos",         icon:"🍹", name:"Chilcano Fresa Vaso",       price:15,   desc:"Chilcano de pisco con fresa, vaso" },
  { id:"CH06", cat:"Chilcanos",         icon:"🍹", name:"Chilcano Fresa Jarra",      price:30,   desc:"Chilcano de pisco con fresa, jarra" },
  { id:"CH07", cat:"Chilcanos",         icon:"🍹", name:"Chilcano Aguaimanto Vaso",  price:15,   desc:"Chilcano de pisco con aguaimanto, vaso" },
  { id:"CH08", cat:"Chilcanos",         icon:"🍹", name:"Chilcano Aguaimanto Jarra", price:30,   desc:"Chilcano de pisco con aguaimanto, jarra" },
  { id:"CH09", cat:"Chilcanos",         icon:"🍹", name:"Chilcano Tuna Vaso",        price:15,   desc:"Chilcano de pisco con tuna, vaso" },
  { id:"CH10", cat:"Chilcanos",         icon:"🍹", name:"Chilcano Tuna Jarra",       price:30,   desc:"Chilcano de pisco con tuna, jarra" },
  { id:"CH11", cat:"Chilcanos",         icon:"🍹", name:"Chilcano Mango Vaso",       price:15,   desc:"Chilcano de pisco con mango, vaso" },
  { id:"CH12", cat:"Chilcanos",         icon:"🍹", name:"Chilcano Mango Jarra",      price:30,   desc:"Chilcano de pisco con mango, jarra" },
  { id:"G01",  cat:"Gaseosas",          icon:"🥤", name:"Inka Cola 2L",              price:15,   desc:"Inka Cola 2 litros" },
  { id:"G02",  cat:"Gaseosas",          icon:"🥤", name:"Coca Cola 2L",              price:15,   desc:"Coca Cola 2 litros" },
  { id:"G03",  cat:"Gaseosas",          icon:"🥤", name:"Inca Kola 1L",              price:8,    desc:"Inca Kola 1 litro" },
  { id:"G04",  cat:"Gaseosas",          icon:"🥤", name:"Coca Cola 1L",              price:8,    desc:"Coca Cola 1 litro" },
  { id:"G05",  cat:"Gaseosas",          icon:"🥤", name:"Gordita",                   price:5,    desc:"Gaseosa gordita" },
  { id:"G06",  cat:"Gaseosas",          icon:"🥤", name:"Coca Cola Personal",        price:2.50, desc:"Coca Cola personal" },
  { id:"G07",  cat:"Gaseosas",          icon:"🥤", name:"Inka Cola Personal",        price:2.50, desc:"Inka Cola personal" },
  { id:"G08",  cat:"Gaseosas",          icon:"🥤", name:"Agua Mineral",              price:3,    desc:"Agua mineral sin gas" },
  { id:"G09",  cat:"Gaseosas",          icon:"🥤", name:"Inca Kola 600ml",           price:4,    desc:"Inca Kola 600ml" },
  { id:"G10",  cat:"Gaseosas",          icon:"🥤", name:"Coca Cola 600ml",           price:4,    desc:"Coca Cola 600ml" },
  { id:"O01",  cat:"Otros",             icon:"☕", name:"Café Pasado",               price:4,    desc:"Café pasado tradicional" },
  { id:"O02",  cat:"Otros",             icon:"🍵", name:"Infusiones",                price:3,    desc:"Variedad de infusiones calientes" },
  { id:"EX01", cat:"Extras",            icon:"🍟", name:"Porción de Papas",          price:6,    desc:"Porción extra de papas fritas" },
  { id:"EX02", cat:"Extras",            icon:"🥗", name:"Porción de Ensalada",       price:4,    desc:"Porción extra de ensalada" },
  { id:"EX03", cat:"Extras",            icon:"🍚", name:"Porción de Chaufa",         price:6,    desc:"Porción extra de arroz chaufa" },
  { id:"EX04", cat:"Extras",            icon:"🍚", name:"Arroz Blanco en Molde",     price:3,    desc:"Porción de arroz blanco" },
];

const ALL_CATS = [...new Set(MENU_BASE.map(i => i.cat))];
const fmt      = (n) => `S/.${Number(n).toFixed(2)}`;
const newDraft = () => ({ table:"", items:[], payTiming:"despues", notes:"", phone:"", orderType:"mesa", taperCost:0 });
const MESAS    = [1, 2, 3, 4, 5, 6];

const getPay = (o, type) => o.payments ? (Number(o.payments[type]) || 0) : (o.payment === type ? o.total : 0);

const timeStr    = (iso) => { if(!iso)return""; const d=new Date(iso); return d.toLocaleTimeString("es-PE",{hour:"2-digit",minute:"2-digit"}); };
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

// ═══════════════════════════════════════════════════════════════════
//  MODAL DE EDICIÓN
// ═══════════════════════════════════════════════════════════════════
function EditOrderModal({ order, onSave, onClose, menu, isMobile, s, Y }) {
  const [eTable,     setETable]     = useState(order.table);
  const [eItems,     setEItems]     = useState(order.items.map(i => ({ ...i })));
  const [eNotes,     setENotes]     = useState(order.notes || "");
  const [ePhone,     setEPhone]     = useState(order.phone || "");
  const [eOrderType, setEOrderType] = useState(order.orderType || "mesa");
  const [eTaperCost, setETaperCost] = useState(order.taperCost || 0);
  const [eCat,       setECat]       = useState("Todos");
  const [eSearch,    setESearch]    = useState("");

  const eTotal = eItems.reduce((sum, i) => sum + i.price * i.qty, 0) + (Number(eTaperCost) || 0);

  const eAddItem = (item) => setEItems(prev => {
    const ex = prev.find(i => i.id === item.id);
    return ex ? prev.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i)
              : [...prev, { ...item, qty: 1, itemNotes: "" }];
  });
  const eChangeQty = (id, d) => setEItems(prev =>
    prev.map(i => i.id === id ? { ...i, qty: i.qty + d } : i).filter(i => i.qty > 0)
  );
  const eUpdateItemNotes = (id, note) => setEItems(prev =>
    prev.map(i => i.id === id ? { ...i, itemNotes: note } : i)
  );

  const filtE = menu.filter(i =>
    (eCat === "Todos" || i.cat === eCat) &&
    i.name.toLowerCase().includes(eSearch.toLowerCase())
  );
  const handleSave = () => {
    if (!eTable.trim() || !eItems.length) return;
    onSave({ ...order, table: eTable, items: eItems, notes: eNotes, phone: ePhone, total: eTotal, orderType: eOrderType, taperCost: eTaperCost });
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
          <input style={{ ...s.input, marginTop:4 }} value={ePhone} onChange={e => setEPhone(e.target.value)} placeholder="Ej: 9 87654321" />
        </div>
      )}

      <div style={{ marginBottom:10 }}>
        <label style={{ fontSize:11, color:"#888", textTransform:"uppercase", letterSpacing:1 }}>
          🥡 Taper / Bolsa (S/.)
        </label>
        <input style={{ ...s.input, marginTop:4 }} type="number" min="0" step="0.50" placeholder="Ej: 1.00"
          value={eTaperCost || ""} onChange={e => setETaperCost(e.target.value)} />
      </div>

      <div style={{ marginBottom:10 }}>
        <label style={{ fontSize:11, color:"#888", textTransform:"uppercase", letterSpacing:1 }}>Notas</label>
        <input style={{ ...s.input, marginTop:4 }} value={eNotes} onChange={e => setENotes(e.target.value)} placeholder="Sin cebolla, extra salsa..." />
      </div>

      <div style={{ marginBottom:12 }}>
        <label style={{ fontSize:11, color:"#888", textTransform:"uppercase", letterSpacing:1 }}>Productos del pedido</label>
        {eItems.length === 0
          ? <div style={{ textAlign:"center", color:"#444", padding:"12px 0", fontSize:12 }}>Agrega productos desde abajo</div>
          : eItems.map(item => (
            <div key={item.id} style={{ marginBottom:10, padding:"10px", background:"#0a0a0a", borderRadius:8, border:"1px solid #222" }}>
              <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:8, paddingBottom:8, borderBottom:"1px solid #252525" }}>
                <div style={{ flex:1, fontSize:14, fontWeight:700 }}>{item.name}</div>
                <button style={{ ...s.btn("danger"), padding:"4px 10px", fontSize:14 }} onClick={() => eChangeQty(item.id,-1)}>−</button>
                <span style={{ fontWeight:900, minWidth:20, textAlign:"center", fontSize:14 }}>{item.qty}</span>
                <button style={{ ...s.btn(), padding:"4px 10px", fontSize:14 }} onClick={() => eChangeQty(item.id,1)}>+</button>
                <span style={{ color:Y, fontWeight:900, fontSize:14, minWidth:55, textAlign:"right" }}>{fmt(item.price*item.qty)}</span>
              </div>
              <input 
                style={{ ...s.input, fontSize:13, padding:"8px 10px", marginTop:4 }} 
                placeholder="Escribir nota para este item..." 
                value={item.itemNotes || ""} 
                onChange={e => eUpdateItemNotes(item.id, e.target.value)} 
              />
            </div>
          ))
        }
        {eTaperCost > 0 && (
          <div style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:"1px solid #252525", color:"#aaa", fontSize:12 }}>
            <span>🥡 Taper/Bolsa</span>
            <span>{fmt(Number(eTaperCost))}</span>
          </div>
        )}
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
              <div key={item.id} onClick={() => eAddItem(item)} style={{ ...s.card, cursor:"pointer", marginBottom:4, padding:"7px 10px", border: inE ? `1px solid ${Y}55` : "1px solid #2a2a2a" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ fontSize:13 }}>{item.icon} {item.name}</span>
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <span style={{ color:Y, fontWeight:900, fontSize:12 }}>{fmt(item.price)}</span>
                    {inE
                      ? <span style={{ background:Y, color:"#111", borderRadius:10, padding:"1px 7px", fontSize:11, fontWeight:900 }}>×{inE.qty}</span>
                      : <span style={{ background:"#2a2a2a", borderRadius:"50%", width:20, height:20, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, color:"#aaa", fontSize:14 }}>+</span>
                    }
                  </div>
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

// ═══════════════════════════════════════════════════════════════════
//  MODAL MULTICOBRO
// ═══════════════════════════════════════════════════════════════════
function CobrarModal({ total, onConfirm, onClose, s, Y }) {
  const [ef, setEf] = useState(total);
  const [ya, setYa] = useState(0);
  const [ta, setTa] = useState(0);

  const sum = Number(ef||0) + Number(ya||0) + Number(ta||0);
  const diff = total - sum;

  return (
    <div style={s.modal} onClick={e => e.stopPropagation()}>
      <div style={{...s.row, marginBottom:16}}>
        <h2 style={{color:Y, fontFamily:"'Bebas Neue',cursive", margin:0, fontSize:24, letterSpacing:1}}>💰 MULTICOBRO</h2>
        <button style={{...s.btn("secondary"), padding:"4px 10px"}} onClick={onClose}>✕</button>
      </div>

      <div style={{fontSize:22, fontWeight:900, marginBottom:16, textAlign:"center", background:"#111", padding:12, borderRadius:8}}>
        TOTAL A COBRAR: <span style={{color:Y}}>{fmt(total)}</span>
      </div>

      <div style={{display:"flex", flexDirection:"column", gap:12}}>
        <div style={{display:"flex", alignItems:"center", gap:10}}>
          <span style={{width:90, fontWeight:700}}>💵 Efectivo</span>
          <input type="number" style={s.input} value={ef} onChange={e=>setEf(e.target.value)} min="0" step="0.5" />
          <button style={s.btn("secondary")} onClick={()=>{setEf(total);setYa(0);setTa(0);}}>Todo</button>
        </div>
        <div style={{display:"flex", alignItems:"center", gap:10}}>
          <span style={{width:90, fontWeight:700}}>💜 Yape</span>
          <input type="number" style={s.input} value={ya} onChange={e=>setYa(e.target.value)} min="0" step="0.5" />
          <button style={s.btn("secondary")} onClick={()=>{setEf(0);setYa(total);setTa(0);}}>Todo</button>
        </div>
        <div style={{display:"flex", alignItems:"center", gap:10}}>
          <span style={{width:90, fontWeight:700}}>💳 Tarjeta</span>
          <input type="number" style={s.input} value={ta} onChange={e=>setTa(e.target.value)} min="0" step="0.5" />
          <button style={s.btn("secondary")} onClick={()=>{setEf(0);setYa(0);setTa(total);}}>Todo</button>
        </div>
      </div>

      <div style={{marginTop:20, fontSize:15, fontWeight:900, textAlign:"center", padding:12, borderRadius:8, background: Math.abs(diff)<0.01 ? "#1e402a" : "#4a1c1c", color: Math.abs(diff)<0.01 ? "#2ecc71" : "#e74c3c"}}>
        Ingresado: {fmt(sum)} {Math.abs(diff)>0.01 && `(Falta: ${fmt(diff)})`}
      </div>

      <button style={{...s.btn("success"), width:"100%", padding:14, fontSize:16, marginTop:16, opacity: Math.abs(diff)>0.01 ? 0.5 : 1}} 
        onClick={()=>onConfirm({efectivo:Number(ef||0), yape:Number(ya||0), tarjeta:Number(ta||0)})} disabled={Math.abs(diff)>0.01}>
        ✅ Confirmar Cobro
      </button>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
//  NUEVO PEDIDO
// ═══════════════════════════════════════════════════════════════════
function NuevoPedidoComponent({ draft, setDraft, menu, addItem, changeQty, updateItemNotes, draftTotal, fmt, submitOrder, newDraft, s, Y, isDesktop, isMobile }) {
  const [search,    setSearch]    = useState("");
  const [catFilter, setCatFilter] = useState("Todos");

  const filteredMenu = menu.filter(i =>
    (catFilter === "Todos" || i.cat === catFilter) &&
    i.name.toLowerCase().includes(search.toLowerCase())
  );

  const taperNum = Number(draft.taperCost) || 0;

  return (
    <div style={{ display:"grid", gridTemplateColumns: isDesktop ? "1fr 300px" : "1fr", gap: isMobile ? 12 : 14, paddingBottom: isMobile && draft.items.length > 0 ? 80 : 0 }}>
      <div>
        <div style={s.title}>🍔 CARTA</div>
        <input
          style={{ ...s.input, marginBottom:8 }}
          placeholder="Buscar platillo..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div style={{ display:"flex", gap:4, flexWrap:"wrap", marginBottom:10 }}>
          {["Todos",...ALL_CATS].map(c => (
            <button key={c}
              style={{ ...s.btn(catFilter===c?"primary":"secondary"), fontSize: isMobile?9:10, padding: isMobile?"3px 6px":"4px 10px" }}
              onClick={() => setCatFilter(c)}>
              {c}
            </button>
          ))}
        </div>
        <div>
          {filteredMenu.length === 0 && <div style={{ color:"#555", textAlign:"center", padding:20 }}>Sin resultados</div>}
          {filteredMenu.map(item => {
            const inDraft = draft.items.find(i => i.id === item.id);
            return (
              <div key={item.id} onClick={() => addItem(item)}
                style={{ ...s.card, cursor:"pointer",
                  border: inDraft?`1px solid ${Y}66`:"1px solid #2a2a2a", marginBottom:5, padding: isMobile?"8px 10px":"10px 12px" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div style={{ flex:1 }}>
                    <span style={{ marginRight:6 }}>{item.icon}</span>
                    <span style={{ fontWeight:700, fontSize: isMobile?13:14 }}>{item.name}</span>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <span style={{ color:Y, fontWeight:900, fontSize: isMobile?13:14 }}>{fmt(item.price)}</span>
                    {inDraft
                      ? <span style={{ background:Y, color:"#111", borderRadius:12, padding:"1px 8px", fontSize:12, fontWeight:900 }}>×{inDraft.qty}</span>
                      : <span style={{ background:"#2a2a2a", borderRadius:"50%", width:22, height:22, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, fontSize:16, color:"#aaa" }}>+</span>
                    }
                  </div>
                </div>
                {item.desc && <div style={{ fontSize:10, color:"#555", marginTop:3, paddingLeft:22 }}>{item.desc}</div>}
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
                  onClick={() => setDraft(d => ({...d, orderType:t, taperCost:0, payTiming: t==="llevar"?"ahora":"despues"}))}>
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
              <label style={{ fontSize:11, color:"#888", textTransform:"uppercase", letterSpacing:1 }}>Teléfono</label>
              <input style={{ ...s.input, marginTop:4 }} value={draft.phone || ""} onChange={e => setDraft(d => ({...d, phone: e.target.value}))} placeholder="Ej: 9 87654321" />
            </div>
          )}

          <div style={{ marginBottom:10 }}>
            <label style={{ fontSize:11, color:"#888", textTransform:"uppercase", letterSpacing:1 }}>
              🥡 Taper / Bolsa (S/.)
            </label>
            <input style={{ ...s.input, marginTop:4 }} type="number" min="0" step="0.50" placeholder="0.00"
              value={draft.taperCost || ""} onChange={e => setDraft(d => ({...d, taperCost: e.target.value}))} />
          </div>

          <div style={{ marginBottom:10 }}>
            <label style={{ fontSize:11, color:"#888", textTransform:"uppercase", letterSpacing:1 }}>Momento del Cobro</label>
            <div style={{ display:"flex", gap:6, marginTop:4 }}>
              <button style={{ ...s.btn(draft.payTiming==="despues"?"primary":"secondary"), flex:1 }}
                onClick={() => setDraft(d => ({...d,payTiming:"despues"}))}>
                ⏱ Pagar después
              </button>
              <button style={{ ...s.btn(draft.payTiming==="ahora"?"primary":"secondary"), flex:1 }}
                onClick={() => setDraft(d => ({...d,payTiming:"ahora"}))}>
                💵 Pagar ahora
              </button>
            </div>
          </div>

          <div style={{ marginBottom:12 }}>
            <label style={{ fontSize:11, color:"#888", textTransform:"uppercase", letterSpacing:1 }}>Notas Generales</label>
            <input style={{ ...s.input, marginTop:4 }} value={draft.notes}
              onChange={e => setDraft(d => ({...d, notes: e.target.value}))} placeholder="Sin cebolla en general..." />
          </div>

          {draft.items.length === 0
            ? <div style={{ textAlign:"center", color:"#444", padding:"20px 0", fontSize:13 }}>Toca un platillo para agregarlo →</div>
            : <div style={{ maxHeight: isDesktop ? 400 : "none", overflowY: isDesktop ? "auto" : "visible", marginBottom:8 }}>
                {draft.items.map(item => (
                  <div key={item.id} style={{ marginBottom:10, padding:"10px", background:"#0a0a0a", borderRadius:8, border:"1px solid #222" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:8, paddingBottom:8, borderBottom:"1px solid #252525" }}>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:700, fontSize:14 }}>{item.name}</div>
                      </div>
                      <button style={{ ...s.btn("danger"), padding:"4px 10px", fontSize:14 }} onClick={() => changeQty(item.id,-1)}>−</button>
                      <span style={{ fontWeight:900, minWidth:20, textAlign:"center", fontSize:14 }}>{item.qty}</span>
                      <button style={{ ...s.btn(), padding:"4px 10px", fontSize:14 }} onClick={() => changeQty(item.id,1)}>+</button>
                      <span style={{ color:Y, fontWeight:900, fontSize:14, minWidth:55, textAlign:"right" }}>{fmt(item.price*item.qty)}</span>
                    </div>
                    <input 
                      style={{ ...s.input, fontSize:13, padding:"8px 10px", marginTop: 4 }} 
                      placeholder="Escribir nota para este item..." 
                      value={item.itemNotes || ""} 
                      onChange={e => updateItemNotes(item.id, e.target.value)} 
                    />
                  </div>
                ))}
              </div>
          }

          {taperNum > 0 && (
            <div style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderTop:"1px solid #2a2a2a", color:"#aaa", fontSize:12 }}>
              <span>🥡 Taper/Bolsa</span><span>{fmt(taperNum)}</span>
            </div>
          )}
          <div style={{ display:"flex", justifyContent:"space-between", padding:"10px 0", borderTop:`2px solid ${Y}55`, marginBottom:12 }}>
            <span style={{ fontWeight:900, fontSize:17 }}>TOTAL</span><span style={{ fontWeight:900, fontSize:17, color:Y }}>{fmt(draftTotal + taperNum)}</span>
          </div>

          {!isMobile && (
            <button style={{ ...s.btn(), width:"100%", padding:12, fontSize:15, opacity:(!draft.table||!draft.items.length)?0.4:1 }}
              onClick={submitOrder} disabled={!draft.table||!draft.items.length}>
              {draft.payTiming==="ahora" ? "💵 Continuar al Cobro" : "📝 Enviar a Cocina"}
            </button>
          )}
          <button style={{ ...s.btn("secondary"), width:"100%", padding:8, marginTop:6, fontSize:12 }}
            onClick={() => setDraft(newDraft())}>🗑️ Limpiar</button>
        </div>
      </div>

      {isMobile && draft.items.length > 0 && (
        <div style={{position:"fixed", bottom:0, left:0, right:0, background:"#1a1a1a", borderTop:`2px solid ${Y}`, padding:"12px 16px", display:"flex", justifyContent:"space-between", alignItems:"center", zIndex:999, boxShadow:"0 -5px 15px rgba(0,0,0,0.8)"}}>
          <div style={{fontWeight:900, fontSize:16, color:"#fff"}}>TOTAL: <span style={{color:Y, fontSize:20}}>{fmt(draftTotal + taperNum)}</span></div>
          <button style={{ ...s.btn(), padding:"12px 24px", fontSize:15, opacity:(!draft.table)?0.4:1 }}
            onClick={submitOrder} disabled={!draft.table}>
            {draft.payTiming==="ahora" ? "💵 Cobrar" : "📝 A Cocina"}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Impresión para cocina ──────────────────────────────────────────
function printOrder(order) {
  const win = window.open("", "_blank", "width=220,height=600");
  const items = order.items.map(i => {
    const itemNote = i.itemNotes ? `<tr><td colspan="3" style="font-size:9px;color:#666;padding-top:0;padding-bottom:2mm;font-style:italic;">📝 ${i.itemNotes}</td></tr>` : "";
    return `<tr><td class="qty">${i.qty}x</td><td class="item">${i.name}</td><td class="price">S/.${(i.price*i.qty).toFixed(2)}</td></tr>${itemNote}`;
  }).join("");
  const taperRow = (order.taperCost && Number(order.taperCost) > 0) ? `<tr><td class="qty">🥡</td><td class="item">Taper/Bolsa</td><td class="price">S/.${Number(order.taperCost).toFixed(2)}</td></tr>` : "";
  const notes = order.notes ? `<div class="notes">📝 ${order.notes}</div>` : "";
  const tipo  = order.orderType==="llevar" ? `🥡 LLEVAR — ${order.table}${order.phone?` · ${order.phone}`:""}` : `MESA ${order.table}`;
  const hora  = new Date().toLocaleTimeString("es-PE",{hour:"2-digit",minute:"2-digit"});
  const fecha = new Date().toLocaleDateString("es-PE",{day:"2-digit",month:"2-digit",year:"2-digit"});
  const paidMarker = order.isPaid ? `<div style="text-align:center;font-weight:bold;margin-top:2mm;border:1px solid #000;padding:2px;">** PAGADO **</div>` : "";
  
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Pedido</title>
<style>
  @page{size:50mm auto;margin:0}*{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Courier New',monospace;font-size:11px;width:50mm;padding:10mm 2mm 4mm;background:#fff;color:#000}
  .logo{text-align:center;font-size:13px;font-weight:bold;letter-spacing:1px;margin-bottom:1mm}
  .sub{text-align:center;font-size:9px;margin-bottom:2mm;color:#333}
  .divider{border-top:1px dashed #000;margin:2mm 0}
  .mesa{text-align:center;font-size:16px;font-weight:bold;margin:2mm 0;letter-spacing:1px}
  .hora{text-align:center;font-size:9px;color:#444;margin-bottom:2mm}
  table{width:100%;border-collapse:collapse}
  td{padding:1mm 0;vertical-align:top}
  .qty{width:7mm;font-weight:bold}.item{width:auto}.price{width:16mm;text-align:right;white-space:nowrap}
  .total-row{display:flex;justify-content:space-between;font-size:13px;font-weight:bold;margin-top:2mm;padding-top:1mm;border-top:1px solid #000}
  .notes{font-size:10px;font-style:italic;margin-top:2mm;padding:1mm;border:1px dashed #999}
  .footer{text-align:center;font-size:9px;margin-top:3mm;color:#555}
</style></head><body>
  <div class="logo">MR. PAPACHOS</div>
  <div class="sub">¡Sabe a Cajacho!</div>
  <div class="divider"></div>
  <div class="mesa">${tipo}</div>
  <div class="hora">${fecha} — ${hora}</div>
  <div class="divider"></div>
  <table>${items}${taperRow}</table>
  ${notes}
  <div class="divider"></div>
  <div class="total-row"><span>TOTAL</span><span>S/.${order.total.toFixed(2)}</span></div>
  ${paidMarker}
  <div class="footer">— Cocina —</div>
  <script>window.onload=function(){window.print();setTimeout(function(){window.close();},500);}<\/script>
</body></html>`);
  win.document.close();
}

// ═══════════════════════════════════════════════════════════════════
//  INVENTARIO
// ═══════════════════════════════════════════════════════════════════
function Inventario({ menu, orders, history, isMobile, s, Y, fmt }) {
  const localNow = new Date();
  const todayIso = localNow.getFullYear() + "-" + String(localNow.getMonth()+1).padStart(2,'0') + "-" + String(localNow.getDate()).padStart(2,'0');

  const [invCat,    setInvCat]    = useState("Todos");
  const [invPeriod, setInvPeriod] = useState("hoy");
  const [invDate,   setInvDate]   = useState(todayIso);
  const [invSortBy, setInvSortBy] = useState("cantidad");
  const [search,    setSearch]    = useState("");

  const now      = new Date();
  const todayStr = now.toDateString();
  const weekAgo  = new Date(now - 7*24*60*60*1000);

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
  history.filter(o=>o.status==="pagado"&&inPeriod(o.createdAt)).forEach(order=>{
    order.items?.forEach(item=>{counts[item.id]=(counts[item.id]||0)+item.qty;revenue[item.id]=(revenue[item.id]||0)+item.price*item.qty;});
  });
  if (invPeriod==="hoy"||invPeriod==="semana"||invPeriod==="fecha") {
    orders.filter(o=>o.isPaid&&inPeriod(o.createdAt)).forEach(order=>{
      order.items?.forEach(item=>{counts[item.id]=(counts[item.id]||0)+item.qty;revenue[item.id]=(revenue[item.id]||0)+item.price*item.qty;});
    });
  }

  let items = menu
    .map(item=>({...item,qty:counts[item.id]||0,revenue:revenue[item.id]||0}))
    .filter(item=>(invCat==="Todos"||item.cat===invCat)&&item.name.toLowerCase().includes(search.toLowerCase()));
  if (invSortBy==="cantidad") items=items.sort((a,b)=>b.qty-a.qty);
  else items=items.sort((a,b)=>a.name.localeCompare(b.name));

  const totalQty=items.reduce((s,i)=>s+i.qty,0);
  const totalRev=items.reduce((s,i)=>s+i.revenue,0);
  const maxQty=Math.max(...items.map(i=>i.qty),1);
  const periodLabel = invPeriod==="hoy" ? "hoy" : invPeriod==="semana" ? "esta semana" : invPeriod==="fecha" ? "esa fecha" : "histórico";

  return (
    <div>
      <div style={s.title}>📦 INVENTARIO DE VENTAS</div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10, alignItems:"center"}}>
        {[["hoy","📅 Hoy"],["semana","📆 Semana"],["fecha","🔍 Fecha"],["total","🗂️ Total"]].map(([v,l])=>(
          <button key={v} style={{...s.btn(invPeriod===v?"primary":"secondary"),fontSize:11}} onClick={()=>setInvPeriod(v)}>{l}</button>
        ))}
        {invPeriod === "fecha" && (
          <input type="date" style={{...s.input, width:"auto", padding:"4px 8px"}} value={invDate} onChange={e => setInvDate(e.target.value)} />
        )}
        <div style={{width:1,background:"#333", height:20, margin:"0 4px"}}/>
        {[["cantidad","# Cantidad"],["nombre","A-Z Nombre"]].map(([v,l])=>(
          <button key={v} style={{...s.btn(invSortBy===v?"primary":"secondary"),fontSize:11}} onClick={()=>setInvSortBy(v)}>{l}</button>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:12}}>
        <div style={s.statCard}><div style={{...s.statNum,fontSize:isMobile?18:24}}>{totalQty}</div><div style={s.statLbl}>Items {periodLabel}</div></div>
        <div style={{...s.statCard,border:`1px solid ${Y}55`}}><div style={{...s.statNum,fontSize:isMobile?14:18}}>{fmt(totalRev)}</div><div style={s.statLbl}>Ingresos {periodLabel}</div></div>
        <div style={s.statCard}><div style={{...s.statNum,fontSize:isMobile?18:24}}>{items.filter(i=>i.qty>0).length}</div><div style={s.statLbl}>Platos distintos</div></div>
      </div>
      <input style={{...s.input,marginBottom:8}} placeholder="Buscar platillo..." value={search} onChange={e=>setSearch(e.target.value)}/>
      <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:12}}>
        {["Todos",...ALL_CATS].map(c=>(
          <button key={c} style={{...s.btn(invCat===c?"primary":"secondary"),fontSize:isMobile?9:10,padding:isMobile?"3px 6px":"4px 9px"}} onClick={()=>setInvCat(c)}>{c}</button>
        ))}
      </div>
      {items.length===0
        ?<div style={{textAlign:"center",padding:40,color:"#444"}}>Sin resultados</div>
        :items.map(item=>(
          <div key={item.id} style={{...s.card,marginBottom:6,padding:"10px 12px",opacity:item.qty===0?0.4:1}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:item.qty>0?6:0}}>
              <div style={{display:"flex",alignItems:"center",gap:8,flex:1,minWidth:0}}>
                <span style={{fontSize:18}}>{item.icon}</span>
                <div style={{minWidth:0}}>
                  <div style={{fontWeight:800,fontSize:isMobile?12:14,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{item.name}</div>
                  <div style={{fontSize:10,color:"#555"}}>{item.cat} · {fmt(item.price)}</div>
                </div>
              </div>
              <div style={{textAlign:"right",flexShrink:0,marginLeft:8}}>
                <div style={{fontWeight:900,fontSize:isMobile?16:20,color:item.qty>0?Y:"#444"}}>{item.qty>0?`×${item.qty}`:"—"}</div>
                {item.qty>0&&<div style={{fontSize:10,color:"#27ae60"}}>{fmt(item.revenue)}</div>}
              </div>
            </div>
            {item.qty>0&&(
              <div style={{background:"#222",borderRadius:4,height:5,overflow:"hidden"}}>
                <div style={{background:`linear-gradient(90deg,${Y},#e6b800)`,height:"100%",width:`${(item.qty/maxQty)*100}%`,borderRadius:4,transition:"width .3s"}}/>
              </div>
            )}
          </div>
        ))
      }
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  COMPONENTES DE PESTAÑAS (Extraídos de App para evitar pérdida de foco)
// ═══════════════════════════════════════════════════════════════════

function DashboardComponent({ orders, history, gastos, handleAddGasto, handleDeleteGasto, fmt, setTab, finishPaidOrder, setCobrarTarget, isMobile, s, Y }) {
  const [descGasto, setDescGasto] = useState("");
  const [montoGasto, setMontoGasto] = useState("");

  const today = new Date().toDateString();
  const paidArchivedToday = history.filter(o => o.status==="pagado" && new Date(o.createdAt).toDateString()===today);
  const paidActiveToday   = orders.filter(o => o.isPaid && new Date(o.createdAt).toDateString()===today);
  const allPaidToday      = [...paidArchivedToday, ...paidActiveToday];

  const todayRev  = allPaidToday.reduce((sum,o) => sum + o.total, 0);
  const totalRev  = history.filter(o => o.status==="pagado").reduce((sum,o) => sum + o.total, 0) + paidActiveToday.reduce((sum,o) => sum + o.total, 0);
  
  const cashRev   = allPaidToday.reduce((sum,o) => sum + getPay(o,"efectivo"), 0);
  const yapeRev   = allPaidToday.reduce((sum,o) => sum + getPay(o,"yape"), 0);
  const cardRev   = allPaidToday.reduce((sum,o) => sum + getPay(o,"tarjeta"), 0);

  const gastosTodayList = gastos.filter(g => new Date(g.createdAt).toDateString() === today);
  const totalGastosToday = gastosTodayList.reduce((sum, g) => sum + (Number(g.monto) || 0), 0);
  const cajaFinal = todayRev - totalGastosToday;

  return (
    <div>
      <div style={s.title}>📊 CUADRE DE CAJA</div>
      <div style={s.grid(isMobile ? 130 : 140)}>
        <div style={s.statCard}><div style={s.statNum}>{orders.length}</div><div style={s.statLbl}>Activos</div></div>
        <div style={s.statCard}><div style={s.statNum}>{allPaidToday.length}</div><div style={s.statLbl}>Pagados hoy</div></div>
        <div style={{...s.statCard, border:`1px solid ${Y}55`}}><div style={{...s.statNum, fontSize:isMobile?16:20}}>{fmt(todayRev)}</div><div style={s.statLbl}>Ingresos (Bruto)</div></div>
        <div style={{...s.statCard, border:`1px solid #e74c3c55`}}><div style={{...s.statNum, fontSize:isMobile?16:20, color:"#e74c3c"}}>- {fmt(totalGastosToday)}</div><div style={s.statLbl}>Gastos / Insumos</div></div>
        <div style={{...s.statCard, border:`1px solid #27ae60`, background:"#0a1f10"}}><div style={{...s.statNum, fontSize:isMobile?16:20, color:"#27ae60"}}>{fmt(cajaFinal)}</div><div style={{...s.statLbl, color:"#2ecc71", fontWeight:900}}>CAJA NETA</div></div>
        <div style={s.statCard}><div style={{...s.statNum, fontSize:isMobile?16:20}}>{fmt(totalRev)}</div><div style={s.statLbl}>Total histórico</div></div>
      </div>
      
      {allPaidToday.length > 0 && (
        <div style={{...s.card, marginTop:8}}>
          <div style={{fontWeight:800, marginBottom:8, color:"#aaa", fontSize:11, textTransform:"uppercase", letterSpacing:1}}>Desglose de Ingresos Hoy</div>
          <div style={s.row}>
            <div style={{textAlign:"center", flex:1}}><div style={{color:"#27ae60", fontWeight:900, fontSize:isMobile?13:16}}>💵 {fmt(cashRev)}</div><div style={{fontSize:10, color:"#666"}}>Efectivo</div></div>
            <div style={{width:1, background:"#333", height:36}}/>
            <div style={{textAlign:"center", flex:1}}><div style={{color:"#8e44ad", fontWeight:900, fontSize:isMobile?13:16}}>💜 {fmt(yapeRev)}</div><div style={{fontSize:10, color:"#666"}}>Yape</div></div>
            <div style={{width:1, background:"#333", height:36}}/>
            <div style={{textAlign:"center", flex:1}}><div style={{color:"#2980b9", fontWeight:900, fontSize:isMobile?13:16}}>💳 {fmt(cardRev)}</div><div style={{fontSize:10, color:"#666"}}>Tarjeta</div></div>
          </div>
        </div>
      )}

      {/* SECCIÓN DE GASTOS / INSUMOS */}
      <div style={{...s.card, marginTop:14}}>
        <div style={{...s.title, fontSize:16, marginBottom:10}}>🛒 REGISTRAR INSUMO / GASTO</div>
        <div style={{display:"flex", gap:8, flexWrap:"wrap"}}>
          <input 
            style={{...s.input, flex:2, minWidth:120}} 
            placeholder="Nombre del insumo (Ej. Aceite, Papas...)" 
            value={descGasto} 
            onChange={e => setDescGasto(e.target.value)} 
          />
          <input 
            style={{...s.input, flex:1, minWidth:80}} 
            type="number" min="0" step="0.5" 
            placeholder="S/. 0.00" 
            value={montoGasto} 
            onChange={e => setMontoGasto(e.target.value)} 
          />
          <button 
            style={{...s.btn("danger"), flex:1, minWidth:100}} 
            onClick={() => { handleAddGasto(descGasto, montoGasto); setDescGasto(""); setMontoGasto(""); }}
          >
            📥 Registrar
          </button>
        </div>

        {gastosTodayList.length > 0 && (
          <div style={{marginTop:14}}>
            <div style={{fontSize:11, color:"#888", marginBottom:6, textTransform:"uppercase", letterSpacing:1}}>Gastos de Hoy</div>
            {gastosTodayList.map(g => (
              <div key={g._fid} style={{display:"flex", justifyContent:"space-between", alignItems:"center", background:"#111", padding:"8px 12px", borderRadius:6, marginBottom:4, border:"1px solid #222"}}>
                <div style={{fontSize:13}}><span style={{marginRight:8}}>💸</span>{g.descripcion}</div>
                <div style={{display:"flex", alignItems:"center", gap:10}}>
                  <span style={{color:"#e74c3c", fontWeight:900}}>- {fmt(g.monto)}</span>
                  <button 
                    style={{background:"transparent", border:"none", color:"#555", cursor:"pointer", padding:"0 5px", fontSize:18, fontWeight:"bold"}} 
                    onClick={() => handleDeleteGasto(g._fid)}
                  >×</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {orders.length > 0 && (
        <>
          <div style={{...s.title, fontSize:isMobile?14:16, marginTop:14}}>🔥 PEDIDOS ACTIVOS</div>
          {orders.slice(0,4).map(o => (
            <div key={o.id} style={s.card}>
              <div style={s.row}>
                <div>
                  <span style={{fontWeight:900, fontSize:isMobile?15:17}}>{o.orderType==="llevar" ? `🥡 ${o.table}` : `Mesa ${o.table}`}</span>
                  <span style={{...s.tag("#252525"), marginLeft:8, fontSize:10}}>{minutesAgo(o.createdAt)}</span>
                  {o.isPaid && <span style={{...s.tag("#1e5c2e"), marginLeft:6}}>✅ Pagado</span>}
                </div>
                <div style={{display:"flex", alignItems:"center", gap:8}}>
                  <span style={{color:Y, fontWeight:900}}>{fmt(o.total)}</span>
                  {o.isPaid ? (
                    <button style={{...s.btn("blue"), padding:isMobile?"6px 9px":"8px 12px"}} onClick={()=>finishPaidOrder(o.id)}>✅ Entregado</button>
                  ) : (
                    <button style={{...s.btn("success"), padding:isMobile?"6px 9px":"8px 12px"}} onClick={()=>setCobrarTarget({type:'existing', data:o})}>💰 Cobrar</button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {orders.length > 4 && <button style={{...s.btn("secondary"), marginTop:4}} onClick={()=>setTab("pedidos")}>Ver todos ({orders.length}) →</button>}
        </>
      )}
    </div>
  );
}

function MesasComponent({ orders, setDraft, newDraft, setTab, setMesaModal, finishPaidOrder, setCobrarTarget, setEditingOrder, printOrder, cancelOrder, isMobile, s, Y, fmt, MESAS }) {
  const llevarOrders = orders.filter(o => o.orderType==="llevar");
  return (
    <div>
      <div style={{...s.row, marginBottom:14}}>
        <div style={s.title}>🪑 MESAS</div>
        <button style={s.btn()} onClick={() => { setDraft({...newDraft(), orderType:"llevar", payTiming:"ahora"}); setTab("nuevo"); }}>🥡 Para llevar</button>
      </div>
      <div style={{display:"grid", gridTemplateColumns:isMobile?"1fr 1fr":"repeat(3, 1fr)", gap:12, marginBottom:20}}>
        {MESAS.map(num => {
          const mesaOrders = orders.filter(o => o.table===String(num) && o.orderType!=="llevar");
          const ocupada = mesaOrders.length > 0;
          const total = mesaOrders.reduce((sum,o) => sum + o.total, 0);
          return (
            <div key={num} onClick={() => setMesaModal(num)} style={{background:ocupada?`${Y}15`:"#1c1c1c", border:`2px solid ${ocupada?Y:"#2a2a2a"}`, borderRadius:14, padding:16, cursor:"pointer", textAlign:"center", transition:"all .2s", position:"relative"}}>
              {ocupada && <div style={{position:"absolute", top:8, right:8, width:10, height:10, borderRadius:"50%", background:"#27ae60"}}/>}
              <div style={{fontSize:36, marginBottom:6}}>🪑</div>
              <div style={{fontFamily:"'Bebas Neue',cursive", fontSize:22, color:ocupada?Y:"#555", letterSpacing:1}}>MESA {num}</div>
              <div style={{fontSize:11, color:ocupada?"#aaa":"#444", marginTop:4}}>{ocupada?`${mesaOrders.length} pedido${mesaOrders.length>1?"s":""} · ${fmt(total)}`:"Libre"}</div>
            </div>
          );
        })}
      </div>
      {llevarOrders.length > 0 && (
        <div>
          <div style={{...s.title, fontSize:16}}>🥡 PARA LLEVAR ({llevarOrders.length})</div>
          {llevarOrders.map(o => (
            <div key={o.id} style={{...s.card, borderLeft:`4px solid #3498db`}}>
              <div style={s.row}>
                <div><span style={{fontWeight:900}}>🥡 {o.table}</span>{o.isPaid&&<span style={{...s.tag("#1e5c2e"), marginLeft:6}}>✅ Pagado</span>}</div>
                <span style={{color:Y, fontWeight:900}}>{fmt(o.total)}</span>
              </div>
              <div style={{display:"flex", gap:6, marginTop:8, flexWrap:"wrap"}}>
                {o.isPaid ? (
                  <button style={{...s.btn("blue"), flex:1}} onClick={() => finishPaidOrder(o.id)}>✅ Entregado</button>
                ) : (
                  <button style={{...s.btn("success"), flex:1}} onClick={() => setCobrarTarget({type:'existing', data:o})}>💰 Cobrar</button>
                )}
                <button style={{...s.btn("warn"), flex:1}} onClick={() => setEditingOrder(o)}>✏️ Editar</button>
                <button style={s.btn("secondary")} onClick={() => printOrder(o)}>🖨️</button>
                <button style={{...s.btn("danger"), padding:"7px 10px"}} onClick={() => cancelOrder(o.id)}>❌</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MesaModalComponent({ num, orders, setDraft, newDraft, onClose, setTab, finishPaidOrder, setCobrarTarget, setEditingOrder, printOrder, isMobile, s, Y, fmt }) {
  const mesaOrders = orders.filter(o => o.table===String(num) && o.orderType!=="llevar");
  return (
    <div style={s.modal} onClick={e => e.stopPropagation()}>
      <div style={{...s.row, marginBottom:14}}>
        <div style={{color:Y, fontFamily:"'Bebas Neue',cursive", fontSize:22}}>🪑 MESA {num}</div>
        <button style={{...s.btn("secondary"), padding:"4px 10px"}} onClick={onClose}>✕</button>
      </div>
      {mesaOrders.length === 0
        ? <div style={{textAlign:"center", padding:30, color:"#555"}}><div style={{fontSize:32}}>🟢</div><div style={{marginTop:8}}>Mesa libre</div></div>
        : mesaOrders.map(o => (
          <div key={o.id} style={{...s.card, borderLeft:`3px solid ${Y}`}}>
            <div style={s.row}>
              <div><span style={{fontSize:12, color:"#888"}}>{minutesAgo(o.createdAt)}</span>{o.isPaid&&<span style={{...s.tag("#1e5c2e"), marginLeft:6}}>✅ Pagado</span>}</div>
              <span style={{color:Y, fontWeight:900}}>{fmt(o.total)}</span>
            </div>
            <div style={{margin:"8px 0"}}>
              {o.items.map((item,i) => (
                <div key={i} style={{marginBottom:4}}>
                  <div style={{display:"flex", justifyContent:"space-between", fontSize:13, padding:"3px 0", borderBottom:"1px solid #222"}}>
                    <span>{item.qty}x {item.name}</span>
                    <span style={{color:"#888"}}>{fmt(item.price*item.qty)}</span>
                  </div>
                  {item.itemNotes && <div style={{fontSize:11, color:"#999", fontStyle:"italic", paddingLeft:4, marginTop:2}}>└ {item.itemNotes}</div>}
                </div>
              ))}
            </div>
            {o.notes && <div style={{fontSize:11, color:"#888", fontStyle:"italic", marginBottom:8}}>📝 {o.notes}</div>}
            <div style={{display:"flex", gap:6, flexWrap:"wrap"}}>
              {o.isPaid ? (
                <button style={{...s.btn("blue"), flex:1}} onClick={() => { finishPaidOrder(o.id); onClose(); }}>✅ Finalizar</button>
              ) : (
                <button style={{...s.btn("success"), flex:1}} onClick={() => { setCobrarTarget({type:'existing', data:o}); onClose(); }}>💰 Cobrar</button>
              )}
              <button style={{...s.btn("warn"), flex:1}} onClick={() => { setEditingOrder(o); onClose(); }}>✏️ Editar</button>
              <button style={s.btn("secondary")} onClick={() => printOrder(o)}>🖨️</button>
            </div>
          </div>
        ))
      }
      <button style={{...s.btn(), width:"100%", padding:12, marginTop:8}}
        onClick={() => { setDraft({...newDraft(), table:String(num), orderType:"mesa"}); onClose(); setTab("nuevo"); }}>
        + Agregar pedido a Mesa {num}
      </button>
    </div>
  );
}

function PedidosComponent({ orders, setTab, finishPaidOrder, setCobrarTarget, setEditingOrder, printOrder, cancelOrder, setConfirmDelete, isMobile, s, Y, fmt }) {
  return (
    <div>
      <div style={{...s.row, marginBottom:14}}>
        <div style={s.title}>🍽️ PEDIDOS ACTIVOS ({orders.length})</div>
        <button style={s.btn()} onClick={() => setTab("nuevo")}>+ Nuevo</button>
      </div>
      {orders.length === 0
        ? <div style={{textAlign:"center", padding:60, color:"#444"}}><div style={{fontSize:48}}>🕐</div><div>Sin pedidos activos</div></div>
        : orders.map(o => (
          <div key={o.id} style={{...s.card, borderLeft:`4px solid ${Y}`}}>
            <div style={{...s.row, marginBottom:8}}>
              <div>
                <span style={{fontFamily:"'Bebas Neue',cursive", fontSize:isMobile?18:22}}>{o.orderType==="llevar" ? `🥡 ${o.table}` : `Mesa ${o.table}`}</span>
                {o.isPaid && <span style={{...s.tag("#1e5c2e"), marginLeft:8}}>✅ Pagado</span>}
              </div>
              <span style={{color:Y, fontWeight:900, fontSize:isMobile?16:19}}>{fmt(o.total)}</span>
            </div>
            <div style={{color:"#666", fontSize:11, marginBottom:8}}>🕐 {timeStr(o.createdAt)} · {minutesAgo(o.createdAt)}</div>
            <div style={{marginBottom:8}}>
              {o.items.map((item,i) => (
                <div key={i} style={{marginBottom:4}}>
                  <div style={{display:"flex", justifyContent:"space-between", fontSize:isMobile?12:13, padding:"3px 0", borderBottom:"1px solid #222"}}>
                    <span>{item.qty}x {item.name}</span>
                    <span style={{color:"#888"}}>{fmt(item.price*item.qty)}</span>
                  </div>
                  {item.itemNotes && <div style={{fontSize:11, color:"#999", fontStyle:"italic", paddingLeft:4, marginTop:2}}>└ {item.itemNotes}</div>}
                </div>
              ))}
            </div>
            {o.notes && <div style={{fontSize:11, color:"#888", fontStyle:"italic", marginBottom:8}}>📝 Nota general: {o.notes}</div>}
            <div style={{display:"flex", gap:6, flexWrap:"wrap"}}>
              {o.isPaid ? (
                <button style={{...s.btn("blue"), flex:1, minWidth:isMobile?0:90}} onClick={() => finishPaidOrder(o.id)}>✅ Entregado</button>
              ) : (
                <button style={{...s.btn("success"), flex:1, minWidth:isMobile?0:90}} onClick={() => setCobrarTarget({type:'existing', data:o})}>💰 Cobrar</button>
              )}
              <button style={{...s.btn("warn"), flex:1, minWidth:isMobile?0:80}} onClick={() => setEditingOrder(o)}>✏️ Editar</button>
              <button style={s.btn("secondary")} onClick={() => printOrder(o)}>🖨️</button>
              <button style={{...s.btn("danger"), padding:isMobile?"7px 10px":"8px 12px"}} onClick={() => cancelOrder(o.id)}>❌</button>
              <button style={{...s.btn("secondary"), padding:isMobile?"7px 10px":"8px 12px"}} onClick={() => setConfirmDelete(o.id)}>🗑️</button>
            </div>
          </div>
        ))
      }
    </div>
  );
}

function HistorialComponent({ history, isMobile, s, Y, fmt, getPay }) {
  const [expandedDays, setExpandedDays] = useState([new Date().toLocaleDateString("es-PE")]);
  const [histDate, setHistDate] = useState("");

  const historyByDay = {};
  history.forEach(o => {
    const dateObj = new Date(o.createdAt);
    const dateStr = dateObj.toLocaleDateString("es-PE");
    const sortKey = dateObj.getFullYear() + "-" + String(dateObj.getMonth()+1).padStart(2,'0') + "-" + String(dateObj.getDate()).padStart(2,'0');
    
    if (!historyByDay[dateStr]) {
      historyByDay[dateStr] = { date: dateStr, sortKey, orders: [], total: 0, ef: 0, ya: 0, ta: 0, cancelados: 0 };
    }
    historyByDay[dateStr].orders.push(o);
    
    if (o.status === "pagado") {
      historyByDay[dateStr].total += o.total;
      historyByDay[dateStr].ef += getPay(o, "efectivo");
      historyByDay[dateStr].ya += getPay(o, "yape");
      historyByDay[dateStr].ta += getPay(o, "tarjeta");
    } else if (o.status === "cancelado") {
      historyByDay[dateStr].cancelados += 1;
    }
  });

  let daysList = Object.values(historyByDay).sort((a,b) => b.sortKey.localeCompare(a.sortKey));
  
  if (histDate) {
    daysList = daysList.filter(d => d.sortKey === histDate);
  }

  const toggleDay = (dateStr) => {
    setExpandedDays(prev => prev.includes(dateStr) ? prev.filter(d => d !== dateStr) : [...prev, dateStr]);
  };

  return (
    <div>
      <div style={{...s.row, marginBottom:14}}>
        <div style={{...s.title, marginBottom:0}}>📋 HISTORIAL POR DÍAS</div>
        <div style={{display:"flex", gap:6}}>
          <input 
            type="date" 
            style={{...s.input, padding:"6px 10px", width:"auto"}} 
            value={histDate} 
            onChange={e => {
              const val = e.target.value;
              setHistDate(val);
              const match = Object.values(historyByDay).find(x => x.sortKey === val);
              if (match && !expandedDays.includes(match.date)) {
                 setExpandedDays(prev => [...prev, match.date]);
              }
            }} 
          />
          {histDate && <button style={s.btn("secondary")} onClick={()=>{setHistDate("");}}>✕</button>}
        </div>
      </div>
      {daysList.length === 0
        ? <div style={{textAlign:"center", padding:60, color:"#444"}}><div style={{fontSize:48}}>📋</div><div>Sin registros</div></div>
        : daysList.map(d => {
          const isExpanded = expandedDays.includes(d.date); 
          return (
            <div key={d.date} style={{...s.card, marginBottom:12, padding:0, overflow:"hidden"}}>
              <div style={{padding:"14px", display:"flex", justifyContent:"space-between", alignItems:"center", cursor:"pointer", background: isExpanded ? "#222" : "transparent"}} onClick={() => toggleDay(d.date)}>
                <div>
                  <div style={{fontWeight:900, fontSize:16, color:Y}}>📅 {d.date}</div>
                  <div style={{fontSize:11, color:"#888", marginTop:4}}>
                    {d.orders.filter(x => x.status==="pagado").length} cobrados {d.cancelados > 0 && `· ${d.cancelados} anulados`}
                  </div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontWeight:900, fontSize:18, color:"#27ae60"}}>{fmt(d.total)}</div>
                  <div style={{fontSize:10, color:"#aaa", marginTop:2}}>{isExpanded ? "▲ Ocultar" : "▼ Detalles"}</div>
                </div>
              </div>

              {isExpanded && (
                <div style={{padding:"14px", borderTop:"1px solid #333"}}>
                  <div style={{display:"flex", gap:8, marginBottom:16, background:"#0a0a0a", padding:12, borderRadius:8, flexWrap:"wrap", border:"1px solid #222"}}>
                    <div style={{flex:1, minWidth:70}}><span style={{color:"#888", fontSize:10, display:"block"}}>EFECTIVO</span><span style={{color:"#27ae60", fontWeight:900}}>💵 {fmt(d.ef)}</span></div>
                    <div style={{flex:1, minWidth:70}}><span style={{color:"#888", fontSize:10, display:"block"}}>YAPE</span><span style={{color:"#8e44ad", fontWeight:900}}>💜 {fmt(d.ya)}</span></div>
                    <div style={{flex:1, minWidth:70}}><span style={{color:"#888", fontSize:10, display:"block"}}>TARJETA</span><span style={{color:"#2980b9", fontWeight:900}}>💳 {fmt(d.ta)}</span></div>
                  </div>

                  {d.orders.map((o,idx) => {
                    const pe = getPay(o, "efectivo");
                    const py = getPay(o, "yape");
                    const pt = getPay(o, "tarjeta");
                    return (
                      <div key={o._fid||o.id||idx} style={{marginBottom:10, paddingBottom:10, borderBottom:"1px solid #2a2a2a", opacity:o.status==="cancelado"?0.5:1}}>
                        <div style={{...s.row, marginBottom:4}}>
                          <div>
                            <span style={{fontWeight:800, fontSize:13}}>{o.orderType==="llevar" ? `🥡 ${o.table}` : `Mesa ${o.table}`}</span>
                            <span style={{...s.tag(o.status==="pagado" ? "#1e5c2e" : "#5c1e1e"), marginLeft:8}}>{o.status==="pagado" ? "✅ Pagado" : "❌ Anulado"}</span>
                          </div>
                          <span style={{color:Y, fontWeight:900, fontSize:14}}>{fmt(o.total)}</span>
                        </div>
                        <div style={{display:"flex", justifyContent:"space-between", marginBottom:6}}>
                          <div style={{color:"#666", fontSize:11}}>
                            {timeStr(o.paidAt || o.cancelledAt || o.createdAt)} 
                            {o.status === "pagado" && ` · ${[pe>0&&`Efe: ${fmt(pe)}`, py>0&&`Yap: ${fmt(py)}`, pt>0&&`Tar: ${fmt(pt)}`].filter(Boolean).join(" | ")}`}
                          </div>
                        </div>
                        <div style={{marginTop:6}}>
                          {o.items.map((item,i) => (
                            <div key={i} style={{fontSize:11, color:"#ccc", paddingLeft:4, borderLeft:`2px solid ${Y}44`, marginBottom:2}}>
                              {item.qty}x {item.name} {item.itemNotes ? <span style={{color:Y, fontStyle:"italic"}}> (📝 {item.itemNotes})</span> : ""}
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          );
        })
      }
    </div>
  );
}

function CartaComponent({ menu, cartaCatFilter, setCartaCatFilter, showAdd, setShowAdd, newItem, setNewItem, addMenuItem, deleteMenuItem, isMobile, s, Y, fmt, ALL_CATS }) {
  return (
    <div>
      <div style={{...s.row, marginBottom:14}}>
        <div style={s.title}>🍔 CARTA ({menu.length})</div>
        <button style={s.btn()} onClick={() => setShowAdd(!showAdd)}>{showAdd ? "✕ Cancelar" : "+ Agregar"}</button>
      </div>
      {showAdd && (
        <div style={{...s.cardHL, marginBottom:14}}>
          <div style={{fontWeight:800, color:Y, marginBottom:10}}>Nuevo platillo</div>
          <div style={{display:"grid", gridTemplateColumns:isMobile?"1fr":"2fr 1fr 1fr", gap:8, marginBottom:10}}>
            <input style={s.input} placeholder="Nombre del platillo" value={newItem.name} onChange={e => setNewItem(f => ({...f, name:e.target.value}))}/>
            <select style={s.input} value={newItem.cat} onChange={e => setNewItem(f => ({...f, cat:e.target.value}))}>
              {ALL_CATS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input style={s.input} type="number" placeholder="Precio S/." value={newItem.price} onChange={e => setNewItem(f => ({...f, price:e.target.value}))}/>
          </div>
          <button style={s.btn()} onClick={addMenuItem}>Guardar Platillo</button>
        </div>
      )}
      <div style={{display:"flex", gap:4, flexWrap:"wrap", marginBottom:10}}>
        {["Todos",...ALL_CATS].map(c => (
          <button key={c} style={{...s.btn(cartaCatFilter===c ? "primary" : "secondary"), fontSize:isMobile?9:10, padding:isMobile?"3px 6px":"4px 9px"}} onClick={() => setCartaCatFilter(c)}>{c}</button>
        ))}
      </div>
      {menu.filter(i => cartaCatFilter==="Todos" || i.cat===cartaCatFilter).map(item => (
        <div key={item.id} style={{...s.card, marginBottom:5, padding:isMobile?"8px 10px":"9px 12px"}}>
          <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
            <div>
              <span style={{marginRight:6}}>{item.icon}</span>
              <span style={{fontWeight:700, fontSize:isMobile?13:14}}>{item.name}</span>
            </div>
            <div style={{display:"flex", alignItems:"center", gap:10}}>
              <span style={{color:Y, fontWeight:900}}>{fmt(item.price)}</span>
              {item.id.startsWith("CUSTOM_") && (
                <button style={{...s.btn("danger"), padding:"2px 7px", fontSize:11}} onClick={() => deleteMenuItem(item.id)}>✕</button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function CocinaComponent({ orders, kitchenChecks, setKitchenChecks, isMobile, isDesktop, s, Y }) {
  const sorted = [...orders].sort((a,b) => new Date(a.createdAt) - new Date(b.createdAt));
  
  const toggleCheck = (orderId, itemIdx, maxQty) => { 
    setKitchenChecks(prev => { 
      const oc = prev[orderId] || {}; 
      const curr = Number(oc[itemIdx]) || (oc[itemIdx] === true ? maxQty : 0);
      let next = curr + 1;
      if (next > maxQty) next = 0;
      return {...prev, [orderId]:{...oc, [itemIdx]: next}}; 
    }); 
  };
  
  const allDone = (order) => { 
    const c = kitchenChecks[order.id] || {}; 
    return order.items.every((item, i) => (Number(c[i]) || (c[i] === true ? item.qty : 0)) === item.qty); 
  };
  
  if(sorted.length === 0) return <div style={{textAlign:"center", padding:60, color:"#444"}}><div style={{fontSize:56}}>👨‍🍳</div><div style={{marginTop:12, fontSize:16}}>Sin pedidos en cocina</div></div>;
  return (
    <div>
      <div style={{...s.row, marginBottom:14}}>
        <div style={s.title}>👨‍🍳 COCINA — {sorted.length} pedido{sorted.length!==1?"s":""}</div>
      </div>
      <div style={{display:"grid", gridTemplateColumns:isDesktop?"1fr 1fr":"1fr", gap:12}}>
        {sorted.map((order,priority) => {
          const checks = kitchenChecks[order.id] || {};
          const done = allDone(order);
          
          const totalPortions = order.items.reduce((sum, item) => sum + item.qty, 0);
          const donePortions = order.items.reduce((sum, item, i) => sum + (Number(checks[i]) || (checks[i] === true ? item.qty : 0)), 0);
          
          const mins = Math.floor((Date.now() - new Date(order.createdAt))/60000);
          const urgent = mins >= 15 && !done;
          const warn = mins >= 8 && mins < 15 && !done;
          
          return (
            <div key={order.id} style={{background:done?"#0d1f0d":urgent?"#1f0d0d":warn?"#1f180d":"#1c1c1c", borderRadius:14, border:`2px solid ${done?"#27ae60":urgent?"#e74c3c":warn?"#e67e22":Y}`, padding:14, position:"relative", transition:"all .3s"}}>
              <div style={{position:"absolute", top:-10, left:14, background:done?"#27ae60":urgent?"#e74c3c":warn?"#e67e22":Y, color:done||urgent||warn?"#fff":"#111", borderRadius:20, padding:"2px 10px", fontSize:11, fontWeight:900}}>
                {done?"✅ LISTO":`#${priority+1} · ${mins<1?"ahora":`${mins}m`}`}
              </div>
              {order.isPaid && <div style={{position:"absolute", top:-10, right:14, background:"#2980b9", color:"#fff", borderRadius:20, padding:"2px 10px", fontSize:11, fontWeight:900}}>✅ PAGADO</div>}
              <div style={{...s.row, marginBottom:10, marginTop:6}}>
                <span style={{fontFamily:"'Bebas Neue',cursive", fontSize:22, color:done?"#27ae60":urgent?"#e74c3c":warn?"#e67e22":Y}}>{order.orderType==="llevar"?`🥡 ${order.table}`:`Mesa ${order.table}`}</span>
              </div>
              <div style={{background:"#2a2a2a", borderRadius:4, height:5, marginBottom:12, overflow:"hidden"}}>
                <div style={{background:done?"#27ae60":Y, height:"100%", width:`${totalPortions > 0 ? (donePortions/totalPortions)*100 : 0}%`, transition:"width .3s"}}/>
              </div>
              {order.items.map((item,i) => {
                const doneQty = Number(checks[i]) || (checks[i] === true ? item.qty : 0);
                const isDone = doneQty === item.qty;
                
                return (
                  <div key={i} onClick={() => toggleCheck(order.id, i, item.qty)} style={{display:"flex", alignItems:"center", gap:10, padding:"9px 10px", marginBottom:5, borderRadius:8, background:isDone?"#0a2a0a":"#252525", border:`1px solid ${isDone?"#27ae6055":"#333"}`, cursor:"pointer", transition:"all .2s", opacity:isDone?0.6:1}}>
                    <div style={{minWidth:26, height:26, borderRadius:6, border:`2px solid ${isDone?"#27ae60":"#555"}`, background:isDone?"#27ae60":"transparent", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, fontSize:13, transition:"all .2s", color:isDone?"#fff":"#aaa", fontWeight:"bold", padding:"0 4px"}}>
                      {item.qty > 1 ? `${doneQty}/${item.qty}` : (isDone ? "✓" : "")}
                    </div>
                    <div style={{flex:1}}>
                      <span style={{fontWeight:800, fontSize:isMobile?13:15, textDecoration:isDone?"line-through":"none", color:isDone?"#555":"#eee"}}>
                        {item.qty>1&&<span style={{color:Y, marginRight:4}}>{item.qty}×</span>}
                        {item.name}
                      </span>
                      {item.itemNotes && <div style={{fontSize:11, color:Y, marginTop:3, fontStyle:"italic"}}>📝 {item.itemNotes}</div>}
                    </div>
                  </div>
                )
              })}
              {order.notes && <div style={{marginTop:8, padding:"8px 10px", background:"#1a1500", borderRadius:8, border:"1px solid #3a3000", fontSize:12, color:"#e6c200"}}>📝 General: {order.notes}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  APP PRINCIPAL
// ═══════════════════════════════════════════════════════════════════
export default function App() {
  const width     = useWindowWidth();
  const isMobile  = width < 480;
  const isTablet  = width >= 480 && width < 768;
  const isDesktop = width >= 768;
  const isWide    = width >= 1024;

  const [tab,            setTab]            = useState("dashboard");
  const [orders,         setOrders]         = useState([]);
  const [history,        setHistory]        = useState([]);
  const [gastos,         setGastos]         = useState([]);
  const [menu,           setMenu]           = useState(MENU_BASE);
  const [draft,          setDraft]          = useState(newDraft());
  const [cartaCatFilter, setCartaCatFilter] = useState("Todos");
  const [showAdd,        setShowAdd]        = useState(false);
  const [newItem,        setNewItem]        = useState({ name:"", cat:"Hamburguesas", price:"" });
  const [loaded,         setLoaded]         = useState(false);
  const [splash,         setSplash]         = useState(true);
  const [toast,          setToast]          = useState(null);
  
  const [editingOrder,  setEditingOrder]  = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [mesaModal,     setMesaModal]     = useState(null);
  const [kitchenChecks, setKitchenChecks] = useState({});
  const [cobrarTarget,  setCobrarTarget]  = useState(null);

  useEffect(() => { const t=setTimeout(()=>setSplash(false),2200); return()=>clearTimeout(t); }, []);

  // Sincronización en tiempo real
  useEffect(() => {
    let unsubOrders, unsubHistory, unsubMenu, unsubGastos;

    const setupListeners = () => {
      unsubOrders = onSnapshot(FS.ordersRef(), (docSnap) => {
        if (docSnap.exists()) setOrders(docSnap.data().list || []);
        else setOrders([]);
      });

      unsubMenu = onSnapshot(FS.menuRef(), (docSnap) => {
        if (docSnap.exists()) setMenu([...MENU_BASE, ...(docSnap.data().list || [])]);
        else setMenu(MENU_BASE);
      });

      const q = query(FS.historyCol(), orderBy("createdAt", "desc"), limit(1000));
      unsubHistory = onSnapshot(q, (snapshot) => {
        const hist = snapshot.docs.map(d => ({ _fid: d.id, ...d.data() }));
        setHistory(hist);
      });

      const qGastos = query(FS.gastosCol(), orderBy("createdAt", "desc"), limit(200));
      unsubGastos = onSnapshot(qGastos, (snapshot) => {
        setGastos(snapshot.docs.map(d => ({ _fid: d.id, ...d.data() })));
      });

      setLoaded(true);
    };

    setupListeners();

    return () => {
      if (unsubOrders) unsubOrders();
      if (unsubHistory) unsubHistory();
      if (unsubMenu) unsubMenu();
      if (unsubGastos) unsubGastos();
    };
  }, []);

  const showToast = (msg,color="#27ae60") => { setToast({msg,color}); setTimeout(()=>setToast(null),2800); };
  
  const saveOrders = async (v) => { await FS.saveOrders(v); };
  const saveMenu   = async (v) => { setMenu(v); await FS.saveMenu(v.filter(i=>i.id.startsWith("CUSTOM_"))); };

  const addItem = (item) => setDraft(d => {
    const ex = d.items.find(i=>i.id===item.id);
    return ex
      ? {...d,items:d.items.map(i=>i.id===item.id?{...i,qty:i.qty+1}:i)}
      : {...d,items:[...d.items,{...item,qty:1,itemNotes:""}]};
  });
  const changeQty = (id,delta) => setDraft(d => ({
    ...d,items:d.items.map(i=>i.id===id?{...i,qty:i.qty+delta}:i).filter(i=>i.qty>0),
  }));
  const updateItemNotes = (id,itemNotes) => setDraft(d => ({
    ...d,items:d.items.map(i=>i.id===id?{...i,itemNotes}:i),
  }));
  const draftTotal = draft.items.reduce((s,i)=>s+i.price*i.qty,0);

  const submitOrder = async () => {
    if (!draft.table.trim()||!draft.items.length) return;
    const taperNum = Number(draft.taperCost) || 0;
    const total = draftTotal + taperNum;
    
    if (draft.payTiming === "ahora") {
      setCobrarTarget({ type: 'new', data: { id:Date.now().toString(), ...draft, total, createdAt:new Date().toISOString() } });
    } else {
      const order = { id:Date.now().toString(), ...draft, total, isPaid: false, status:"pendiente", createdAt:new Date().toISOString() };
      setOrders(prev => [...prev, order]); 
      await saveOrders([...orders,order]);
      setDraft(newDraft());
      showToast(`📝 Pedido enviado a cocina`);
      setTab("pedidos");
    }
  };

  const handleConfirmCobro = async (payments) => {
    if (!cobrarTarget) return;
    const target = cobrarTarget;
    setCobrarTarget(null);

    if (target.type === 'new') {
      const order = { ...target.data, isPaid: true, status: "pendiente", payments, paidAt: new Date().toISOString() };
      setOrders(prev => [...prev, order]); 
      await saveOrders([...orders, order]);
      setDraft(newDraft());
      showToast("✅ Pedido cobrado y enviado a cocina");
      setTab("pedidos");
    } 
    else if (target.type === 'existing') {
      const o = target.data;
      if (!orders.find(x => x.id === o.id)) return;

      const newOrders = orders.filter(x => x.id !== o.id);
      setOrders(newOrders); 

      const finished = { ...o, isPaid: true, status: "pagado", payments, paidAt: new Date().toISOString() };
      await Promise.all([
        FS.addHistory(finished),
        saveOrders(newOrders)
      ]);
      showToast("💰 Pedido cobrado y archivado");
    }
  };

  const finishPaidOrder = async (id) => {
    const o = orders.find(x=>x.id===id); if (!o) return;
    const newOrders = orders.filter(x=>x.id!==id);
    setOrders(newOrders); 

    const finished = { ...o, status: "pagado" }; 
    await Promise.all([
      FS.addHistory(finished),
      saveOrders(newOrders)
    ]);
    showToast("✅ Pedido entregado y archivado");
  };

  const cancelOrder = async (id) => {
    const o = orders.find(x=>x.id===id); if (!o) return;
    const newOrders = orders.filter(x=>x.id!==id);
    setOrders(newOrders); 

    const finished = {...o,status:"cancelado",cancelledAt:new Date().toISOString(),createdAt:o.createdAt||new Date().toISOString()};
    await Promise.all([
      FS.addHistory(finished),
      saveOrders(newOrders)
    ]);
    showToast("❌ Pedido cancelado","#e74c3c");
  };

  const deleteOrderPermanent = async (id) => {
    const newOrders = orders.filter(x=>x.id!==id);
    setOrders(newOrders); 
    await saveOrders(newOrders);
    setConfirmDelete(null); showToast("🗑️ Pedido eliminado","#888");
  };

  const saveEditedOrder = async (updated) => {
    setOrders(prev => prev.map(o=>o.id===updated.id?updated:o)); 
    await saveOrders(orders.map(o=>o.id===updated.id?updated:o));
    setEditingOrder(null); showToast(`✏️ Pedido actualizado`,"#f39c12");
  };

  const addMenuItem = async () => {
    if (!newItem.name.trim()||!newItem.price) return;
    const item = {id:"CUSTOM_"+Date.now(),cat:newItem.cat,icon:"⭐",name:newItem.name,price:parseFloat(newItem.price),desc:""};
    await saveMenu([...menu,item]);
    setNewItem({name:"",cat:"Hamburguesas",price:""}); setShowAdd(false);
    showToast(`⭐ "${item.name}" agregado`);
  };
  const deleteMenuItem = async (id) => { await saveMenu(menu.filter(i=>i.id!==id)); showToast("🗑️ Platillo eliminado","#e74c3c"); };

  const handleAddGasto = async (descripcion, monto) => {
    if (!descripcion.trim() || !monto) return;
    await FS.addGasto({ descripcion, monto: Number(monto), createdAt: new Date().toISOString() });
    showToast("💸 Gasto registrado", "#e74c3c");
  };

  const handleDeleteGasto = async (id) => {
    await FS.deleteGasto(id);
    showToast("🗑️ Gasto eliminado", "#888");
  };

  if (splash) return (
    <div style={{background:"#111",height:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:20}}>
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Nunito:wght@400;700;900&display=swap" rel="stylesheet"/>
      <div style={{fontSize:90}}>🍔</div>
      <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:36,color:"#FFD700",letterSpacing:4}}>MR. PAPACHOS</div>
      <div style={{fontFamily:"'Nunito',sans-serif",color:"#555",fontSize:13,letterSpacing:3,textTransform:"uppercase"}}>Cajamarca</div>
    </div>
  );

  if (!loaded) return (
    <div style={{background:"#111",color:"#FFD700",height:"100vh",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"sans-serif"}}>
      <div style={{textAlign:"center"}}><div style={{fontSize:52}}>🍔</div><div style={{marginTop:12,fontWeight:700,letterSpacing:2}}>Cargando...</div></div>
    </div>
  );

  const Y = "#FFD700";
  const s = {
    app:     {fontFamily:"'Nunito',sans-serif",background:"#0f0f0f",color:"#eee",minHeight:"100vh",display:"flex",flexDirection:"column"},
    header:  {background:`linear-gradient(135deg,${Y} 0%,#e6b800 100%)`,color:"#111",padding:isMobile?"8px 12px":"10px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",boxShadow:"0 2px 12px rgba(255,215,0,.3)"},
    logo:    {fontFamily:"'Bebas Neue',cursive",fontSize:isMobile?17:isTablet?22:28,letterSpacing:isMobile?1:3,margin:0,lineHeight:1.1},
    nav:     {display:"flex",background:"#1a1a1a",borderBottom:`2px solid ${Y}33`,overflowX:"auto",scrollbarWidth:"none"},
    navBtn:  (a)=>({padding:isMobile?"9px 7px":"10px 14px",background:a?Y:"transparent",color:a?"#111":"#999",border:"none",cursor:"pointer",fontFamily:"'Nunito',sans-serif",fontWeight:700,fontSize:isMobile?9:12,whiteSpace:"nowrap",transition:"all .2s",borderBottom:a?`3px solid #e6b800`:"3px solid transparent"}),
    content: {flex:1,padding:isMobile?"10px 8px":isTablet?14:20,maxWidth:isWide?1200:"100%",margin:"0 auto",width:"100%",boxSizing:"border-box"},
    card:    {background:"#1c1c1c",borderRadius:isMobile?10:12,padding:isMobile?10:14,marginBottom:10,border:"1px solid #2a2a2a"},
    cardHL:  {background:"#1c1c1c",borderRadius:isMobile?10:12,padding:isMobile?10:14,marginBottom:10,border:`1px solid ${Y}44`},
    statCard:{background:"#1c1c1c",borderRadius:isMobile?10:12,padding:isMobile?"12px 8px":"16px 12px",border:"1px solid #2a2a2a",textAlign:"center"},
    statNum: {fontSize:isMobile?22:28,fontWeight:900,color:Y,lineHeight:1},
    statLbl: {fontSize:isMobile?9:11,color:"#777",marginTop:5,textTransform:"uppercase",letterSpacing:1},
    btn:     (v="primary")=>({padding:isMobile?"7px 10px":"8px 14px",background:v==="primary"?Y:v==="danger"?"#c0392b":v==="success"?"#27ae60":v==="blue"?"#2980b9":v==="warn"?"#d35400":"#2a2a2a",color:v==="primary"?"#111":"#fff",border:"none",borderRadius:8,cursor:"pointer",fontWeight:800,fontSize:isMobile?11:12,fontFamily:"'Nunito',sans-serif",transition:"opacity .15s",whiteSpace:"nowrap"}),
    input:   {background:"#222",border:"1px solid #383838",borderRadius:8,padding:isMobile?"8px 10px":"9px 12px",color:"#eee",fontFamily:"'Nunito',sans-serif",fontSize:13,outline:"none",width:"100%",boxSizing:"border-box"},
    tag:     (bg, col)=>({display:"inline-block",padding:"2px 8px",borderRadius:10,fontSize:11,fontWeight:700,background:bg,color:col||"#eee"}),
    grid:    (cols)=>({display:"grid",gridTemplateColumns:`repeat(auto-fit, minmax(${cols}px,1fr))`,gap:isMobile?8:10}),
    row:     {display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8},
    title:   {color:Y,fontFamily:"'Bebas Neue',cursive",fontSize:isMobile?18:22,marginBottom:isMobile?10:14,letterSpacing:1},
    overlay: {position:"fixed",inset:0,background:"rgba(0,0,0,.85)",zIndex:200,display:"flex",alignItems:isMobile?"flex-end":"center",justifyContent:"center",padding:isMobile?0:16},
    modal:   {background:"#1a1a1a",border:`1px solid ${Y}44`,borderRadius:isMobile?"16px 16px 0 0":14,padding:isMobile?"16px 12px":20,width:"100%",maxWidth:isMobile?"100%":600,maxHeight:isMobile?"92vh":"88vh",overflowY:"auto"},
  };

  const tabs = [
    {id:"dashboard", label:isMobile?"📊":"📊 Inicio"},
    {id:"mesas",     label:isMobile?"🪑":"🪑 Mesas"},
    {id:"nuevo",     label:isMobile?"➕":"➕ Nuevo"},
    {id:"pedidos",   label:isMobile?`🍽️${orders.length>0?` ${orders.length}`:""}` : `🍽️ Pedidos${orders.length>0?` (${orders.length})`:""}`},
    {id:"cocina",    label:isMobile?`👨‍🍳${orders.length>0?` ${orders.length}`:""}` : `👨‍🍳 Cocina${orders.length>0?` (${orders.length})`:""}`},
    {id:"historial", label:isMobile?"📋":"📋 Historial"},
    {id:"inventario",label:isMobile?"📦":"📦 Inventario"},
    {id:"carta",     label:isMobile?"🍔":"🍔 Carta"},
  ];

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Nunito:wght@400;700;900&display=swap" rel="stylesheet"/>
      <div style={s.app}>
        <header style={s.header}>
          <div>
            <h1 style={s.logo}>🍔 MR. PAPACHOS · CAJAMARCA</h1>
            {!isMobile&&<div style={{fontSize:11,color:"#555",fontWeight:700}}>Sistema de Pedidos</div>}
          </div>
          {!isMobile&&<div style={{fontSize:11,color:"#333",fontWeight:700,textAlign:"right"}}>
            <div>{new Date().toLocaleDateString("es-PE",{weekday:"long",day:"numeric",month:"long"})}</div>
          </div>}
        </header>

        <nav style={s.nav}>
          {tabs.map(t=>(
            <button key={t.id} style={{...s.navBtn(tab===t.id),flex:isMobile?1:"none"}} onClick={()=>setTab(t.id)}>{t.label}</button>
          ))}
        </nav>

        {toast&&(
          <div style={{position:"fixed",bottom:isMobile ? 90 : 20,left:"50%",transform:"translateX(-50%)",background:toast.color,color:"#fff",padding:"10px 20px",borderRadius:12,fontWeight:800,zIndex:9999,fontSize:14,boxShadow:"0 4px 20px rgba(0,0,0,.5)",whiteSpace:"nowrap"}}>
            {toast.msg}
          </div>
        )}

        {cobrarTarget && (
          <div style={s.overlay} onClick={()=>setCobrarTarget(null)}>
            <CobrarModal 
              total={cobrarTarget.data.total} 
              onConfirm={handleConfirmCobro} 
              onClose={()=>setCobrarTarget(null)} 
              s={s} Y={Y} 
            />
          </div>
        )}

        {editingOrder&&(
          <div style={s.overlay} onClick={()=>setEditingOrder(null)}>
            <EditOrderModal order={editingOrder} onSave={saveEditedOrder} onClose={()=>setEditingOrder(null)} menu={menu} isMobile={isMobile} s={s} Y={Y}/>
          </div>
        )}
        {mesaModal&&(
          <div style={s.overlay} onClick={()=>setMesaModal(null)}>
            <MesaModalComponent num={mesaModal} orders={orders} setDraft={setDraft} newDraft={newDraft} onClose={()=>setMesaModal(null)} setTab={setTab} finishPaidOrder={finishPaidOrder} setCobrarTarget={setCobrarTarget} setEditingOrder={setEditingOrder} printOrder={printOrder} isMobile={isMobile} s={s} Y={Y} fmt={fmt} />
          </div>
        )}
        {confirmDelete&&(
          <div style={s.overlay} onClick={()=>setConfirmDelete(null)}>
            <div style={{...s.modal,maxWidth:340,textAlign:"center"}} onClick={e=>e.stopPropagation()}>
              <div style={{fontSize:42,marginBottom:12}}>🗑️</div>
              <div style={{fontWeight:900,fontSize:17,marginBottom:8,color:"#eee"}}>¿Eliminar pedido?</div>
              <div style={{color:"#888",fontSize:13,marginBottom:20}}>Esta acción no se puede deshacer.</div>
              <div style={{display:"flex",gap:10}}>
                <button style={{...s.btn("secondary"),flex:1}} onClick={()=>setConfirmDelete(null)}>Cancelar</button>
                <button style={{...s.btn("danger"),flex:1}} onClick={()=>deleteOrderPermanent(confirmDelete)}>🗑️ Eliminar</button>
              </div>
            </div>
          </div>
        )}

        <div style={s.content}>
          {tab==="dashboard"  && <DashboardComponent orders={orders} history={history} gastos={gastos} handleAddGasto={handleAddGasto} handleDeleteGasto={handleDeleteGasto} fmt={fmt} setTab={setTab} finishPaidOrder={finishPaidOrder} setCobrarTarget={setCobrarTarget} isMobile={isMobile} s={s} Y={Y} />}
          {tab==="mesas"      && <MesasComponent orders={orders} setDraft={setDraft} newDraft={newDraft} setTab={setTab} setMesaModal={setMesaModal} finishPaidOrder={finishPaidOrder} setCobrarTarget={setCobrarTarget} setEditingOrder={setEditingOrder} printOrder={printOrder} cancelOrder={cancelOrder} isMobile={isMobile} s={s} Y={Y} fmt={fmt} MESAS={MESAS} />}
          {tab==="nuevo"      && <NuevoPedidoComponent draft={draft} setDraft={setDraft} menu={menu} addItem={addItem} changeQty={changeQty} updateItemNotes={updateItemNotes} draftTotal={draftTotal} fmt={fmt} submitOrder={submitOrder} newDraft={newDraft} s={s} Y={Y} isDesktop={isDesktop} isMobile={isMobile} />}
          {tab==="pedidos"    && <PedidosComponent orders={orders} setTab={setTab} finishPaidOrder={finishPaidOrder} setCobrarTarget={setCobrarTarget} setEditingOrder={setEditingOrder} printOrder={printOrder} cancelOrder={cancelOrder} setConfirmDelete={setConfirmDelete} isMobile={isMobile} s={s} Y={Y} fmt={fmt} />}
          {tab==="cocina"     && <CocinaComponent orders={orders} kitchenChecks={kitchenChecks} setKitchenChecks={setKitchenChecks} isMobile={isMobile} isDesktop={isDesktop} s={s} Y={Y} />}
          {tab==="historial"  && <HistorialComponent history={history} isMobile={isMobile} s={s} Y={Y} fmt={fmt} getPay={getPay} />}
          {tab==="inventario" && <Inventario menu={menu} orders={orders} history={history} isMobile={isMobile} s={s} Y={Y} fmt={fmt}/>}
          {tab==="carta"      && <CartaComponent menu={menu} cartaCatFilter={cartaCatFilter} setCartaCatFilter={setCartaCatFilter} showAdd={showAdd} setShowAdd={setShowAdd} newItem={newItem} setNewItem={setNewItem} addMenuItem={addMenuItem} deleteMenuItem={deleteMenuItem} isMobile={isMobile} s={s} Y={Y} fmt={fmt} ALL_CATS={ALL_CATS} />}
        </div>
      </div>
    </>
  );
}