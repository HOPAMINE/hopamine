/* ZIMA HQ renderer
   - Reads modules/manifest.json, then each module JSON listed with "on": true.
   - Each module = one section. Each section = a list of typed blocks.
   - On localhost it polls the files and re-renders on save (live reload).
   No build step, no dependencies. */
(function () {
  "use strict";
  var ROOT = "modules/";
  var IS_LOCAL = /^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])$/.test(location.hostname) || /\.local$/.test(location.hostname);
  var app = document.getElementById("app");
  var lastSig = "";

  /* ---------- helpers ---------- */
  function attr(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function esc(s) { return glyphs(attr(s)); }
  // Bootzy has no · • ° » → … × ✓ — set those marks in a fallback face (spec §1.1)
  function glyphs(h) { return h.replace(/[·•°»→…×✓]/g, function (c) { return '<span class="g">' + c + "</span>"; }); }
  // tiny inline markup: **bold**, *italic*, `code`, [text](url)
  function md(s) {
    return esc(s)
      .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/`(.+?)`/g, "<code>$1</code>")
      .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+|[#\/][^)\s]*)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  }
  function list(items) { return (items || []).map(function (i) { return "<li>" + md(i) + "</li>"; }).join(""); }
  function tags(t) {
    if (!t || !t.length) return "";
    return '<div class="tags">' + t.map(function (x) {
      if (typeof x === "string") return '<span class="tag">' + esc(x) + "</span>";
      return '<span class="tag ' + attr(x.k || "") + '">' + esc(x.t) + "</span>";
    }).join("") + "</div>";
  }
  function stamp(m) {
    return '<div class="stamp"><b>' + esc(m.stamp || "") + '</b><i></i><i></i><span>' + esc(m.eyebrow || "") + "</span></div>";
  }
  function title(m) {
    var s = m.script ? ' <span class="script">' + esc(m.script) + "</span>" : "";
    return '<h2 class="t1">' + esc(m.title) + s + "</h2>";
  }

  /* ---------- block renderers ---------- */
  var B = {
    text: function (b) { return (b.paragraphs || []).map(function (p) { return '<p class="lede">' + md(p) + "</p>"; }).join(""); },
    quote: function (b) { return '<p class="quote">“' + md(b.text) + '”</p><div class="quote-by">' + esc(b.by || "") + "</div>"; },
    cards: function (b) {
      return '<div class="cards">' + b.items.map(function (c) {
        return '<div class="card">' + (c.num ? '<div class="num">' + esc(c.num) + "</div>" : "") +
          (c.who ? '<div class="who">' + esc(c.who) + "</div>" : "") +
          (c.title ? '<h3 class="h">' + esc(c.title) + "</h3>" : "") + "<p>" + md(c.text) + "</p>" + tags(c.tags) + "</div>";
      }).join("") + "</div>";
    },
    panels: function (b) {
      return '<div class="panels">' + b.items.map(function (c) {
        return '<div class="panel f-' + attr(c.fill || "white") + '"><h3 class="h">' + esc(c.title) + "</h3><p>" + md(c.text) + "</p>" + tags(c.tags) + "</div>";
      }).join("") + "</div>";
    },
    tracks: function (b) {
      return '<div class="tracks">' + b.tracks.map(function (t) {
        return '<div class="track"><div class="track-head"><h3 class="h">' + esc(t.name) + '</h3><span class="repo">' + esc(t.repo || "") + "</span></div>" +
          '<div class="lane">' + t.phases.map(function (p) {
            var pr = typeof p.progress === "number" ? '<div class="bar-p"><i style="width:' + Math.max(0, Math.min(100, p.progress)) + '%"></i></div>' : "";
            return '<div class="phase' + (p.now ? " now" : "") + '">' + (p.flag ? '<span class="flag">' + esc(p.flag) + "</span>" : "") +
              '<div class="when">' + esc(p.when) + '</div><div class="name">' + esc(p.name) + "</div>" +
              (p.goal ? '<div class="goal">' + md(p.goal) + "</div>" : "") + "<ul>" + list(p.items) + "</ul>" + pr + "</div>";
          }).join("") + "</div></div>";
      }).join("") + "</div>";
    },
    board: function (b) {
      return '<div class="board">' + b.items.map(function (t) {
        var dw = t.done && t.done.length ? '<details class="done-when"><summary>Done when</summary><ul>' + list(t.done) + "</ul></details>" : "";
        return '<div class="task"><div class="id">' + esc(t.id) + "</div><div><h4>" + esc(t.title) + "</h4><p>" + md(t.text) + "</p>" + tags(t.tags) + dw + "</div></div>";
      }).join("") + "</div>";
    },
    team: function (b) {
      return '<div class="tbl"><table><tr><th>Person</th><th>Role</th><th>Owns</th></tr>' + b.people.map(function (p) {
        return "<tr><td><b>" + esc(p.name) + '</b></td><td><span class="role ' + attr(p.kind || "") + '">' + esc(p.role) + "</span></td><td>" + md(p.owns) + "</td></tr>";
      }).join("") + "</table></div>";
    },
    table: function (b) {
      return '<div class="tbl"><table><tr>' + b.cols.map(function (c) { return "<th>" + esc(c) + "</th>"; }).join("") + "</tr>" +
        b.rows.map(function (r) { return "<tr>" + r.map(function (c) { return "<td>" + md(c) + "</td>"; }).join("") + "</tr>"; }).join("") + "</table></div>";
    },
    steps: function (b) {
      return '<div class="steps">' + b.items.map(function (s) { return '<div class="step"><div><h4>' + esc(s.title) + "</h4><p>" + md(s.text) + "</p></div></div>"; }).join("") + "</div>";
    },
    ladder: function (b) {
      var fills = { p0: "var(--coral)", p1: "var(--ink);color:var(--white)", p2: "var(--blue)", p3: "var(--lime)" };
      return '<div class="ladder">' + b.items.map(function (r) {
        return '<div class="rung"><b style="background:' + (fills[r.p.toLowerCase()] || "var(--cream)") + '">' + esc(r.p) + "</b><p><strong>" + esc(r.title) + ".</strong> " + md(r.text) + "</p></div>";
      }).join("") + "</div>";
    },
    ring: function (b) {
      var R = b.roles || [], n = R.length, cx = 150, cy = 150, rad = 104, nodes = "";
      R.forEach(function (r, i) {
        var a = -Math.PI / 2 + (2 * Math.PI * i) / n, x = cx + rad * Math.cos(a), y = cy + rad * Math.sin(a);
        nodes += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="31" fill="#F2EFE8" stroke="#161616" stroke-width="2"/>' +
          '<text x="' + x.toFixed(1) + '" y="' + (y + 3.5).toFixed(1) + '" text-anchor="middle" font-family="Bootzy,Arial Black,sans-serif" font-weight="400" font-size="' + Math.min(9, 50 / Math.max(r.name.length, 1)).toFixed(1) + '" letter-spacing=".3">' + attr(r.name.toUpperCase()) + "</text>";
      });
      var svg = '<svg viewBox="0 0 300 300" role="img" aria-label="Roles rotate around the driver">' +
        '<circle cx="150" cy="150" r="104" fill="none" stroke="#161616" stroke-width="1.5" stroke-dasharray="3 6"/>' +
        '<circle cx="150" cy="150" r="50" fill="#5BC2E7" stroke="#161616" stroke-width="2"/>' +
        '<text x="150" y="148" text-anchor="middle" font-family="Bootzy,Arial Black,sans-serif" font-weight="400" font-size="13" fill="#fff">' + attr((b.center || "DRIVER").toUpperCase()) + "</text>" +
        '<text x="150" y="164" text-anchor="middle" font-family="Bootzy,Arial,sans-serif" font-weight="400" font-size="8.5" fill="#161616">' + attr(b.centerSub || "") + "</text>" +
        nodes + '</svg>';
      var items = (b.items || []).map(function (r) { return "<div><b>" + esc(r.name) + "</b><p>" + md(r.text) + "</p></div>"; }).join("");
      return '<div class="ring">' + svg + '<div class="rlist">' + items + "</div></div>";
    },
    checklist: function (b, m) {
      return '<div class="people">' + b.people.map(function (p, pi) {
        return '<div class="person"><h3 class="h"><span class="av">' + esc(p.initial || p.name[0]) + "</span>" + esc(p.name) + "</h3>" +
          p.items.map(function (it, ii) {
            var key = "hq:" + m.id + ":" + pi + ":" + ii, on = false;
            try { on = localStorage.getItem(key) === "1"; } catch (e) {}
            return '<label class="chk' + (on ? " done" : "") + '"><input type="checkbox" data-key="' + attr(key) + '"' + (on ? " checked" : "") + "><span>" + md(it.text) + (it.tag ? "<em>" + esc(it.tag) + "</em>" : "") + "</span></label>";
          }).join("") + "</div>";
      }).join("") + "</div>";
    },
    code: function (b) {
      return '<div class="codes">' + b.items.map(function (c) {
        var body = attr(c.lines).split("\n").map(function (l) { return /^\s*#/.test(l) ? '<span class="c">' + l + "</span>" : l.replace(/(\s#\s.*)$/, '<span class="c">$1</span>'); }).join("\n");
        return '<pre class="code">' + body + "</pre>";
      }).join("") + "</div>";
    },
    dosdonts: function (b) {
      return '<div class="dd"><div class="do"><h3 class="h">Do</h3><ul>' + list(b["do"]) + '</ul></div><div class="dont"><h3 class="h">Don\'t</h3><ul>' + list(b.dont) + "</ul></div></div>";
    },
    swatches: function (b) {
      return '<div class="swatches">' + b.items.map(function (s) {
        return '<div class="sw" style="background:' + attr(s.hex) + ";color:" + attr(s.ink || "#161616") + '"><b>' + esc(s.name) + "</b><span>" + esc(s.hex) + "</span><span>" + esc(s.job || "") + "</span></div>";
      }).join("") + "</div>";
    }
  };

  /* ---------- page ---------- */
  function renderModule(m) {
    var keys = (m.keywords || []).join(" ");
    var html = '<section class="mod g-' + attr(m.ground || "cream") + '" id="' + attr(m.id) + '" data-k="' + attr(keys) + '"><div class="wrap">' +
      stamp(m) + title(m) + (m.lede ? '<p class="lede">' + md(m.lede) + "</p>" : "");
    (m.blocks || []).forEach(function (b) {
      var fn = B[b.type];
      html += '<div class="blk">' + (b.title ? '<h3 class="blk-title">' + esc(b.title) + "</h3>" : "") +
        (fn ? fn(b, m) : '<p class="err">Unknown block type: ' + esc(b.type) + "</p>") + "</div>";
    });
    return html + "</div></section>";
  }

  function render(man, mods) {
    var h = man.hero || {};
    var nav = mods.map(function (m) { return '<a href="#' + attr(m.id) + '">' + esc(m.nav || m.title) + "</a>"; }).join("");
    var envLabel = IS_LOCAL ? "Local · live reload" : "Deployed · " + esc(man.version || "");
    var out =
      '<header class="bar"><div class="wrap"><a class="mark" href="#top">Zima HQ</a><span class="env' + (IS_LOCAL ? " local" : "") + '">' + envLabel + "</span><nav>" + nav + "</nav></div></header>" +
      '<section class="hero" id="top"><div class="wrap">' +
        '<div class="stamp" style="color:var(--ink)"><b>' + esc(h.stamp || "N 00") + '</b><i></i><i></i><span>' + esc(h.eyebrow || "") + "</span></div>" +
        '<h1 class="t1"><span class="l1">' + esc(h.line1 || "") + (h.script ? ' <span class="script">' + esc(h.script) + "</span>" : "") + '</span><span class="l2">' + esc(h.line2 || "") + "</span></h1>" +
        (h.sub ? '<p class="sub">' + md(h.sub) + "</p>" : "") +
        '<form class="jump" id="jump" autocomplete="off"><input id="jq" placeholder="Jump to… sprint 1, mobs, bugs, pipeline" aria-label="Jump to a section"><button>Go</button></form>' +
        '<div class="jump-hint" id="jh">type a word, hit enter</div>' +
        '<div class="meta">' + (h.meta || []).map(function (x) { return "<span>" + md(x) + "</span>"; }).join("") + "</div>" +
      "</div></section>" +
      mods.map(renderModule).join("") +
      '<footer class="foot"><div class="wrap"><span class="mark">Hopamine</span><span class="micro">' + esc(man.footer || "") + '</span><span class="micro r">' + esc(man.version || "") + "</span></div></footer>";

    var y = window.scrollY;
    app.innerHTML = out;
    window.scrollTo(0, y);
    wire(mods);
  }

  function wire(mods) {
    app.querySelectorAll(".chk input").forEach(function (cb) {
      cb.addEventListener("change", function () {
        cb.closest(".chk").classList.toggle("done", cb.checked);
        try { localStorage.setItem(cb.getAttribute("data-key"), cb.checked ? "1" : "0"); } catch (e) {}
      });
    });
    var f = document.getElementById("jump"), q = document.getElementById("jq"), hint = document.getElementById("jh");
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var words = q.value.trim().toLowerCase().split(/\s+/).filter(Boolean); if (!words.length) return;
      var best = null, top = 0;
      app.querySelectorAll("section.mod").forEach(function (s) {
        var k = (s.getAttribute("data-k") || "").toLowerCase(), t = s.textContent.toLowerCase(), sc = 0;
        words.forEach(function (w) { if (k.indexOf(w) > -1) sc += 5; if (t.indexOf(w) > -1) sc += 1; });
        if (sc > top) { top = sc; best = s; }
      });
      if (!best) { hint.textContent = "nothing on that yet"; return; }
      best.scrollIntoView({ behavior: "smooth" });
      best.classList.remove("flash"); void best.offsetWidth; best.classList.add("flash");
      hint.textContent = "→ " + best.querySelector("h2").textContent;
    });
  }

  /* ---------- load ---------- */
  function getJSON(path) {
    return fetch(path, { cache: "no-store" }).then(function (r) {
      if (!r.ok) throw new Error(path + " → HTTP " + r.status);
      return r.text().then(function (t) {
        try { return { text: t, json: JSON.parse(t) }; }
        catch (e) { throw new Error(path + " has a JSON typo: " + e.message); }
      });
    });
  }

  function load() {
    return getJSON(ROOT + "manifest.json").then(function (man) {
      var on = (man.json.modules || []).filter(function (m) { return m.on !== false; });
      return Promise.all(on.map(function (m) { return getJSON(ROOT + m.file); })).then(function (files) {
        var sig = man.text + files.map(function (f) { return f.text; }).join("");
        if (sig === lastSig) return;
        lastSig = sig;
        render(man.json, files.map(function (f) { return f.json; }));
      });
    });
  }

  function fail(e) {
    var msg = location.protocol === "file:"
      ? "Open HQ through a local server (npm run dev, or python3 -m http.server 4321), not by double-clicking."
      : String(e.message || e);
    var bar = document.getElementById("hq-err");
    if (!bar) { bar = document.createElement("div"); bar.id = "hq-err"; bar.className = "err"; document.body.prepend(bar); }
    bar.textContent = "⚠ " + msg;
  }
  function clearErr() { var b = document.getElementById("hq-err"); if (b) b.remove(); }

  load().then(clearErr, fail);
  if (IS_LOCAL) setInterval(function () { load().then(clearErr, fail); }, 1500);
})();
