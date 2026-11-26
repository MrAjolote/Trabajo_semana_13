/* ==========================================================================
   AquaSteps · Página de Pérdidas
   - Tabla, cifras y barras por lugar
   - Gráfico interactivo (Hoy / 7 días, en ml o soles) hecho con SVG
   - Calculadora de ahorro
   - Acciones recomendadas con casillas y barra de progreso
   - Exportar CSV e imprimir
   ========================================================================== */
(function () {
    "use strict";

    const tablaTotal = document.getElementById("tabla-total");
    if (!tablaTotal || !window.AquaSteps) { return; }
    const A = AquaSteps;
    const NS = "http://www.w3.org/2000/svg";

    let unidad = "ml";      // "ml" | "soles"
    let periodo = "hoy";    // "hoy" | "semana"

    /* ---------- Ayudas ---------- */
    function celda(texto) { return A.crear("td", "", texto); }

    function svg(etiqueta, atributos, texto) {
        const el = document.createElementNS(NS, etiqueta);
        Object.keys(atributos || {}).forEach(function (k) { el.setAttribute(k, atributos[k]); });
        if (texto !== undefined) { el.textContent = texto; }
        return el;
    }

    function valorEn(ml) { return unidad === "ml" ? ml : A.calcularCosto(ml); }
    function textoValor(ml) {
        return unidad === "ml" ? A.formatearMl(ml) : A.formatearSoles(A.calcularCosto(ml));
    }
    function textoEje(v) {
        return unidad === "ml" ? String(Math.round(v)) : v.toFixed(2).replace(".", ",");
    }

    /* ---------- Tabla, cifras, barras ---------- */
    function pintarResumen() {
        const total = A.totalMl();
        const ordenados = A.ordenar(A.lugares());
        const fila = A.crear("tr");
        fila.appendChild(celda(A.formatearMl(total)));
        fila.appendChild(celda(A.formatearCosto(total)));
        tablaTotal.replaceChildren(fila);

        function cifra(valor, etiqueta) {
            const c = A.crear("div", "cifra");
            c.appendChild(A.crear("strong", "", valor));
            c.appendChild(A.crear("span", "", etiqueta));
            return c;
        }
        document.getElementById("cifras").replaceChildren(
            cifra(A.formatearMl(total), "Pérdida total"),
            cifra(A.formatearCosto(total), "Costo total"),
            cifra(String(A.pendientes().length), "Alertas activas")
        );

        const barras = document.getElementById("barras");
        barras.replaceChildren();
        ordenados.forEach(function (lugar) {
            const porcentaje = total > 0 ? Math.round(lugar.ml / total * 100) : 0;
            const clave = A.estadoDe(lugar).clave;
            const item = A.crear("li", "", lugar.nombre);
            const fondo = A.crear("span", "barra-fondo");
            const valor = A.crear("span", "barra-valor " + clave);
            valor.style.width = porcentaje + "%";
            fondo.appendChild(valor);
            item.appendChild(fondo);
            item.appendChild(A.crear("b", "", porcentaje + "%"));
            barras.appendChild(item);
        });

        document.getElementById("resumen").textContent = ordenados.map(function (l) {
            return l.nombre + ": " + A.formatearMl(l.ml);
        }).join(" · ");
    }

    /* ---------- Gráfico ---------- */
    const cajaGrafico = document.getElementById("grafico-caja");
    const grafico = document.getElementById("grafico");
    const globo = document.getElementById("globo");

    // Datos de ejemplo de los días anteriores, calculados a partir del pico de cada lugar.
    const FACTORES = [0.55, 0.7, 0.62, 0.85, 0.78, 0.92];   // hace 6, 5, 4, 3, 2, 1 días

    function semilla(id) {
        let h = 0;
        for (let i = 0; i < id.length; i++) { h = (h * 31 + id.charCodeAt(i)) % 97; }
        return (h % 7 - 3) / 50;   // entre -0,06 y +0,06
    }

    function datosSemana() {
        const dias = [];
        const hoy = new Date();
        for (let d = 6; d >= 0; d--) {
            const fecha = new Date(hoy);
            fecha.setDate(hoy.getDate() - d);
            let ml = 0;
            if (d === 0) {
                ml = A.totalMl();
            } else {
                A.lugares().forEach(function (l) {
                    const f = Math.max(0, Math.min(1, FACTORES[6 - d] + semilla(l.id)));
                    ml += Math.round(l.pico * f);
                });
            }
            dias.push({
                etiqueta: d === 0 ? "Hoy" : fecha.toLocaleDateString("es-PE", { weekday: "short" }).replace(".", ""),
                detalle: fecha.toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long" }),
                ml: ml,
                hoy: d === 0
            });
        }
        return dias;
    }

    function datosHoy() {
        return A.ordenar(A.lugares()).map(function (l) {
            return { etiqueta: l.nombre, detalle: l.nombre + " · " + A.estadoDe(l).nombre, ml: l.ml, clase: A.estadoDe(l).clave, hoy: true };
        });
    }

    // Techo del eje: 4 tramos iguales con un paso "redondo" (1, 2, 2,5, 5 × 10^n)
    function techoNice(max) {
        if (max <= 0) { return unidad === "ml" ? 4 : 1; }
        const crudo = max / 4;
        const exp = Math.pow(10, Math.floor(Math.log10(crudo)));
        const f = crudo / exp;
        let paso = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * exp;
        if (unidad === "ml") { paso = Math.max(1, Math.ceil(paso)); }
        return paso * 4;
    }

    function mostrarGlobo(barra, texto) {
        globo.textContent = texto;
        globo.hidden = false;
        const cr = cajaGrafico.getBoundingClientRect();
        const br = barra.getBoundingClientRect();
        let x = br.left - cr.left + br.width / 2;
        const mitad = globo.offsetWidth / 2;
        x = Math.max(mitad + 4, Math.min(cr.width - mitad - 4, x));
        globo.style.left = x + "px";
        globo.style.top = Math.max(0, br.top - cr.top - globo.offsetHeight - 8) + "px";
    }

    function ocultarGlobo() { globo.hidden = true; }

    function pintarGrafico() {
        const datos = periodo === "hoy" ? datosHoy() : datosSemana();
        const W = 640, H = 300, mi = 54, md = 14, ms = 18, mb = 40;
        const ancho = W - mi - md;
        const alto = H - ms - mb;
        const maxValor = Math.max.apply(null, datos.map(function (d) { return valorEn(d.ml); }).concat([0]));
        const techo = techoNice(maxValor);

        grafico.replaceChildren();
        grafico.setAttribute("viewBox", "0 0 " + W + " " + H);

        // Líneas y valores del eje Y
        for (let i = 0; i <= 4; i++) {
            const v = techo * i / 4;
            const y = ms + alto - alto * i / 4;
            grafico.appendChild(svg("line", { x1: mi, x2: W - md, y1: y, y2: y, class: "g-linea" }));
            grafico.appendChild(svg("text", { x: mi - 8, y: y + 4, class: "g-eje", "text-anchor": "end" }, textoEje(v)));
        }
        grafico.appendChild(svg("text", {
            x: 12, y: ms + alto / 2, class: "g-eje", "text-anchor": "middle",
            transform: "rotate(-90 12 " + (ms + alto / 2) + ")"
        }, unidad === "ml" ? "ml" : "soles"));

        const paso = ancho / datos.length;
        const grosor = Math.min(64, paso * 0.58);

        datos.forEach(function (d, i) {
            const valor = valorEn(d.ml);
            const h = techo > 0 ? alto * valor / techo : 0;
            const x = mi + paso * i + (paso - grosor) / 2;
            const y = ms + alto - h;
            const clase = "g-barra " + (d.clase || (d.hoy ? "g-hoy" : "g-previo"));
            const descripcion = d.detalle + ": " + textoValor(d.ml);
            const rect = svg("rect", {
                x: x, y: y, width: grosor, height: Math.max(h, 2), rx: 5, class: clase,
                tabindex: 0, role: "img", "aria-label": descripcion
            });
            rect.addEventListener("pointerenter", function () { mostrarGlobo(rect, descripcion); });
            rect.addEventListener("pointerleave", ocultarGlobo);
            rect.addEventListener("focus", function () { mostrarGlobo(rect, descripcion); });
            rect.addEventListener("blur", ocultarGlobo);
            grafico.appendChild(rect);
            grafico.appendChild(svg("text", {
                x: x + grosor / 2, y: Math.max(y - 6, ms - 2), class: "g-valor", "text-anchor": "middle"
            }, unidad === "ml" ? String(Math.round(d.ml)) : textoEje(valor)));
            grafico.appendChild(svg("text", {
                x: x + grosor / 2, y: H - 14, class: "g-etiqueta" + (d.hoy && periodo === "semana" ? " g-etiqueta-hoy" : ""),
                "text-anchor": "middle"
            }, d.etiqueta));
        });

        // Tabla equivalente (accesible)
        const cuerpo = document.getElementById("grafico-datos");
        cuerpo.replaceChildren();
        datos.forEach(function (d) {
            const fila = A.crear("tr");
            fila.appendChild(celda(d.detalle));
            fila.appendChild(celda(A.formatearMl(d.ml)));
            fila.appendChild(celda(A.formatearCosto(d.ml)));
            cuerpo.appendChild(fila);
        });

        document.getElementById("grafico-titulo").textContent = periodo === "hoy"
            ? "Pérdida de hoy por lugar"
            : "Pérdida total de los últimos 7 días";
        document.getElementById("grafico-nota").textContent = periodo === "hoy"
            ? "Pasa el mouse o enfoca una barra para ver el detalle."
            : "Los 6 días anteriores son datos de ejemplo; el día de hoy usa tus mediciones reales.";
    }

    function activarSegmento(grupo, valor) {
        grupo.querySelectorAll("button").forEach(function (b) {
            b.setAttribute("aria-pressed", b.getAttribute("data-valor") === valor ? "true" : "false");
        });
    }

    const grupoUnidad = document.getElementById("grafico-unidad");
    const grupoPeriodo = document.getElementById("grafico-periodo");
    grupoUnidad.addEventListener("click", function (e) {
        const b = e.target.closest("button[data-valor]");
        if (!b) { return; }
        unidad = b.getAttribute("data-valor");
        activarSegmento(grupoUnidad, unidad);
        ocultarGlobo();
        pintarGrafico();
    });
    grupoPeriodo.addEventListener("click", function (e) {
        const b = e.target.closest("button[data-valor]");
        if (!b) { return; }
        periodo = b.getAttribute("data-valor");
        activarSegmento(grupoPeriodo, periodo);
        ocultarGlobo();
        pintarGrafico();
    });

    /* ---------- Calculadora de ahorro ---------- */
    const rangoParte = document.getElementById("calc-parte");
    const rangoDias = document.getElementById("calc-dias");

    function pintarCalculadora() {
        const parte = Number(rangoParte.value) / 100;
        const dias = Number(rangoDias.value);
        const total = A.totalMl();
        const mlAhorrados = total * parte * dias;
        const mlAnual = total * parte * 365;

        document.getElementById("calc-parte-valor").textContent = rangoParte.value + " %";
        document.getElementById("calc-dias-valor").textContent = dias + (dias === 1 ? " día" : " días");
        rangoParte.setAttribute("aria-valuetext", rangoParte.value + " por ciento");
        rangoDias.setAttribute("aria-valuetext", dias + (dias === 1 ? " día" : " días"));

        document.getElementById("calc-soles").textContent = A.formatearSoles(A.calcularCosto(mlAhorrados));
        document.getElementById("calc-litros").textContent = A.formatearLitros(mlAhorrados);
        document.getElementById("calc-vasos").textContent = Math.round(mlAhorrados / 250) + " vasos";
        document.getElementById("calc-anual").textContent = A.formatearSoles(A.calcularCosto(mlAnual)) +
            " y " + A.formatearLitros(mlAnual) + " al año";
        document.getElementById("calc-aviso").textContent = total === 0
            ? "Ahora mismo no hay fuga que reparar: todo está en 0 ml."
            : "Calculado con tu pérdida de hoy (" + A.formatearMl(total) + ") repetida cada día.";

        document.querySelectorAll("#calc-atajos button").forEach(function (b) {
            b.setAttribute("aria-pressed", b.getAttribute("data-dias") === String(dias) ? "true" : "false");
        });
    }

    rangoParte.addEventListener("input", pintarCalculadora);
    rangoDias.addEventListener("input", pintarCalculadora);
    document.getElementById("calc-atajos").addEventListener("click", function (e) {
        const b = e.target.closest("button[data-dias]");
        if (!b) { return; }
        rangoDias.value = b.getAttribute("data-dias");
        pintarCalculadora();
    });

    /* ---------- Acciones recomendadas ---------- */
    function pintarAcciones() {
        const foco = document.activeElement && document.activeElement.getAttribute
            ? document.activeElement.getAttribute("data-foco") : null;
        const acciones = document.getElementById("acciones");
        acciones.replaceChildren();
        const conFuga = A.ordenar(A.lugares()).filter(function (l) { return l.ml > 0; });

        if (conFuga.length === 0) {
            acciones.appendChild(A.crear("li", "sin-numero", "No hay acciones pendientes."));
        } else {
            const principal = conFuga[0];
            const itemAyuda = A.crear("li", "sin-numero");
            const enlaceAyuda = A.crear("a", "boton secundario", "Solicitar gasfitero o asistencia para " + principal.nombre + " →");
            enlaceAyuda.href = "alertas.html?lugar=" + encodeURIComponent(principal.id) + "#ayuda";
            itemAyuda.appendChild(enlaceAyuda);
            acciones.appendChild(itemAyuda);
        }
        conFuga.forEach(function (lugar) {
            A.estadoDe(lugar).operaciones.forEach(function (operacion, i) {
                const clave = A.claveOperacion(lugar, i);
                const item = A.crear("li");
                const etiqueta = A.crear("label");
                const casilla = A.crear("input");
                casilla.type = "checkbox";
                casilla.checked = A.operacionMarcada(clave);
                casilla.setAttribute("data-foco", "accion:" + clave);
                casilla.addEventListener("change", function () { A.marcarOperacion(clave, casilla.checked); });
                etiqueta.appendChild(casilla);
                const texto = A.crear("span");
                texto.appendChild(A.crear("b", "", lugar.nombre + ": "));
                texto.appendChild(document.createTextNode(operacion));
                etiqueta.appendChild(texto);
                item.appendChild(etiqueta);
                if (casilla.checked) { item.className = "hecha"; }
                acciones.appendChild(item);
            });
        });

        const prog = A.progresoOperaciones();
        const porcentaje = prog.total > 0 ? Math.round(prog.hechas / prog.total * 100) : 0;
        const barra = document.getElementById("progreso-barra");
        barra.setAttribute("aria-valuenow", porcentaje);
        barra.firstChild.style.width = porcentaje + "%";
        document.getElementById("progreso-texto").textContent = prog.total === 0
            ? "Sin tareas"
            : prog.hechas + " de " + prog.total + " completadas";

        if (foco) {
            const nuevo = acciones.querySelector('[data-foco="' + foco.replace(/"/g, '\\"') + '"]');
            if (nuevo) { nuevo.focus(); }
        }
    }

    /* ---------- Exportar ---------- */
    function celdaCsv(valor) {
        return '"' + String(valor).replace(/"/g, '""') + '"';
    }

    function descargarCsv() {
        const hoy = new Date();
        const iso = hoy.getFullYear() + "-" + String(hoy.getMonth() + 1).padStart(2, "0") + "-" + String(hoy.getDate()).padStart(2, "0");
        const filas = [["Lugar", "Pérdida (ml)", "Costo (soles)", "Estado", "Mantenimiento", "Fecha"]];
        A.ordenar(A.lugares()).forEach(function (l) {
            const e = A.estadoDe(l);
            filas.push([l.nombre, l.ml, A.calcularCosto(l.ml).toFixed(2), e.nombre, e.mantenimiento, iso]);
        });
        filas.push(["TOTAL", A.totalMl(), A.calcularCosto(A.totalMl()).toFixed(2), "", "", iso]);
        const texto = "﻿" + filas.map(function (f) { return f.map(celdaCsv).join(","); }).join("\r\n");
        const blob = new Blob([texto], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const enlace = A.crear("a");
        enlace.href = url;
        enlace.download = "aquasteps-reporte-" + iso + ".csv";
        document.body.appendChild(enlace);
        enlace.click();
        enlace.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
        A.avisar("Se descargó el reporte en CSV.", "sin");
    }

    document.getElementById("btn-csv").addEventListener("click", descargarCsv);
    document.getElementById("btn-imprimir").addEventListener("click", function () { window.print(); });

    /* ---------- Todo junto ---------- */
    function actualizar() {
        pintarResumen();
        pintarGrafico();
        pintarCalculadora();
        pintarAcciones();
    }

    actualizar();
    A.alCambiar(actualizar);
})();
