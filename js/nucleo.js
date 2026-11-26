/* ==========================================================================
   AquaSteps · Núcleo
   Datos compartidos entre todas las páginas: lugares, estados de fuga,
   servicios de ayuda dinámica, historial, operaciones marcadas y avisos.
   ========================================================================== */
(function () {
    "use strict";

    /* ---------- Constantes ---------- */
    const TARIFA_POR_ML = 0.25 / 52;      // soles por ml
    const UMBRAL_MODERADO = 20;           // ml
    const UMBRAL_CRITICO = 30;            // ml
    const MAX_ML = 1000;
    const MAX_HISTORIAL = 60;
    const CLAVE_DATOS = "aquasteps-datos-v2";
    const CLAVE_ANTIGUA = "aquasteps-mediciones";   // versión anterior (fugas.js)
    const COORD_DEFECTO = { lat: -12.046374, lng: -77.042793 };

    const ESTADOS = {
        sin: {
            clave: "sin", nombre: "Sin fuga", nivel: 0,
            mantenimiento: "No requiere", requiereMantenimiento: false,
            operaciones: ["Continuar con el monitoreo habitual."]
        },
        leve: {
            clave: "leve", nombre: "Leve", nivel: 1,
            mantenimiento: "Seguimiento", requiereMantenimiento: false,
            operaciones: [
                "Revisar que las llaves queden bien cerradas.",
                "Volver a medir en 24 horas para confirmar la pérdida."
            ]
        },
        moderado: {
            clave: "moderado", nombre: "Moderado", nivel: 2,
            mantenimiento: "Preventivo", requiereMantenimiento: true,
            operaciones: [
                "Revisar empaques y conexiones del punto afectado.",
                "Programar una inspección de la tubería en los próximos días.",
                "Volver a medir mañana para confirmar que la pérdida bajó."
            ]
        },
        critico: {
            clave: "critico", nombre: "Crítico", nivel: 3,
            mantenimiento: "Completo", requiereMantenimiento: true,
            operaciones: [
                "Cerrar la llave de paso del punto afectado.",
                "Realizar un mantenimiento completo de la tubería y sus conexiones.",
                "Reemplazar las piezas dañadas: empaques, uniones o tramos de tubería.",
                "Hacer una nueva medición para confirmar que la fuga se detuvo."
            ]
        }
    };

    const SERVICIOS_POR_ESTADO = {
        critico: {
            titulo: "Atención de emergencia recomendada (Respuesta inmediata)",
            descripcion: "La pérdida supera el umbral crítico. Se recomienda cerrar la llave general del ambiente y contactar de inmediato a un gasfitero de urgencia o a la línea de emergencias de agua.",
            servicios: [
                {
                    id: "gasfitero-247",
                    nombre: "Gasfitero de Emergencia 24/7",
                    categoria: "Urgencia domiciliaria",
                    prioridad: "Prioritario",
                    tiempo: "Llegada en 30–45 min",
                    tarifa: "Desde S/ 70,00 (visita urgente)",
                    telefono: "+51999111222",
                    telefonoTexto: "999 111 222",
                    detalle: "Corte de fuga activa, sellado de tuberías rotas y reemplazo inmediato de llaves de paso o uniones."
                },
                {
                    id: "detec-ultrasonido",
                    nombre: "Especialista en Fugas Ocultas y Tuberías",
                    categoria: "Diagnóstico técnico",
                    prioridad: "Recomendado",
                    tiempo: "Atención en el día",
                    tarifa: "Desde S/ 95,00 (inspección técnica)",
                    telefono: "+51999333444",
                    telefonoTexto: "999 333 444",
                    detalle: "Detección de filtraciones internas en muros o pisos sin romper innecesariamente y reparación integral."
                },
                {
                    id: "sedapal-emergencia",
                    nombre: "Aquafono SEDAPAL · Emergencias de Red",
                    categoria: "Servicio público",
                    prioridad: "Si afecta acometida",
                    tiempo: "Atención telefónica 24 h",
                    tarifa: "Gratuito (red externa / medidor)",
                    telefono: "+5113178000",
                    telefonoTexto: "(01) 317-8000",
                    detalle: "Reporta fugas en la caja del medidor, vereda o matriz externa de agua potable."
                }
            ]
        },
        moderado: {
            titulo: "Mantenimiento preventivo con gasfitero programado",
            descripcion: "La fuga es constante y puede agravar la presión en la instalación. Conviene agendar un técnico gasfitero para cambiar empaques, válvulas o conexiones desgastadas.",
            servicios: [
                {
                    id: "gasfitero-preventivo",
                    nombre: "Gasfitero Residencial Certificado",
                    categoria: "Mantenimiento preventivo",
                    prioridad: "Recomendado",
                    tiempo: "Visita hoy o en 24 h",
                    tarifa: "Desde S/ 45,00 (revisión + ajuste)",
                    telefono: "+51999555666",
                    telefonoTexto: "999 555 666",
                    detalle: "Cambio de empaques, o-rings, válvulas check, sifones y calibración de grifería en cocina o baño."
                },
                {
                    id: "tecnico-sanitario",
                    nombre: "Técnico en Grifería y Sanitarios",
                    categoria: "Reparación de accesorios",
                    prioridad: "Opcional",
                    tiempo: "Cita programada",
                    tarifa: "Desde S/ 50,00",
                    telefono: "+51999777888",
                    telefonoTexto: "999 777 888",
                    detalle: "Mantenimiento de mezcladoras, tanques de inodoro, fluxómetros y llaves angulares."
                }
            ]
        },
        leve: {
            titulo: "Orientación técnica y diagnóstico rápido",
            descripcion: "El goteo es leve. Puedes recibir orientación virtual gratuita de un técnico o solicitar un kit de repuestos básicos antes de requerir visita presencial.",
            servicios: [
                {
                    id: "consulta-virtual",
                    nombre: "Asesoría Virtual con Gasfitero",
                    categoria: "Orientación por videollamada",
                    prioridad: "Recomendado",
                    tiempo: "Respuesta en 15 min",
                    tarifa: "Gratuito (diagnóstico inicial)",
                    telefono: "+51999222333",
                    telefonoTexto: "999 222 333",
                    detalle: "Envía una foto o video del punto con goteo para identificar si basta con ajustar o cambiar un empaque."
                },
                {
                    id: "kit-reparacion",
                    nombre: "Ferretería y Repuestos a Domicilio",
                    categoria: "Insumos de gasfitería",
                    prioridad: "Apoyo",
                    tiempo: "Entrega en 60 min",
                    tarifa: "Desde S/ 12,00 (kit empaques + teflón)",
                    telefono: "+51999444555",
                    telefonoTexto: "999 444 555",
                    detalle: "Envío de cinta teflón, empaques universales, llaves de ajuste y selladores para reparaciones menores."
                }
            ]
        },
        sin: {
            titulo: "Sin incidencias · Asistencia preventiva opcional",
            descripcion: "Este punto no registra pérdidas de agua. Si sospechas de humedad oculta o deseas una revisión anual de tus instalaciones, tienes estas opciones disponibles.",
            servicios: [
                {
                    id: "chequeo-preventivo",
                    nombre: "Inspección Preventiva del Hogar",
                    categoria: "Mantenimiento anual",
                    prioridad: "Preventivo",
                    tiempo: "Según agenda",
                    tarifa: "Desde S/ 40,00",
                    telefono: "+51999555666",
                    telefonoTexto: "999 555 666",
                    detalle: "Revisión general de presión de agua, estado de llaves de paso y prevención de fugas silenciosas."
                },
                {
                    id: "orientacion-hidrica",
                    nombre: "Línea de Orientación y Consumo Responsable",
                    categoria: "Soporte AquaSteps",
                    prioridad: "Informativo",
                    tiempo: "Disponible 24/7",
                    tarifa: "Gratuito",
                    telefono: "+5113178000",
                    telefonoTexto: "(01) 317-8000",
                    detalle: "Consultas sobre lectura de medidor, detección temprana de filtraciones y ahorro de agua en casa."
                }
            ]
        }
    };

    const LUGARES_BASE = [
        { id: "cocina", nombre: "Cocina", ml: 32, pico: 32, lat: -12.046374, lng: -77.042793 },
        { id: "bano", nombre: "Baño", ml: 20, pico: 20, lat: -12.046402, lng: -77.042741 }
    ];

    /* ---------- Utilidades ---------- */
    function crear(etiqueta, clase, texto) {
        const el = document.createElement(etiqueta);
        if (clase) { el.className = clase; }
        if (texto !== undefined && texto !== null && texto !== "") { el.textContent = texto; }
        return el;
    }

    function copiaBase() {
        return LUGARES_BASE.map(function (l) { return Object.assign({}, l); });
    }

    function numeroEntre(min, max) {
        return Math.round(min + Math.random() * (max - min));
    }

    function formatearMl(ml) { return Math.round(ml) + " ml"; }
    function calcularCosto(ml) { return ml * TARIFA_POR_ML; }
    function formatearSoles(valor) { return valor.toFixed(2).replace(".", ",") + " soles"; }
    function formatearCosto(ml) { return formatearSoles(calcularCosto(ml)); }
    function formatearLitros(ml) { return (ml / 1000).toFixed(2).replace(".", ",") + " L"; }

    function clasificarEstado(ml) {
        if (ml >= UMBRAL_CRITICO) { return ESTADOS.critico; }
        if (ml >= UMBRAL_MODERADO) { return ESTADOS.moderado; }
        if (ml > 0) { return ESTADOS.leve; }
        return ESTADOS.sin;
    }

    function estadoDe(lugar) { return clasificarEstado(lugar.ml); }

    function serviciosParaLugar(lugar) {
        const estado = estadoDe(lugar);
        return SERVICIOS_POR_ESTADO[estado.clave] || SERVICIOS_POR_ESTADO.sin;
    }

    function urlUbicacion(lugar) { return "https://www.google.com/maps?q=" + lugar.lat + "," + lugar.lng; }
    function textoUbicacion(lugar) { return lugar.lat.toFixed(6) + ", " + lugar.lng.toFixed(6); }

    function ordenar(lista, criterio) {
        const copia = lista.slice();
        if (criterio === "nombre") {
            return copia.sort(function (a, b) { return a.nombre.localeCompare(b.nombre, "es"); });
        }
        return copia.sort(function (a, b) { return b.ml - a.ml || a.nombre.localeCompare(b.nombre, "es"); });
    }

    /* ---------- Almacenamiento ---------- */
    function lugarValido(l) {
        return l && typeof l.id === "string" && typeof l.nombre === "string" &&
            Number.isFinite(Number(l.ml)) && Number.isFinite(Number(l.lat)) && Number.isFinite(Number(l.lng));
    }

    function limpiarLugar(l) {
        const ml = Math.min(MAX_ML, Math.max(0, Math.round(Number(l.ml))));
        const pico = Math.max(ml, Math.round(Number(l.pico)) || 0);
        return {
            id: l.id, nombre: l.nombre.slice(0, 30),
            ml: ml, pico: pico, lat: Number(l.lat), lng: Number(l.lng)
        };
    }

    function datosIniciales() {
        const lugares = copiaBase();
        try {
            const viejas = JSON.parse(localStorage.getItem(CLAVE_ANTIGUA));
            if (viejas && typeof viejas === "object") {
                lugares.forEach(function (l) {
                    const v = Number(viejas[l.id]);
                    if (Number.isFinite(v) && v >= 0) { l.ml = Math.round(v); l.pico = Math.max(l.pico, l.ml); }
                });
            }
        } catch (error) { /* sin datos antiguos */ }
        return { lugares: lugares, historial: [], checks: {} };
    }

    function cargar() {
        try {
            const crudo = JSON.parse(localStorage.getItem(CLAVE_DATOS));
            if (crudo && Array.isArray(crudo.lugares) && crudo.lugares.length > 0) {
                return {
                    lugares: crudo.lugares.filter(lugarValido).map(limpiarLugar),
                    historial: Array.isArray(crudo.historial) ? crudo.historial.slice(0, MAX_HISTORIAL) : [],
                    checks: crudo.checks && typeof crudo.checks === "object" ? crudo.checks : {}
                };
            }
        } catch (error) { /* datos dañados: se parte de cero */ }
        return datosIniciales();
    }

    let datos = cargar();
    if (datos.lugares.length === 0) { datos = datosIniciales(); }
    const oyentes = [];

    function guardar() {
        try { localStorage.setItem(CLAVE_DATOS, JSON.stringify(datos)); } catch (error) { /* modo privado */ }
    }

    function emitir() {
        oyentes.forEach(function (fn) { fn(); });
    }

    function alCambiar(fn) { oyentes.push(fn); }

    window.addEventListener("storage", function (evento) {
        if (evento.key === CLAVE_DATOS) {
            datos = cargar();
            emitir();
        }
    });

    /* ---------- Consultas ---------- */
    function lugares() { return datos.lugares; }
    function historial() { return datos.historial; }
    function buscar(id) { return datos.lugares.find(function (l) { return l.id === id; }) || null; }
    function totalMl() { return datos.lugares.reduce(function (s, l) { return s + l.ml; }, 0); }
    function pendientes() {
        return ordenar(datos.lugares).filter(function (l) { return estadoDe(l).requiereMantenimiento; });
    }
    function estadoGeneral() {
        return datos.lugares.reduce(function (peor, l) {
            const e = estadoDe(l);
            return e.nivel > peor.nivel ? e : peor;
        }, ESTADOS.sin);
    }

    /* ---------- Historial ---------- */
    const TIPOS = {
        medicion: "Medición", simulacion: "Simulación", vivo: "En vivo",
        reparacion: "Reparación", lugar: "Lugar", sistema: "Sistema",
        asistencia: "Asistencia"
    };

    function anotar(tipo, texto) {
        datos.historial.unshift({ t: Date.now(), tipo: tipo, texto: texto });
        if (datos.historial.length > MAX_HISTORIAL) { datos.historial.length = MAX_HISTORIAL; }
    }

    function limpiarHistorial() {
        datos.historial = [];
        guardar();
        emitir();
    }

    /* ---------- Cambios de datos ---------- */
    function fijarMl(id, ml, opciones) {
        const lugar = buscar(id);
        const valor = Number(ml);
        if (!lugar || !Number.isFinite(valor) || valor < 0) { return null; }
        const op = opciones || {};
        const antes = estadoDe(lugar);
        lugar.ml = Math.min(MAX_ML, Math.round(valor));
        if (lugar.ml > lugar.pico) { lugar.pico = lugar.ml; }
        const despues = estadoDe(lugar);
        const cambio = antes.clave !== despues.clave;

        if (op.registrar === true || (op.registrar === "solo-cambio" && cambio)) {
            anotar(op.tipo || "medicion", op.texto ||
                (lugar.nombre + ": " + formatearMl(lugar.ml) + " (" + despues.nombre + ")"));
        }
        if (cambio && !op.silencioso) {
            const texto = despues.clave === "sin"
                ? lugar.nombre + ": ya no hay fuga."
                : lugar.nombre + ": ahora está en estado " + despues.nombre.toLowerCase() + ".";
            avisar(texto, despues.clave);
        }
        guardar();
        emitir();
        return lugar;
    }

    function registrarMedicion(id, ml) {
        const lugar = buscar(id);
        if (!lugar) { return null; }
        const valor = Number(ml);
        if (!Number.isFinite(valor) || valor < 0 || valor > MAX_ML) { return null; }
        return fijarMl(id, valor, {
            tipo: "medicion", registrar: true,
            texto: "Medición en " + lugar.nombre + ": " + formatearMl(Math.round(valor)) +
                " (" + clasificarEstado(Math.round(valor)).nombre + ")"
        });
    }

    function borrarChecks(id) {
        Object.keys(datos.checks).forEach(function (clave) {
            if (clave.indexOf(id + ":") === 0) { delete datos.checks[clave]; }
        });
    }

    function repararLugar(id) {
        const lugar = buscar(id);
        if (!lugar) { return null; }
        const eraMl = lugar.ml;
        borrarChecks(id);
        fijarMl(id, 0, {
            tipo: "reparacion", registrar: true,
            texto: lugar.nombre + " reparado: la pérdida bajó de " + formatearMl(eraMl) + " a 0 ml."
        });
        return lugar;
    }

    function registrarSolicitudAyuda(lugarId, servicioNombre, contacto, telefono) {
        const lugar = buscar(lugarId);
        const nombreLugar = lugar ? lugar.nombre : "General";
        const detalleMl = lugar ? " (" + formatearMl(lugar.ml) + " · " + estadoDe(lugar).nombre + ")" : "";
        anotar("asistencia", "Solicitud a " + servicioNombre + " para " + nombreLugar + detalleMl + " · Contacto: " + contacto + " (" + telefono + ").");
        guardar();
        emitir();
    }

    function agregarLugar(nombre, lat, lng) {
        const limpio = String(nombre || "").trim().replace(/\s+/g, " ");
        if (limpio.length < 2) { return { ok: false, error: "Escribe un nombre de al menos 2 letras." }; }
        if (limpio.length > 30) { return { ok: false, error: "El nombre puede tener hasta 30 caracteres." }; }
        const existe = datos.lugares.some(function (l) { return l.nombre.toLowerCase() === limpio.toLowerCase(); });
        if (existe) { return { ok: false, error: "Ya existe un lugar llamado «" + limpio + "»." }; }

        let latitud = lat === "" || lat === null || lat === undefined ? COORD_DEFECTO.lat : Number(lat);
        let longitud = lng === "" || lng === null || lng === undefined ? COORD_DEFECTO.lng : Number(lng);
        if (!Number.isFinite(latitud) || latitud < -90 || latitud > 90) {
            return { ok: false, error: "La latitud debe estar entre -90 y 90." };
        }
        if (!Number.isFinite(longitud) || longitud < -180 || longitud > 180) {
            return { ok: false, error: "La longitud debe estar entre -180 y 180." };
        }
        const base = limpio.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "lugar";
        const lugar = { id: base + "-" + Date.now().toString(36), nombre: limpio, ml: 0, pico: 0, lat: latitud, lng: longitud };
        datos.lugares.push(lugar);
        anotar("lugar", "Lugar agregado: " + limpio + ".");
        guardar();
        emitir();
        return { ok: true, lugar: lugar };
    }

    function eliminarLugar(id) {
        const lugar = buscar(id);
        if (!lugar || datos.lugares.length <= 1) { return false; }
        datos.lugares = datos.lugares.filter(function (l) { return l.id !== id; });
        borrarChecks(id);
        anotar("lugar", "Lugar eliminado: " + lugar.nombre + ".");
        guardar();
        emitir();
        return true;
    }

    function restablecerTodo() {
        try { localStorage.removeItem(CLAVE_DATOS); localStorage.removeItem(CLAVE_ANTIGUA); } catch (error) { /* nada */ }
        datos = { lugares: copiaBase(), historial: [], checks: {} };
        anotar("sistema", "Se restablecieron todos los datos iniciales.");
        guardar();
        emitir();
    }

    /* ---------- Operaciones marcadas (lista de verificación) ---------- */
    function claveOperacion(lugar, indice) {
        return lugar.id + ":" + estadoDe(lugar).clave + ":" + indice;
    }
    function operacionMarcada(clave) { return datos.checks[clave] === true; }
    function marcarOperacion(clave, valor) {
        if (valor) { datos.checks[clave] = true; } else { delete datos.checks[clave]; }
        guardar();
        emitir();
    }
    function progresoOperaciones(lista) {
        let hechas = 0;
        let total = 0;
        (lista || datos.lugares).forEach(function (lugar) {
            if (lugar.ml <= 0) { return; }
            estadoDe(lugar).operaciones.forEach(function (op, i) {
                total += 1;
                if (operacionMarcada(claveOperacion(lugar, i))) { hechas += 1; }
            });
        });
        return { hechas: hechas, total: total };
    }

    /* ---------- Avisos emergentes (toasts) ---------- */
    function avisar(texto, clase) {
        let caja = document.getElementById("avisos");
        if (!caja) {
            caja = crear("div", "avisos");
            caja.id = "avisos";
            caja.setAttribute("role", "status");
            caja.setAttribute("aria-live", "polite");
            document.body.appendChild(caja);
        }
        const aviso = crear("div", "aviso " + (clase || "leve"));
        aviso.appendChild(crear("span", "", texto));
        const cerrar = crear("button", "aviso-cerrar", "×");
        cerrar.type = "button";
        cerrar.setAttribute("aria-label", "Cerrar aviso");
        aviso.appendChild(cerrar);

        function quitar() {
            if (aviso.parentNode) { aviso.parentNode.removeChild(aviso); }
        }
        cerrar.addEventListener("click", quitar);
        caja.appendChild(aviso);
        while (caja.children.length > 4) { caja.removeChild(caja.firstChild); }
        setTimeout(quitar, 5500);
    }

    /* ---------- API pública ---------- */
    window.AquaSteps = {
        ESTADOS: ESTADOS, TIPOS: TIPOS, UMBRAL_MODERADO: UMBRAL_MODERADO, UMBRAL_CRITICO: UMBRAL_CRITICO,
        MAX_ML: MAX_ML, TARIFA_POR_ML: TARIFA_POR_ML,
        crear: crear, numeroEntre: numeroEntre,
        formatearMl: formatearMl, formatearCosto: formatearCosto, formatearSoles: formatearSoles,
        formatearLitros: formatearLitros, calcularCosto: calcularCosto,
        clasificarEstado: clasificarEstado, estadoDe: estadoDe, serviciosParaLugar: serviciosParaLugar,
        urlUbicacion: urlUbicacion, textoUbicacion: textoUbicacion, ordenar: ordenar,
        lugares: lugares, historial: historial, buscar: buscar, totalMl: totalMl,
        pendientes: pendientes, estadoGeneral: estadoGeneral,
        fijarMl: fijarMl, registrarMedicion: registrarMedicion, repararLugar: repararLugar,
        registrarSolicitudAyuda: registrarSolicitudAyuda,
        agregarLugar: agregarLugar, eliminarLugar: eliminarLugar, restablecerTodo: restablecerTodo,
        anotar: function (tipo, texto) { anotar(tipo, texto); guardar(); emitir(); },
        limpiarHistorial: limpiarHistorial,
        claveOperacion: claveOperacion, operacionMarcada: operacionMarcada,
        marcarOperacion: marcarOperacion, progresoOperaciones: progresoOperaciones,
        avisar: avisar, alCambiar: alCambiar
    };
})();
