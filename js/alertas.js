/* ==========================================================================
   AquaSteps · Página de Alertas
   - Filtros por estado y orden (gravedad, costo, nombre)
   - Tarjetas con lista de verificación y botón "Marcar como reparado"
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

    let filtroActual = "todos";
    let ordenActual = "gravedad";
    const abiertos = new Set();   // tarjetas con "condiciones" desplegadas

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
        tarjeta.appendChild(A.crear("span", "estado " + estado.clave, estado.nombre));

        const datos = A.crear("dl", "datos");
        datos.appendChild(filaDato("Lugar", lugar.nombre));
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
        const reparar = A.crear("button", "boton", "Marcar como reparado");
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
            const nuevo = contenedor.querySelector('[data-foco="' + foco.replace(/"/g, '\\"') + '"]');
            if (nuevo && !nuevo.disabled) { nuevo.focus(); }
        }
    }

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
        mensaje.textContent = lugar.nombre + ": " + A.formatearMl(lugar.ml) + " registrados. Estado: " + A.estadoDe(lugar).nombre + ".";
        document.getElementById("cantidad").value = "";
    });

    document.getElementById("restablecer").addEventListener("click", function () {
        if (!window.confirm("Se borrarán tus lugares, mediciones e historial y volverán los datos iniciales. ¿Continuar?")) { return; }
        abiertos.clear();
        filtroActual = "todos";
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
        pintarNotificaciones();
        pintarFiltros();
        pintarLugares();
        pintarHistorial();
    }

    llenarSelector();
    actualizar();
    A.alCambiar(actualizar);
})();
