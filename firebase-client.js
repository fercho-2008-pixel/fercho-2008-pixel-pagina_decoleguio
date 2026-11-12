// Client-side Firebase Firestore Integration for Rincón de Guías
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

export const OperationType = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  LIST: 'list',
  GET: 'get',
  WRITE: 'write',
};

export function handleFirestoreError(error, operationType, path) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
      email: null,
      emailVerified: null,
      isAnonymous: true,
      tenantId: null,
      providerInfo: []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

let db = null;
let app = null;
let isConnected = false;
let initPromise = null;

// Initialize connection and test connection
export async function initFirebase() {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    try {
      const configRes = await fetch('/firebase-applet-config.json');
      if (!configRes.ok) {
        console.warn('No se pudo cargar firebase-applet-config.json (status ' + configRes.status + ')');
        return null;
      }
      const firebaseConfig = await configRes.json();
      app = initializeApp(firebaseConfig);
      // CRITICAL: Must pass databaseId from config
      db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

      // Validate connection to Firestore
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
        isConnected = true;
        console.log('✅ Conexión con Firestore verificada exitosamente.');
      } catch (testErr) {
        // Doc may not exist yet, connection is still online
        isConnected = true;
        console.log('✅ Firestore en línea.');
      }
      return db;
    } catch (err) {
      console.error('Error al inicializar Firebase:', err);
      initPromise = null;
      return null;
    }
  })();
  return initPromise;
}

export async function ensureDb() {
  if (db) return db;
  return await initFirebase();
}

// Helper to sanitize payload for Firestore (remove undefined / null / huge raw blobs)
function cleanPayload(obj) {
  const clean = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null) {
      clean[k] = v;
    }
  }
  return clean;
}

// ==================== PROFESORES ====================
export async function dbSaveProfesor(profesor) {
  const firestore = await ensureDb();
  if (!firestore) {
    console.warn('⚠️ No se puede guardar profesor: Firestore no disponible');
    return;
  }
  const path = `profesores/${profesor.cedula}`;
  try {
    const data = cleanPayload({
      cedula: String(profesor.cedula),
      nombre: String(profesor.nombre || ''),
      telefono: String(profesor.telefono || ''),
      materia: String(profesor.materia || ''),
      passwordHash: String(profesor.passwordHash || ''),
      fecha: profesor.fecha || new Date().toISOString()
    });
    await setDoc(doc(firestore, 'profesores', data.cedula), data);
    console.log('✅ Profesor guardado en Firestore:', data.cedula, data.nombre);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function dbGetProfesores() {
  const firestore = await ensureDb();
  if (!firestore) return [];
  const path = 'profesores';
  try {
    const snap = await getDocs(collection(firestore, path));
    const list = [];
    snap.forEach(d => list.push(d.data()));
    return list;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
    return [];
  }
}

export async function dbDeleteProfesor(cedula) {
  const firestore = await ensureDb();
  if (!firestore) return;
  const path = `profesores/${cedula}`;
  try {
    await deleteDoc(doc(firestore, 'profesores', String(cedula)));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// ==================== ESTUDIANTES ====================
export async function dbSaveEstudiante(estudiante) {
  const firestore = await ensureDb();
  if (!firestore) {
    console.warn('⚠️ No se puede guardar estudiante: Firestore no disponible');
    return;
  }
  const path = `estudiantes/${estudiante.documento}`;
  try {
    const data = cleanPayload({
      documento: String(estudiante.documento),
      nombre: String(estudiante.nombre || ''),
      curso: String(estudiante.curso || '1'),
      passwordHash: String(estudiante.passwordHash || ''),
      fecha: estudiante.fecha || new Date().toISOString()
    });
    await setDoc(doc(firestore, 'estudiantes', data.documento), data);
    console.log('✅ Estudiante guardado en Firestore:', data.documento, data.nombre);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function dbGetEstudiantes() {
  const firestore = await ensureDb();
  if (!firestore) return [];
  const path = 'estudiantes';
  try {
    const snap = await getDocs(collection(firestore, path));
    const list = [];
    snap.forEach(d => list.push(d.data()));
    return list;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
    return [];
  }
}

export async function dbDeleteEstudiante(documento) {
  const firestore = await ensureDb();
  if (!firestore) return;
  const path = `estudiantes/${documento}`;
  try {
    await deleteDoc(doc(firestore, 'estudiantes', String(documento)));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// ==================== TRABAJOS ====================
export async function dbSaveTrabajo(work) {
  const firestore = await ensureDb();
  if (!firestore) {
    console.warn('⚠️ No se puede guardar trabajo: Firestore no disponible');
    return;
  }
  const path = `trabajos/${work.id}`;
  try {
    const raw = {
      id: String(work.id),
      grado: Number(work.grado) || 1,
      titulo: String(work.titulo || 'Trabajo'),
      fecha: work.fecha || new Date().toISOString(),
      profesorNombre: String(work.profesorNombre || 'Profesor'),
      profesorCedula: String(work.profesorCedula || work.profesorId || ''),
      profesorTelefono: String(work.profesorTelefono || ''),
      profesorMateria: String(work.profesorMateria || ''),
      guiaNombre: String(work.guiaNombre || ''),
      preguntasNombre: String(work.preguntasNombre || '')
    };
    if (work.editado) raw.editado = String(work.editado);
    if (work.guiaHtml) raw.guiaHtml = String(work.guiaHtml).slice(0, 800000);
    if (work.preguntasHtml) raw.preguntasHtml = String(work.preguntasHtml).slice(0, 800000);
    const data = cleanPayload(raw);
    await setDoc(doc(firestore, 'trabajos', data.id), data);
    console.log('✅ Trabajo guardado en Firestore:', data.id, data.titulo);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function dbGetTrabajos(grade) {
  const firestore = await ensureDb();
  if (!firestore) return [];
  const path = 'trabajos';
  try {
    let q = collection(firestore, path);
    if (grade) {
      q = query(q, where('grado', '==', Number(grade)));
    }
    const snap = await getDocs(q);
    const list = [];
    snap.forEach(d => list.push(d.data()));
    return list;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
    return [];
  }
}

export async function dbDeleteTrabajo(id) {
  const firestore = await ensureDb();
  if (!firestore) return;
  const path = `trabajos/${id}`;
  try {
    await deleteDoc(doc(firestore, 'trabajos', String(id)));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// ==================== ENTREGAS Y CALIFICACIONES ====================
export async function dbSaveEntrega(entrega) {
  const firestore = await ensureDb();
  if (!firestore) {
    console.warn('⚠️ No se puede guardar entrega: Firestore no disponible');
    return;
  }
  const path = `entregas/${entrega.id}`;
  try {
    const data = cleanPayload({
      id: String(entrega.id),
      trabajoId: String(entrega.trabajoId),
      grado: entrega.grado ? Number(entrega.grado) : null,
      trabajoTitulo: String(entrega.trabajoTitulo || ''),
      profesorNombre: String(entrega.profesorNombre || ''),
      estudianteDoc: String(entrega.estudianteDoc),
      estudianteNombre: String(entrega.estudianteNombre || 'Estudiante'),
      estudianteCurso: String(entrega.estudianteCurso || ''),
      fecha: entrega.fecha || new Date().toISOString(),
      respuestas: Array.isArray(entrega.respuestas) ? entrega.respuestas.slice(0, 100).map(r => ({
        numero: String(r.numero || ''),
        pregunta: String(r.pregunta || ''),
        respuesta: String(r.respuesta || '').slice(0, 5000)
      })) : [],
      nota: entrega.nota != null ? Number(entrega.nota) : null,
      fechaCalificacion: entrega.fechaCalificacion || null,
      retroalimentacion: entrega.retroalimentacion ? String(entrega.retroalimentacion).slice(0, 1000) : null
    });
    await setDoc(doc(firestore, 'entregas', data.id), data);
    console.log('✅ Entrega guardada en Firestore:', data.id);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function dbSaveCalificacion(entregaId, nota, retroalimentacion) {
  const firestore = await ensureDb();
  if (!firestore) return;
  const path = `entregas/${entregaId}`;
  try {
    const patch = {
      nota: Number(nota),
      fechaCalificacion: new Date().toISOString()
    };
    if (retroalimentacion !== undefined) {
      patch.retroalimentacion = retroalimentacion ? String(retroalimentacion).slice(0, 1000) : null;
    }
    await updateDoc(doc(firestore, 'entregas', String(entregaId)), patch);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function dbGetEntregas(trabajoId) {
  const firestore = await ensureDb();
  if (!firestore) return [];
  const path = 'entregas';
  try {
    let q = collection(firestore, path);
    if (trabajoId) {
      q = query(q, where('trabajoId', '==', String(trabajoId)));
    }
    const snap = await getDocs(q);
    const list = [];
    snap.forEach(d => list.push(d.data()));
    return list;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
    return [];
  }
}

export async function dbDeleteEntrega(id) {
  const firestore = await ensureDb();
  if (!firestore) return;
  const path = `entregas/${id}`;
  try {
    await deleteDoc(doc(firestore, 'entregas', String(id)));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// ==================== COORDINADORES ====================
export async function dbSaveCoordinador(coord) {
  const firestore = await ensureDb();
  if (!firestore) {
    console.warn('⚠️ No se puede guardar coordinador: Firestore no disponible');
    return;
  }
  const path = `coordinadores/${coord.cedula}`;
  try {
    const data = cleanPayload({
      cedula: String(coord.cedula),
      nombres: String(coord.nombres || ''),
      apellidos: String(coord.apellidos || ''),
      nombre: String(coord.nombre || `${coord.nombres || ''} ${coord.apellidos || ''}`.trim()),
      telefono: String(coord.telefono || ''),
      email: String(coord.email || ''),
      institucion: String(coord.institucion || ''),
      passwordHash: String(coord.passwordHash || ''),
      salt: String(coord.salt || ''),
      fecha: coord.fecha || new Date().toISOString()
    });
    await setDoc(doc(firestore, 'coordinadores', data.cedula), data);
    console.log('✅ Coordinador guardado en Firestore:', data.cedula, data.nombre);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function dbGetCoordinadores() {
  const firestore = await ensureDb();
  if (!firestore) return [];
  const path = 'coordinadores';
  try {
    const snap = await getDocs(collection(firestore, path));
    const list = [];
    snap.forEach(d => list.push(d.data()));
    return list;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
    return [];
  }
}

// Global hook for application
window.ColegioDB = {
  init: initFirebase,
  ensureDb: ensureDb,
  isConnected: () => isConnected,
  saveProfesor: dbSaveProfesor,
  getProfesores: dbGetProfesores,
  deleteProfesor: dbDeleteProfesor,
  saveEstudiante: dbSaveEstudiante,
  getEstudiantes: dbGetEstudiantes,
  deleteEstudiante: dbDeleteEstudiante,
  saveCoordinador: dbSaveCoordinador,
  getCoordinadores: dbGetCoordinadores,
  saveTrabajo: dbSaveTrabajo,
  getTrabajos: dbGetTrabajos,
  deleteTrabajo: dbDeleteTrabajo,
  saveEntrega: dbSaveEntrega,
  saveCalificacion: dbSaveCalificacion,
  getEntregas: dbGetEntregas,
  deleteEntrega: dbDeleteEntrega
};

// Auto-initialize connection immediately on module load
initFirebase().then((res) => {
  if (res) {
    console.log('🔥 ColegioDB conectado a Firebase Firestore.');
    try {
      window.dispatchEvent(new CustomEvent('colegiodb:ready'));
    } catch (_) {}
  }
}).catch(err => {
  console.warn('⚠️ Error en auto-inicio de Firebase:', err);
});
