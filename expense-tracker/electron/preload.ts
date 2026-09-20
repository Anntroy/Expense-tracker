import { contextBridge } from "electron";

// Las operaciones de transacciones (crear/listar/borrar, resumen mensual)
// se exponen acá vía contextBridge en el paso 4, una vez exista la capa
// de datos en el proceso principal.
contextBridge.exposeInMainWorld("api", {});
