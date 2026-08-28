export function PlaceholderBlock({ titulo, bloque }: { titulo: string; bloque: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center rounded-xl border border-dashed border-bac-gray-border bg-white text-center">
      <p className="text-sm font-medium text-bac-gray-text">{bloque}</p>
      <h2 className="mt-1 text-lg font-semibold text-gray-900">{titulo}</h2>
      <p className="mt-1 text-sm text-bac-gray-text">Pendiente de construcción.</p>
    </div>
  );
}
