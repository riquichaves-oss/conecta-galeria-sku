
(() => {
  const { useEffect, useMemo, useState } = React;
  const STORAGE_KEY = "foto-mapping-v1";
  const EMPRESA = "Conecta Acessórios";

  const readFileAsDataURL = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  function App() {
    const [rows, setRows] = useState([]);
    const [mapping, setMapping] = useState({});
    const [query, setQuery] = useState("");
    const [onlyMissing, setOnlyMissing] = useState(false);
    const [status, setStatus] = useState("");

    useEffect(() => {
      try { const raw = localStorage.getItem(STORAGE_KEY); if (raw) setMapping(JSON.parse(raw)); } catch {}
    }, []);

    useEffect(() => {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(mapping)); } catch {}
    }, [mapping]);

    useEffect(() => {
      async function load() {
        try {
          const url = window.__DEFAULT_ITEMS_URL__ || "items.json";
          const res = await fetch(url);
          const data = await res.json();
          if (Array.isArray(data?.items)) {
            setRows(data.items.filter(r => /\d+\.\d+\.\d+\.\d+/.test(String(r.codigo))));
            setStatus(`Itens carregados do estoque: ${data.items.length}`);
          }
        } catch(e) { console.warn("Falha ao carregar items.json", e); }
      }
      load();
    }, []);

    const parsed = useMemo(() => {
      const q = query.trim().toLowerCase();
      return rows
        .filter(r => {
          const has = (mapping[r.codigo] && mapping[r.codigo].length > 0);
          if (onlyMissing && has) return false;
          if (!q) return true;
          return (String(r.codigo).toLowerCase().includes(q) || String(r.descricao).toLowerCase().includes(q));
        })
        .sort((a,b)=> String(a.codigo).localeCompare(String(b.codigo)));
    }, [rows, mapping, query, onlyMissing]);

    const handleUploadPlan = async (file) => {
      setStatus("Lendo planilha...");
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet, { defval: "" });

      const normKey = (k) => (k || "").toString().normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
      const mapRow = (row) => {
        const entries = Object.entries(row);
        const get = (...alts) => {
          for (const a of alts) {
            const f = entries.find(([k]) => normKey(k) === normKey(a));
            if (f) return f[1];
          }
          return "";
        };
        const codigo = get("Código","Codigo","CÓDIGO","codigo","código");
        if (!codigo || !/\d+\.\d+\.\d+\.\d+/.test(String(codigo))) return null;
        return {
          codigo: String(codigo).trim(),
          descricao: String(get("Descrição","Descricao","Descricao do Item","Descrição do Produto","Produto")).trim(),
          estoque: Number(get("Qtde","Estoque","Quantidade","Qtd")) || 0,
          custo: Number(String(get("Custo","Custo Unit","Preco")).replace(",", ".")) || undefined,
        };
      };
      const clean = json.map(mapRow).filter(Boolean);
      setRows(clean);
      setStatus(`Planilha carregada: ${clean.length} itens.`);
    };

    const handleAttachPhoto = async (files, codigo) => {
      const arr = Array.from(files || []);
      if (!arr.length) return;
      const imgs = await Promise.all(arr.map(readFileAsDataURL));
      setMapping((m) => ({ ...m, [codigo]: [ ...(m[codigo] || []), ...imgs ] }));
    };

    const handleBulkMatch = async (fileList) => {
      const files = Array.from(fileList || []);
      if (!files.length) return;
      setStatus("Processando upload em lote...");
      let matched = 0;
      const newMap = { ...mapping };
      for (const f of files) {
        const name = f.name;
        const code = rows.find(r => name.includes(r.codigo))?.codigo;
        if (code) {
          const dataUrl = await readFileAsDataURL(f);
          newMap[code] = [ ...(newMap[code] || []), dataUrl ];
          matched++;
        }
      }
      setMapping(newMap);
      setStatus(`Upload em lote concluído: ${matched} fotos vinculadas.`);
    };

    const importJSON = async (file) => {
      const text = await file.text();
      try {
        const obj = JSON.parse(text);
        if (obj?.mapping) setMapping(obj.mapping);
        if (Array.isArray(obj?.items) && obj.items.length && !rows.length) setRows(obj.items);
        setStatus("Backup importado com sucesso.");
      } catch(e) { setStatus("Falha ao importar JSON."); }
    };

    const exportJSON = () => {
      const payload = {
        generatedAt: new Date().toISOString(),
        empresa: EMPRESA,
        items: rows,
        mapping,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      downloadBlob(blob, "fotos-por-sku.json");
    };

    const exportZIP = async () => {
      const zip = new JSZip();
      const folder = zip.folder("fotos");
      const manifest = [];
      for (const r of rows) {
        const fotos = mapping[r.codigo] || [];
        fotos.forEach((dataUrl, i) => {
          const [meta, b64] = dataUrl.split(",");
          const ext = (meta?.match(/data:image\/(.*?);/)?.[1] || "png").replace("jpeg","jpg");
          const fname = `${r.codigo}__${i+1}.${ext}`;
          folder.file(fname, b64 || "", { base64: true });
          manifest.push({ codigo: r.codigo, arquivo: fname, descricao: r.descricao });
        });
      }
      zip.file("manifest.json", JSON.stringify({ generatedAt: new Date().toISOString(), manifest }, null, 2));
      const blob = await zip.generateAsync({ type: "blob" });
      downloadBlob(blob, "fotos-por-sku.zip");
    };

    const totalComFoto = React.useMemo(() => Object.keys(mapping).length, [mapping]);

    return React.createElement(
      "div",
      { className: "min-h-screen" },
      React.createElement("header", { className: "bg-white border-b sticky top-0 z-10" },
        React.createElement("div", { className: "max-w-6xl mx-auto px-4 py-3 flex items-center justify-between" },
          React.createElement("div", { className: "flex items-center gap-3" },
            React.createElement("div", { className: "text-2xl" }, "🚗"),
            React.createElement("div", null,
              React.createElement("div", { className: "text-xl font-semibold" }, "Conecta Acessórios"),
              React.createElement("div", { className: "text-xs text-gray-500" }, "Galeria de Fotos por SKU")
            )
          ),
          React.createElement("div", { className: "text-sm text-gray-600" }, "Itens com foto: ", React.createElement("b", null, totalComFoto))
        )
      ),
      React.createElement("main", { className: "max-w-6xl mx-auto p-4 space-y-6" },
        React.createElement("section", { className: "bg-white rounded-2xl shadow p-4" },
          React.createElement("h2", { className: "text-lg font-medium mb-2" }, "1) Estoque (Excel) — opcional"),
          React.createElement("p", { className: "text-sm text-gray-600 mb-3" }, "O site já carrega os SKUs da sua planilha atual. Se quiser atualizar, envie uma nova planilha (colunas como ", React.createElement("b", null, "Código"), ", ", React.createElement("b", null, "Descrição"), ", ", React.createElement("b", null, "Qtde"), ", ", React.createElement("b", null, "Custo"), ")."),
          React.createElement("input", { type: "file", accept: ".xlsx,.xls", onChange: (e)=> e.target.files?.[0] && handleUploadPlan(e.target.files[0]) }),
          status ? React.createElement("p", { className: "text-xs text-gray-500 mt-2" }, status) : null
        ),
        React.createElement("section", { className: "bg-white rounded-2xl shadow p-4 grid gap-3 md:grid-cols-3" },
          React.createElement("div", null,
            React.createElement("label", { className: "block text-sm font-medium text-gray-700 mb-1" }, "Buscar"),
            React.createElement("input", { className: "w-full border rounded-xl px-3 py-2", placeholder: "Código ou nome do produto", value: query, onChange: (e)=>setQuery(e.target.value) })
          ),
          React.createElement("label", { className: "flex items-end gap-2 text-sm" },
            React.createElement("input", { type: "checkbox", checked: onlyMissing, onChange: (e)=>setOnlyMissing(e.target.checked) }),
            " Mostrar somente itens ", React.createElement("b", null, "sem foto")
          ),
          React.createElement("div", null,
            React.createElement("label", { className: "block text-sm font-medium text-gray-700 mb-1" }, "Upload em lote"),
            React.createElement("input", { type: "file", accept: "image/*", multiple: true, onChange: (e)=>handleBulkMatch(e.target.files) }),
            React.createElement("p", { className: "text-xs text-gray-500 mt-1" }, "Arquivos são vinculados se o nome contiver o código (ex.: 006.01.00.1004_friso.jpg).")
          )
        ),
        React.createElement("section", { className: "bg-white rounded-2xl shadow p-0 overflow-hidden" },
          React.createElement("table", { className: "min-w-full text-sm" },
            React.createElement("thead", { className: "bg-gray-100 text-gray-700" },
              React.createElement("tr", null,
                React.createElement("th", { className: "text-left p-3" }, "Código"),
                React.createElement("th", { className: "text-left p-3" }, "Produto"),
                React.createElement("th", { className: "text-left p-3" }, "Estoque"),
                React.createElement("th", { className: "text-left p-3" }, "Fotos"),
                React.createElement("th", { className: "text-left p-3" }, "Ações")
              )
            ),
            React.createElement("tbody", null,
              parsed.length === 0 ? React.createElement("tr", null, React.createElement("td", { colSpan: 5, className: "p-6 text-center text-gray-500" }, "Nenhum item encontrado.")) : null,
              parsed.map((r) => {
                const fotos = mapping[r.codigo] || [];
                return React.createElement("tr", { key: r.codigo, className: "border-t" },
                  React.createElement("td", { className: "p-3 mono text-xs md:text-sm whitespace-nowrap" }, r.codigo),
                  React.createElement("td", { className: "p-3" }, r.descricao || "—"),
                  React.createElement("td", { className: "p-3" }, r.estoque ?? "—"),
                  React.createElement("td", { className: "p-3" },
                    React.createElement("div", { className: "flex flex-wrap gap-2" },
                      fotos.map((src, idx) => React.createElement("div", { key: idx, className: "relative group" },
                        React.createElement("img", { src: src, alt: `${r.codigo}-${idx+1}`, className: "w-16 h-16 object-cover rounded-lg border" }),
                        React.createElement("button", { title: "Remover", onClick: ()=>{
                          const arr = [...(mapping[r.codigo] || [])];
                          arr.splice(idx, 1);
                          const copy = {...mapping};
                          if (arr.length) copy[r.codigo] = arr; else delete copy[r.codigo];
                          setMapping(copy);
                        }, className: "absolute -top-2 -right-2 hidden group-hover:block bg-red-600 text-white rounded-full w-6 h-6 text-xs" }, "✕")
                      ))
                    )
                  ),
                  React.createElement("td", { className: "p-3" },
                    React.createElement("label", { className: "px-3 py-2 rounded-xl border cursor-pointer inline-block" }, "Adicionar foto",
                      React.createElement("input", { type: "file", accept: "image/*", multiple: true, className: "hidden", onChange: (e)=>handleAttachPhoto(e.target.files, r.codigo) })
                    )
                  )
                );
              })
            )
          )
        ),
        React.createElement("section", { className: "flex flex-wrap gap-3" },
          React.createElement("button", { className: "px-4 py-2 rounded-xl bg-black text-white", onClick: exportJSON }, "Exportar JSON (backup)"),
          React.createElement("label", { className: "px-4 py-2 rounded-xl border cursor-pointer" }, "Importar JSON",
            React.createElement("input", { type: "file", accept: "application/json", className: "hidden", onChange: (e)=> e.target.files?.[0] && importJSON(e.target.files[0]) })
          ),
          React.createElement("button", { className: "px-4 py-2 rounded-xl bg-gray-800 text-white", onClick: exportZIP }, "Baixar ZIP com fotos + manifest")
        ),
        React.createElement("footer", { className: "text-xs text-gray-500" }, "Tudo roda no seu navegador (client-side). Nenhum arquivo é enviado a servidores.")
      )
    );
  }

  const root = ReactDOM.createRoot(document.getElementById("root"));
  root.render(React.createElement(App));
})();
