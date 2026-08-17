/* ==========================================================================
   RETRO STATION - BỘ NẠP GIẢ LẬP DÙNG CHUNG (EmulatorJS)
   --------------------------------------------------------------------------
   Nhiệm vụ:
   1. Tự động chọn engine (core) phù hợp với tệp ROM người dùng nạp vào.
   2. Tự động giải nén tệp .zip (với các hệ máy dùng ROM đơn tệp: GB/GBC/GBA).
   3. Khởi động EmulatorJS: bàn phím + tay cầm trên máy tính, nút ảo trên điện thoại.

   Trang HTML chỉ cần khai báo window.RETRO_CONFIG trước khi nạp tệp này.
   ========================================================================== */

(function () {
    "use strict";

    var CFG = window.RETRO_CONFIG || {};
    var EJS_DATA_PATH = "https://cdn.emulatorjs.org/stable/data/";

    /* ------------------------------------------------------------------ */
    /* 1. BẢNG NHẬN DIỆN ENGINE                                            */
    /* ------------------------------------------------------------------ */

    // Bộ ROM Capcom CPS-1 (dùng core fbalpha2012_cps1)
    var CPS1_SETS = [
        "1941", "3wonders", "area88", "captcomm", "cawing", "cworld2j", "daimakai",
        "dino", "dynwar", "ffight", "forgottn", "ganbare", "ghouls", "kod", "knights",
        "mbombrd", "megaman", "mercs", "msword", "mtwins", "nemo", "pang3", "pnickj",
        "punisher", "qad", "qtono2", "rockmanj", "sf2", "sfzch", "slammast", "strider",
        "unsquad", "varth", "willow", "wof"
    ];

    // Bộ ROM Capcom CPS-2 (dùng core fbalpha2012_cps2)
    var CPS2_SETS = [
        "19xx", "1944", "armwar", "avsp", "batcir", "choko", "csclub", "cybots",
        "ddsom", "ddtod", "dimahoo", "dstlk", "ecofghtr", "gigawing", "hsf2",
        "jyangoku", "megaman2", "mmancp2u", "mmatrix", "mpang", "msh", "mshvsf",
        "mvsc", "nwarr", "progear", "pzloop2", "qndream", "ringdest", "rockmn2",
        "sfa", "sfa2", "sfa3", "sfz", "sfz2", "sfz3", "sgemf", "spf2t", "ssf2",
        "ssf2t", "ssf2xj", "techromn", "uecology", "vampj", "vhunt2", "vsav",
        "vsav2", "xmcota", "xmvsf"
    ];

    // Bộ ROM Neo Geo (bắt buộc có thêm tệp BIOS neogeo.zip)
    var NEOGEO_SETS = [
        "3countb", "alpham2", "androdun", "aodk", "aof", "bakatono", "bangbead",
        "blazstar", "breakers", "bstars", "burningf", "crsword", "cyberlip",
        "doubledr", "eightman", "fatfury", "fbfrenzy", "galaxyfg", "ganryu",
        "garou", "goalx3", "gowcaizr", "gpilots", "janshin", "joyjoy", "kabukikl",
        "karnovr", "kizuna", "kof", "kotm", "lastblad", "lastbld2", "lbowling",
        "legendos", "magdrop", "mahretsu", "maglord", "marukodq", "matrim",
        "miexchng", "minasan", "mslug", "mutnat", "nam1975", "ncombat", "ncommand",
        "neobombe", "neocup98", "neodrift", "neomrdo", "ninjamas", "nitd", "overtop",
        "panicbom", "pbobble", "pgoal", "pnyaa", "popbounc", "preisle2", "pspikes2",
        "pulstar", "puzzledp", "quizdai2", "ragnagrd", "rbff", "ridhero", "roboarmy",
        "rotd", "s1945p", "samsho", "savagere", "sengoku", "shocktro", "socbrawl",
        "sonicwi", "spinmast", "ssideki", "stakwin", "strhoop", "superspy",
        "svc", "tophuntr", "tpgolf", "trally", "trex", "turfmast", "twinspri",
        "viewpoin", "wakuwak7", "wh1", "wh2", "whp", "wjammers", "zedblade", "zupapa"
    ];

    // Phần mở rộng ROM đơn tệp của dòng Game Boy
    var GB_ROM_EXTS = ["gba", "gbc", "gb", "sgb"];

    var ENGINE_LABELS = {
        "gba": "GBA · mGBA",
        "gb": "GB / GBC · Gambatte",
        "fbneo": "Arcade · FinalBurn Neo",
        "fbalpha2012_cps1": "Arcade · FB Alpha CPS-1",
        "fbalpha2012_cps2": "Arcade · FB Alpha CPS-2",
        "mame2003_plus": "Arcade · MAME 2003-Plus",
        "mame2003": "Arcade · MAME 2003"
    };

    var FAMILIES = {
        // Dòng Game Boy: tự chọn giữa mGBA (.gba) và Gambatte (.gb/.gbc)
        gb: {
            extract: true,
            romExts: GB_ROM_EXTS,
            engines: ["auto", "gba", "gb"],
            detect: function (info) {
                var ext = info.romExt;
                if (ext === "gba") return { core: "gba", reason: "GBA" };
                if (ext === "gbc") return { core: "gb", reason: "Game Boy Color" };
                if (ext === "gb" || ext === "sgb") return { core: "gb", reason: "Game Boy" };
                return { core: "gba", reason: "GBA (mặc định)" };
            }
        },
        // Dòng FinalBurn: ưu tiên core CPS chuyên dụng, còn lại dùng FBNeo
        fba: {
            extract: false,
            engines: ["auto", "fbneo", "fbalpha2012_cps1", "fbalpha2012_cps2", "mame2003_plus", "mame2003"],
            detect: function (info) {
                var set = matchSet(info.baseName);
                if (set === "cps1") return { core: "fbalpha2012_cps1", reason: "CPS-1" };
                if (set === "cps2") return { core: "fbalpha2012_cps2", reason: "CPS-2" };
                if (set === "neogeo") return { core: "fbneo", reason: "Neo Geo", needBios: true };
                return { core: "fbneo", reason: "FinalBurn Neo" };
            }
        },
        // Dòng MAME: mặc định 2003-Plus (tương thích rộng nhất trong hai bản)
        mame: {
            extract: false,
            engines: ["auto", "mame2003_plus", "mame2003", "fbneo", "fbalpha2012_cps1", "fbalpha2012_cps2"],
            detect: function (info) {
                var set = matchSet(info.baseName);
                if (set === "neogeo") return { core: "mame2003_plus", reason: "Neo Geo", needBios: true };
                return { core: "mame2003_plus", reason: "MAME 2003-Plus" };
            }
        }
    };

    function matchSet(baseName) {
        var name = String(baseName || "").toLowerCase()
            .replace(/\.(zip|7z)$/, "")
            .replace(/\([^)]*\)|\[[^\]]*\]/g, "")
            .replace(/[^a-z0-9]/g, "");
        if (!name) return null;

        var groups = [["cps2", CPS2_SETS], ["cps1", CPS1_SETS], ["neogeo", NEOGEO_SETS]];
        var best = null, bestLen = 0;
        for (var g = 0; g < groups.length; g++) {
            var list = groups[g][1];
            for (var i = 0; i < list.length; i++) {
                var s = list[i];
                if (name === s || name.indexOf(s) === 0) {
                    if (s.length > bestLen) {
                        bestLen = s.length;
                        best = groups[g][0];
                    }
                }
            }
        }
        return best;
    }

    /* ------------------------------------------------------------------ */
    /* 2. TIỆN ÍCH GIAO DIỆN                                               */
    /* ------------------------------------------------------------------ */

    function $(sel) { return document.querySelector(sel); }
    function lang() { return localStorage.getItem("selected_lang") || "vi"; }
    function t(vi, en) { return lang() === "vi" ? vi : en; }

    var toastTimer = null;
    function showToast(msg, type) {
        var el = $("#toast-notice");
        if (!el) return;
        el.innerText = msg;
        el.className = "toast active " + (type || "success");
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { el.classList.remove("active"); }, 2200);
    }
    window.showToast = showToast;

    function fileExt(name) {
        var m = String(name || "").toLowerCase().match(/\.([a-z0-9]+)$/);
        return m ? m[1] : "";
    }

    /* ------------------------------------------------------------------ */
    /* 3. ĐA NGÔN NGỮ                                                      */
    /* ------------------------------------------------------------------ */

    function changeLang(l) {
        localStorage.setItem("selected_lang", l);
        document.documentElement.lang = l;

        var viBtn = $("#btn-lang-vi"), enBtn = $("#btn-lang-en");
        if (viBtn && enBtn) {
            viBtn.classList.toggle("active", l === "vi");
            enBtn.classList.toggle("active", l === "en");
        }

        document.querySelectorAll("[data-vi]").forEach(function (el) {
            var text = l === "vi" ? el.getAttribute("data-vi") : el.getAttribute("data-en");
            if (text === null) return;
            if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
                el.placeholder = text;
            } else {
                el.innerHTML = text;
            }
        });

        if (CFG.title) {
            document.title = l === "vi" ? CFG.title.vi : CFG.title.en;
        }
        renderEngineOptions();
    }
    window.changeLang = changeLang;

    /* ------------------------------------------------------------------ */
    /* 4. BỘ CHỌN ENGINE                                                   */
    /* ------------------------------------------------------------------ */

    var family = FAMILIES[CFG.family] || FAMILIES.gb;
    var storageKey = "engine_choice_" + (CFG.family || "gb");

    function selectedEngine() {
        var sel = $("#engine-select");
        return sel ? sel.value : "auto";
    }

    function renderEngineOptions() {
        var sel = $("#engine-select");
        if (!sel) return;
        var current = sel.value || localStorage.getItem(storageKey) || "auto";
        sel.innerHTML = "";
        family.engines.forEach(function (id) {
            var opt = document.createElement("option");
            opt.value = id;
            opt.textContent = id === "auto"
                ? t("⚙️ Tự động chọn engine", "⚙️ Auto-select engine")
                : ENGINE_LABELS[id] || id;
            sel.appendChild(opt);
        });
        sel.value = current;
    }

    /* ------------------------------------------------------------------ */
    /* 5. GIẢI NÉN TỰ ĐỘNG                                                 */
    /* ------------------------------------------------------------------ */

    /**
     * Trả về { blob, name, romExt, baseName, extracted }
     * - Hệ máy ROM đơn tệp (GB/GBC/GBA): tự mở tệp .zip và lấy ROM bên trong,
     *   nhờ đó mới biết được phần mở rộng thật để chọn đúng engine.
     * - Hệ máy arcade (FBA/MAME): giữ nguyên tệp .zip vì core cần cả bộ romset.
     */
    function prepareRom(file) {
        var ext = fileExt(file.name);
        var isArchive = (ext === "zip");

        if (!family.extract || !isArchive) {
            if (family.extract && ext === "7z") {
                showToast(t("⚠️ Tệp .7z sẽ do EmulatorJS tự giải nén.",
                    "⚠️ .7z will be extracted by EmulatorJS itself."), "warning");
            }
            return Promise.resolve({
                blob: file,
                name: file.name,
                baseName: file.name,
                romExt: ext,
                extracted: false
            });
        }

        if (typeof JSZip === "undefined") {
            return Promise.resolve({
                blob: file, name: file.name, baseName: file.name, romExt: ext, extracted: false
            });
        }

        return JSZip.loadAsync(file).then(function (zip) {
            var entries = [];
            zip.forEach(function (path, entry) {
                if (!entry.dir) entries.push(entry);
            });

            // Ưu tiên tệp có phần mở rộng ROM hợp lệ, tệp lớn nhất trước.
            var candidates = entries.filter(function (e) {
                return family.romExts.indexOf(fileExt(e.name)) !== -1;
            });
            if (!candidates.length) {
                throw new Error("NO_ROM_IN_ZIP");
            }
            candidates.sort(function (a, b) {
                return (b._data ? b._data.uncompressedSize : 0) - (a._data ? a._data.uncompressedSize : 0);
            });

            var picked = candidates[0];
            return picked.async("blob").then(function (blob) {
                var shortName = picked.name.split("/").pop();
                return {
                    blob: blob,
                    name: shortName,
                    baseName: shortName,
                    romExt: fileExt(shortName),
                    extracted: true
                };
            });
        });
    }

    /* ------------------------------------------------------------------ */
    /* 6. KHỞI ĐỘNG EMULATORJS                                             */
    /* ------------------------------------------------------------------ */

    var booted = false;
    var biosUrl = null;

    function boot(rom, core) {
        window.EJS_player = "#ejs-game";
        window.EJS_core = core;
        window.EJS_gameUrl = URL.createObjectURL(rom.blob);
        window.EJS_gameName = rom.name.replace(/\.[^.]+$/, "");
        window.EJS_pathtodata = EJS_DATA_PATH;
        window.EJS_startOnLoaded = true;
        window.EJS_volume = 0.5;
        window.EJS_color = "#B176F0";
        window.EJS_backgroundColor = "#000000";
        window.EJS_language = lang() === "vi" ? "vi-VN" : "en-US";
        if (biosUrl) window.EJS_biosUrl = biosUrl;
        if (CFG.virtualGamepad) window.EJS_VirtualGamepadSettings = CFG.virtualGamepad;
        if (CFG.controlScheme) window.EJS_controlScheme = CFG.controlScheme;

        document.body.classList.add("playing");

        var loader = document.createElement("script");
        loader.src = EJS_DATA_PATH + "loader.js";
        loader.onerror = function () {
            showToast(t("❌ Không tải được EmulatorJS. Kiểm tra kết nối mạng!",
                "❌ Failed to load EmulatorJS. Check your connection!"), "danger");
        };
        document.body.appendChild(loader);
        booted = true;

        var loadBtn = $("#btn-load-label");
        if (loadBtn) {
            loadBtn.setAttribute("data-vi", "ĐỔI ROM");
            loadBtn.setAttribute("data-en", "CHANGE ROM");
            loadBtn.innerHTML = t("ĐỔI ROM", "CHANGE ROM");
        }
    }

    function loadFile(file) {
        if (!file) return;

        if (booted) {
            showToast(t("🔄 Đang tải lại trang để đổi ROM...", "🔄 Reloading to change ROM..."), "warning");
            setTimeout(function () { location.reload(); }, 700);
            return;
        }

        showToast(t("⏳ Đang xử lý ROM...", "⏳ Preparing ROM..."), "warning");

        prepareRom(file).then(function (rom) {
            var choice = selectedEngine();
            localStorage.setItem(storageKey, choice);

            var core, reason = "", needBios = false;
            if (choice !== "auto") {
                core = choice;
                reason = ENGINE_LABELS[choice] || choice;
            } else {
                var res = family.detect(rom);
                core = res.core;
                reason = res.reason;
                needBios = !!res.needBios;
            }

            var msg = t("🎮 Engine: ", "🎮 Engine: ") + (ENGINE_LABELS[core] || core)
                + (reason ? " (" + reason + ")" : "");
            showToast(msg, "success");

            if (needBios && !biosUrl) {
                setTimeout(function () {
                    showToast(t("⚠️ Game Neo Geo cần thêm tệp BIOS neogeo.zip (nút BIOS ở thanh trên).",
                        "⚠️ Neo Geo games also need the neogeo.zip BIOS (BIOS button in the top bar)."), "warning");
                }, 2400);
            }

            boot(rom, core);
        }).catch(function (err) {
            console.error(err);
            if (err && err.message === "NO_ROM_IN_ZIP") {
                showToast(t("❌ Trong tệp .zip không có ROM hợp lệ (" + family.romExts.join(", ") + ").",
                    "❌ No valid ROM found inside the .zip (" + family.romExts.join(", ") + ")."), "danger");
            } else {
                showToast(t("❌ Không đọc được tệp ROM. Vui lòng thử tệp khác!",
                    "❌ Could not read the ROM file. Please try another one!"), "danger");
            }
        });
    }

    /* ------------------------------------------------------------------ */
    /* 7. GẮN SỰ KIỆN                                                      */
    /* ------------------------------------------------------------------ */

    function bind() {
        renderEngineOptions();

        var romInput = $("#rom-file");
        if (romInput) {
            if (CFG.accept) romInput.setAttribute("accept", CFG.accept);
            romInput.addEventListener("change", function (e) {
                loadFile(e.target.files[0]);
                e.target.value = "";
            });
        }

        var engineSel = $("#engine-select");
        if (engineSel) {
            engineSel.value = localStorage.getItem(storageKey) || "auto";
            engineSel.addEventListener("change", function () {
                localStorage.setItem(storageKey, engineSel.value);
            });
        }

        // Tệp BIOS phụ (Neo Geo, ...)
        var biosInput = $("#bios-file");
        if (biosInput) {
            biosInput.addEventListener("change", function (e) {
                var f = e.target.files[0];
                if (!f) return;
                biosUrl = URL.createObjectURL(f);
                showToast(t("✅ Đã nạp BIOS: ", "✅ BIOS loaded: ") + f.name, "success");
            });
        }

        // Kéo - thả ROM
        var dropZone = $("#screen-loading");
        if (dropZone) {
            ["dragenter", "dragover"].forEach(function (ev) {
                dropZone.addEventListener(ev, function (e) {
                    e.preventDefault();
                    dropZone.classList.add("drag-over");
                });
            });
            ["dragleave", "drop"].forEach(function (ev) {
                dropZone.addEventListener(ev, function (e) {
                    e.preventDefault();
                    dropZone.classList.remove("drag-over");
                });
            });
            dropZone.addEventListener("drop", function (e) {
                var f = e.dataTransfer && e.dataTransfer.files[0];
                if (f) loadFile(f);
            });
        }

        // Phím tắt lưu / nạp trạng thái trên máy tính
        window.addEventListener("keydown", function (e) {
            if (e.code !== "F6" && e.code !== "F9") return;
            e.preventDefault();
            var em = window.EJS_emulator;
            if (!em || !em.gameManager) {
                showToast(t("⚠️ Chưa nạp game!", "⚠️ No game loaded!"), "warning");
                return;
            }
            try {
                if (e.code === "F6") {
                    em.gameManager.saveState();
                    showToast(t("💾 ĐÃ LƯU TRẠNG THÁI!", "💾 STATE SAVED!"), "success");
                } else {
                    em.gameManager.loadState();
                    showToast(t("⚡ ĐÃ NẠP TRẠNG THÁI!", "⚡ STATE LOADED!"), "success");
                }
            } catch (err) {
                console.error(err);
                showToast(t("❌ Thao tác thất bại!", "❌ Action failed!"), "danger");
            }
        });

        changeLang(lang());
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", bind);
    } else {
        bind();
    }
})();
