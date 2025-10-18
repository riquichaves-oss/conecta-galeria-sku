
(() => {
  const { useEffect, useMemo, useState } = React;
  const EMPRESA = "Conecta Acessórios";

  function App() {
    const [rows, setRows] = useState([]);
    const [query, setQuery] = useState("");

    useEffect(() => {
      (async () => {
        try {
          const res = await fetch(window.__DEFAULT_ITEMS_URL__ || "items.json");
          const data = await res.json();
          if (Array.isArray(data?.items)) {
            const clean = data.items.filter(r => /\d+\.\d+\.\d+\.\d+/.test(String(r.codigo || "")));
            setRows(clean);
          }
        } catch(e) {}
      })();
    }, []);

    const parsed = useMemo(() => {
      const q = query.trim().toLowerCase();
      return rows
        .filter(r => {
          if (!q) return true;
          return (String(r.codigo).toLowerCase().includes(q) || String(r.descricao).toLowerCase().includes(q));
        })
        .sort((a,b)=> String(a.codigo).localeCompare(String(b.codigo)));
    }, [rows, query]);

    return React.createElement(
      "div",
      { className: "min-h-screen" },
      React.createElement("header", { className: "bg-white border-b sticky top-0 z-10" },
        React.createElement("div", { className: "max-w-6xl mx-auto px-4 py-3 flex items-center justify-between" },
          React.createElement("div", { className: "flex items-center gap-3" },
            React.createElement("div", { className: "text-2xl" }, "👀"),
            React.createElement("div", null,
              React.createElement("div", { className: "text-xl font-semibold" }, EMPRESA),
              React.createElement("div", { className: "text-xs text-gray-500" }, "Galeria de Fotos por SKU — Somente Visualização")
            )
          )
        )
      ),
      React.createElement("main", { className: "max-w-6xl mx-auto p-4 space-y-6" },
        React.createElement("section", { className: "bg-white rounded-2xl shadow p-4 grid gap-3 md:grid-cols-3" },
          React.createElement("div", { className: "md:col-span-3" },
            React.createElement("label", { className: "block text-sm font-medium text-gray-700 mb-1" }, "Buscar"),
            React.createElement("input", { className: "w-full border rounded-xl px-3 py-2", placeholder: "Código ou nome do produto", value: query, onChange: (e)=>setQuery(e.target.value) })
          )
        ),
        React.createElement("section", { className: "bg-white rounded-2xl shadow p-0 overflow-hidden" },
          React.createElement("table", { className: "min-w-full text-sm" },
            React.createElement("thead", { className: "bg-gray-100 text-gray-700" },
              React.createElement("tr", null,
                React.createElement("th", { className: "text-left p-3" }, "Código"),
                React.createElement("th", { className: "text-left p-3" }, "Produto"),
                React.createElement("th", { className: "text-left p-3" }, "Fotos (visualização)")
              )
            ),
            React.createElement("tbody", null,
              parsed.length === 0
                ? React.createElement("tr", null, React.createElement("td", { colSpan: 3, className: "p-6 text-center text-gray-500" }, "Nenhum item encontrado."))
                : null,
              parsed.map((r) =>
                React.createElement("tr", { key: r.codigo, className: "border-t" },
                  React.createElement("td", { className: "p-3 mono text-xs md:text-sm whitespace-nowrap" }, r.codigo),
                  React.createElement("td", { className: "p-3" }, r.descricao || "—"),
                  React.createElement("td", { className: "p-3" },
                    React.createElement("div", { className: "text-xs text-gray-500" }, "As fotos são gerenciadas pela administração. Sem permissões de edição.")
                  )
                )
              )
            )
          )
        ),
        React.createElement("p", { className: "text-xs text-gray-500" }, "Versão somente visualização. Edição desativada.")
      ))
    );
  }

  const root = ReactDOM.createRoot(document.getElementById("root"));
  root.render(React.createElement(App));
})();
