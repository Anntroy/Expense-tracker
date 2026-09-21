export function ApiMissingNotice() {
  return (
    <p className="rounded-lg border border-dashed border-amber-400 bg-amber-50 p-6 text-center text-sm text-amber-800 dark:border-amber-600 dark:bg-amber-950 dark:text-amber-200">
      Esta vista necesita ejecutarse dentro de la app de escritorio (<code>npm run dev</code>), no
      en una pestaña de navegador normal: ahí no existe el puente <code>window.api</code> que da
      acceso a los datos guardados.
    </p>
  );
}
