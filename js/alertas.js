/* ==========================================================================
   AquaSteps · Página de Alertas
   - Filtros por estado y orden (gravedad, costo, nombre)
   - Tarjetas con lista de verificación, botón de asistencia y "Marcar como reparado"
   - Servicios de ayuda dinámicos según la gravedad y el lugar afectado
   - Registrar medición, agregar y eliminar lugares
   - Historial de movimientos
   ========================================================================== */
(function () {
    "use strict";

    const contenedor = document.getElementById("lugares");
    if (!contenedor || !window.AquaSteps) { return; }
    const A = AquaSteps;

    const notificaciones = document.getElementById("notificaciones");
    const filtros = document.getElementById("filtros");
    const selectorOrden = document.getElementById("orden");
    const formMedicion = document.getElementById("medicion");
    const selectorLugar = document.getElementById("lugar");
    const mensaje = document.getElementById("mensaje");
    const formLugar = document.getElementById("nuevo-lugar");
    const mensajeLugar = document.getElementById("mensaje-lugar");
    const listaHistorial = document.getElementById("historial");

    const selectorAyudaLugar = document.getElementById("ayuda-lugar");
    const cajaDiagnostico = document.getElementById("ayuda-diagnostico");
    const gridServicios = document.getElementById("ayuda-servicios");
    const modalAyuda = document.getElementById("modal-ayuda");
    const formSolicitud = document.getElementById("form-solicitud");
    const modalResumen = document.getElementById("modal-resumen");
    const inputSolNombre = document.getElementById("sol-nombre");
    const inputSolTelefono = document.getElementById("sol-telefono");
    const inputSolDetalle = document.getElementById("sol-detalle");
    const linkWhatsapp = document.getElementById("sol-whatsapp");
    const linkLlamar = document.getElementById("sol-llamar");

    let filtroActual = "todos";
    let ordenActual = "gravedad";
    let lugarAyudaManual = false;
    let servicioActivo = null;
    const abiertos = new Set();

    /* ---------- Notificaciones ---------- */
    function pintarNotificaciones() {
        const pendientes = A.pendientes();
        notificaciones.replaceChildren();
        if (pendientes.length === 0) {
            notificaciones.appendChild(A.crear("p", "notificacion sin", "Ningún lugar requiere mantenimiento por ahora."));
            return;
        }
        pendientes.forEach(function (lugar) {
            const estado = A.estadoDe(lugar);
            const texto = estado.clave === "critico"
                ? lugar.nombre + ": la fuga está en estado crítico, es necesario un mantenimiento completo."
                : lugar.nombre + ": la fuga está en estado moderado, se recomienda un mantenimiento preventivo.";
            notificaciones.appendChild(A.crear("p", "notificacion " + estado.clave, texto));
        });
    }

    /* ---------- Filtros ---------- */
    function contarPor(clave) {
        if (clave === "todos") { return A.lugares().length; }
        return A.lugares().filter(function (l) { return A.estadoDe(l).clave === clave; }).length;
    }

    function pintarFiltros() {
        filtros.querySelectorAll("button[data-filtro]").forEach(function (boton) {
            const clave = boton.getAttribute("data-filtro");
            const activo = clave === filtroActual;
            boton.setAttribute("aria-pressed", activo ? "true" : "false");
            boton.querySelector(".conteo").textContent = contarPor(clave);
        });
    }

    filtros.addEventListener("click", function (evento) {
        const boton = evento.target.closest("button[data-filtro]");
        if (!boton) { return; }
        filtroActual = boton.getAttribute("data-filtro");
        pintarFiltros();
        pintarLugares();
    });

    selectorOrden.addEventListener("change", function () {
        ordenActual = selectorOrden.value;
        pintarLugares();
    });

    /* ---------- Tarjetas ---------- */
    function filaDato(termino, valor) {
        const fila = A.crear("div");
        fila.appendChild(A.crear("dt", "", termino));
        fila.appendChild(A.crear("dd", "", valor));
        return fila;
    }

    function textoBotonAyuda(estado) {
        if (estado.clave === "critico") { return "Urgencia: Gasfitero 24/7"; }
        if (estado.clave === "moderado") { return "Contactar gasfitero"; }
        return "Consultar técnico";
    }

    function seleccionarLugarAyuda(id, desplazar) {
        if (!A.buscar(id)) { return; }
        lugarAyudaManual = true;
        selectorAyudaLugar.value = id;
        pintarAyuda();
        if (desplazar) {
            const sec = document.getElementById("ayuda");
            if (sec) { sec.scrollIntoView({ behavior: "smooth" }); }
        }
    }

    function crearTarjeta(lugar) {
        const estado = A.estadoDe(lugar);
        const articulo = A.crear("article", "lugar");

        const pin = A.crear("a", "pin");
        pin.href = A.urlUbicacion(lugar);
        pin.target = "_blank";
        pin.rel = "noopener noreferrer";
        pin.setAttribute("aria-label", "Ver la ubicación exacta de " + lugar.nombre + " en Google Maps");
        const icono = A.crear("img");
        icono.src = "iconos/ubicacion.svg";
        icono.alt = "";
        icono.width = 38;
        icono.height = 38;
        pin.appendChild(icono);

        const tarjeta = A.crear("div", "tarjeta");
        const cabeceraTarjeta = A.crear("div", "lugar-cabecera");
        cabeceraTarjeta.appendChild(A.crear("h3", "lugar-titulo", lugar.nombre));
        cabeceraTarjeta.appendChild(A.crear("span", "estado " + estado.clave, estado.nombre));
        tarjeta.appendChild(cabeceraTarjeta);

        const datos = A.crear("dl", "datos");
        datos.appendChild(filaDato("Cantidad perdida", A.formatearMl(lugar.ml)));
        datos.appendChild(filaDato("Costo", A.formatearCosto(lugar.ml)));
        tarjeta.appendChild(datos);

        /* Condiciones + lista de verificación */
        const detalle = A.crear("details", "condiciones");
        if (abiertos.has(lugar.id)) { detalle.open = true; }
        detalle.addEventListener("toggle", function () {
            if (detalle.open) { abiertos.add(lugar.id); } else { abiertos.delete(lugar.id); }
        });
        detalle.appendChild(A.crear("summary", "", "Ver condiciones de la fuga"));
        const detalleDatos = A.crear("dl", "datos");
        detalleDatos.appendChild(filaDato("Estado actual", estado.nombre));
        detalleDatos.appendChild(filaDato("Mantenimiento", estado.mantenimiento));
        detalleDatos.appendChild(filaDato("Ubicación exacta", A.textoUbicacion(lugar)));
        detalle.appendChild(detalleDatos);

        detalle.appendChild(A.crear("p", "", "Operaciones posibles:"));
        const lista = A.crear("ul", "lista-checks");
        estado.operaciones.forEach(function (operacion, i) {
            const item = A.crear("li");
            if (lugar.ml <= 0) {
                item.textContent = operacion;
            } else {
                const clave = A.claveOperacion(lugar, i);
                const etiqueta = A.crear("label");
                const casilla = A.crear("input");
                casilla.type = "checkbox";
                casilla.checked = A.operacionMarcada(clave);
                casilla.setAttribute("data-foco", "check:" + clave);
                casilla.addEventListener("change", function () { A.marcarOperacion(clave, casilla.checked); });
                etiqueta.appendChild(casilla);
                etiqueta.appendChild(A.crear("span", "", operacion));
                item.appendChild(etiqueta);
                if (casilla.checked) { item.className = "hecha"; }
            }
            lista.appendChild(item);
        });
        detalle.appendChild(lista);

        if (lugar.ml > 0) {
            const prog = A.progresoOperaciones([lugar]);
            const nota = A.crear("p", "nota", prog.hechas + " de " + prog.total + " operaciones completadas." +
                (prog.hechas === prog.total ? " Ya puedes marcar el lugar como reparado." : ""));
            detalle.appendChild(nota);
        }
        tarjeta.appendChild(detalle);

        /* Acciones */
        const botones = A.crear("div", "botones centro");

        if (lugar.ml > 0) {
            const claseAyuda = estado.clave === "critico" ? "boton peligro" : "boton";
            const btnAyuda = A.crear("button", claseAyuda, textoBotonAyuda(estado));
            btnAyuda.type = "button";
            btnAyuda.setAttribute("data-foco", "ayuda:" + lugar.id);
            btnAyuda.addEventListener("click", function () {
                seleccionarLugarAyuda(lugar.id, true);
            });
            botones.appendChild(btnAyuda);
        }

        const reparar = A.crear("button", "boton" + (lugar.ml > 0 ? " secundario" : ""), "Marcar como reparado");
        reparar.type = "button";
        reparar.disabled = lugar.ml === 0;
        reparar.setAttribute("data-foco", "reparar:" + lugar.id);
        reparar.addEventListener("click", function () {
            A.repararLugar(lugar.id);
            A.avisar(lugar.nombre + " quedó reparado.", "sin");
        });
        botones.appendChild(reparar);

        if (A.lugares().length > 1) {
            const quitar = A.crear("button", "boton secundario", "Eliminar lugar");
            quitar.type = "button";
            quitar.setAttribute("data-foco", "eliminar:" + lugar.id);
            quitar.setAttribute("aria-label", "Eliminar el lugar " + lugar.nombre);
            quitar.addEventListener("click", function () {
                if (window.confirm("¿Eliminar «" + lugar.nombre + "» de la lista?")) {
                    abiertos.delete(lugar.id);
                    A.eliminarLugar(lugar.id);
                    contenedor.focus();
                }
            });
            botones.appendChild(quitar);
        }
        tarjeta.appendChild(botones);

        articulo.appendChild(pin);
        articulo.appendChild(tarjeta);
        return articulo;
    }

    function pintarLugares() {
        const foco = document.activeElement && document.activeElement.getAttribute
            ? document.activeElement.getAttribute("data-foco") : null;

        contenedor.replaceChildren();
        let lista = A.ordenar(A.lugares(), ordenActual);
        if (filtroActual !== "todos") {
            lista = lista.filter(function (l) { return A.estadoDe(l).clave === filtroActual; });
        }
        if (lista.length === 0) {
            contenedor.appendChild(A.crear("p", "vacio", "No hay lugares con ese estado."));
        }
        lista.forEach(function (lugar) { contenedor.appendChild(crearTarjeta(lugar)); });

        if (foco) {
            const nuevo = contenedor.querySelector('[data-foco="' + foco.replace(/"/g, '\"') + '"]');
            if (nuevo && !nuevo.disabled) { nuevo.focus(); }
        }
    }

    /* ---------- Servicios de ayuda dinámicos ---------- */
    function llenarSelectorAyuda() {
        const previo = selectorAyudaLugar.value;
        selectorAyudaLugar.replaceChildren();
        A.ordenar(A.lugares(), "gravedad").forEach(function (lugar) {
            const estado = A.estadoDe(lugar);
            const op = A.crear("option", "", lugar.nombre + " (" + estado.nombre + " · " + A.formatearMl(lugar.ml) + ")");
            op.value = lugar.id;
            selectorAyudaLugar.appendChild(op);
        });

        if (lugarAyudaManual && previo && A.buscar(previo)) {
            selectorAyudaLugar.value = previo;
        } else {
            const ordenados = A.ordenar(A.lugares(), "gravedad");
            if (ordenados.length > 0) {
                selectorAyudaLugar.value = ordenados[0].id;
            }
        }
    }

    function actualizarEnlacesModal() {
        if (!servicioActivo) { return; }
        const texto = encodeURIComponent(inputSolDetalle.value);
        const telLimpio = servicioActivo.servicio.telefono.replace(/[^0-9]/g, "");
        linkWhatsapp.href = "https://wa.me/" + telLimpio + "?text=" + texto;
        linkLlamar.href = "tel:" + servicioActivo.servicio.telefono;
    }

    function abrirModalSolicitud(lugar, servicio) {
        const estado = A.estadoDe(lugar);
        servicioActivo = { lugar: lugar, servicio: servicio };
        document.getElementById("modal-ayuda-titulo").textContent = "Contactar: " + servicio.nombre;
        modalResumen.textContent = "Caso detectado en " + lugar.nombre + " · Estado " + estado.nombre +
            " (" + A.formatearMl(lugar.ml) + " · " + A.formatearCosto(lugar.ml) + "). Teléfono: " + servicio.telefonoTexto + ".";
        inputSolDetalle.value = "Hola, solicito asistencia (" + servicio.nombre + ") por fuga de agua en " +
            lugar.nombre + ". Nivel: " + estado.nombre + " (" + A.formatearMl(lugar.ml) + "). Ubicación: " + A.urlUbicacion(lugar);
        actualizarEnlacesModal();

        if (typeof modalAyuda.showModal === "function") {
            modalAyuda.showModal();
        } else {
            modalAyuda.setAttribute("open", "");
        }
    }

    function cerrarModalSolicitud() {
        if (typeof modalAyuda.close === "function" && modalAyuda.open) {
            modalAyuda.close();
        } else {
            modalAyuda.removeAttribute("open");
        }
    }

    document.getElementById("modal-cerrar").addEventListener("click", cerrarModalSolicitud);
    inputSolDetalle.addEventListener("input", actualizarEnlacesModal);

    modalAyuda.addEventListener("click", function (evento) {
        if (evento.target === modalAyuda) { cerrarModalSolicitud(); }
    });

    formSolicitud.addEventListener("submit", function (evento) {
        evento.preventDefault();
        if (!servicioActivo) { return; }
        const contacto = inputSolNombre.value.trim();
        const telefono = inputSolTelefono.value.trim();
        if (!contacto || !telefono) { return; }
        A.registrarSolicitudAyuda(
            servicioActivo.lugar.id,
            servicioActivo.servicio.nombre,
            contacto,
            telefono
        );
        cerrarModalSolicitud();
        formSolicitud.reset();
        A.avisar("Solicitud enviada a " + servicioActivo.servicio.nombre + " para " + servicioActivo.lugar.nombre + ".", "sin");
    });

    function pintarAyuda() {
        const lugar = A.buscar(selectorAyudaLugar.value) || A.lugares()[0];
        if (!lugar) { return; }
        const estado = A.estadoDe(lugar);
        const pack = A.serviciosParaLugar(lugar);

        cajaDiagnostico.replaceChildren();
        const cabeceraDiag = A.crear("div", "diagnostico-cabecera");
        cabeceraDiag.appendChild(A.crear("span", "estado " + estado.clave, estado.nombre));
        cabeceraDiag.appendChild(A.crear("strong", "", lugar.nombre + " · " + A.formatearMl(lugar.ml) + " (" + A.formatearCosto(lugar.ml) + ")"));
        cajaDiagnostico.appendChild(cabeceraDiag);
        cajaDiagnostico.appendChild(A.crear("h3", "titulo-peq", pack.titulo));
        cajaDiagnostico.appendChild(A.crear("p", "", pack.descripcion));

        gridServicios.replaceChildren();
        pack.servicios.forEach(function (srv) {
            const card = A.crear("article", "tarjeta servicio-card");
            const top = A.crear("div", "servicio-top");
            top.appendChild(A.crear("span", "servicio-cat", srv.categoria));
            top.appendChild(A.crear("span", "servicio-badge " + estado.clave, srv.prioridad));
            card.appendChild(top);

            card.appendChild(A.crear("h3", "titulo-peq", srv.nombre));
            card.appendChild(A.crear("p", "", srv.detalle));

            const datosSrv = A.crear("dl", "datos");
            datosSrv.appendChild(filaDato("Tiempo estimado", srv.tiempo));
            datosSrv.appendChild(filaDato("Tarifa referencial", srv.tarifa));
            datosSrv.appendChild(filaDato("Contacto directo", srv.telefonoTexto));
            card.appendChild(datosSrv);

            const accionesSrv = A.crear("div", "botones");
            const btnSolicitar = A.crear("button", estado.clave === "critico" ? "boton peligro" : "boton", "Solicitar asistencia");
            btnSolicitar.type = "button";
            btnSolicitar.addEventListener("click", function () {
                abrirModalSolicitud(lugar, srv);
            });
            accionesSrv.appendChild(btnSolicitar);

            const enlaceTel = A.crear("a", "boton secundario", "Llamar");
            enlaceTel.href = "tel:" + srv.telefono;
            accionesSrv.appendChild(enlaceTel);

            card.appendChild(accionesSrv);
            gridServicios.appendChild(card);
        });
    }

    selectorAyudaLugar.addEventListener("change", function () {
        lugarAyudaManual = true;
        pintarAyuda();
    });

    /* ---------- Registrar medición ---------- */
    function llenarSelector() {
        const actual = selectorLugar.value;
        selectorLugar.replaceChildren();
        A.lugares().forEach(function (lugar) {
            const op = A.crear("option", "", lugar.nombre);
            op.value = lugar.id;
            selectorLugar.appendChild(op);
        });
        if (actual && A.buscar(actual)) { selectorLugar.value = actual; }
    }

    formMedicion.addEventListener("submit", function (evento) {
        evento.preventDefault();
        const lugar = A.registrarMedicion(selectorLugar.value, Number(document.getElementById("cantidad").value));
        if (!lugar) {
            mensaje.textContent = "Ingresa una cantidad válida entre 0 y " + A.MAX_ML + " ml.";
            return;
        }
        lugarAyudaManual = true;
        selectorAyudaLugar.value = lugar.id;
        mensaje.textContent = lugar.nombre + ": " + A.formatearMl(lugar.ml) + " registrados. Estado: " + A.estadoDe(lugar).nombre + ".";
        document.getElementById("cantidad").value = "";
    });

    document.getElementById("restablecer").addEventListener("click", function () {
        if (!window.confirm("Se borrarán tus lugares, mediciones e historial y volverán los datos iniciales. ¿Continuar?")) { return; }
        abiertos.clear();
        filtroActual = "todos";
        lugarAyudaManual = false;
        A.restablecerTodo();
        mensaje.textContent = "Se restablecieron los datos iniciales.";
    });

    /* ---------- Agregar lugar ---------- */
    const campoLat = document.getElementById("nuevo-lat");
    const campoLng = document.getElementById("nuevo-lng");
    const botonUbicacion = document.getElementById("usar-ubicacion");

    formLugar.addEventListener("submit", function (evento) {
        evento.preventDefault();
        const resultado = A.agregarLugar(
            document.getElementById("nuevo-nombre").value, campoLat.value, campoLng.value
        );
        if (!resultado.ok) {
            mensajeLugar.textContent = resultado.error;
            return;
        }
        mensajeLugar.textContent = "Se agregó «" + resultado.lugar.nombre + "». Ya puedes registrar mediciones ahí.";
        formLugar.reset();
        A.avisar("Lugar agregado: " + resultado.lugar.nombre + ".", "leve");
    });

    if (!navigator.geolocation) {
        botonUbicacion.hidden = true;
    } else {
        botonUbicacion.addEventListener("click", function () {
            mensajeLugar.textContent = "Buscando tu ubicación…";
            navigator.geolocation.getCurrentPosition(function (pos) {
                campoLat.value = pos.coords.latitude.toFixed(6);
                campoLng.value = pos.coords.longitude.toFixed(6);
                mensajeLugar.textContent = "Ubicación completada.";
            }, function () {
                mensajeLugar.textContent = "No se pudo obtener tu ubicación. Escríbela a mano o déjala vacía.";
            }, { timeout: 8000 });
        });
    }

    /* ---------- Historial ---------- */
    function pintarHistorial() {
        listaHistorial.replaceChildren();
        const registros = A.historial();
        document.getElementById("borrar-historial").disabled = registros.length === 0;
        if (registros.length === 0) {
            listaHistorial.appendChild(A.crear("li", "vacio", "Aún no hay movimientos. Registra una medición o simula una fuga."));
            return;
        }
        registros.forEach(function (r) {
            const item = A.crear("li");
            const hora = A.crear("time", "", new Date(r.t).toLocaleString("es-PE", {
                day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit"
            }));
            hora.dateTime = new Date(r.t).toISOString();
            item.appendChild(hora);
            item.appendChild(A.crear("span", "tipo tipo-" + r.tipo, A.TIPOS[r.tipo] || "Registro"));
            item.appendChild(A.crear("span", "texto", r.texto));
            listaHistorial.appendChild(item);
        });
    }

    document.getElementById("borrar-historial").addEventListener("click", function () {
        A.limpiarHistorial();
        A.avisar("Historial borrado.", "leve");
    });

    /* ---------- Todo junto ---------- */
    function actualizar() {
        if (selectorLugar.options.length !== A.lugares().length) { llenarSelector(); }
        llenarSelectorAyuda();
        pintarNotificaciones();
        pintarFiltros();
        pintarLugares();
        pintarAyuda();
        pintarHistorial();
    }

    // Leer parámetro ?lugar=... si viene desde Inicio o Pérdidas
    try {
        const params = new URLSearchParams(window.location.search);
        const paramLugar = params.get("lugar");
        if (paramLugar && A.buscar(paramLugar)) {
            lugarAyudaManual = true;
            llenarSelectorAyuda();
            selectorAyudaLugar.value = paramLugar;
        }
    } catch (e) { /* sin parámetros */ }

    llenarSelector();
    actualizar();
    A.alCambiar(actualizar);
})();
