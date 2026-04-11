import { useState, useEffect, useRef } from "react";
import { initializeApp, getApps } from "firebase/app";
import {
  getFirestore, doc, setDoc, getDoc, collection, addDoc, query, orderBy, limit, onSnapshot
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

// ─── MOTOR MULTI-LOCAL ────────────────────────────────────────────────────────
const FS = (localId) => ({
  ordersRef:  () => doc(db, `mrpapachos_${localId}`, "orders"),
  menuRef:    () => doc(db, `mrpapachos_${localId}`, "customMenu"),
  historyCol: () => collection(db, `mrpapachos_${localId}_historial`),
  
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
  async addHistory(order) {
    try { await addDoc(this.historyCol(), order); } catch (e) { console.error(e); }
  }
});

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
const SALSAS_ALITAS = ["Clásica", "Maracuyá", "BBQ", "Picante", "Huancaina", "Mango Abanero", "Broaster", "Hawaiana", "Acevichada", "Maracumango", "Aguaimanto"];

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
//  ICONO DE MESA VECTORIAL (SVG) 
// ═══════════════════════════════════════════════════════════════════
const IconoMesa = ({ color, size }) => (
  <svg width={size} height={size * 0.75} viewBox="0 0 120 90" fill="none" xmlns="http://www.w3.org/2000/svg" 
       style={{ marginBottom: 10, filter: color !== "#ffffff" ? `drop-shadow(0px 0px 6px ${color}88)` : 'none' }}>
    {/* Silla Izquierda */}
    <rect x="5" y="30" width="15" height="30" rx="4" stroke={color} strokeWidth="3" />
    {/* Silla Derecha */}
    <rect x="100" y="30" width="15" height="30" rx="4" stroke={color} strokeWidth="3" />
    {/* Sillas Arriba */}
    <rect x="35" y="5" width="20" height="15" rx="4" stroke={color} strokeWidth="3" />
    <rect x="65" y="5" width="20" height="15" rx="4" stroke={color} strokeWidth="3" />
    {/* Sillas Abajo */}
    <rect x="35" y="70" width="20" height="15" rx="4" stroke={color} strokeWidth="3" />
    <rect x="65" y="70" width="20" height="15" rx="4" stroke={color} strokeWidth="3" />
    {/* Mesa Central */}
    <rect x="16" y="16" width="88" height="58" rx="8" fill="#1c1c1c" stroke={color} strokeWidth="4" />
  </svg>
);

// ═══════════════════════════════════════════════════════════════════
//  LOGIN SCREEN MULTI-LOCAL
// ═══════════════════════════════════════════════════════════════════
function LoginScreen({ onLogin, s, Y }) {
  const [selectedLocal, setSelectedLocal] = useState("amazonas");

  const roles = [
    { id: 'admin', icon: '👑', label: 'Administrador' },
    { id: 'cajero', icon: '💰', label: 'Cajero' },
    { id: 'mesero', icon: '📝', label: 'Mesero' },
    { id: 'cocinero', icon: '👨‍🍳', label: 'Cocina' }
  ];

  const locales = [
    { id: "amazonas", nombre: "Amazonas" },
    { id: "sanmartin", nombre: "San Martín" },
    { id: "belen", nombre: "Belén" }
  ];

  return (
    <div style={{background:"#111", height:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", color:"#fff"}}>
      <div style={{fontSize:60, marginBottom:10}}>🍔</div>
      <div style={{fontFamily:"'Bebas Neue',cursive", fontSize:32, color:Y, letterSpacing:2, marginBottom:20}}>MR. PAPACHOS</div>
      
      {/* Selector de Sucursal */}
      <div style={{marginBottom:30, textAlign:"center"}}>
        <label style={{fontSize:11, color:"#888", textTransform:"uppercase", letterSpacing:1, display:"block", marginBottom:8}}>Selecciona tu sucursal</label>
        <select 
          style={{...s.input, width:250, textAlign:"center", fontSize:16, fontWeight:700, border:`1px solid ${Y}55`}}
          value={selectedLocal}
          onChange={(e) => setSelectedLocal(e.target.value)}
        >
          {locales.map(loc => (
            <option key={loc.id} value={loc.id}>{loc.nombre}</option>
          ))}
        </select>
      </div>

      <div style={{fontSize:11, color:"#888", marginBottom:14, textTransform:"uppercase", letterSpacing:1}}>Ingresa tu rol</div>
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:16}}>
        {roles.map(r => (
          <button key={r.id} onClick={() => {
            const locName = locales.find(l => l.id === selectedLocal)?.nombre || selectedLocal;
            onLogin({ ...r, localId: selectedLocal, localName: locName });
          }} style={{...s.card, cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", padding:20, border:`1px solid #333`}}>
            <div style={{fontSize:32, marginBottom:10}}>{r.icon}</div>
            <div style={{fontWeight:800, fontSize:14}}>{r.label}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  MODAL CONFIGURADOR DE SALSAS
// ═══════════════════════════════════════════════════════════════════
function SalsasModalComponent({ initialSalsas = [], onSave, onClose, s, Y }) {
  const [selected, setSelected] = useState(initialSalsas);

  const toggleSalsa = (salsa) => {
    if (selected.find(x => x.name === salsa)) {
      setSelected(selected.filter(x => x.name !== salsa));
    } else {
      if (selected.length >= 4) return;
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
        <div style={{fontSize:24, marginBottom:10, color:Y, fontFamily:"'Bebas Neue',cursive", letterSpacing:1}}>
          🥫 ELEGIR SALSAS (Max. 4)
        </div>
        
        <div style={{ display:"flex", gap:6, marginTop:6, flexWrap:"wrap", marginBottom:16 }}>
          {SALSAS_ALITAS.map(salsa => {
            const isSelected = selected.find(x => x.name === salsa);
            return (
              <button key={salsa} 
                style={{...s.btn(isSelected ? "primary" : "secondary"), fontSize:11, opacity: (!isSelected && selected.length >= 4) ? 0.4 : 1}}
                onClick={() => toggleSalsa(salsa)} disabled={!isSelected && selected.length >= 4}>
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
          💾 Guardar Salsas
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  MODAL DIVIDIR CUENTA (SPLIT BILL)
// ═══════════════════════════════════════════════════════════════════
function SplitBillModal({ order, onProceed, onClose, s, Y, fmt }) {
  const [splitItems, setSplitItems] = useState(
    order.items.map(i => ({ ...i, splitQty: 0 }))
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
          <h2 style={{color:Y, fontFamily:"'Bebas Neue',cursive", margin:0, fontSize:24, letterSpacing:1}}>✂️ DIVIDIR CUENTA</h2>
          <button style={{...s.btn("secondary"), padding:"4px 10px"}} onClick={onClose}>✕</button>
        </div>
        
        <div style={{fontSize:12, color:"#aaa", marginBottom:16}}>
          Selecciona las cantidades que el cliente actual va a pagar. El resto se quedará en la cuenta de la mesa.
        </div>

        <div style={{maxHeight: 300, overflowY:"auto", marginBottom:16}}>
          {splitItems.map(item => (
            <div key={item.cartId} style={{display:"flex", alignItems:"center", justifyContent:"space-between", background:"#1a1a1a", padding:10, borderRadius:8, marginBottom:8, border:"1px solid #333"}}>
              <div style={{flex:1}}>
                <div style={{fontWeight:800, fontSize:13}}>{item.name} {item.isLlevar && "🥡"}</div>
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
          💵 Proceder a Cobrar S/. {splitTotal.toFixed(2)}
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  MODAL DE EDICIÓN
// ═══════════════════════════════════════════════════════════════════
function EditOrderModal({ order, onSave, onClose, menu, isMobile, s, Y }) {
  const [eTable,     setETable]     = useState(order.table);
  const [eItems,     setEItems]     = useState(order.items.map(i => ({ ...i, individualNotes: i.individualNotes || Array(i.qty).fill("") })));
  const [eNotes,     setENotes]     = useState(order.notes || "");
  const [ePhone,     setEPhone]     = useState(order.phone || "");
  const [eOrderType, setEOrderType] = useState(order.orderType || "mesa");
  const taperItem = eItems.find(i => i.id === "TAPER");
  const [eTaperCost, setETaperCost] = useState(taperItem ? 0 : (order.taperCost || 0));

  const [eCat,       setECat]       = useState("Todos");
  const [eSearch,    setESearch]    = useState("");
  const [salsasModal, setSalsasModal] = useState(null);

  const eTotal = eItems.reduce((sum, i) => sum + i.price * i.qty, 0) + (Number(eTaperCost) || 0);

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
    if (eTaperCost > 0 && !taperItem) {
      finalItems.push({ id: "TAPER", cartId: "TAPER", name: "Taper / Bolsa", price: eTaperCost, qty: 1, individualNotes: [""] });
    }
    onSave({ ...order, table: eTable, items: finalItems, notes: eNotes, phone: ePhone, total: eTotal, orderType: eOrderType, taperCost: 0 });
  };

  const handleCartaClick = (item) => {
    if (["Alitas", "Alichaufa", "Rondas"].includes(item.cat)) {
      setSalsasModal({ itemToAdd: item, salsas: [] });
    } else {
      eAddItem(item);
    }
  };

  return (
    <div style={s.modal} onClick={e => e.stopPropagation()}>
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
        <div style={{ color:Y, fontFamily:"'Bebas Neue',cursive", fontSize:20, letterSpacing:1 }}>✏️ EDITAR PEDIDO</div>
        <button style={{ ...s.btn("secondary"), padding:"4px 10px" }} onClick={onClose}>✕</button>
      </div>

      <div style={{ marginBottom:10 }}>
        <label style={{ fontSize:11, color:"#888", textTransform:"uppercase", letterSpacing:1 }}>Tipo de pedido</label>
        <div style={{ display:"flex", gap:6, marginTop:4 }}>
          {["mesa","llevar"].map(t => (
            <button key={t} style={{ ...s.btn(eOrderType===t?"primary":"secondary"), flex:1 }}
              onClick={() => { setEOrderType(t); }}>
              {t==="mesa"?"🪑 Mesa":"🥡 Para llevar"}
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

      {!taperItem && (
        <div style={{ marginBottom:10 }}>
          <label style={{ fontSize:11, color:"#888", textTransform:"uppercase", letterSpacing:1 }}>
            🥡 Taper / Bolsa (S/.)
          </label>
          <input style={{ ...s.input, marginTop:4 }} type="number" min="0" step="0.50" placeholder="Ej: 1.00"
            value={eTaperCost || ""} onChange={e => setETaperCost(e.target.value)} />
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
                  {item.name} {item.isLlevar && <span style={{marginLeft:6, background:"#154360", color:"#3498db", borderRadius:4, padding:"2px 6px", fontSize:10, fontWeight:700}}>🥡 Llevar</span>}
                  {["Alitas", "Alichaufa", "Rondas"].includes(item.cat) && (
                    <button style={{...s.btn("secondary"), padding:"2px 6px", fontSize:10, marginLeft:6}} onClick={() => setSalsasModal({cartId: item.cartId, salsas: item.salsas || []})}>
                      🥫 Salsas
                    </button>
                  )}
                </div>
                <button style={{ ...s.btn("danger"), padding:"4px 10px", fontSize:14 }} onClick={() => eChangeQty(item.cartId,-1)}>−</button>
                <span style={{ fontWeight:900, minWidth:20, textAlign:"center", fontSize:14 }}>{item.qty}</span>
                <button style={{ ...s.btn(), padding:"4px 10px", fontSize:14 }} onClick={() => eChangeQty(item.cartId,1)}>+</button>
                <span style={{ color:Y, fontWeight:900, fontSize:14, minWidth:55, textAlign:"right" }}>{fmt(item.price*item.qty)}</span>
              </div>
              
              {item.salsas?.length > 0 && (
                <div style={{color:Y, fontSize:11, marginBottom:4, fontStyle:"italic"}}>
                  🥫 Salsas: {item.salsas.map(sa => `${sa.name} (${sa.style})`).join(", ")}
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
        {eTaperCost > 0 && !taperItem && (
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
              <div key={item.id} onClick={() => handleCartaClick(item)} style={{ ...s.card, cursor:"pointer", marginBottom:4, padding:"7px 10px", border: inE ? `1px solid ${Y}55` : "1px solid #2a2a2a" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ fontSize:13 }}>{item.icon} {item.name}</span>
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
        💾 Guardar Cambios
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  MODAL MULTICOBRO (Con SUNAT / RENIEC Simulado)
// ═══════════════════════════════════════════════════════════════════
function CobrarModal({ orderContext, total, onConfirm, onClose, s, Y }) {
  const [ef, setEf] = useState(total);
  const [ya, setYa] = useState(0);
  const [ta, setTa] = useState(0);

  const [sunatDocType, setSunatDocType] = useState(orderContext?.sunatDocType || "Varios");
  const [sunatDocNum, setSunatDocNum] = useState(orderContext?.sunatDocNum || "");
  const [sunatCustomerName, setSunatCustomerName] = useState(orderContext?.sunatCustomerName || "");
  const [sunatCustomerAddress, setSunatCustomerAddress] = useState(orderContext?.sunatCustomerAddress || "");
  const [loadingDoc, setLoadingDoc] = useState(false);

  const sum = Number(ef||0) + Number(ya||0) + Number(ta||0);
  const diff = total - sum;

  const handleSearchDoc = () => {
    if (sunatDocNum.length < 8) return;
    setLoadingDoc(true);
    setTimeout(() => {
      setSunatCustomerName(sunatDocType === "DNI" ? "JUAN PEREZ (API)" : "EMPRESA TECNOLOGICA S.A.C. (API)");
      if(sunatDocType === "RUC") setSunatCustomerAddress("LIMA, PERU");
      setLoadingDoc(false);
    }, 800);
  };

  const handleConfirm = () => {
    onConfirm({
      efectivo: Number(ef||0), yape: Number(ya||0), tarjeta: Number(ta||0),
      sunatDocType, sunatDocNum, sunatCustomerName, sunatCustomerAddress
    });
  };

  return (
    <div style={s.modal} onClick={e => e.stopPropagation()}>
      <div style={{...s.row, marginBottom:16}}>
        <h2 style={{color:Y, fontFamily:"'Bebas Neue',cursive", margin:0, fontSize:24, letterSpacing:1}}>💰 COBRAR</h2>
        <button style={{...s.btn("secondary"), padding:"4px 10px"}} onClick={onClose}>✕</button>
      </div>

      <div style={{fontSize:22, fontWeight:900, marginBottom:16, textAlign:"center", background:"#111", padding:12, borderRadius:8}}>
        TOTAL: <span style={{color:Y}}>{fmt(total)}</span>
      </div>

      <div style={{ marginBottom:16, padding:10, border:`1px solid ${Y}55`, borderRadius:8 }}>
        <label style={{ fontSize:11, color:"#888", textTransform:"uppercase", letterSpacing:1 }}>Comprobante (SUNAT)</label>
        <div style={{ display:"flex", gap:6, marginTop:4 }}>
          {["Varios","Boleta","Factura"].map(t => {
              const val = t === "Varios" ? "Varios" : t === "Boleta" ? "DNI" : "RUC";
              return (
            <button key={t} style={{ ...s.btn(sunatDocType===val?"primary":"secondary"), flex:1, padding:"6px 0" }} onClick={() => setSunatDocType(val)}>
              {t}
            </button>
          )})}
        </div>
        {sunatDocType !== "Varios" && (
          <div style={{marginTop:8, display:"flex", flexDirection:"column", gap:6}}>
            <div style={{display:"flex", gap:6}}>
              <input style={s.input} placeholder={sunatDocType==="DNI" ? "N° DNI" : "N° RUC"} value={sunatDocNum} onChange={e=>setSunatDocNum(e.target.value)} spellCheck="false" />
              <button style={{...s.btn(loadingDoc ? "secondary" : "blue"), padding:"0 14px"}} onClick={handleSearchDoc} disabled={loadingDoc}>
                {loadingDoc ? "..." : "🔍"}
              </button>
            </div>
            <input style={s.input} placeholder={sunatDocType==="DNI" ? "Nombre completo" : "Razón Social"} value={sunatCustomerName} onChange={e=>setSunatCustomerName(e.target.value)} spellCheck="false" />
            {sunatDocType === "RUC" && (
              <input style={s.input} placeholder="Dirección Fiscal" value={sunatCustomerAddress} onChange={e=>setSunatCustomerAddress(e.target.value)} spellCheck="false" />
            )}
          </div>
        )}
      </div>

      <div style={{display:"flex", flexDirection:"column", gap:10}}>
        <div style={{display:"flex", alignItems:"center", gap:10}}>
          <span style={{width:80, fontWeight:700}}>💵 Efectivo</span>
          <input type="number" style={s.input} value={ef} onChange={e=>setEf(e.target.value)} min="0" step="0.5" />
          <button style={s.btn("secondary")} onClick={()=>{setEf(total);setYa(0);setTa(0);}}>Todo</button>
        </div>
        <div style={{display:"flex", alignItems:"center", gap:10}}>
          <span style={{width:80, fontWeight:700}}>💜 Yape</span>
          <input type="number" style={s.input} value={ya} onChange={e=>setYa(e.target.value)} min="0" step="0.5" />
          <button style={s.btn("secondary")} onClick={()=>{setEf(0);setYa(total);setTa(0);}}>Todo</button>
        </div>
        <div style={{display:"flex", alignItems:"center", gap:10}}>
          <span style={{width:80, fontWeight:700}}>💳 Tarjeta</span>
          <input type="number" style={s.input} value={ta} onChange={e=>setTa(e.target.value)} min="0" step="0.5" />
          <button style={s.btn("secondary")} onClick={()=>{setEf(0);setYa(0);setTa(total);}}>Todo</button>
        </div>
      </div>

      <button style={{...s.btn("success"), width:"100%", padding:14, fontSize:16, marginTop:16, opacity: Math.abs(diff)>0.01 ? 0.5 : 1}} 
        onClick={handleConfirm} disabled={Math.abs(diff)>0.01}>
        ✅ Confirmar Cobro
      </button>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
//  NUEVO PEDIDO (Carrito)
// ═══════════════════════════════════════════════════════════════════
function NuevoPedidoComponent({ draft, setDraft, menu, addItem, changeQty, updateIndividualNote, draftTotal, fmt, submitOrder, newDraft, s, Y, isDesktop, isMobile }) {
  const [search,    setSearch]    = useState("");
  const [catFilter, setCatFilter] = useState("Todos");
  const [showCartModal, setShowCartModal] = useState(false);
  const [salsasModal, setSalsasModal] = useState(null);

  const filteredMenu = menu.filter(i => (catFilter === "Todos" || i.cat === catFilter) && i.name.toLowerCase().includes(search.toLowerCase()));
  const taperNum = Number(draft.taperCost) || 0;
  const itemCount = draft.items.reduce((sum, i) => sum + i.qty, 0);

  const handleCartaClick = (item) => {
    if (["Alitas", "Alichaufa", "Rondas"].includes(item.cat)) {
      setSalsasModal({ itemToAdd: item, salsas: [] });
    } else {
      addItem(item);
    }
  };

  const CartContent = () => (
    <div style={{ ...s.cardHL, position: isDesktop ? "sticky" : "static", top:8, background: isMobile ? "#1a1a1a" : "#1c1c1c", border: isMobile ? "none" : `1px solid ${Y}44`, padding: isMobile ? 0 : 14 }}>
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

      <div style={{ ...s.title, fontSize:22, marginBottom:12, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <span>📋 PEDIDO ACTUAL</span>
        {isMobile && <button onClick={() => setShowCartModal(false)} style={{...s.btn("secondary"), padding:"4px 10px"}}>✕</button>}
      </div>

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
          placeholder={draft.orderType==="mesa"?"Ej: Mesa 5":"Nombre del cliente (opcional)"}
          value={draft.table} onChange={e => setDraft(d => ({...d,table:e.target.value}))} spellCheck="false" />
      </div>

      {draft.orderType === "llevar" && (
        <div style={{ marginBottom:10 }}>
          <label style={{ fontSize:11, color:"#888", textTransform:"uppercase", letterSpacing:1 }}>Teléfono / Info</label>
          <input style={{ ...s.input, marginTop:4 }} value={draft.phone || ""} onChange={e => setDraft(d => ({...d, phone: e.target.value}))} placeholder="Ej: 9 87654321" />
        </div>
      )}

      <div style={{ marginBottom:10 }}>
        <label style={{ fontSize:11, color:"#888", textTransform:"uppercase", letterSpacing:1 }}>🥡 Taper / Bolsa (S/.)</label>
        <input style={{ ...s.input, marginTop:4 }} type="number" min="0" step="0.50" placeholder="0.00" value={draft.taperCost || ""} onChange={e => setDraft(d => ({...d, taperCost: e.target.value}))} />
      </div>

      <div style={{ marginBottom:10 }}>
        <label style={{ fontSize:11, color:"#888", textTransform:"uppercase", letterSpacing:1 }}>Momento del Cobro</label>
        <div style={{ display:"flex", gap:6, marginTop:4 }}>
          <button style={{ ...s.btn(draft.payTiming==="despues"?"primary":"secondary"), flex:1 }} onClick={() => setDraft(d => ({...d,payTiming:"despues"}))}>⏱ Pagar después</button>
          <button style={{ ...s.btn(draft.payTiming==="ahora"?"primary":"secondary"), flex:1 }} onClick={() => setDraft(d => ({...d,payTiming:"ahora"}))}>💵 Pagar ahora</button>
        </div>
      </div>

      <div style={{ marginBottom:12 }}>
        <label style={{ fontSize:11, color:"#888", textTransform:"uppercase", letterSpacing:1 }}>Notas Generales</label>
        <textarea style={{ ...s.input, marginTop:4, resize:"vertical", minHeight:60, fontFamily:"inherit" }} value={draft.notes}
          onChange={e => setDraft(d => ({...d, notes: e.target.value}))} placeholder="Sin cebolla en general..." spellCheck="false" />
      </div>

      {draft.items.length === 0
        ? <div style={{ textAlign:"center", color:"#444", padding:"20px 0", fontSize:13 }}>Toca un platillo para agregarlo →</div>
        : <div style={{ maxHeight: isDesktop ? 400 : "none", overflowY: isDesktop ? "auto" : "visible", marginBottom:8 }}>
            {draft.items.map(item => (
              <div key={item.cartId} style={{ marginBottom:10, padding:"10px", background:"#0a0a0a", borderRadius:8, border:"1px solid #222" }}>
                <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:8, paddingBottom:8, borderBottom:"1px solid #252525" }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:700, fontSize:14 }}>
                      {item.name} 
                      {["Alitas", "Alichaufa", "Rondas"].includes(item.cat) && (
                        <button style={{...s.btn("secondary"), padding:"2px 6px", fontSize:10, marginLeft:6}} onClick={() => setSalsasModal({cartId: item.cartId, salsas: item.salsas || []})}>
                          🥫 Salsas
                        </button>
                      )}
                    </div>
                  </div>
                  <button style={{ ...s.btn("danger"), padding:"4px 10px", fontSize:14 }} onClick={() => changeQty(item.cartId,-1)}>−</button>
                  <span style={{ fontWeight:900, minWidth:20, textAlign:"center", fontSize:14 }}>{item.qty}</span>
                  <button style={{ ...s.btn(), padding:"4px 10px", fontSize:14 }} onClick={() => changeQty(item.cartId,1)}>+</button>
                  <span style={{ color:Y, fontWeight:900, fontSize:14, minWidth:55, textAlign:"right" }}>{fmt(item.price*item.qty)}</span>
                </div>
                {item.salsas?.length > 0 && <div style={{color:Y, fontSize:11, marginBottom:4, fontStyle:"italic"}}>🥫 Salsas: {item.salsas.map(sa => `${sa.name} (${sa.style})`).join(", ")}</div>}
                {Array.from({ length: item.qty }).map((_, idx) => (
                  <textarea key={idx} style={{ ...s.input, fontSize:13, padding:"6px 10px", marginTop: 4, background:"#141414", resize:"vertical", minHeight:40, fontFamily:"inherit" }} 
                    placeholder={`Nota para el plato ${idx + 1}...`} value={item.individualNotes?.[idx] || ""} spellCheck="false" onChange={e => updateIndividualNote(item.cartId, idx, e.target.value)} />
                ))}
              </div>
            ))}
          </div>
      }

      {taperNum > 0 && <div style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderTop:"1px solid #2a2a2a", color:"#aaa", fontSize:12 }}><span>🥡 Taper/Bolsa</span><span>{fmt(taperNum)}</span></div>}
      <div style={{ display:"flex", justifyContent:"space-between", padding:"10px 0", borderTop:`2px solid ${Y}55`, marginBottom:12 }}><span style={{ fontWeight:900, fontSize:17 }}>TOTAL</span><span style={{ fontWeight:900, fontSize:17, color:Y }}>{fmt(draftTotal + taperNum)}</span></div>

      <button style={{ ...s.btn(), width:"100%", padding:16, fontSize:16, opacity:(!draft.table||!draft.items.length)?0.4:1 }}
        onClick={() => { submitOrder(); if(isMobile) setShowCartModal(false); }} disabled={!draft.table||!draft.items.length}>
        {draft.payTiming==="ahora" ? "💵 Continuar al Cobro" : "📝 Enviar a Cocina"}
      </button>
      <button style={{ ...s.btn("secondary"), width:"100%", padding:10, marginTop:8, fontSize:13 }}
        onClick={() => { setDraft(newDraft()); if(isMobile) setShowCartModal(false); }}>🗑️ Limpiar Pedido</button>
    </div>
  );

  return (
    <div style={{ display:"grid", gridTemplateColumns: isDesktop ? "1fr 320px" : "1fr", gap: isMobile ? 12 : 14 }}>
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
      <div>
        <div style={s.title}>🍔 CARTA</div>
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
                  <div style={{ flex:1 }}><span style={{ marginRight:6 }}>{item.icon}</span><span style={{ fontWeight:700, fontSize: isMobile?13:14 }}>{item.name}</span></div>
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
      {isDesktop ? <div>{CartContent()}</div> : (
        <>
          {showCartModal && <div style={{...s.overlay, zIndex:9999}} onClick={() => setShowCartModal(false)}><div style={s.modal} onClick={e => e.stopPropagation()}>{CartContent()}</div></div>}
          <button onClick={() => setShowCartModal(true)} style={{ position: "fixed", bottom: 20, right: 20, width: 66, height: 66, borderRadius: 33, background: Y, border: "none", boxShadow: "0 6px 16px rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, zIndex: 999, cursor: "pointer", paddingLeft: 4 }}>
            🛒{itemCount > 0 && <div style={{ position: "absolute", top: 0, right: 0, background: "#e74c3c", color: "#fff", borderRadius: 12, padding: "2px 7px", fontSize: 13, fontWeight: 900, border: "2px solid #111" }}>{itemCount}</div>}
          </button>
        </>
      )}
    </div>
  );
}

// ── Impresión mejorada con Blob (Evita bloqueos en Móvil/Tablet) ────────────
function printOrder(order) {
  const items = order.items.map(i => {
    const validNotes = (i.individualNotes || []).filter(n => n.trim() !== "");
    let notesHtml = "";
    if (validNotes.length > 0) {
      notesHtml = validNotes.map((n, idx) => `<tr><td colspan="3" style="font-size:9px;color:#666;padding-top:0;padding-bottom:1mm;font-style:italic;">📝 [Plato ${idx+1}]: ${n}</td></tr>`).join("");
    }
    const salsasHtml = i.salsas?.length > 0 ? `<tr><td colspan="3" style="font-size:9px;color:#333;padding-top:0;padding-bottom:1mm;">🥫 Salsas: ${i.salsas.map(s=>`${s.name} (${s.style})`).join(', ')}</td></tr>` : "";
    const llevarTag = i.isLlevar ? ` <span style="font-size:8px;font-weight:bold;">[🥡LLEVAR]</span>` : "";
    return `<tr><td class="qty">${i.qty}x</td><td class="item">${i.name}${llevarTag}</td><td class="price">S/.${(i.price*i.qty).toFixed(2)}</td></tr>${salsasHtml}${notesHtml}`;
  }).join("");

  const notes = order.notes ? `<div class="notes">📝 ${order.notes}</div>` : "";
  const tipo  = order.orderType==="llevar" ? `🥡 LLEVAR — ${order.table}${order.phone?` · ${order.phone}`:""}` : `MESA ${order.table}`;
  const hora  = new Date().toLocaleTimeString("es-PE",{hour:"2-digit",minute:"2-digit"});
  const fecha = new Date().toLocaleDateString("es-PE",{day:"2-digit",month:"2-digit",year:"2-digit"});
  const paidMarker = order.isPaid ? `<div style="text-align:center;font-weight:bold;margin-top:2mm;border:1px solid #000;padding:2px;">** PAGADO **</div>` : "";
  
  const htmlContent = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Pedido</title>
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
  <table>${items}</table>
  ${notes}
  <div class="divider"></div>
  <div class="total-row"><span>TOTAL</span><span>S/.${order.total.toFixed(2)}</span></div>
  ${paidMarker}
  <div class="footer">— Cocina —</div>
  <script>window.onload=function(){window.print();}<\/script>
</body></html>`;

  const blob = new Blob([htmlContent], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
}

// ═══════════════════════════════════════════════════════════════════
//  COMPONENTES SECUNDARIOS
// ═══════════════════════════════════════════════════════════════════
function DashboardComponent({ orders, history, fmt, setTab, finishPaidOrder, setCobrarTarget, isMobile, s, Y }) {
  const today = new Date().toDateString();
  const paidArchivedToday = history.filter(o => o.status==="pagado" && new Date(o.createdAt).toDateString()===today);
  const paidActiveToday   = orders.filter(o => o.isPaid && new Date(o.createdAt).toDateString()===today);
  const allPaidToday      = [...paidArchivedToday, ...paidActiveToday];

  const todayRev  = allPaidToday.reduce((sum,o) => sum + o.total, 0);
  const totalRev  = history.filter(o => o.status==="pagado").reduce((sum,o) => sum + o.total, 0) + paidActiveToday.reduce((sum,o) => sum + o.total, 0);
  const cashRev   = allPaidToday.reduce((sum,o) => sum + getPay(o,"efectivo"), 0);
  const yapeRev   = allPaidToday.reduce((sum,o) => sum + getPay(o,"yape"), 0);
  const cardRev   = allPaidToday.reduce((sum,o) => sum + getPay(o,"tarjeta"), 0);

  return (
    <div>
      <div style={s.title}>📊 RESUMEN DEL DÍA</div>
      <div style={s.grid(isMobile ? 130 : 140)}>
        <div style={s.statCard}><div style={s.statNum}>{orders.filter(o => o.kitchenStatus !== 'listo').length}</div><div style={s.statLbl}>Activos Cocina</div></div>
        <div style={s.statCard}><div style={s.statNum}>{allPaidToday.length}</div><div style={s.statLbl}>Pagados hoy</div></div>
        <div style={{...s.statCard, border:`1px solid ${Y}55`}}><div style={{...s.statNum, fontSize:isMobile?16:20}}>{fmt(todayRev)}</div><div style={s.statLbl}>Recaudado hoy</div></div>
        <div style={s.statCard}><div style={{...s.statNum, fontSize:isMobile?16:20}}>{fmt(totalRev)}</div><div style={s.statLbl}>Total histórico</div></div>
      </div>
      {allPaidToday.length > 0 && (
        <div style={{...s.card, marginTop:8}}>
          <div style={s.row}>
            <div style={{textAlign:"center", flex:1}}><div style={{color:"#27ae60", fontWeight:900, fontSize:isMobile?13:16}}>💵 {fmt(cashRev)}</div><div style={{fontSize:10, color:"#666"}}>Efectivo</div></div>
            <div style={{width:1, background:"#333", height:36}}/>
            <div style={{textAlign:"center", flex:1}}><div style={{color:"#8e44ad", fontWeight:900, fontSize:isMobile?13:16}}>💜 {fmt(yapeRev)}</div><div style={{fontSize:10, color:"#666"}}>Yape</div></div>
            <div style={{width:1, background:"#333", height:36}}/>
            <div style={{textAlign:"center", flex:1}}><div style={{color:"#2980b9", fontWeight:900, fontSize:isMobile?13:16}}>💳 {fmt(cardRev)}</div><div style={{fontSize:10, color:"#666"}}>Tarjeta</div></div>
          </div>
        </div>
      )}
    </div>
  );
}

function MesasComponent({ orders, setDraft, newDraft, setTab, setMesaModal, finishPaidOrder, setCobrarTarget, setSplitTarget, isMobile, isTablet, s, Y, fmt, MESAS }) {
  const llevarOrders = orders.filter(o => o.orderType==="llevar");
  return (
    <div>
      <div style={{...s.row, marginBottom:14}}>
        <div style={s.title}>🪑 MESAS</div>
        <button style={s.btn()} onClick={() => { setDraft({...newDraft(), orderType:"llevar", payTiming:"ahora"}); setTab("nuevo"); }}>🥡 Para llevar</button>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr 1fr":"repeat(3, 1fr)", gridAutoRows: isTablet ? "minmax(25vh, auto)" : "auto", gap: isMobile ? 12 : 20, marginBottom:20 }}>
        {MESAS.map(num => {
          const mesaOrders = orders.filter(o => o.table===String(num) && o.orderType!=="llevar");
          const ocupada = mesaOrders.length > 0;
          const total = mesaOrders.reduce((sum,o) => sum + o.total, 0);
          return (
            <div key={num} onClick={() => setMesaModal(num)} style={{ background:ocupada?`${Y}15`:"#1c1c1c", border:`2px solid ${ocupada?Y:"#2a2a2a"}`, borderRadius:14, padding: "24px 16px", minHeight: isMobile ? 140 : isTablet ? "25vh" : 160, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", cursor:"pointer", textAlign:"center", position:"relative" }}>
              {ocupada && <div style={{position:"absolute", top:10, right:10, width:12, height:12, borderRadius:"50%", background:"#27ae60", boxShadow:"0 0 8px #27ae60"}}/>}
              <IconoMesa color={ocupada ? Y : "#ffffff"} size={isMobile ? 80 : 100} />
              <div style={{fontFamily:"'Bebas Neue',cursive", fontSize:24, color:ocupada?Y:"#555", letterSpacing:1}}>MESA {num}</div>
              <div style={{fontSize:12, color:ocupada?"#aaa":"#444", marginTop:6}}>{ocupada?`${mesaOrders.length} pedido${mesaOrders.length>1?"s":""} · ${fmt(total)}`:"Libre"}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MesaModalComponent({ num, orders, setDraft, newDraft, onClose, setTab, setCobrarTarget, setSplitTarget, setEditingOrder, printOrder, isMobile, s, Y, fmt }) {
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
              {o.items.map((item,i) => {
                const validNotes = (item.individualNotes || []).filter(n => n.trim() !== "");
                return (
                <div key={i} style={{marginBottom:6}}>
                  <div style={{display:"flex", justifyContent:"space-between", fontSize:13, padding:"3px 0", borderBottom:"1px solid #222"}}>
                    <span>{item.qty}x {item.name}{item.isLlevar && <span style={{marginLeft:6, background:"#154360", color:"#3498db", borderRadius:4, padding:"1px 5px", fontSize:10, fontWeight:700}}>🥡 Llevar</span>}</span>
                    <span style={{color:"#888"}}>{fmt(item.price*item.qty)}</span>
                  </div>
                  {item.salsas?.length > 0 && <div style={{fontSize:11, color:Y, paddingLeft:4, marginTop:2}}>🥫 {item.salsas.map(s => `${s.name} (${s.style})`).join(', ')}</div>}
                  {validNotes.map((n, idx) => <div key={idx} style={{fontSize:11, color:"#999", fontStyle:"italic", paddingLeft:4, marginTop:2, whiteSpace:"pre-wrap"}}>└ Plato {idx+1}: {n}</div>)}
                </div>
              )})}
            </div>
            {o.notes && <div style={{fontSize:11, color:"#888", fontStyle:"italic", marginBottom:8, whiteSpace:"pre-wrap"}}>📝 {o.notes}</div>}
            <div style={{display:"flex", gap:6, flexWrap:"wrap"}}>
              {!o.isPaid && <button style={{...s.btn("success"), flex:1}} onClick={() => { setCobrarTarget({type:'existing', data:o}); onClose(); }}>💰 Cobrar Todo</button>}
              {!o.isPaid && <button style={{...s.btn("secondary"), flex:1}} onClick={() => { setSplitTarget(o); onClose(); }}>✂️ Dividir</button>}
              <button style={{...s.btn("warn"), flex:1}} onClick={() => { setEditingOrder(o); onClose(); }}>✏️ Editar</button>
              <button style={s.btn("secondary")} onClick={() => printOrder(o)}>🖨️ Ticket</button>
            </div>
          </div>
        ))
      }
      <button style={{...s.btn(), width:"100%", padding:12, marginTop:8}} onClick={() => { setDraft({...newDraft(), table:String(num), orderType:"mesa"}); onClose(); setTab("nuevo"); }}>
        + Agregar pedido a Mesa {num}
      </button>
    </div>
  );
}

function PedidosComponent({ orders, setTab, finishPaidOrder, setCobrarTarget, setSplitTarget, setEditingOrder, printOrder, cancelOrder, setConfirmDelete, isMobile, s, Y, fmt }) {
  return (
    <div>
      <div style={{...s.row, marginBottom:14}}>
        <div style={s.title}>🍽️ PEDIDOS ACTIVOS</div>
        <button style={s.btn()} onClick={() => setTab("nuevo")}>+ Nuevo</button>
      </div>
      {orders.length === 0 ? <div style={{textAlign:"center", padding:60, color:"#444"}}><div style={{fontSize:48}}>🕐</div><div>Sin pedidos activos</div></div> : orders.map(o => (
          <div key={o.id} style={{...s.card, borderLeft:`4px solid ${Y}`}}>
            <div style={{...s.row, marginBottom:8}}>
              <div>
                <span style={{fontFamily:"'Bebas Neue',cursive", fontSize:isMobile?18:22}}>{o.orderType==="llevar" ? `🥡 ${o.table}` : `Mesa ${o.table}`}</span>
                {o.isPaid && <span style={{...s.tag("#1e5c2e"), marginLeft:8}}>✅ Pagado</span>}
                {o.kitchenStatus === 'listo' && <span style={{...s.tag("#2980b9"), marginLeft:8}}>👨‍🍳 Despachado</span>}
              </div>
              <span style={{color:Y, fontWeight:900, fontSize:isMobile?16:19}}>{fmt(o.total)}</span>
            </div>
            <div style={{color:"#666", fontSize:11, marginBottom:8}}>🕐 {timeStr(o.createdAt)} · {minutesAgo(o.createdAt)}</div>
            <div style={{marginBottom:8}}>
              {o.items.map((item,i) => {
                const validNotes = (item.individualNotes || []).filter(n => n.trim() !== "");
                return (
                <div key={i} style={{marginBottom:6}}>
                  <div style={{display:"flex", justifyContent:"space-between", fontSize:isMobile?12:13, padding:"3px 0", borderBottom:"1px solid #222"}}>
                    <span>{item.qty}x {item.name}{item.isLlevar && <span style={{marginLeft:6, background:"#154360", color:"#3498db", borderRadius:4, padding:"1px 5px", fontSize:10, fontWeight:700}}>🥡 Llevar</span>}</span>
                  </div>
                  {item.salsas?.length > 0 && <div style={{fontSize:11, color:Y, paddingLeft:4, marginTop:2}}>🥫 {item.salsas.map(s => `${s.name} (${s.style})`).join(', ')}</div>}
                  {validNotes.map((n, idx) => <div key={idx} style={{fontSize:11, color:"#999", fontStyle:"italic", paddingLeft:4, marginTop:2, whiteSpace:"pre-wrap"}}>└ Plato {idx+1}: {n}</div>)}
                </div>
              )})}
            </div>
            {o.notes && <div style={{fontSize:11, color:"#888", fontStyle:"italic", marginBottom:8, whiteSpace:"pre-wrap"}}>📝 {o.notes}</div>}
            <div style={{display:"flex", gap:6, flexWrap:"wrap"}}>
              {o.isPaid ? <button style={{...s.btn("blue"), flex:1}} onClick={() => finishPaidOrder(o.id)}>✅ Entregado</button> 
               : <><button style={{...s.btn("success"), flex:1}} onClick={() => setCobrarTarget({type:'existing', data:o})}>💰 Cobrar Todo</button>
                   <button style={{...s.btn("secondary"), flex:1}} onClick={() => setSplitTarget(o)}>✂️ Dividir</button></>}
              <button style={{...s.btn("warn"), flex:1}} onClick={() => setEditingOrder(o)}>✏️ Editar</button>
              <button style={s.btn("secondary")} onClick={() => printOrder(o)}>🖨️ Ticket</button>
              {o.enlace_pdf && <button style={{...s.btn("blue"), padding:isMobile?"7px 10px":"8px 12px"}} onClick={() => window.open(o.enlace_pdf, "_blank")}>🧾 SUNAT</button>}
              <button style={{...s.btn("danger"), padding:isMobile?"7px 10px":"8px 12px"}} onClick={() => cancelOrder(o.id)}>❌</button>
              <button style={{...s.btn("secondary"), padding:isMobile?"7px 10px":"8px 12px"}} onClick={() => setConfirmDelete(o.id)}>🗑️</button>
            </div>
          </div>
        ))
      }
    </div>
  );
}

function CocinaComponent({ orders, kitchenChecks, setKitchenChecks, markKitchenListo, isMobile, isDesktop, s, Y }) {
  const sorted = [...orders].sort((a,b) => new Date(a.createdAt) - new Date(b.createdAt));
  
  const toggleCheck = (order, itemIdx, maxQty) => { 
    const orderId = order.id;
    setKitchenChecks(prev => { 
      const oc = prev[orderId] || {}; 
      let valAnterior = oc[itemIdx];
      if (valAnterior === true) valAnterior = maxQty; 
      let next = (Number(valAnterior) || 0) + 1; 
      if (next > maxQty) next = 0;
      
      const newOrderChecks = {...oc, [itemIdx]: next};

      const isFullyDone = order.items.length > 0 && order.items.every((item, i) => { 
          let val = (i === itemIdx) ? next : newOrderChecks[i];
          if (val === true) val = item.qty;
          return Number(val || 0) === item.qty; 
      });

      if (isFullyDone) {
          setTimeout(() => markKitchenListo(orderId), 500); 
      }
      return {...prev, [orderId]: newOrderChecks}; 
    }); 
  };

  const activeOrders = sorted.filter(order => order.kitchenStatus !== 'listo');
  if(activeOrders.length === 0) return <div style={{textAlign:"center", padding:60, color:"#444"}}><div style={{fontSize:56}}>👨‍🍳</div><div style={{marginTop:12, fontSize:16}}>Sin pedidos pendientes en cocina</div></div>;
  
  return (
    <div>
      <div style={{...s.row, marginBottom:14}}><div style={s.title}>👨‍🍳 COCINA — {activeOrders.length} pendiente{activeOrders.length!==1?"s":""}</div></div>
      <div style={{display:"grid", gridTemplateColumns:isDesktop?"1fr 1fr":"1fr", gap:12}}>
        {activeOrders.map((order,priority) => {
          const checks = kitchenChecks[order.id] || {};
          const totalPortions = order.items.reduce((sum, item) => sum + item.qty, 0);
          const donePortions = order.items.reduce((sum, item, i) => sum + (Number(checks[i]===true?item.qty:checks[i]) || 0), 0);
          const mins = Math.floor((Date.now() - new Date(order.createdAt))/60000);
          
          return (
            <div key={order.id} style={{background:mins>=15?"#1f0d0d":mins>=8?"#1f180d":"#1c1c1c", borderRadius:14, border:`2px solid ${mins>=15?"#e74c3c":mins>=8?"#e67e22":Y}`, padding:14, position:"relative", transition:"all .3s"}}>
              <div style={{position:"absolute", top:-10, left:14, background:mins>=15?"#e74c3c":mins>=8?"#e67e22":Y, color:mins>=8?"#fff":"#111", borderRadius:20, padding:"2px 10px", fontSize:11, fontWeight:900}}>{`#${priority+1} · ${mins<1?"ahora":`${mins}m`}`}</div>
              <div style={{...s.row, marginBottom:10, marginTop:6}}><span style={{fontFamily:"'Bebas Neue',cursive", fontSize:22, color:mins>=15?"#e74c3c":mins>=8?"#e67e22":Y}}>{order.orderType==="llevar"?`🥡 ${order.table}`:`Mesa ${order.table}`}</span></div>
              <div style={{background:"#2a2a2a", borderRadius:4, height:5, marginBottom:12, overflow:"hidden"}}><div style={{background:Y, height:"100%", width:`${totalPortions > 0 ? (donePortions/totalPortions)*100 : 0}%`, transition:"width .3s"}}/></div>
              {order.items.map((item,i) => {
                let doneQty = checks[i];
                if (doneQty === true) doneQty = item.qty;
                doneQty = Number(doneQty) || 0;
                
                const isDone = doneQty === item.qty;
                const validNotes = (item.individualNotes || []).filter(n => n.trim() !== "");
                return (
                  <div key={i} onClick={() => toggleCheck(order, i, item.qty)} style={{display:"flex", alignItems:"center", gap:10, padding:"9px 10px", marginBottom:5, borderRadius:8, background:isDone?"#0a2a0a":"#252525", border:`1px solid ${isDone?"#27ae6055":"#333"}`, cursor:"pointer", transition:"all .2s", opacity:isDone?0.6:1}}>
                    <div style={{minWidth:26, height:26, borderRadius:6, border:`2px solid ${isDone?"#27ae60":"#555"}`, background:isDone?"#27ae60":"transparent", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, fontSize:13, color:isDone?"#fff":"#aaa", fontWeight:"bold"}}>{item.qty > 1 ? `${doneQty}/${item.qty}` : (isDone ? "✓" : "")}</div>
                    <div style={{flex:1}}>
                      <span style={{fontWeight:800, fontSize:isMobile?13:15, textDecoration:isDone?"line-through":"none", color:isDone?"#555":"#eee"}}>{item.qty>1&&<span style={{color:Y, marginRight:4}}>{item.qty}×</span>}{item.name} {item.isLlevar && <span style={{marginLeft:6, background:"#154360", color:"#3498db", borderRadius:4, padding:"1px 5px", fontSize:10}}>🥡 Llevar</span>}</span>
                      {item.salsas?.length > 0 && <div style={{color:Y, fontSize:11, fontStyle:"italic", marginTop:2}}>🥫 {item.salsas.map(s => `${s.name} (${s.style})`).join(', ')}</div>}
                      {validNotes.map((n, idx) => <div key={idx} style={{fontSize:11, color:"#aaa", marginTop:3, fontStyle:"italic", whiteSpace:"pre-wrap"}}>📝 Plato {idx+1}: {n}</div>)}
                    </div>
                  </div>
                )
              })}
              {order.notes && <div style={{marginTop:8, padding:"8px 10px", background:"#1a1500", borderRadius:8, border:"1px solid #3a3000", fontSize:12, color:"#e6c200", whiteSpace:"pre-wrap"}}>📝 General: {order.notes}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HistorialComponent({ history, isMobile, s, Y, fmt, getPay, printOrder }) {
  const [expandedDays, setExpandedDays] = useState([new Date().toLocaleDateString("es-PE")]);
  const [histDate, setHistDate] = useState("");

  const historyByDay = {};
  history.forEach(o => {
    const dateObj = new Date(o.createdAt);
    const dateStr = dateObj.toLocaleDateString("es-PE");
    const sortKey = dateObj.getFullYear() + "-" + String(dateObj.getMonth()+1).padStart(2,'0') + "-" + String(dateObj.getDate()).padStart(2,'0');
    
    if (!historyByDay[dateStr]) historyByDay[dateStr] = { date: dateStr, sortKey, orders: [], total: 0, ef: 0, ya: 0, ta: 0, cancelados: 0 };
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
  if (histDate) daysList = daysList.filter(d => d.sortKey === histDate);

  const toggleDay = (dateStr) => {
    setExpandedDays(prev => prev.includes(dateStr) ? prev.filter(d => d !== dateStr) : [...prev, dateStr]);
  };

  return (
    <div>
      <div style={{...s.row, marginBottom:16}}>
        <div style={{...s.title, marginBottom:0}}>📋 HISTORIAL DE VENTAS</div>
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

      {daysList.length === 0 ? (
        <div style={{textAlign:"center", padding:60, color:"#444", background:"#1a1a1a", borderRadius:12}}>
          <div style={{fontSize:48, marginBottom:10}}>📭</div>
          <div style={{fontSize:16, fontWeight:700}}>No hay registros para mostrar</div>
        </div>
      ) : (
        daysList.map(d => {
          const isExpanded = expandedDays.includes(d.date); 
          return (
            <div key={d.date} style={{background:"#1c1c1c", borderRadius:12, marginBottom:16, border:"1px solid #2a2a2a", overflow:"hidden", boxShadow:"0 4px 6px rgba(0,0,0,0.3)"}}>
              
              {/* CABECERA DEL ACORDEÓN (Click para mostrar/ocultar) */}
              <div 
                style={{
                  padding:"16px 20px", display:"flex", justifyContent:"space-between", alignItems:"center", 
                  cursor:"pointer", background: isExpanded ? `linear-gradient(90deg, #1f1a00 0%, #1c1c1c 100%)` : "#1c1c1c", 
                  borderBottom: isExpanded ? `2px solid ${Y}55` : "none", transition:"all 0.2s"
                }} 
                onClick={() => toggleDay(d.date)}
              >
                <div style={{display:"flex", alignItems:"center", gap:12}}>
                  <div style={{fontSize:24}}>📅</div>
                  <div>
                    <div style={{fontWeight:900, fontSize:18, color: isExpanded ? Y : "#eee", letterSpacing:0.5}}>{d.date}</div>
                    <div style={{fontSize:12, color:"#888", marginTop:2}}>
                      {d.orders.filter(x => x.status==="pagado").length} pedidos cobrados {d.cancelados > 0 && <span style={{color:"#e74c3c"}}> • {d.cancelados} anulados</span>}
                    </div>
                  </div>
                </div>
                <div style={{textAlign:"right", display:"flex", alignItems:"center", gap:16}}>
                  <div style={{fontWeight:900, fontSize:22, color:"#27ae60"}}>{fmt(d.total)}</div>
                  <div style={{background:"#2a2a2a", borderRadius:"50%", width:32, height:32, display:"flex", alignItems:"center", justifyContent:"center", color:Y, transition:"transform 0.3s", transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)"}}>
                    ▼
                  </div>
                </div>
              </div>

              {/* CUERPO DEL ACORDEÓN (Detalles de los pedidos) */}
              {isExpanded && (
                <div style={{padding:"20px", background:"#111"}}>
                  
                  {/* Cajas de Métodos de Pago */}
                  <div style={{display:"flex", gap:12, marginBottom:20, flexWrap:"wrap"}}>
                    <div style={{flex:1, minWidth:100, background:"#1a2e1a", border:"1px solid #27ae6055", borderRadius:8, padding:"12px", textAlign:"center"}}>
                      <div style={{color:"#27ae60", fontSize:11, fontWeight:800, marginBottom:4, letterSpacing:1}}>💵 EFECTIVO</div>
                      <div style={{color:"#fff", fontWeight:900, fontSize:18}}>{fmt(d.ef)}</div>
                    </div>
                    <div style={{flex:1, minWidth:100, background:"#2a1a3a", border:"1px solid #8e44ad55", borderRadius:8, padding:"12px", textAlign:"center"}}>
                      <div style={{color:"#c39bd3", fontSize:11, fontWeight:800, marginBottom:4, letterSpacing:1}}>💜 YAPE</div>
                      <div style={{color:"#fff", fontWeight:900, fontSize:18}}>{fmt(d.ya)}</div>
                    </div>
                    <div style={{flex:1, minWidth:100, background:"#1a253a", border:"1px solid #2980b955", borderRadius:8, padding:"12px", textAlign:"center"}}>
                      <div style={{color:"#5dade2", fontSize:11, fontWeight:800, marginBottom:4, letterSpacing:1}}>💳 TARJETA</div>
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
                              <span style={{fontWeight:900, fontSize:16, color: isCanceled ? "#e74c3c" : "#eee"}}>{o.orderType==="llevar" ? `🥡 ${o.table}` : `🪑 Mesa ${o.table}`}</span>
                              <span style={{...s.tag(isCanceled ? "#c0392b" : "#1e5c2e"), fontSize:10}}>{isCanceled ? "❌ Anulado" : "✅ Pagado"}</span>
                              <span style={{color:"#666", fontSize:12}}>⏱ {timeStr(o.paidAt || o.cancelledAt || o.createdAt)}</span>
                            </div>
                            <div style={{display:"flex", alignItems:"center", gap:12}}>
                              <span style={{color: isCanceled ? "#888" : Y, fontWeight:900, fontSize:18}}>{isCanceled ? <del>{fmt(o.total)}</del> : fmt(o.total)}</span>
                              <div style={{display:"flex", gap:6}}>
                                <button style={{...s.btn("secondary"), padding:"6px 10px", fontSize:11}} onClick={(e) => { e.stopPropagation(); printOrder(o); }}>🖨️ Ticket</button>
                                {o.enlace_pdf && <button style={{...s.btn("blue"), padding:"6px 10px", fontSize:11}} onClick={(e) => { e.stopPropagation(); window.open(o.enlace_pdf, "_blank"); }}>🧾 SUNAT</button>}
                              </div>
                            </div>
                          </div>

                          {/* Detalle de Pagos */}
                          {!isCanceled && (
                            <div style={{fontSize:11, color:"#aaa", display:"flex", gap:12, marginBottom:10, background:"#0a0a0a", padding:"8px 12px", borderRadius:6}}>
                              <span style={{fontWeight:800, color:"#777"}}>MEDIO DE PAGO:</span>
                              {[pe>0&&`💵 Efectivo: ${fmt(pe)}`, py>0&&`💜 Yape: ${fmt(py)}`, pt>0&&`💳 Tarjeta: ${fmt(pt)}`].filter(Boolean).join("  |  ")}
                            </div>
                          )}

                          {/* Platos del Ticket */}
                          <div style={{display:"grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap:8}}>
                            {o.items.map((item,i) => (
                              <div key={i} style={{fontSize:12, color:"#ccc", padding:"8px 12px", background:"#222", borderRadius:6, borderLeft:`3px solid ${isCanceled ? '#e74c3c' : Y}`}}>
                                <div style={{display:"flex", justifyContent:"space-between", fontWeight:700}}>
                                  <span>{item.qty}x {item.name} {item.isLlevar && <span style={{marginLeft:6, background:"#154360", color:"#3498db", borderRadius:4, padding:"1px 5px", fontSize:9}}>🥡 Llevar</span>}</span>
                                  <span style={{color:"#888"}}>{fmt(item.price * item.qty)}</span>
                                </div>
                                {item.salsas?.length > 0 && <div style={{color:Y, fontSize:10, fontStyle:"italic", marginTop:4}}>🥫 {item.salsas.map(s => `${s.name} (${s.style})`).join(', ')}</div>}
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

  const [invCat,    setInvCat]    = useState("Todos");
  const [invPeriod, setInvPeriod] = useState("hoy");
  const [invDate,   setInvDate]   = useState(todayIso);
  const [invSortBy, setInvSortBy] = useState("cantidad");
  const [search,    setSearch]    = useState("");

  const now      = new Date(); const todayStr = now.toDateString(); const weekAgo  = new Date(now - 7*24*60*60*1000);

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
      <div style={s.title}>📦 INVENTARIO DE VENTAS</div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10, alignItems:"center"}}>
        {[["hoy","📅 Hoy"],["semana","📆 Semana"],["fecha","🔍 Fecha"],["total","🗂️ Total"]].map(([v,l])=>(<button key={v} style={{...s.btn(invPeriod===v?"primary":"secondary"),fontSize:11}} onClick={()=>setInvPeriod(v)}>{l}</button>))}
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
              <div style={{display:"flex",alignItems:"center",gap:8,flex:1,minWidth:0}}><span style={{fontSize:18}}>{item.icon}</span><div style={{minWidth:0}}><div style={{fontWeight:800,fontSize:isMobile?12:14,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{item.name}</div><div style={{fontSize:10,color:"#555"}}>{item.cat} · {fmt(item.price)}</div></div></div>
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
        <div style={s.title}>🍔 CARTA ({menu.length})</div>
        <button style={s.btn()} onClick={() => setShowAdd(!showAdd)}>{showAdd ? "✕ Cancelar" : "+ Agregar"}</button>
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
            <div><span style={{marginRight:6}}>{item.icon}</span><span style={{fontWeight:700, fontSize:isMobile?13:14}}>{item.name}</span></div>
            <div style={{display:"flex", alignItems:"center", gap:10}}>
              <span style={{color:Y, fontWeight:900}}>{fmt(item.price)}</span>
              {item.id.startsWith("CUSTOM_") && <button style={{...s.btn("danger"), padding:"2px 7px", fontSize:11}} onClick={() => deleteMenuItem(item.id)}>✕</button>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  APP COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════
export default function App() {
  const width     = useWindowWidth();
  const isMobile  = width < 480;
  const isTablet  = width >= 480 && width < 1024;
  const isDesktop = width >= 768;
  const isWide    = width >= 1024;

  const [currentUser,    setCurrentUser]    = useState(null); 

  const [tab,            setTab]            = useState("mesas");
  const [orders,         setOrders]         = useState([]);
  const [history,        setHistory]        = useState([]);
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
  const [splitTarget,   setSplitTarget]   = useState(null); 
  const [mergeModal,    setMergeModal]    = useState(null);
  const [mergeName,     setMergeName]     = useState("");

  useEffect(() => { const t=setTimeout(()=>setSplash(false),2200); return()=>clearTimeout(t); }, []);

  useEffect(() => {
    if (!currentUser) return;
    setLoaded(false);
    const localFS = FS(currentUser.localId);
    
    let unsubOrders, unsubHistory, unsubMenu;
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
      setLoaded(true);
    };
    setupListeners();
    return () => { if (unsubOrders) unsubOrders(); if (unsubHistory) unsubHistory(); if (unsubMenu) unsubMenu(); };
  }, [currentUser]);

  const showToast = (msg,color="#27ae60") => { setToast({msg,color}); setTimeout(()=>setToast(null),2800); };
  
  const saveOrders = async (v) => { await FS(currentUser.localId).saveOrders(v); };
  const saveMenu   = async (v) => { setMenu(v); await FS(currentUser.localId).saveMenu(v.filter(i=>i.id.startsWith("CUSTOM_"))); };
  const addHistory = async (o) => { await FS(currentUser.localId).addHistory(o); };

  const markKitchenListo = async (orderId) => {
    setOrders(prevOrders => {
      const updatedOrders = prevOrders.map(o => o.id === orderId ? {...o, kitchenStatus: 'listo'} : o);
      saveOrders(updatedOrders);
      return updatedOrders;
    });
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

  const submitOrder = async (forceMerge = null) => {
    if (!draft.table.trim()||!draft.items.length) return;
    const taperNum = Number(draft.taperCost) || 0;
    const total = draftTotal + taperNum;
    const existingMesaOrder = orders.find(o => o.table === draft.table.trim() && o.orderType === "mesa" && !o.isPaid) ?? null;

    if (existingMesaOrder && forceMerge === null) {
      setMergeModal({ existingOrder: existingMesaOrder, newDraftData: { ...draft, total, taperNum } });
      setMergeName(""); return;
    }

    let finalItems = forceMerge === "merge" ? [...mergeModal.newDraftData.items] : [...draft.items];
    const currentTaperNum = forceMerge === "merge" ? mergeModal.newDraftData.taperNum : taperNum;
    if (currentTaperNum > 0) finalItems.push({ id: "TAPER", cartId: "TAPER", name: "Taper / Bolsa", price: currentTaperNum, qty: 1, cat: "Extras", individualNotes: [""] });

    if (forceMerge === "merge" && mergeModal) {
      const existing = mergeModal.existingOrder;
      const isLlevarDraft = mergeModal.newDraftData.orderType === "llevar";
      const newItems = finalItems.map(i => {
        let nameTag = mergeName.trim() ? `[Llevar: ${mergeName.trim()}]` : "";
        return { ...i, ...(isLlevarDraft ? { isLlevar: true } : {}), individualNotes: isLlevarDraft && nameTag ? i.individualNotes.map(n => n ? `${nameTag} ${n}` : nameTag) : i.individualNotes }
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
      const updated = { ...existing, items: mergedItems, total: mergedItems.reduce((s, i) => s + i.price * i.qty, 0), notes: [existing.notes, mergeModal.newDraftData.notes].filter(Boolean).join(" | "), taperCost: 0, kitchenStatus: 'pendiente' };
      setOrders(prev => prev.map(o => o.id === existing.id ? updated : o));
      await saveOrders(orders.map(o => o.id === existing.id ? updated : o));
      setDraft(newDraft()); setMergeModal(null); setMergeName(""); showToast(`➕ Ítems agregados a Mesa ${existing.table}`); setTab("pedidos"); return;
    }

    if (mergeModal) { setMergeModal(null); setMergeName(""); }
    const finalDraft = { ...draft, items: finalItems, taperCost: 0 }; 

    if (draft.payTiming === "ahora") {
      setCobrarTarget({ type: 'new', data: { id:Date.now().toString(), ...finalDraft, total, createdAt:new Date().toISOString() } });
    } else {
      const order = { id:Date.now().toString(), ...finalDraft, total, isPaid: false, status:"pendiente", kitchenStatus:"pendiente", createdAt:new Date().toISOString() };
      setOrders(prev => [...prev, order]); await saveOrders([...orders,order]);
      setDraft(newDraft()); showToast(`📝 Pedido enviado a cocina`); setTab("pedidos");
    }
  };

  const handleConfirmCobro = async (paymentData) => {
    if (!cobrarTarget) return;
    const target = cobrarTarget; setCobrarTarget(null);
    const payments = { efectivo: paymentData.efectivo, yape: paymentData.yape, tarjeta: paymentData.tarjeta };
    const sunatData = { sunatDocType: paymentData.sunatDocType, sunatDocNum: paymentData.sunatDocNum, sunatCustomerName: paymentData.sunatCustomerName, sunatCustomerAddress: paymentData.sunatCustomerAddress };

    if (target.type === 'split') {
        const originalOrder = target.data.originalOrder;
        const splitItems = target.data.splitItems;
        const paidItems = splitItems.map(si => ({...si, qty: si.splitQty}));
        const finishedOrder = { ...originalOrder, id: Date.now().toString(), items: paidItems, total: target.data.total, isPaid: true, status: "pagado", payments, paidAt: new Date().toISOString(), ...sunatData };
        
        let remainingItems = originalOrder.items.map(origItem => {
           const splitItem = splitItems.find(si => si.cartId === origItem.cartId);
           if (splitItem) {
               return { ...origItem, qty: origItem.qty - splitItem.splitQty, individualNotes: origItem.individualNotes.slice(splitItem.splitQty) };
           }
           return origItem;
        }).filter(i => i.qty > 0);
        
        if (remainingItems.length === 0) {
           const newOrders = orders.filter(x => x.id !== originalOrder.id);
           setOrders(newOrders); await Promise.all([ addHistory(finishedOrder), saveOrders(newOrders) ]);
        } else {
           const newTotal = remainingItems.reduce((s,i) => s + i.price * i.qty, 0);
           const updatedOriginal = { ...originalOrder, items: remainingItems, total: newTotal };
           const newOrders = orders.map(o => o.id === originalOrder.id ? updatedOriginal : o);
           setOrders(newOrders); await Promise.all([ addHistory(finishedOrder), saveOrders(newOrders) ]);
        }
        showToast("💰 Cuenta dividida cobrada");
        setTab("pedidos"); return;
    }

    if (target.type === 'new') {
      const order = { ...target.data, isPaid: true, status: "pendiente", kitchenStatus: "pendiente", payments, paidAt: new Date().toISOString(), ...sunatData };
      setOrders(prev => [...prev, order]); await saveOrders([...orders, order]);
      setDraft(newDraft()); showToast("✅ Pedido cobrado y enviado a cocina"); setTab("pedidos");
    } else if (target.type === 'existing') {
      const o = target.data;
      const newOrders = orders.filter(x => x.id !== o.id); setOrders(newOrders); 
      const finished = { ...o, isPaid: true, status: "pagado", payments, paidAt: new Date().toISOString(), ...sunatData };
      await Promise.all([addHistory(finished), saveOrders(newOrders)]);
      showToast("💰 Pedido cobrado y archivado");
    }
  };

  const finishPaidOrder = async (id) => {
    const o = orders.find(x=>x.id===id); if (!o) return;
    const newOrders = orders.filter(x=>x.id!==id); setOrders(newOrders); 
    const finished = { ...o, status: "pagado" }; await Promise.all([addHistory(finished), saveOrders(newOrders)]);
    showToast("✅ Pedido entregado y archivado");
  };

  const cancelOrder = async (id) => {
    const o = orders.find(x=>x.id===id); if (!o) return;
    const newOrders = orders.filter(x=>x.id!==id); setOrders(newOrders); 
    const finished = {...o,status:"cancelado",cancelledAt:new Date().toISOString(),createdAt:o.createdAt||new Date().toISOString()};
    await Promise.all([addHistory(finished), saveOrders(newOrders)]); showToast("❌ Pedido cancelado","#e74c3c");
  };

  const deleteOrderPermanent = async (id) => {
    const newOrders = orders.filter(x=>x.id!==id); setOrders(newOrders); await saveOrders(newOrders);
    setConfirmDelete(null); showToast("🗑️ Pedido eliminado","#888");
  };

  const saveEditedOrder = async (updated) => {
    setOrders(prev => prev.map(o=>o.id===updated.id?updated:o)); await saveOrders(orders.map(o=>o.id===updated.id?updated:o));
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

  if (splash) return (
    <div style={{background:"#111",height:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:20}}>
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Nunito:wght@400;700;900&display=swap" rel="stylesheet"/>
      <div style={{fontSize:90}}>🍔</div>
      <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:36,color:"#FFD700",letterSpacing:4}}>MR. PAPACHOS</div>
      <div style={{fontFamily:"'Nunito',sans-serif",color:"#555",fontSize:13,letterSpacing:3,textTransform:"uppercase"}}>Cajamarca</div>
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

  if (!currentUser) return <LoginScreen onLogin={(user) => { setCurrentUser(user); setTab(user.id === 'cocinero' ? 'cocina' : 'mesas'); }} s={s} Y={Y} />;
  if (!loaded) return <div style={{background:"#111",color:"#FFD700",height:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{textAlign:"center"}}><div style={{fontSize:52}}>🍔</div><div style={{marginTop:12,fontWeight:700,letterSpacing:2}}>Cargando Sucursal...</div></div></div>;

  const allTabs = [
    {id:"dashboard", label:isMobile?"📊":"📊 Inicio"}, {id:"mesas", label:isMobile?"🪑":"🪑 Mesas"}, {id:"nuevo", label:isMobile?"➕":"➕ Nuevo"},
    {id:"pedidos", label:isMobile?`🍽️${orders.length>0?` ${orders.length}`:""}` : `🍽️ Pedidos${orders.length>0?` (${orders.length})`:""}`},
    {id:"cocina", label:isMobile?`👨‍🍳${orders.filter(o => o.kitchenStatus !== 'listo').length>0?` ${orders.filter(o => o.kitchenStatus !== 'listo').length}`:""}` : `👨‍🍳 Cocina${orders.filter(o => o.kitchenStatus !== 'listo').length>0?` (${orders.filter(o => o.kitchenStatus !== 'listo').length})`:""}`},
    {id:"historial", label:isMobile?"📋":"📋 Historial"}, {id:"inventario",label:isMobile?"📦":"📦 Inventario"}, {id:"carta", label:isMobile?"🍔":"🍔 Carta"},
  ];

  const tabs = allTabs.filter(t => {
    if (currentUser.id === 'admin') return true;
    if (currentUser.id === 'cajero') return ['dashboard', 'mesas', 'pedidos', 'historial', 'nuevo'].includes(t.id);
    if (currentUser.id === 'mesero') return ['mesas', 'nuevo', 'pedidos', 'carta'].includes(t.id);
    if (currentUser.id === 'cocinero') return ['cocina'].includes(t.id);
    return false;
  });

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Nunito:wght@400;700;900&display=swap" rel="stylesheet"/>
      <div style={s.app}>
        <header style={s.header}>
          <div>
            <h1 style={s.logo}>🍔 MR. PAPACHOS · CAJAMARCA</h1>
            {!isMobile&&<div style={{fontSize:11,color:"#555",fontWeight:700}}>Modo: {currentUser.label} | SUCURSAL: {currentUser.localName.toUpperCase()}</div>}
          </div>
          <div style={{display:"flex", gap:10, alignItems:"center"}}>
            {!isMobile&&<div style={{fontSize:11,color:"#333",fontWeight:700,textAlign:"right"}}>{new Date().toLocaleDateString("es-PE",{weekday:"long",day:"numeric",month:"long"})}</div>}
            <button style={{...s.btn("danger"), fontSize:10, padding:"4px 8px"}} onClick={()=>setCurrentUser(null)}>Salir</button>
          </div>
        </header>

        <nav style={s.nav}>{tabs.map(t=>(<button key={t.id} style={{...s.navBtn(tab===t.id),flex:isMobile?1:"none"}} onClick={()=>setTab(t.id)}>{t.label}</button>))}</nav>

        {toast&&(<div style={{position:"fixed",bottom:isMobile ? 90 : 20,left:"50%",transform:"translateX(-50%)",background:toast.color,color:"#fff",padding:"10px 20px",borderRadius:12,fontWeight:800,zIndex:9999,fontSize:14,boxShadow:"0 4px 20px rgba(0,0,0,.5)",whiteSpace:"nowrap"}}>{toast.msg}</div>)}

        {cobrarTarget && <div style={s.overlay} onClick={()=>setCobrarTarget(null)}><CobrarModal orderContext={cobrarTarget.data} total={cobrarTarget.data.total} onConfirm={handleConfirmCobro} onClose={()=>setCobrarTarget(null)} s={s} Y={Y} /></div>}
        {splitTarget && <SplitBillModal order={splitTarget} onProceed={(items, total) => { setCobrarTarget({ type: 'split', data: { originalOrder: splitTarget, splitItems: items, total }}); setSplitTarget(null); }} onClose={() => setSplitTarget(null)} s={s} Y={Y} fmt={fmt} />}
        {editingOrder&&<div style={s.overlay} onClick={()=>setEditingOrder(null)}><EditOrderModal order={editingOrder} onSave={saveEditedOrder} onClose={()=>setEditingOrder(null)} menu={menu} isMobile={isMobile} s={s} Y={Y}/></div>}
        {mesaModal&&<div style={s.overlay} onClick={()=>setMesaModal(null)}><MesaModalComponent num={mesaModal} orders={orders} setDraft={setDraft} newDraft={newDraft} onClose={()=>setMesaModal(null)} setTab={setTab} setCobrarTarget={setCobrarTarget} setSplitTarget={setSplitTarget} setEditingOrder={setEditingOrder} printOrder={printOrder} isMobile={isMobile} s={s} Y={Y} fmt={fmt} /></div>}
        
        {mergeModal && (
          <div style={s.overlay} onClick={() => setMergeModal(null)}>
            <div style={{...s.modal, maxWidth:400}} onClick={e => e.stopPropagation()}>
              <div style={{fontSize:36, textAlign:"center", marginBottom:10}}>➕</div>
              <div style={{fontWeight:900, fontSize:18, marginBottom:6, color:Y, textAlign:"center", fontFamily:"'Bebas Neue',cursive", letterSpacing:1}}>MESA {mergeModal.existingOrder.table} YA TIENE PEDIDO</div>
              <div style={{color:"#aaa", fontSize:13, textAlign:"center", marginBottom:16}}>{mergeModal.newDraftData.orderType === "llevar" ? <>¿Deseas <b style={{color:"#3498db"}}>acoplar este pedido 🥡 Para Llevar</b> a la mesa?</> : "¿Qué quieres hacer con los nuevos ítems?"}</div>
              {mergeModal.newDraftData.orderType === "llevar" && <div style={{marginBottom:14}}><input style={{...s.input, borderColor:"#3498db"}} placeholder="Nombre (Ej: Juan)" value={mergeName} onChange={e => setMergeName(e.target.value)} spellCheck="false" /></div>}
              <div style={{background:"#111", borderRadius:8, padding:10, marginBottom:12, border:"1px solid #2a2a2a"}}><div style={{fontSize:11, color:"#666", textTransform:"uppercase", letterSpacing:1, marginBottom:6}}>Pedido existente</div>{mergeModal.existingOrder.items.map((item,i) => (<div key={i} style={{display:"flex", justifyContent:"space-between", fontSize:12, color:"#888", padding:"2px 0"}}><span>{item.qty}x {item.name}</span><span>{fmt(item.price * item.qty)}</span></div>))}<div style={{borderTop:"1px solid #2a2a2a", marginTop:6, paddingTop:6, display:"flex", justifyContent:"space-between", fontWeight:900, fontSize:13}}><span>Subtotal</span><span style={{color:Y}}>{fmt(mergeModal.existingOrder.total)}</span></div></div>
              <div style={{background:"#0a1f0a", borderRadius:8, padding:10, marginBottom:16, border:"1px solid #27ae6044"}}><div style={{fontSize:11, color:"#27ae60", textTransform:"uppercase", letterSpacing:1, marginBottom:6}}>{mergeModal.newDraftData.orderType === "llevar" ? "🥡 Ítems Para Llevar a agregar" : "Nuevos ítems a agregar"}</div>{mergeModal.newDraftData.items.map((item,i) => (<div key={i} style={{display:"flex", justifyContent:"space-between", fontSize:12, color:"#aaa", padding:"2px 0"}}><span>{item.qty}x {item.name}</span><span>{fmt(item.price * item.qty)}</span></div>))}<div style={{borderTop:"1px solid #27ae6033", marginTop:6, paddingTop:6, display:"flex", justifyContent:"space-between", fontWeight:900, fontSize:13}}><span style={{color:"#27ae60"}}>+ Subtotal</span><span style={{color:"#27ae60"}}>{fmt(mergeModal.newDraftData.items.reduce((s,i)=>s+i.price*i.qty,0))}</span></div></div>
              <div style={{display:"flex", flexDirection:"column", gap:8}}><button style={{...s.btn("success"), padding:14, fontSize:14, width:"100%"}} onClick={() => submitOrder("merge")}>➕ Agregar al pedido existente<div style={{fontSize:11, fontWeight:400, marginTop:2, opacity:0.8}}>Total: {fmt(mergeModal.existingOrder.total + mergeModal.newDraftData.items.reduce((s,i)=>s+i.price*i.qty,0) + (mergeModal.newDraftData.taperNum || 0))}</div></button><button style={{...s.btn("blue"), padding:12, fontSize:13, width:"100%"}} onClick={() => submitOrder("new")}>📋 Crear pedido separado para Mesa {mergeModal.existingOrder.table}</button><button style={{...s.btn("secondary"), padding:10, fontSize:12, width:"100%"}} onClick={() => setMergeModal(null)}>✕ Cancelar</button></div>
            </div>
          </div>
        )}

        {confirmDelete&&<div style={s.overlay} onClick={()=>setConfirmDelete(null)}><div style={{...s.modal,maxWidth:340,textAlign:"center"}} onClick={e=>e.stopPropagation()}><div style={{fontSize:42,marginBottom:12}}>🗑️</div><div style={{fontWeight:900,fontSize:17,marginBottom:8,color:"#eee"}}>¿Eliminar pedido?</div><div style={{color:"#888",fontSize:13,marginBottom:20}}>Esta acción no se puede deshacer.</div><div style={{display:"flex",gap:10}}><button style={{...s.btn("secondary"),flex:1}} onClick={()=>setConfirmDelete(null)}>Cancelar</button><button style={{...s.btn("danger"),flex:1}} onClick={()=>deleteOrderPermanent(confirmDelete)}>🗑️ Eliminar</button></div></div></div>}

        <div style={s.content}>
          {tab==="dashboard"  && <DashboardComponent orders={orders} history={history} fmt={fmt} setTab={setTab} finishPaidOrder={finishPaidOrder} setCobrarTarget={setCobrarTarget} isMobile={isMobile} s={s} Y={Y} />}
          {tab==="mesas"      && <MesasComponent orders={orders} setDraft={setDraft} newDraft={newDraft} setTab={setTab} setMesaModal={setMesaModal} finishPaidOrder={finishPaidOrder} setCobrarTarget={setCobrarTarget} setSplitTarget={setSplitTarget} setEditingOrder={setEditingOrder} printOrder={printOrder} cancelOrder={cancelOrder} isMobile={isMobile} isTablet={isTablet} s={s} Y={Y} fmt={fmt} MESAS={MESAS} />}
          {tab==="nuevo"      && <NuevoPedidoComponent draft={draft} setDraft={setDraft} menu={menu} addItem={addItem} changeQty={changeQty} updateIndividualNote={updateIndividualNote} draftTotal={draftTotal} fmt={fmt} submitOrder={submitOrder} newDraft={newDraft} s={s} Y={Y} isDesktop={isDesktop} isMobile={isMobile} />}
          {tab==="pedidos"    && <PedidosComponent orders={orders} setTab={setTab} finishPaidOrder={finishPaidOrder} setCobrarTarget={setCobrarTarget} setSplitTarget={setSplitTarget} setEditingOrder={setEditingOrder} printOrder={printOrder} cancelOrder={cancelOrder} setConfirmDelete={setConfirmDelete} isMobile={isMobile} s={s} Y={Y} fmt={fmt} />}
          {tab==="cocina"     && <CocinaComponent orders={orders} kitchenChecks={kitchenChecks} setKitchenChecks={setKitchenChecks} markKitchenListo={markKitchenListo} isMobile={isMobile} isDesktop={isDesktop} s={s} Y={Y} />}
          {tab==="historial"  && <HistorialComponent history={history} isMobile={isMobile} s={s} Y={Y} fmt={fmt} getPay={getPay} printOrder={printOrder} />}
          {tab==="inventario" && <Inventario menu={menu} orders={orders} history={history} isMobile={isMobile} s={s} Y={Y} fmt={fmt}/>}
          {tab==="carta"      && <CartaComponent menu={menu} cartaCatFilter={cartaCatFilter} setCartaCatFilter={setCartaCatFilter} showAdd={showAdd} setShowAdd={setShowAdd} newItem={newItem} setNewItem={setNewItem} addMenuItem={addMenuItem} deleteMenuItem={deleteMenuItem} isMobile={isMobile} s={s} Y={Y} fmt={fmt} ALL_CATS={ALL_CATS} />}
        </div>
      </div>
    </>
  )
}