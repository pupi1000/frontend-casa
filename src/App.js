import React, { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
// Línea corregida (Copia y pega esto en la línea 3):
import { Container, Card, Button, Form, Modal, Alert, ListGroup, Badge } from 'react-bootstrap';
import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

// 1. CONFIGURACIÓN
const firebaseConfig = {
  apiKey: "AIzaSyBJ25t7cGyyMGWfAP7Wbqk8GhI5blkamBg",
  authDomain: "calendariocasa-46be7.firebaseapp.com",
  projectId: "calendariocasa-46be7",
  storageBucket: "calendariocasa-46be7.firebasestorage.app",
  messagingSenderId: "435220870770",
  appId: "1:435220870770:web:a6c632351def012ce134eb",
  measurementId: "G-4DGKJG8DPE"
};

// 2. TU LLAVE PÚBLICA (VAPID KEY) - ¡Pégala aquí si la tienes!
const VAPID_KEY = "PON_AQUI_TU_CLAVE_LARGA_DE_FIREBASE_WEB_PUSH"; 

// Inicializar
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const messaging = getMessaging(app);

// Datos fijos
const usuarios = ['Dani', 'Mamá', 'Pupi'];
const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const horario = {
  'Lavar Servicios': { 1: 'Pupi', 2: 'Mamá', 3: 'Dani', 4: 'Dani', 5: 'Pupi', 6: 'Pupi', 0: 'Mamá' },
  'Trapear Cocina': { 1: 'Pupi', 2: 'Mamá', 3: 'Dani', 4: 'Dani', 5: 'Pupi', 6: 'Pupi', 0: 'Mamá' },
  'Cocinar': { 1: 'Mamá', 2: 'Buchu', 3: 'Mamá', 4: 'Mamá', 5: 'Buchu', 6: 'Opcional', 0: 'Opcional' },
  'Baños': { 3: 'Mamá', 0: 'Mamá' },
  'Paseo/Todos': { 6: 'Todos', 0: 'Paseo' }
};

function App() {
  const [usuarioActual, setUsuarioActual] = useState(null);
  const [diaActualIndex] = useState(new Date().getDay());
  const [tareasDeHoy, setTareasDeHoy] = useState([]);
  const [modalShow, setModalShow] = useState(false);
  const [tareaSeleccionada, setTareaSeleccionada] = useState(null);
  const [comentario, setComentario] = useState("");
  const [historial, setHistorial] = useState([]);
  const [miToken, setMiToken] = useState("");
  const [tokenMama, setTokenMama] = useState(""); // Aquí pegaremos el token de Mamá para probar
  const [mensajeEstado, setMensajeEstado] = useState("");

  // Cargar historial en vivo
  useEffect(() => {
    const q = query(collection(db, "historial_tareas"), orderBy("fecha", "desc"), limit(10));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setHistorial(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Escuchar notificaciones si la app está abierta
    onMessage(messaging, (payload) => {
        alert(`🔔 NOTIFICACIÓN:\n${payload.notification.title}\n${payload.notification.body}`);
    });

    return () => unsubscribe();
  }, []);

  // Pedir permiso de notificaciones
  const activarNotificaciones = async () => {
    if (!VAPID_KEY || VAPID_KEY.startsWith("PON_AQUI")) {
        console.warn("Falta la VAPID KEY en el código. No se puede generar token.");
        return;
    }
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const token = await getToken(messaging, { vapidKey: VAPID_KEY });
        setMiToken(token);
      }
    } catch (error) {
      console.error("Error tokens:", error);
    }
  };

  // Calcular tareas
  useEffect(() => {
    if (usuarioActual) {
        activarNotificaciones();
        const tareas = [];
        for (const [nombre, asig] of Object.entries(horario)) {
            let resp = asig[diaActualIndex];
            if (resp === usuarioActual || resp === 'Todos' || (resp === 'Buchu' && usuarioActual !== 'Mamá')) {
                tareas.push({ nombre: nombre, responsableOriginal: resp });
            }
        }
        setTareasDeHoy(tareas);
    }
  }, [usuarioActual, diaActualIndex]);

  // --- ENVIAR AL BACKEND ---
  const handleEnviarTarea = async () => {
    if (!usuarioActual || !tareaSeleccionada) return;

    // Usamos el token de Mamá si lo escribimos, si no, usamos el propio para probar
    const tokenDestino = tokenMama || miToken; 

    const datos = {
        tarea: tareaSeleccionada.nombre,
        quien: usuarioActual,
        comentario: comentario || "Sin comentario",
        tokenMama: tokenDestino 
    };

    try {
        // CONECTAR CON TU SERVIDOR LOCAL
        const respuesta = await fetch('https://backend-casa.onrender.com', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datos)
        });

        const resultado = await respuesta.json();
        
        if (resultado.exito) {
            setMensajeEstado("✅ ¡Guardado en Firebase y Notificado!");
            setModalShow(false);
            setComentario("");
            setTimeout(() => setMensajeEstado(""), 3000);
        } else {
            alert("Error del servidor: " + resultado.error);
        }
    } catch (error) {
        console.error(error);
        alert("Error: No se puede conectar con el Backend (http://localhost:5000). ¿Está encendido?");
    }
  };

  // Vistas
  if (!usuarioActual) {
    return (
      <Container className="mt-5 text-center">
        <h1>🏠 ¿Quién eres?</h1>
        {usuarios.map(u => <Button key={u} className="m-2" size="lg" onClick={() => setUsuarioActual(u)}>{u}</Button>)}
      </Container>
    );
  }

  return (
    <Container className="py-3">
        <div className="d-flex justify-content-between mb-3">
            <h3>Hola, {usuarioActual}</h3>
            <Button variant="secondary" size="sm" onClick={() => setUsuarioActual(null)}>Salir</Button>
        </div>
        
        {mensajeEstado && <Alert variant="success">{mensajeEstado}</Alert>}

        {/* DEBUGGING: ZONA DE TOKENS */}
        <Card className="mb-3 bg-light border-warning">
            <Card.Body>
                <small>🔑 Mi Token (Copia este si eres Mamá):</small>
                <textarea className="form-control mb-2" style={{fontSize:'0.7em', height:'40px'}} readOnly value={miToken || "Cargando..."}></textarea>
                
                <small>📲 Token Destino (Pega aquí el token de Mamá):</small>
                <input type="text" className="form-control" style={{fontSize:'0.8em'}} placeholder="Pegar token aquí..." value={tokenMama} onChange={e => setTokenMama(e.target.value)} />
            </Card.Body>
        </Card>

        <Card className="mb-4">
            <Card.Header>📅 Tareas para Hoy</Card.Header>
            <Card.Body>
                {tareasDeHoy.map((t, i) => (
                    <div key={i} className="d-flex justify-content-between mb-2 border-bottom pb-2">
                        <span>{t.nombre}</span>
                        <Button variant="success" size="sm" onClick={()=>{setTareaSeleccionada(t); setModalShow(true)}}>Cumplir</Button>
                    </div>
                ))}
            </Card.Body>
        </Card>

        <h5>Historial Reciente</h5>
        <ListGroup>
            {historial.map(h => (
                <ListGroup.Item key={h.id}>
                    <strong>{h.quien}</strong>: {h.tarea} <Badge bg="secondary">{h.fechaLegible}</Badge>
                </ListGroup.Item>
            ))}
        </ListGroup>

        <Modal show={modalShow} onHide={() => setModalShow(false)}>
            <Modal.Header closeButton><Modal.Title>Confirmar</Modal.Title></Modal.Header>
            <Modal.Body>
                <Form.Control as="textarea" placeholder="Comentario..." value={comentario} onChange={e => setComentario(e.target.value)} />
            </Modal.Body>
            <Modal.Footer>
                <Button onClick={handleEnviarTarea}>Enviar y Notificar</Button>
            </Modal.Footer>
        </Modal>
    </Container>
  );
}

export default App;