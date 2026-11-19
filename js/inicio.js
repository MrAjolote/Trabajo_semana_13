/* ==========================================================================
   AquaSteps · Página de Inicio
   - Banner de alerta según los datos reales
   - Simulador de fuga (lugar + intensidad) y botón "Detener fuga"
   - Monitoreo en vivo: la pérdida crece sola y las alertas escalan
   - Contador animado y gota que reacciona a la gravedad
   ========================================================================== */
(function () {
    "use strict";

    const banner = document.getElementById("alerta");
    if (!banner || !window.AquaSteps) { return; }
    const A = AquaSteps;

    const selectorLugar = document.getElementById("sim-lugar");
    const selectorIntensidad = document.getElementById("sim-intensidad");
    const botonSimular = document.getElementById("btn-simular");
    const botonDetener = document.getElementById("btn-detener");
    const interruptor = document.getElementById("sim-vivo");
    const mensaje = document.getElementById("sim-mensaje");
    const contadorMl = document.getElementById("contador-ml");
    const contadorCosto = document.getElementById("contador-costo");
    const postal = document.getElementById("postal");

    const RANGOS = { leve: [5, 19], moderada: [20, 29], critica: [30, 60] };
    const RITMO = { leve: 1, moderada: 2, critica: 4 };   // ml por cada tic en vivo
    const INTERVALO_MS = 1500;
    const LIMITE_VIVO = 500;
    const reducirMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let temporizador = null;

    /* ---------- Banner ---------- */
    function pintarBanner() {
        const pendientes = A.pendientes();
        const criticos = pendientes.filter(function (l) { return A.estadoDe(l).clave === "critico"; });
        let clase = "alerta sin";
        let titulo = "SIN ALERTAS";
        let detalle = "Ningún lugar requiere mantenimiento por ahora.";

        if (criticos.length > 0) {
            clase = "alerta critico";
            titulo = "¡ALERTA DE FUGA DETECTADA!";
            detalle = "Mantenimiento completo necesario en: " + criticos.map(function (l) { return l.nombre; }).join(", ") + ".";
        } else if (pendientes.length > 0) {
            clase = "alerta moderado";
            titulo = "¡ALERTA!";
            detalle = "Mantenimiento preventivo recomendado en: " + pendientes.map(function (l) { return l.nombre; }).join(", ") + ".";
        }
        banner.className = clase;
        banner.replaceChildren(A.crear("strong", "", titulo), A.crear("span", "", detalle));
    }

    /* ---------- Contador animado ---------- */
    let mostrado = 0;
    let animacion = null;

    function animarContador(hasta) {
        if (animacion) { cancelAnimationFrame(animacion); }
        const desde = mostrado;
        if (reducirMovimiento || desde === hasta) {
            mostrado = hasta;
            escribirContador(hasta);
            return;
        }
        const inicio = performance.now();
        const duracion = 500;
        function paso(ahora) {
            const t = Math.min(1, (ahora - inicio) / duracion);
            const suave = 1 - Math.pow(1 - t, 3);
            mostrado = desde + (hasta - desde) * suave;
            escribirContador(mostrado);
            if (t < 1) { animacion = requestAnimationFrame(paso); } else { mostrado = hasta; }
        }
        animacion = requestAnimationFrame(paso);
    }

    function escribirContador(ml) {
        contadorMl.textContent = Math.round(ml) + " ml";
        contadorCosto.textContent = A.formatearCosto(ml);
    }

    /* ---------- Gota reactiva ---------- */
    function pintarGota() {
        postal.setAttribute("data-estado", A.estadoGeneral().clave);
    }

    /* ---------- Selector de lugar ---------- */
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

    function pintarTodo() {
        pintarBanner();
        pintarGota();
        animarContador(A.totalMl());
        const lugar = A.buscar(selectorLugar.value);
        botonDetener.disabled = !lugar || lugar.ml === 0;
    }

    function actualizar() {
        // Si cambió la lista de lugares (otra pestaña o página), se vuelve a llenar
        if (selectorLugar.options.length !== A.lugares().length) { llenarSelector(); }
        pintarTodo();
    }

    function decir(texto) { mensaje.textContent = texto; }

    /* ---------- Simulación ---------- */
    botonSimular.addEventListener("click", function () {
        const lugar = A.buscar(selectorLugar.value);
        if (!lugar) { return; }
        const intensidad = selectorIntensidad.value;
        const rango = RANGOS[intensidad];
        const ml = A.numeroEntre(rango[0], rango[1]);
        const nombreIntensidad = selectorIntensidad.options[selectorIntensidad.selectedIndex].text.split(" (")[0].toLowerCase();
        A.fijarMl(lugar.id, ml, {
            tipo: "simulacion", registrar: true,
            texto: "Simulación " + nombreIntensidad + " en " + lugar.nombre + ": " + A.formatearMl(ml) + "."
        });
        decir("Fuga " + nombreIntensidad + " simulada en " + lugar.nombre + ": " + A.formatearMl(ml) + ".");
    });

    botonDetener.addEventListener("click", function () {
        const lugar = A.buscar(selectorLugar.value);
        if (!lugar || lugar.ml === 0) { return; }
        apagarVivo();
        A.fijarMl(lugar.id, 0, {
            tipo: "simulacion", registrar: true,
            texto: "Fuga detenida en " + lugar.nombre + "."
        });
        decir("Fuga detenida en " + lugar.nombre + ".");
    });

    selectorLugar.addEventListener("change", pintarTodo);

    /* ---------- Monitoreo en vivo ---------- */
    function tic() {
        const lugar = A.buscar(selectorLugar.value);
        if (!lugar) { apagarVivo(); return; }
        const siguiente = lugar.ml + RITMO[selectorIntensidad.value];
        if (siguiente >= LIMITE_VIVO) {
            A.fijarMl(lugar.id, LIMITE_VIVO, { tipo: "vivo", registrar: "solo-cambio" });
            apagarVivo();
            decir("La simulación en vivo llegó al límite de " + LIMITE_VIVO + " ml y se detuvo.");
            return;
        }
        A.fijarMl(lugar.id, siguiente, {
            tipo: "vivo", registrar: "solo-cambio",
            texto: "En vivo: " + lugar.nombre + " pasó a " + A.clasificarEstado(siguiente).nombre.toLowerCase() +
                " (" + A.formatearMl(siguiente) + ")."
        });
    }

    function encenderVivo() {
        const lugar = A.buscar(selectorLugar.value);
        if (!lugar) { interruptor.checked = false; return; }
        A.anotar("vivo", "Monitoreo en vivo iniciado en " + lugar.nombre + ".");
        decir("Monitoreo en vivo activo en " + lugar.nombre + ": la pérdida irá aumentando sola.");
        temporizador = setInterval(tic, INTERVALO_MS);
    }

    function apagarVivo() {
        if (temporizador === null) { return; }
        clearInterval(temporizador);
        temporizador = null;
        interruptor.checked = false;
        A.anotar("vivo", "Monitoreo en vivo detenido.");
        decir("Monitoreo en vivo detenido.");
    }

    interruptor.addEventListener("change", function () {
        if (interruptor.checked) { encenderVivo(); } else { apagarVivo(); }
    });

    // Al salir de la página el monitoreo se detiene solo
    window.addEventListener("pagehide", function () {
        if (temporizador !== null) { clearInterval(temporizador); temporizador = null; }
    });

    /* ---------- Inicio ---------- */
    llenarSelector();
    mostrado = A.totalMl();
    escribirContador(mostrado);
    pintarTodo();
    A.alCambiar(actualizar);
})();
