import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, FileDown, FileUp, Pencil, Search, Trash2, X } from 'lucide-react';
import { api } from '@/lib/api';
import { useFetch } from '@/lib/useFetch';
import { cn, eur } from '@/lib/cn';
import { toast } from '@/store/toast';
import { useOverlay } from '@/lib/useOverlay';
import { exportarProductosAExcel } from '@/lib/excelProductos';
import { ImportDialog } from './ImportDialog';
import type { AdminProduct, AdminProductsResponse, RefTax, Taxonomy } from '@/lib/types';

/**
 * GESTIÓN DE PRODUCTOS DEL PANEL.
 *
 * Una tabla con TODO el catálogo, con búsqueda (nombre o SKU), filtros (animal,
 * categoría, línea, marca, estado) y orden, y un editor por producto para
 * cambiar lo que el admin necesite —categoría, animal, línea, precio, nombre,
 * marca, activo—. Los cambios van por PATCH y se reflejan en la tienda porque es
 * la misma base de datos.
 *
 * El filtrado y el orden se hacen en el cliente sobre la lista que ya llega
 * entera: para un catálogo de este tamaño es instantáneo y evita una ida y
 * vuelta al servidor por cada tecla. Se pagina para no pintar miles de filas.
 */

const POR_PAGINA = 25;

type Estado = 'todos' | 'activos' | 'inactivos';
type Orden = 'nombre' | 'precio-asc' | 'precio-desc';

export function ProductosPanel({
  data,
  onChanged,
}: {
  data: AdminProductsResponse | null | undefined;
  onChanged: () => void;
}) {
  const taxonomia = useFetch<Taxonomy>(() => api.taxonomy(), []);

  const [q, setQ] = useState('');
  const [fAnimal, setFAnimal] = useState('');
  const [fCategoria, setFCategoria] = useState('');
  const [fLinea, setFLinea] = useState('');
  const [fMarca, setFMarca] = useState('');
  const [fEstado, setFEstado] = useState<Estado>('todos');
  const [orden, setOrden] = useState<Orden>('nombre');
  const [pagina, setPagina] = useState(1);
  const [editando, setEditando] = useState<AdminProduct | null>(null);
  const [importando, setImportando] = useState(false);
  const [exportando, setExportando] = useState(false);

  const productos = data?.products ?? [];

  const exportar = async () => {
    if (!productos.length) return;
    setExportando(true);
    try {
      await exportarProductosAExcel(productos);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setExportando(false);
    }
  };

  const filtrados = useMemo(() => {
    const t = q.trim().toLowerCase();
    const lista = productos.filter((p) => {
      if (t && !(p.name.toLowerCase().includes(t) || p.variants.some((v) => v.sku.toLowerCase().includes(t)))) return false;
      if (fAnimal && !p.animals.some((a) => a.slug === fAnimal)) return false;
      if (fCategoria && !p.categories.some((c) => c.slug === fCategoria)) return false;
      if (fLinea && p.line !== fLinea) return false;
      if (fMarca && p.brand?.slug !== fMarca) return false;
      if (fEstado === 'activos' && !p.active) return false;
      if (fEstado === 'inactivos' && p.active) return false;
      return true;
    });
    const precio = (p: AdminProduct) => p.price ?? p.variants[0]?.price ?? Infinity;
    lista.sort((a, b) =>
      orden === 'nombre'
        ? a.name.localeCompare(b.name, 'es')
        : orden === 'precio-asc'
        ? precio(a) - precio(b)
        : precio(b) - precio(a),
    );
    return lista;
  }, [productos, q, fAnimal, fCategoria, fLinea, fMarca, fEstado, orden]);

  // Cualquier cambio de filtro vuelve a la primera página.
  useEffect(() => setPagina(1), [q, fAnimal, fCategoria, fLinea, fMarca, fEstado, orden]);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const visibles = filtrados.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA);

  const borrar = async (p: AdminProduct) => {
    if (!confirm(`¿Eliminar «${p.name}»? Esta acción no se puede deshacer.`)) return;
    try {
      await api.adminDeleteProduct(p.id);
      toast.success('Producto eliminado');
      onChanged();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  if (!data) {
    return <div className="card rounded-4xl py-16 text-center text-content-subtle">Cargando productos…</div>;
  }

  const limpiar = () => {
    setQ('');
    setFAnimal('');
    setFCategoria('');
    setFLinea('');
    setFMarca('');
    setFEstado('todos');
    setOrden('nombre');
  };
  const hayFiltros = q || fAnimal || fCategoria || fLinea || fMarca || fEstado !== 'todos';

  return (
    <div className="space-y-4">
      {/* Exportar / importar en bloque */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-content-subtle">Edita, exporta o importa el catálogo en bloque.</p>
        <div className="flex gap-2">
          <button
            onClick={exportar}
            disabled={exportando || productos.length === 0}
            className="inline-flex items-center gap-2 rounded-full border border-brand-900/10 bg-white px-4 py-2.5 text-sm font-semibold text-ink hover:bg-brand-50 disabled:opacity-50"
          >
            <FileDown className="h-4 w-4" aria-hidden="true" />
            {exportando ? 'Exportando…' : 'Exportar a Excel'}
          </button>
          <button
            onClick={() => setImportando(true)}
            className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-4 py-2.5 text-sm font-semibold text-cream shadow-soft hover:bg-brand-700"
          >
            <FileUp className="h-4 w-4" aria-hidden="true" />
            Importar
          </button>
        </div>
      </div>

      {/* Barra de búsqueda y filtros */}
      <div className="card rounded-3xl p-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="relative min-w-56 flex-1">
            <span className="sr-only">Buscar por nombre o SKU</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-content-subtle" aria-hidden="true" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nombre o SKU…"
              className="h-11 w-full rounded-full border border-brand-900/10 bg-white pl-10 pr-3 text-sm outline-none focus:border-brand-500"
            />
          </label>
          <Selector valor={fAnimal} onChange={setFAnimal} vacio="Animal" opciones={taxonomia.data?.animals ?? []} />
          <Selector valor={fCategoria} onChange={setFCategoria} vacio="Categoría" opciones={taxonomia.data?.categories ?? []} />
          <SelectorTexto valor={fLinea} onChange={setFLinea} vacio="Línea" opciones={data.lineas} />
          <Selector valor={fMarca} onChange={setFMarca} vacio="Marca" opciones={taxonomia.data?.brands ?? []} />
          <select
            value={fEstado}
            onChange={(e) => setFEstado(e.target.value as Estado)}
            className="h-11 rounded-full border border-brand-900/10 bg-white px-3 text-sm font-semibold outline-none focus:border-brand-500"
          >
            <option value="todos">Todos</option>
            <option value="activos">Activos</option>
            <option value="inactivos">Ocultos</option>
          </select>
          <select
            value={orden}
            onChange={(e) => setOrden(e.target.value as Orden)}
            className="h-11 rounded-full border border-brand-900/10 bg-white px-3 text-sm font-semibold outline-none focus:border-brand-500"
          >
            <option value="nombre">Nombre A–Z</option>
            <option value="precio-asc">Precio ↑</option>
            <option value="precio-desc">Precio ↓</option>
          </select>
          {hayFiltros && (
            <button onClick={limpiar} className="text-sm font-semibold text-brand-700 hover:underline">
              Limpiar
            </button>
          )}
        </div>
        <p className="mt-3 text-xs text-content-subtle">
          {filtrados.length} {filtrados.length === 1 ? 'producto' : 'productos'}
          {filtrados.length !== productos.length ? ` de ${productos.length}` : ''}
        </p>
      </div>

      {/*
        Tabla con scroll horizontal propio. El `min-w` evita que, con muchas
        columnas, el navegador aplaste unas y recorte otras por la derecha: si no
        caben, aparece la barra de scroll y se ven todas.
      */}
      <div className="card overflow-x-auto rounded-4xl">
        <table className="w-full min-w-[1080px] text-sm">
          <thead className="bg-brand-900/[0.03] text-left text-xs uppercase tracking-wide text-content-subtle">
            <tr>
              <th className="whitespace-nowrap px-4 py-3">Producto</th>
              <th className="whitespace-nowrap px-4 py-3">Marca</th>
              <th className="whitespace-nowrap px-4 py-3">Animal</th>
              <th className="whitespace-nowrap px-4 py-3">Categoría</th>
              <th className="whitespace-nowrap px-4 py-3">Línea</th>
              <th className="whitespace-nowrap px-4 py-3">SKU</th>
              <th className="whitespace-nowrap px-4 py-3 text-right">Precio</th>
              <th className="whitespace-nowrap px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-900/5">
            {visibles.map((p) => (
              <tr key={p.id} className={cn('hover:bg-brand-900/[0.02]', !p.active && 'opacity-55')}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <img src={p.image} alt="" className="h-10 w-10 shrink-0 rounded-lg bg-white object-contain" />
                    <div className="min-w-0 max-w-[240px]">
                      <Link to={`/producto/${p.slug}`} className="block truncate font-semibold text-ink hover:text-brand-700" title={p.name}>
                        {p.name}
                      </Link>
                      {!p.active && <span className="text-xs text-content-subtle">Oculto en la tienda</span>}
                    </div>
                  </div>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-brand-900/70">{p.brand?.name ?? '—'}</td>
                <td className="px-4 py-3 text-brand-900/70">{p.animals.map((a) => a.name).join(', ') || '—'}</td>
                <td className="px-4 py-3 text-brand-900/70">{p.categories.map((c) => c.name).join(', ') || '—'}</td>
                <td className="px-4 py-3 text-brand-900/70">{p.line || '—'}</td>
                <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-brand-900/60">{p.variants[0]?.sku ?? '—'}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right font-semibold">
                  {p.price == null && p.variants[0]?.price == null ? 'A consultar' : eur(p.price ?? p.variants[0]?.price)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <button
                      onClick={() => setEditando(p)}
                      className="rounded-lg p-2 text-content-subtle hover:bg-brand-50 hover:text-brand-700"
                      aria-label={`Editar ${p.name}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => borrar(p)}
                      className="rounded-lg p-2 text-content-subtle hover:bg-red-50 hover:text-red-500"
                      aria-label={`Eliminar ${p.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {visibles.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-content-subtle">
                  No hay productos con estos filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {totalPaginas > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => setPagina((n) => Math.max(1, n - 1))}
            disabled={paginaActual === 1}
            className="rounded-full border border-brand-900/10 bg-white px-4 py-2 text-sm font-semibold disabled:opacity-40"
          >
            Anterior
          </button>
          <span className="text-sm text-content-subtle">
            Página {paginaActual} de {totalPaginas}
          </span>
          <button
            onClick={() => setPagina((n) => Math.min(totalPaginas, n + 1))}
            disabled={paginaActual === totalPaginas}
            className="rounded-full border border-brand-900/10 bg-white px-4 py-2 text-sm font-semibold disabled:opacity-40"
          >
            Siguiente
          </button>
        </div>
      )}

      {editando && taxonomia.data && (
        <EditorProducto
          producto={editando}
          taxonomia={taxonomia.data}
          lineas={data.lineas}
          onCerrar={() => setEditando(null)}
          onGuardado={() => {
            setEditando(null);
            onChanged();
          }}
        />
      )}

      {importando && <ImportDialog onCerrar={() => setImportando(false)} onImportado={onChanged} />}
    </div>
  );
}

/** Un `<select>` de filtro sobre una lista de taxonomía (slug + nombre). */
function Selector({
  valor,
  onChange,
  vacio,
  opciones,
}: {
  valor: string;
  onChange: (v: string) => void;
  vacio: string;
  opciones: RefTax[];
}) {
  return (
    <select
      value={valor}
      onChange={(e) => onChange(e.target.value)}
      className="h-11 rounded-full border border-brand-900/10 bg-white px-3 text-sm font-semibold outline-none focus:border-brand-500"
    >
      <option value="">{vacio}: todas</option>
      {opciones.map((o) => (
        <option key={o.id} value={o.slug}>
          {o.name}
        </option>
      ))}
    </select>
  );
}

/** Un `<select>` de filtro sobre valores de texto (las líneas). */
function SelectorTexto({
  valor,
  onChange,
  vacio,
  opciones,
}: {
  valor: string;
  onChange: (v: string) => void;
  vacio: string;
  opciones: string[];
}) {
  return (
    <select
      value={valor}
      onChange={(e) => onChange(e.target.value)}
      className="h-11 rounded-full border border-brand-900/10 bg-white px-3 text-sm font-semibold outline-none focus:border-brand-500"
    >
      <option value="">{vacio}: todas</option>
      {opciones.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

/* ═══════════════════════════ Editor ═══════════════════════════ */

function EditorProducto({
  producto,
  taxonomia,
  lineas,
  onCerrar,
  onGuardado,
}: {
  producto: AdminProduct;
  taxonomia: Taxonomy;
  lineas: string[];
  onCerrar: () => void;
  onGuardado: () => void;
}) {
  const panel = useOverlay(true, onCerrar);
  const [nombre, setNombre] = useState(producto.name);
  const [descripcion, setDescripcion] = useState(producto.description);
  const [precio, setPrecio] = useState(producto.price != null ? String(producto.price) : '');
  const [linea, setLinea] = useState(producto.line ?? '');
  const [marca, setMarca] = useState(producto.brand?.id ?? '');
  const [activo, setActivo] = useState(producto.active);
  const [animales, setAnimales] = useState<Set<string>>(new Set(producto.animals.map((a) => a.id)));
  const [categorias, setCategorias] = useState<Set<string>>(new Set(producto.categories.map((c) => c.id)));
  const [guardando, setGuardando] = useState(false);

  const alternar = (set: Set<string>, id: string): Set<string> => {
    const copia = new Set(set);
    copia.has(id) ? copia.delete(id) : copia.add(id);
    return copia;
  };

  const guardar = async () => {
    const precioNum = precio.trim() === '' ? null : Number(precio.replace(',', '.'));
    if (precioNum != null && (Number.isNaN(precioNum) || precioNum < 0)) {
      toast.error('El precio no es válido.');
      return;
    }
    setGuardando(true);
    try {
      await api.adminUpdateProduct(producto.id, {
        name: nombre.trim(),
        description: descripcion,
        line: linea.trim() === '' ? null : linea.trim(),
        price: precioNum,
        brandId: marca || null,
        active: activo,
        animalIds: [...animales],
        categoryIds: [...categorias],
      });
      toast.success('Producto actualizado');
      onGuardado();
    } catch (err) {
      toast.error((err as Error).message);
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-ink/40" onClick={onCerrar} aria-hidden="true" />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={`Editar ${producto.name}`}
        className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-4xl bg-cream sm:rounded-4xl"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-brand-900/10 px-6 py-4">
          <h2 className="font-display text-lg font-bold text-ink">Editar producto</h2>
          <button onClick={onCerrar} className="rounded-lg p-2 text-content-subtle hover:bg-brand-900/5" aria-label="Cerrar">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
          <Campo etiqueta="Nombre">
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} className="field h-11 w-full" />
          </Campo>

          <div className="grid gap-5 sm:grid-cols-2">
            <Campo etiqueta="Precio (€)" ayuda="Vacío = «a consultar». Iguala también el precio de la variante.">
              <input
                value={precio}
                onChange={(e) => setPrecio(e.target.value)}
                inputMode="decimal"
                placeholder="A consultar"
                className="field h-11 w-full"
              />
            </Campo>
            <Campo etiqueta="Marca">
              <select value={marca} onChange={(e) => setMarca(e.target.value)} className="field h-11 w-full">
                <option value="">Sin marca</option>
                {taxonomia.brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </Campo>
          </div>

          <Campo etiqueta="Línea de producto" ayuda="Jaulas y transportines, Descanso, Gourmet…">
            <input
              value={linea}
              onChange={(e) => setLinea(e.target.value)}
              list="lineas-existentes"
              placeholder="Sin línea"
              className="field h-11 w-full"
            />
            <datalist id="lineas-existentes">
              {lineas.map((l) => (
                <option key={l} value={l} />
              ))}
            </datalist>
          </Campo>

          <Campo etiqueta="Animales">
            <Casillas
              opciones={taxonomia.animals}
              marcados={animales}
              onToggle={(id) => setAnimales((s) => alternar(s, id))}
            />
          </Campo>

          <Campo etiqueta="Categorías">
            <Casillas
              opciones={taxonomia.categories}
              marcados={categorias}
              onToggle={(id) => setCategorias((s) => alternar(s, id))}
            />
          </Campo>

          <Campo etiqueta="Descripción">
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={3}
              className="field w-full resize-y py-2"
            />
          </Campo>

          <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-ink">
            <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} className="h-4 w-4" />
            Visible en la tienda
          </label>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-3 border-t border-brand-900/10 bg-white px-6 py-4">
          <button onClick={onCerrar} className="rounded-full px-5 py-2.5 text-sm font-semibold text-brand-900/70 hover:bg-brand-900/5">
            Cancelar
          </button>
          <button
            onClick={guardar}
            disabled={guardando}
            className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-6 py-2.5 text-sm font-semibold text-cream shadow-soft hover:bg-brand-700 disabled:opacity-50"
          >
            <Check className="h-4 w-4" />
            {guardando ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Campo({ etiqueta, ayuda, children }: { etiqueta: string; ayuda?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-content-subtle">{etiqueta}</span>
      {children}
      {ayuda && <span className="mt-1 block text-xs text-content-subtle">{ayuda}</span>}
    </label>
  );
}

function Casillas({
  opciones,
  marcados,
  onToggle,
}: {
  opciones: RefTax[];
  marcados: Set<string>;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {opciones.map((o) => {
        const activa = marcados.has(o.id);
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onToggle(o.id)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors',
              activa
                ? 'border-brand-600 bg-brand-600 text-cream'
                : 'border-brand-900/15 bg-white text-brand-900/70 hover:border-brand-400',
            )}
          >
            {activa && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
            {o.name}
          </button>
        );
      })}
    </div>
  );
}
