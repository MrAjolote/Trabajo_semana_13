(function () {
    "use strict";

    const banner = document.getElementById("alerta");
    if (!banner || !window.AquaSteps) { return; }
    const A = AquaSteps;

    const contadorMl = document.getElementById("contador-ml");
    const contadorCosto = document.getElementById("contador-costo");
    const postal = document.getElementById("postal");

    const tutEtiqueta = document.getElementById("tut-etiqueta");
    const tutPuntos = document.getElementById("tut-puntos");
    const tutBarra = document.getElementById("tut-barra");
    const tutTitulo = document.getElementById("tut-titulo");
    const tutDescripcion = document.getElementById("tut-descripcion");
    const tutObjetivo = document.getElementById("tut-objetivo");
    const tutAccion = document.getElementById("tut-accion");
    const tutEnlace = document.getElementById("tut-enlace");
    const tutFeedback = document.getElementById("tut-feedback");
    const tutAnterior = document.getElementById("tut-anterior");
    const tutSiguiente = document.getElementById("tut-siguiente");
    const tutReiniciar = document.getElementById("tut-reiniciar");

    const CLAVE_TUTORIAL = "aquasteps-tutorial-paso";
    const reducirMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const PASOS = [
        {
            titulo: "1. Detecta fugas y mide su costo diario",
            descripcion: "En el panel principal visualizas de inmediato si tu hogar tiene fugas activas, cuántos mililitros se pierden hoy y cuánto representa en soles.",
            objetivo: "Necesidad que resuelve: identificar pérdidas invisibles antes de que aumenten tu recibo de agua.",
            textoAccion: "Probar detección de fuga",
            enlace: null,
            ejecutar: function () {
                const cocina = A.buscar("cocina") || A.lugares()[0];
                if (!cocina) { return; }
                const ml = cocina.ml >= 30 ? 22 : 34;
                A.fijarMl(cocina.id, ml, {
                    tipo: "simulacion",
                    registrar: true,
                    texto: "Tutorial: ejemplo de fuga detectada en " + cocina.nombre + " (" + A.formatearMl(ml) + ")."
                });
                mostrarFeedback("Observa arriba: el banner cambió de color y el medidor actualizó la pérdida y su costo en soles.");
            }
        },
        {
            titulo: "2. Diagnostica ambientes y registra mediciones",
            descripcion: "En «Alertas» puedes filtrar qué ambiente requiere atención urgente, seguir una lista de verificación paso a paso y registrar nuevas mediciones o zonas del hogar.",
            objetivo: "Necesidad que resuelve: saber exactamente qué punto revisar primero y llevar control por habitación.",
            textoAccion: "Agregar lugar de ejemplo",
            enlace: { href: "alertas.html", texto: "Practicar en Alertas →" },
            ejecutar: function () {
                const res = A.agregarLugar("Lavandería", -12.04642, -77.04271);
                if (res.ok) {
                    A.fijarMl(res.lugar.id, 14, { tipo: "medicion", registrar: true });
                    mostrarFeedback("Se creó «Lavandería» con una fuga leve (14 ml). Puedes gestionarla en la sección Alertas.");
                } else {
                    const existente = A.lugares().find(function (l) { return l.nombre === "Lavandería"; }) || A.lugares()[0];
                    A.fijarMl(existente.id, 16, { tipo: "medicion", registrar: true });
                    mostrarFeedback("Se actualizó la medición en " + existente.nombre + " (16 ml · Leve).");
                }
            }
        },
        {
            titulo: "3. Solicita asistencia técnica según la gravedad",
            descripcion: "Según el nivel de pérdida (Leve, Moderado o Crítico), AquaSteps diagnostica el caso y te conecta con gasfiteros 24/7 o especialistas con los datos ya listos.",
            objetivo: "Necesidad que resuelve: contactar ayuda confiable sin perder tiempo explicando los detalles técnicos.",
            textoAccion: "Simular caso urgente",
            enlace: { href: "alertas.html#ayuda", texto: "Ver servicios de ayuda →" },
            ejecutar: function () {
                const lugar = A.buscar("cocina") || A.lugares()[0];
                if (!lugar) { return; }
                A.fijarMl(lugar.id, 38, {
                    tipo: "simulacion",
                    registrar: true,
                    texto: "Tutorial: caso crítico en " + lugar.nombre + " para diagnóstico técnico."
                });
                mostrarFeedback("Con 38 ml en " + lugar.nombre + ", el sistema prioriza Gasfitero de Emergencia 24/7 en «Servicios de ayuda».");
            }
        },
        {
            titulo: "4. Analiza tendencias y exporta reportes",
            descripcion: "En «Pérdidas de agua» comparas el consumo de hoy por ambiente o la evolución de los últimos 7 días (en ml o soles) y descargas reportes en CSV o PDF.",
            objetivo: "Necesidad que resuelve: respaldar reclamos, evaluar hábitos de consumo y compartir evidencia.",
            textoAccion: null,
            enlace: { href: "perdidas.html", texto: "Explorar gráficos y reportes →" },
            ejecutar: null
        },
        {
            titulo: "5. Calcula tu ahorro y cierra la incidencia",
            descripcion: "Usa la calculadora de ahorro para proyectar cuánta agua y dinero conservas al reparar la fuga. Una vez solucionada, márcala como reparada para volver a 0 ml.",
            objetivo: "Necesidad que resuelve: comprobar el beneficio económico de reparar a tiempo y dejar el monitoreo limpio.",
            textoAccion: "Marcar todo como reparado (0 ml)",
            enlace: { href: "perdidas.html#calc-parte", texto: "Abrir calculadora de ahorro →" },
            ejecutar: function () {
                A.lugares().forEach(function (l) {
                    if (l.ml > 0) { A.repararLugar(l.id); }
                });
                mostrarFeedback("¡Listo! Todas las fugas quedaron en 0 ml (Sin fuga). Ya dominas las funciones principales de AquaSteps.");
            }
        }
    ];

    let pasoActual = 0;
    try {
        const guardado = Number(sessionStorage.getItem(CLAVE_TUTORIAL));
        if (Number.isInteger(guardado) && guardado >= 0 && guardado < PASOS.length) {
            pasoActual = guardado;
        }
    } catch (e) { /* sin almacenamiento de sesión */ }

    function guardarPaso() {
        try { sessionStorage.setItem(CLAVE_TUTORIAL, String(pasoActual)); } catch (e) { /* nada */ }
    }

    function mostrarFeedback(texto) {
        tutFeedback.textContent = texto;
    }

    function pintarBanner() {
        const pendientes = A.pendientes();
        const criticos = pendientes.filter(function (l) { return A.estadoDe(l).clave === "critico"; });
        let clase = "alerta sin";
        let titulo = "SIN ALERTAS";
        let detalle = "Ningún lugar requiere mantenimiento por ahora.";
        let lugarUrgente = null;

        if (criticos.length > 0) {
            clase = "alerta critico";
            titulo = "¡ALERTA DE FUGA DETECTADA!";
            detalle = "Mantenimiento completo necesario en: " + criticos.map(function (l) { return l.nombre; }).join(", ") + ".";
            lugarUrgente = criticos[0];
        } else if (pendientes.length > 0) {
            clase = "alerta moderado";
            titulo = "¡ALERTA!";
            detalle = "Mantenimiento preventivo recomendado en: " + pendientes.map(function (l) { return l.nombre; }).join(", ") + ".";
            lugarUrgente = pendientes[0];
        }
        banner.className = clase;
        const elementos = [A.crear("strong", "", titulo), A.crear("span", "", detalle)];
        if (lugarUrgente) {
            const enlaceAyuda = A.crear("a", "alerta-enlace", "Contactar gasfitero o servicio de ayuda →");
            enlaceAyuda.href = "alertas.html?lugar=" + encodeURIComponent(lugarUrgente.id) + "#ayuda";
            elementos.push(enlaceAyuda);
        }
        banner.replaceChildren.apply(banner, elementos);
    }

    let mostrado = 0;
    let animacion = null;

    function escribirContador(ml) {
        contadorMl.textContent = Math.round(ml) + " ml";
        contadorCosto.textContent = A.formatearCosto(ml);
    }

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

    function pintarGota() {
        postal.setAttribute("data-estado", A.estadoGeneral().clave);
    }

    function pintarTutorial() {
        const paso = PASOS[pasoActual];
        const total = PASOS.length;
        const porcentaje = Math.round(((pasoActual + 1) / total) * 100);

        tutEtiqueta.textContent = "Paso " + (pasoActual + 1) + " de " + total;
        tutBarra.setAttribute("aria-valuenow", String(porcentaje));
        tutBarra.firstElementChild.style.width = porcentaje + "%";

        tutTitulo.textContent = paso.titulo;
        tutDescripcion.textContent = paso.descripcion;
        tutObjetivo.textContent = paso.objetivo;

        if (paso.textoAccion && paso.ejecutar) {
            tutAccion.hidden = false;
            tutAccion.textContent = paso.textoAccion;
        } else {
            tutAccion.hidden = true;
        }

        if (paso.enlace) {
            tutEnlace.hidden = false;
            tutEnlace.href = paso.enlace.href;
            tutEnlace.textContent = paso.enlace.texto;
        } else {
            tutEnlace.hidden = true;
        }

        tutPuntos.replaceChildren();
        PASOS.forEach(function (p, i) {
            const btn = A.crear("button", "tut-punto", String(i + 1));
            btn.type = "button";
            btn.setAttribute("aria-label", "Ir al paso " + (i + 1) + ": " + p.titulo);
            btn.setAttribute("aria-pressed", i === pasoActual ? "true" : "false");
            if (i < pasoActual) { btn.classList.add("completado"); }
            btn.addEventListener("click", function () {
                pasoActual = i;
                guardarPaso();
                mostrarFeedback("");
                pintarTutorial();
            });
            tutPuntos.appendChild(btn);
        });

        tutAnterior.disabled = pasoActual === 0;
        tutSiguiente.textContent = pasoActual === total - 1 ? "Finalizar guía ✓" : "Siguiente →";
    }

    tutAccion.addEventListener("click", function () {
        const paso = PASOS[pasoActual];
        if (paso && paso.ejecutar) { paso.ejecutar(); }
    });

    tutEnlace.addEventListener("click", function () {
        guardarPaso();
    });

    tutAnterior.addEventListener("click", function () {
        if (pasoActual > 0) {
            pasoActual -= 1;
            guardarPaso();
            mostrarFeedback("");
            pintarTutorial();
        }
    });

    tutSiguiente.addEventListener("click", function () {
        if (pasoActual < PASOS.length - 1) {
            pasoActual += 1;
            guardarPaso();
            mostrarFeedback("");
            pintarTutorial();
        } else {
            pasoActual = 0;
            guardarPaso();
            pintarTutorial();
            mostrarFeedback("Has completado el tutorial de AquaSteps. Puedes volver a revisar cualquier paso cuando lo necesites.");
        }
    });

    tutReiniciar.addEventListener("click", function () {
        pasoActual = 0;
        guardarPaso();
        A.restablecerTodo();
        pintarTutorial();
        mostrarFeedback("Guía y datos iniciales restablecidos al Paso 1.");
    });

    function actualizar() {
        pintarBanner();
        pintarGota();
        animarContador(A.totalMl());
    }

    mostrado = A.totalMl();
    escribirContador(mostrado);
    actualizar();
    pintarTutorial();
    A.alCambiar(actualizar);
})();
