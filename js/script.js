/* ==========================================================================
   AquaSteps · Interfaz general (todas las páginas)
   1. Fecha actual
   2. Modo oscuro
   3. Menú "Consultar" (se cierra solo)
   4. Insignia con el número de alertas activas
   ========================================================================== */
(function () {
    "use strict";

    const CLAVE_TEMA = "aquasteps-tema";

    /* ---------- 1. Fecha ---------- */
    document.querySelectorAll("#fecha-actual").forEach(function (el) {
        el.textContent = new Date().toLocaleDateString("es-PE", {
            weekday: "long", day: "numeric", month: "long", year: "numeric"
        });
    });

    /* ---------- 2. Modo oscuro ---------- */
    const raiz = document.documentElement;
    const botonTema = document.getElementById("btn-tema");

    function temaActual() {
        return raiz.getAttribute("data-tema") === "oscuro" ? "oscuro" : "claro";
    }

    function aplicarTema(tema, guardar) {
        if (tema === "oscuro") { raiz.setAttribute("data-tema", "oscuro"); }
        else { raiz.removeAttribute("data-tema"); }
        if (botonTema) { botonTema.setAttribute("aria-pressed", tema === "oscuro" ? "true" : "false"); }
        if (guardar) {
            try { localStorage.setItem(CLAVE_TEMA, tema); } catch (error) { /* modo privado */ }
        }
    }

    if (botonTema) {
        botonTema.setAttribute("aria-pressed", temaActual() === "oscuro" ? "true" : "false");
        botonTema.addEventListener("click", function () {
            aplicarTema(temaActual() === "oscuro" ? "claro" : "oscuro", true);
        });
    }

    /* ---------- 3. Menú desplegable ---------- */
    const menus = document.querySelectorAll("details.desplegable");

    function cerrarMenus(excepto) {
        menus.forEach(function (menu) {
            if (menu !== excepto) { menu.removeAttribute("open"); }
        });
    }

    document.addEventListener("click", function (evento) {
        menus.forEach(function (menu) {
            if (!menu.contains(evento.target)) { menu.removeAttribute("open"); }
        });
    });

    document.addEventListener("keydown", function (evento) {
        if (evento.key !== "Escape") { return; }
        menus.forEach(function (menu) {
            if (menu.hasAttribute("open")) {
                menu.removeAttribute("open");
                const resumen = menu.querySelector("summary");
                if (resumen) { resumen.focus(); }
            }
        });
    });

    // Al abrir un menú, se cierran los demás
    menus.forEach(function (menu) {
        menu.addEventListener("toggle", function () {
            if (menu.open) { cerrarMenus(menu); }
        });
    });

    /* ---------- 4. Insignia de alertas activas ---------- */
    if (!window.AquaSteps) { return; }

    function crearInsignia() {
        const insignia = document.createElement("span");
        insignia.className = "insignia";
        insignia.hidden = true;
        const numero = document.createElement("span");
        numero.setAttribute("aria-hidden", "true");
        const lector = document.createElement("span");
        lector.className = "solo-lector";
        insignia.appendChild(numero);
        insignia.appendChild(lector);
        return insignia;
    }

    const destinos = [];
    document.querySelectorAll("details.desplegable > summary").forEach(function (el) { destinos.push(el); });
    document.querySelectorAll('.submenu a[href="alertas.html"]').forEach(function (el) { destinos.push(el); });
    const insignias = destinos.map(function (el) {
        const insignia = crearInsignia();
        el.appendChild(insignia);
        return insignia;
    });

    function actualizarInsignias() {
        const n = AquaSteps.pendientes().length;
        insignias.forEach(function (insignia) {
            insignia.hidden = n === 0;
            insignia.firstChild.textContent = n;
            insignia.lastChild.textContent = n === 1 ? " alerta activa" : " alertas activas";
        });
    }

    actualizarInsignias();
    AquaSteps.alCambiar(actualizarInsignias);
})();
