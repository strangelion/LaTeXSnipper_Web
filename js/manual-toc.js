/* LaTeXSnipper manual — single TOC drawer.
 *
 * One #sidebar panel can dock on either screen edge:
 *   - hovering the left/right edge zones opens it on that side;
 *   - the floating arrow (floatArrow) toggles it on the arrow's side;
 *   - on coarse pointers (no hover) the arrow is the only trigger, so it
 *     always opens the drawer regardless of which half it sits on.
 *
 * Generated pages must contain: #sidebar (toc), #floatArrow,
 * #edgeHoverLeft, #edgeHoverRight, #sidebarClose.
 */
(() => {
  var sidebar = document.getElementById("sidebar");
  var sidebarClose = document.getElementById("sidebarClose");
  var arrow = document.getElementById("floatArrow");
  var edgeL = document.getElementById("edgeHoverLeft");
  var edgeR = document.getElementById("edgeHoverRight");

  if (!sidebar) return;

  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  var COARSE = !finePointer.matches;

  // Current dock side of the drawer.
  var dock = "left";

  // ---- drawer state ----
  function openDock(side) {
    dock = side;
    sidebar.classList.remove("dock-left", "dock-right");
    sidebar.classList.add("dock-" + side);
    sidebar.classList.add("open");
    if (arrow) {
      arrow.classList.remove("side-left", "side-right");
      arrow.classList.add("side-" + side);
    }
  }

  function closeDrawer() {
    sidebar.classList.remove("open");
  }

  function isOpen() {
    return sidebar.classList.contains("open");
  }

  function toggleDock(side) {
    if (isOpen() && dock === side) closeDrawer();
    else openDock(side);
  }

  // ---- edge hover zones (fine pointers only) ----
  var edgeTimer = null;
  function keepOpenTimer() {
    if (edgeTimer) {
      clearTimeout(edgeTimer);
      edgeTimer = null;
    }
  }
  function scheduleClose() {
    keepOpenTimer();
    edgeTimer = setTimeout(closeDrawer, 450);
  }

  if (finePointer.matches) {
    if (edgeL) {
      edgeL.addEventListener("mouseenter", () => {
        keepOpenTimer();
        openDock("left");
      });
    }
    if (edgeR) {
      edgeR.addEventListener("mouseenter", () => {
        keepOpenTimer();
        openDock("right");
      });
    }
    // Keep the drawer open while the pointer is inside it.
    sidebar.addEventListener("mouseenter", keepOpenTimer);
    // Track the pointer globally: while the drawer is open, closing it is
    // scheduled whenever the pointer sits outside the drawer / edge zones /
    // arrow, and cancelled as soon as it returns inside one of them.
    var pointerInside = false;
    function pointerOverOpenRegion(x, y) {
      var rect;
      rect = sidebar.getBoundingClientRect();
      if (
        x >= rect.left &&
        x <= rect.right &&
        y >= rect.top &&
        y <= rect.bottom
      )
        return true;
      if (edgeL) {
        rect = edgeL.getBoundingClientRect();
        if (
          x >= rect.left &&
          x <= rect.right &&
          y >= rect.top &&
          y <= rect.bottom
        )
          return true;
      }
      if (edgeR) {
        rect = edgeR.getBoundingClientRect();
        if (
          x >= rect.left &&
          x <= rect.right &&
          y >= rect.top &&
          y <= rect.bottom
        )
          return true;
      }
      if (arrow) {
        rect = arrow.getBoundingClientRect();
        if (
          x >= rect.left &&
          x <= rect.right &&
          y >= rect.top &&
          y <= rect.bottom
        )
          return true;
      }
      return false;
    }
    window.addEventListener(
      "mousemove",
      (ev) => {
        if (!isOpen()) return;
        var inside = pointerOverOpenRegion(ev.clientX, ev.clientY);
        if (inside) {
          pointerInside = true;
          keepOpenTimer();
        } else if (pointerInside) {
          pointerInside = false;
          scheduleClose();
        }
      },
      { passive: true },
    );
  }

  if (sidebarClose) {
    sidebarClose.addEventListener("click", (ev) => {
      ev.stopPropagation();
      keepOpenTimer();
      closeDrawer();
    });
  }

  // Clicking a toc link scrolls and closes the drawer.
  sidebar.addEventListener("click", (ev) => {
    var link =
      ev.target && ev.target.closest ? ev.target.closest('a[href^="#"]') : null;
    if (!link) return;
    var target = document.getElementById(link.getAttribute("href").slice(1));
    if (target) {
      ev.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    closeDrawer();
  });

  // ---- floating arrow (drag to re-position / click to toggle) ----
  if (arrow) {
    var side = "left";
    var arrowY = Math.max(
      80,
      Math.min(window.innerHeight - 80, window.innerHeight * 0.5),
    );
    var dragging = false;
    var startX = 0;
    var startY = 0;
    var startArrowY = 0;
    var moved = false;

    try {
      var saved = JSON.parse(
        localStorage.getItem("latexSnipper-floatArrow") || "null",
      );
      if (saved) {
        side = saved.side === "right" ? "right" : "left";
        if (typeof saved.y === "number") {
          arrowY = Math.max(60, Math.min(window.innerHeight - 60, saved.y));
        }
      }
    } catch {
      /* ignore */
    }

    function placeArrow() {
      arrow.classList.remove("side-left", "side-right");
      arrow.classList.add("side-" + side);
      if (side === "left") {
        arrow.style.left = "6px";
        arrow.style.right = "auto";
      } else {
        arrow.style.right = "6px";
        arrow.style.left = "auto";
      }
      arrow.style.top = arrowY + "px";
    }
    function saveArrow() {
      try {
        localStorage.setItem(
          "latexSnipper-floatArrow",
          JSON.stringify({ side: side, y: arrowY }),
        );
      } catch {
        /* ignore */
      }
    }

    function onDown(ev) {
      ev.preventDefault();
      dragging = true;
      moved = false;
      var cx = ev.touches ? ev.touches[0].clientX : ev.clientX;
      var cy = ev.touches ? ev.touches[0].clientY : ev.clientY;
      startX = cx;
      startY = cy;
      startArrowY = arrowY;
      arrow.classList.add("dragging");
    }
    function onMove(ev) {
      if (!dragging) return;
      var cx = ev.touches ? ev.touches[0].clientX : ev.clientX;
      var cy = ev.touches ? ev.touches[0].clientY : ev.clientY;
      var dx = cx - startX,
        dy = cy - startY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) moved = true;
      arrowY = Math.max(
        40,
        Math.min(window.innerHeight - 40, startArrowY + dy),
      );
      arrow.style.top = arrowY + "px";
      if (cx < window.innerWidth * 0.5) {
        if (side !== "left") {
          side = "left";
          placeArrow();
        }
      } else if (side !== "right") {
        side = "right";
        placeArrow();
      }
    }
    function onUp(ev) {
      if (!dragging) return;
      dragging = false;
      arrow.classList.remove("dragging");
      var cx;
      if (ev.changedTouches) cx = ev.changedTouches[0].clientX;
      else cx = ev.clientX;
      side = cx < window.innerWidth * 0.5 ? "left" : "right";
      placeArrow();
      saveArrow();
      if (!moved) {
        // A plain click on the arrow toggles the drawer.
        if (COARSE) openDock(side);
        else toggleDock(side);
      }
    }

    arrow.addEventListener("touchstart", onDown, { passive: false });
    arrow.addEventListener("touchmove", onMove, { passive: false });
    arrow.addEventListener("touchend", onUp);
    arrow.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", (ev) => {
      if (dragging) onMove(ev);
    });
    window.addEventListener("mouseup", (ev) => {
      if (dragging) onUp(ev);
    });

    // Show the drawer on the arrow's side without a drag on coarse screens.
    if (COARSE) {
      arrow.addEventListener("click", (ev) => {
        ev.preventDefault();
        openDock(side);
      });
    }

    placeArrow();
  }

  // Clicking anywhere else closes the drawer.
  document.addEventListener("click", (ev) => {
    if (!isOpen()) return;
    var hit = ev.target;
    if (sidebar.contains(hit)) return;
    if (arrow && arrow.contains(hit)) return;
    if ((edgeL && edgeL.contains(hit)) || (edgeR && edgeR.contains(hit)))
      return;
    closeDrawer();
  });

  // ---- scroll spy: highlight the heading currently in view ----
  var links = Array.prototype.slice.call(
    sidebar.querySelectorAll('a[href^="#"]'),
  );
  var anchors = links
    .map((link) => {
      var el = document.getElementById(link.getAttribute("href").slice(1));
      return el ? { el: el, link: link } : null;
    })
    .filter(Boolean);

  function highlight() {
    if (!anchors.length) return;
    var probe = window.scrollY + 140;
    var current = null;
    for (var i = 0; i < anchors.length; i++) {
      if (anchors[i].el.offsetTop <= probe) current = anchors[i];
      else break;
    }
    for (var j = 0; j < anchors.length; j++) {
      anchors[j].link.classList.toggle("active", anchors[j] === current);
    }
  }
  if (anchors.length) {
    window.addEventListener("scroll", highlight, { passive: true });
    highlight();
  }
})();
