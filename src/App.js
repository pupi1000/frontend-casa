import React, { useState, useEffect, useRef } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import { Container, Button, Modal, Form, Spinner, Badge } from 'react-bootstrap';
import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, orderBy, limit, onSnapshot, doc, setDoc } from "firebase/firestore";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { motion, AnimatePresence } from "framer-motion";
import html2canvas from 'html2canvas'; 
import { FaBroom, FaUtensils, FaBath, FaTools, FaCheckCircle, FaCog, FaHistory, FaTrash, FaPlusCircle, FaLock, FaCalendarAlt, FaCamera } from "react-icons/fa";

// --- TUS CLAVES ---
const firebaseConfig = {
  apiKey: "AIzaSyBJ25t7cGyyMGWfAP7Wbqk8GhI5blkamBg",
  authDomain: "calendariocasa-46be7.firebaseapp.com",
  projectId: "calendariocasa-46be7",
  storageBucket: "calendariocasa-46be7.firebasestorage.app",
  messagingSenderId: "435220870770",
  appId: "1:435220870770:web:a6c632351def012ce134eb",
  measurementId: "G-4DGKJG8DPE"
};

const VAPID_KEY = "BHb07sGWZS0RlUBqKME8Hpn9QmWWosCBJNu3z6QsLbgLqtKx4QDffDJLSvRihZq9C1Z949lmtT55HpFCP36HgWQ";
const API_URL = "https://backend-casa.onrender.com"; 

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const messaging = getMessaging(app);

// DATOS
const usuarios = [
  { nombre: 'Dani', color: '#6C63FF', avatar: '👨‍💻' },
  { nombre: 'Mamá', color: '#FF6584', avatar: '👩‍❤️‍💋‍👩' },
  { nombre: 'Pupi', color: '#3BDE86', avatar: '🐶' },
  { nombre: 'Admin', color: '#2d3436', avatar: '🛡️' }
];
const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

// HORARIO
const horarioDefault = {
  'Lavar Servicios': { 1: 'Pupi', 2: 'Mamá', 3: 'Dani', 4: 'Dani', 5: 'Pupi', 6: 'Pupi', 0: 'Mamá' },
  'Trapear Cocina': { 1: 'Pupi', 2: 'Mamá', 3: 'Dani', 4: 'Dani', 5: 'Pupi', 6: 'Pupi', 0: 'Mamá' },
  'Cocinar': { 1: 'Mamá', 2: 'Buchu', 3: 'Mamá', 4: 'Mamá', 5: 'Buchu', 6: 'Opcional', 0: 'Opcional' },
  'Baños': { 3: 'Mamá', 0: 'Mamá' },
  'Mantenimiento': { 2: 'Pupi', 6: 'Todos', 0: 'Paseo' }
};

const listaTareasComunes = Object.keys(horarioDefault);
const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };
const itemVariants = { hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } };

function App() {
  const [usuarioActual, setUsuarioActual] = useState(null);
  const [diaActualIndex, setDiaActualIndex] = useState(new Date().getDay());
  const [tareasDeHoy, setTareasDeHoy] = useState([]);
  
  // ESTADO VIVO
  const [horario, setHorario] = useState(horarioDefault);

  // States Login
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [loginError, setLoginError] = useState(false);

  // UI States
  const [modalTarea, setModalTarea] = useState(false);
  const [modalConfig, setModalConfig] = useState(false);
  const [modalAsignar, setModalAsignar] = useState(false);
  const [modalCalendario, setModalCalendario] = useState(false);
  const [modalEditarCelda, setModalEditarCelda] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [calendarioRef, setCalendarioRef] = useState(null); 

  // Edición
  const [celdaEditando, setCeldaEditando] = useState({ tarea: '', dia: 0 });
  const [nuevoResponsable, setNuevoResponsable] = useState("");
  
  // Acciones
  const [tareaSeleccionada, setTareaSeleccionada] = useState(null);
  const [asignarA, setAsignarA] = useState("Dani");
  const [tareaAsignar, setTareaAsignar] = useState(listaTareasComunes[0]);
  const [comentario, setComentario] = useState("");
  const [historial, setHistorial] = useState([]);
  
  // Tokens
  const [miToken, setMiToken] = useState("");
  const [tokenMama, setTokenMama] = useState(localStorage.getItem('tokenMama') || "");

  // 1. CARGA INICIAL
  useEffect(() => {
    // A. HISTORIAL EN VIVO
    const q = query(collection(db, "historial_tareas"), orderBy("fecha", "desc"), limit(20));
    const unsubHistorial = onSnapshot(q, (snap) => {
      setHistorial(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // B. HORARIO EN VIVO
    const docRef = doc(db, "configuracion", "horario_semanal");
    const unsubHorario = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setHorario(docSnap.data().data);
      } else {
        setDoc(docRef, { data: horarioDefault });
      }
    });

    // C. Escuchar mensajes en primer plano
    onMessage(messaging, (payload) => {
      console.log("Mensaje recibido en primer plano:", payload);
      new Notification(payload.notification.title, { body: payload.notification.body });
    });

    return () => { unsubHistorial(); unsubHorario(); };
  }, []);

  // 2. GENERAR TOKEN
  useEffect(() => {
    if (usuarioActual && VAPID_KEY) {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
           getToken(messaging, { vapidKey: VAPID_KEY })
             .then((token) => {
                console.log("Mi Token generado:", token);
                setMiToken(token);
             })
             .catch((err) => console.error("Error obteniendo token:", err));
        } else {
            console.log("Permiso de notificaciones denegado");
        }
      });
    }
  }, [usuarioActual]);

  // 3. CALCULAR TAREAS
  useEffect(() => {
    if (usuarioActual && usuarioActual.nombre !== 'Admin') {
      const tareasPotenciales = [];
      
      for (const [nombre, asig] of Object.entries(horario)) {
        let resp = asig[diaActualIndex];
        const soyYo = resp === usuarioActual.nombre;
        const esTodos = resp === 'Todos';
        const esBuchu = (resp === 'Buchu' || resp === 'Opcional') && usuarioActual.nombre === 'Mamá';
        
        if (soyYo || esTodos || esBuchu) {
          tareasPotenciales.push({ nombre: nombre, responsableOriginal: resp });
        }
      }

      // Filtro local simple (si el backend guarda fecha completa, esto funciona mejor comparando strings)
      // Usaremos la fechaLegible del historial para comparar si contiene la fecha de hoy "dd/mm/yyyy"
      const hoy = new Date().toLocaleDateString("es-BO", { timeZone: "America/La_Paz" });
      
      const tareasHechasHoy = historial.filter(h => {
        // h.fechaLegible suele ser "dd/mm/yyyy, hh:mm:ss" o similar. Buscamos si empieza con la fecha de hoy.
        return h.fechaLegible && h.fechaLegible.includes(hoy) && h.quien === usuarioActual.nombre;
      }).map(h => h.tarea);

      const pendientes = tareasPotenciales.filter(t => !tareasHechasHoy.includes(t.nombre));
      setTareasDeHoy(pendientes);
    }
  }, [usuarioActual, diaActualIndex, horario, historial]);

  // --- ACCIONES ---

  const handleDescargarCalendario = async () => {
    const elemento = document.getElementById("calendario-div");
    if (elemento) {
      const canvas = await html2canvas(elemento, { 
          scale: 2, 
          backgroundColor: "#ffffff",
          windowWidth: 1200, 
          width: 1200
      });
      const image = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = image;
      link.download = "Calendario_Casa.png";
      link.click();
    }
  };

  const enviarAlBackend = async (tarea, quien, comm) => {
    setEnviando(true);
    const datos = {
      tarea: tarea,
      quien: quien,
      comentario: comm || "Sin comentarios",
      tokenMama: tokenMama || miToken
    };
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); 

      const res = await fetch(`${API_URL}/api/completar-tarea`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        setModalTarea(false);
        setModalAsignar(false);
        setComentario("");
      } else {
        alert("Error del servidor (Intenta de nuevo).");
      }
    } catch (e) {
      alert("⚠️ Servidor despertando (Render es gratis y lento). Intenta de nuevo en 30 segundos.");
    }
    setEnviando(false);
  };

  const handleBorrar = async (id) => {
    if (!window.confirm("¿Borrar?")) return;
    try { await fetch(`${API_URL}/api/borrar-tarea/${id}`, { method: 'DELETE' }); } catch (e) {}
  };

  const guardarCambioHorario = async () => {
    const nuevoHorario = { ...horario };
    if (!nuevoHorario[celdaEditando.tarea]) nuevoHorario[celdaEditando.tarea] = {};
    nuevoHorario[celdaEditando.tarea][celdaEditando.dia] = nuevoResponsable;
    
    try {
      await setDoc(doc(db, "configuracion", "horario_semanal"), { data: nuevoHorario });
      setHorario(nuevoHorario); 
      setModalEditarCelda(false);
    } catch (e) { alert("Error guardando: " + e.message); }
  };

  const getIcon = (n) => {
    if(n.includes('Lavar')) return <FaUtensils/>;
    if(n.includes('Trapear')) return <FaBroom/>;
    if(n.includes('Baños')) return <FaBath/>;
    if(n.includes('Mantenimiento')) return <FaTools/>;
    return <FaCheckCircle/>;
  };

  // --- VISTAS ---

  if (!usuarioActual) {
    return (
      <div className="login-container">
        <h1 className="fw-bold mb-5" style={{color: '#6C63FF'}}>🏠 HouseApp</h1>
        {usuarios.map(u => (
          <div key={u.nombre} className="profile-card" onClick={() => {
              if (u.nombre === 'Admin') { setShowLoginModal(true); setPasswordInput(""); setLoginError(false); }
              else setUsuarioActual(u);
          }}>
            <div style={{fontSize:'2rem'}}>{u.avatar}</div>
            <div className="fw-bold fs-5 flex-grow-1">{u.nombre}</div>
          </div>
        ))}

        <Modal show={showLoginModal} onHide={() => setShowLoginModal(false)} centered size="sm">
          <Modal.Body className="p-4 text-center">
            <h5 className="mb-3">Admin</h5>
            <Form.Control type="password" placeholder="****" className="text-center mb-3 fs-4"
              value={passwordInput} onChange={e => setPasswordInput(e.target.value)} />
            {loginError && <p className="text-danger small">Clave incorrecta</p>}
            <Button className="btn-action" onClick={() => {
              if(passwordInput === '1234') { setUsuarioActual(usuarios.find(u=>u.nombre==='Admin')); setShowLoginModal(false); }
              else setLoginError(true);
            }}>Entrar</Button>
          </Modal.Body>
        </Modal>
      </div>
    );
  }

  return (
    <div style={{minHeight: '100vh', paddingBottom: '80px', background: '#f8f9fa'}}>
      
      <div className="app-header">
        <div className="d-flex align-items-center gap-3">
          <div style={{fontSize:'1.8rem'}}>{usuarioActual.avatar}</div>
          <div>
            <h3 className="fw-bold m-0">{usuarioActual.nombre}</h3>
            <Badge bg="light" text="dark" className="fw-normal border">{diasSemana[diaActualIndex]}</Badge>
          </div>
        </div>
        <div className="d-flex gap-2">
          <Button variant="light" className="rounded-circle shadow-sm" onClick={() => setModalCalendario(true)}><FaCalendarAlt color="#6C63FF"/></Button>
          {usuarioActual.nombre === 'Admin' && (
            <Button variant="success" className="rounded-circle shadow-sm" onClick={() => setModalAsignar(true)}><FaPlusCircle/></Button>
          )}
          <Button variant="light" className="rounded-circle shadow-sm" onClick={() => setModalConfig(true)}><FaCog/></Button>
        </div>
      </div>

      <Container className="mt-4">
        
        {usuarioActual.nombre !== 'Admin' && (
          <motion.div variants={containerVariants} initial="hidden" animate="visible">
            <h5 className="text-muted mb-3 fw-bold">📍 Misiones Pendientes</h5>
            {tareasDeHoy.length === 0 ? (
              <div className="text-center py-5 opacity-50">
                <h1>🎉</h1>
                <p>¡Todo listo por hoy!</p>
              </div>
            ) : (
              tareasDeHoy.map((t, i) => (
                <motion.div key={i} variants={itemVariants} className="task-card">
                  <div className="d-flex align-items-center">
                    <div style={{fontSize:'1.5rem', color: usuarioActual.color, marginRight:'15px'}}>{getIcon(t.nombre)}</div>
                    <div>
                      <h6 className="fw-bold m-0">{t.nombre}</h6>
                      <small className="text-muted">{t.responsableOriginal}</small>
                    </div>
                  </div>
                  <Button variant="light" onClick={() => { setTareaSeleccionada(t); setModalTarea(true); }} className="rounded-circle p-3">
                    <FaCheckCircle size={24} color={usuarioActual.color}/>
                  </Button>
                </motion.div>
              ))
            )}
          </motion.div>
        )}

        {usuarioActual.nombre === 'Admin' && (
          <div className="bg-white p-4 rounded-4 shadow-sm text-center mb-4">
            <h5>Panel de Control</h5>
            <p className="text-muted small">Modifica el calendario o registra tareas.</p>
          </div>
        )}

        <Button variant="danger" className="rounded-pill px-4 py-2 shadow position-fixed" 
          style={{bottom: '20px', left: '50%', transform: 'translateX(-50%)', zIndex: 100}}
          onClick={() => setUsuarioActual(null)}>SALIR</Button>

      </Container>

      <div className="history-section">
        <h5 className="fw-bold mb-4 d-flex align-items-center gap-2"><FaHistory/> Actividad Reciente</h5>
        <AnimatePresence>
          {historial.map(h => (
            <motion.div key={h.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="history-item">
               <div className="fs-3 me-3">{usuarios.find(u => u.nombre === h.quien)?.avatar || '👤'}</div>
               <div className="flex-grow-1">
                 <div className="d-flex justify-content-between">
                   <strong>{h.quien}</strong>
                   {/* Aquí mostramos fechaLegible que ya viene con hora de Bolivia desde el Backend */}
                   <small className="text-muted">{h.fechaLegible || "Reciente"}</small>
                 </div>
                 <div>Hizo: <strong style={{color: '#6C63FF'}}>{h.tarea}</strong></div>
               </div>
               {usuarioActual.nombre === 'Admin' && (
                   <button className="btn btn-sm btn-outline-danger border-0" onClick={() => handleBorrar(h.id)}><FaTrash/></button>
               )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* MODAL 1: TAREA */}
      <Modal show={modalTarea} onHide={() => setModalTarea(false)} centered contentClassName="border-0 rounded-4">
        <Modal.Body className="p-4 text-center">
            <h4 className="fw-bold mb-3">{tareaSeleccionada?.nombre}</h4>
            <Form.Control as="textarea" className="custom-input mb-3" rows={2} placeholder="Nota..."
                value={comentario} onChange={e => setComentario(e.target.value)} />
            <Button className="btn-action" onClick={() => enviarAlBackend(tareaSeleccionada.nombre, usuarioActual.nombre, comentario)} disabled={enviando}>
                {enviando ? <Spinner size="sm" animation="border"/> : "¡Listo!"}
            </Button>
        </Modal.Body>
      </Modal>

      {/* MODAL 2: REGISTRO ADMIN */}
      <Modal show={modalAsignar} onHide={() => setModalAsignar(false)} centered contentClassName="border-0 rounded-4">
        <Modal.Header closeButton><Modal.Title>Registrar</Modal.Title></Modal.Header>
        <Modal.Body className="p-4">
            <Form.Select className="custom-input mb-3" value={asignarA} onChange={e => setAsignarA(e.target.value)}>
                {usuarios.filter(u => u.nombre !== 'Admin').map(u => <option key={u.nombre} value={u.nombre}>{u.nombre}</option>)}
            </Form.Select>
            <Form.Select className="custom-input mb-3" value={tareaAsignar} onChange={e => setTareaAsignar(e.target.value)}>
                {listaTareasComunes.map(t => <option key={t} value={t}>{t}</option>)}
            </Form.Select>
            <Button className="btn-action" onClick={() => enviarAlBackend(tareaAsignar, asignarA, `Admin: ${comentario}`)} disabled={enviando}>Guardar</Button>
        </Modal.Body>
      </Modal>

      {/* MODAL 3: CALENDARIO */}
      <Modal show={modalCalendario} onHide={() => setModalCalendario(false)} size="xl" centered contentClassName="border-0 rounded-4">
        <Modal.Header closeButton className="border-0">
            <Modal.Title className="fw-bold d-flex align-items-center gap-2">📅 Calendario
                <Button size="sm" variant="outline-primary" onClick={handleDescargarCalendario}><FaCamera/> Foto</Button>
            </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-0">
            <div className="calendar-container" id="calendario-div">
                <div className="p-3 text-center bg-white"><h4 className="fw-bold m-0" style={{color:'#6C63FF'}}>Horario Semanal</h4></div>
                <div className="scroll-container">
                    <table className="calendar-table">
                        <thead className="calendar-header">
                            <tr><th>Tarea</th><th>Lun</th><th>Mar</th><th>Mié</th><th>Jue</th><th>Vie</th><th>Sáb</th><th>Dom</th></tr>
                        </thead>
                        <tbody>
                            {Object.entries(horario).map(([nombreTarea, dias]) => (
                                <tr key={nombreTarea} className="calendar-row">
                                    <td className="fw-bold bg-light">{nombreTarea}</td>
                                    {[1, 2, 3, 4, 5, 6, 0].map(dia => (
                                        <td key={dia} onClick={() => {
                                            if (usuarioActual.nombre === 'Admin') {
                                                setCeldaEditando({ tarea: nombreTarea, dia });
                                                setNuevoResponsable(dias[dia] || "Nadie");
                                                setModalEditarCelda(true);
                                            }
                                        }}>
                                            <div className={`calendar-cell ${usuarioActual.nombre === 'Admin' ? 'admin-mode' : ''}`}>
                                                {dias[dia] || '-'}
                                            </div>
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            {usuarioActual.nombre === 'Admin' && <div className="p-2 text-center text-muted small">Toca una celda para editar</div>}
        </Modal.Body>
      </Modal>

      {/* MODAL 4: EDITAR CELDA */}
      <Modal show={modalEditarCelda} onHide={() => setModalEditarCelda(false)} centered size="sm">
          <Modal.Header closeButton><Modal.Title>Editar</Modal.Title></Modal.Header>
          <Modal.Body>
              <Form.Select className="custom-input mb-3" value={nuevoResponsable} onChange={e => setNuevoResponsable(e.target.value)}>
                  <option value="Nadie">Nadie</option>
                  {usuarios.filter(u => u.nombre !== 'Admin').map(u => <option key={u.nombre} value={u.nombre}>{u.nombre}</option>)}
                  <option value="Mamá">Mamá</option>
                  <option value="Buchu">Buchu</option>
                  <option value="Todos">Todos</option>
              </Form.Select>
              <Button className="btn-action" onClick={guardarCambioHorario}>Guardar</Button>
          </Modal.Body>
      </Modal>

      {/* MODAL 5: CONFIG */}
      <Modal show={modalConfig} onHide={() => setModalConfig(false)} centered>
        <Modal.Body className="p-4">
           <h5 className="mb-3">Configuración</h5>
           <label className="small text-muted">Mi Token</label>
           <Form.Control className="custom-input mb-3 text-muted" readOnly value={miToken || "Cargando..."} />
           <label className="small text-muted">Token Mamá</label>
           <Form.Control className="custom-input mb-3" placeholder="Pegar..." value={tokenMama} onChange={e => {setTokenMama(e.target.value); localStorage.setItem('tokenMama', e.target.value)}} />
           <Button variant="secondary" className="w-100" onClick={() => setModalConfig(false)}>Cerrar</Button>
        </Modal.Body>
      </Modal>

    </div>
  );
}

export default App;