# Manual: cómo montar el simulador en Google Sheets (Apps Script)

Esta es la **Opción B oficial** de la consigna (Google Sheets + JavaScript / Google Apps Script),
por lo que no hay ningún riesgo de compatibilidad como con LibreOffice/Excel. Todo el código vive
en la carpeta `apps_script/` como archivos `.gs`, listos para copiar al editor de Apps Script.

## Paso 1 — Crear la hoja de cálculo

1. Ve a [sheets.google.com](https://sheets.google.com) → **Hoja de cálculo en blanco**.
2. Nómbrala, por ejemplo, **"Simulador CPU 8 bits"**.

## Paso 2 — Copiar los archivos de código a Apps Script

1. En la hoja, ve a **Extensiones → Apps Script**. Se abre el editor en una pestaña nueva.
2. Verás un archivo `Código.gs` por defecto. Bórralo (clic derecho → Eliminar) o simplemente
   sobrescríbelo con el contenido de `Code.gs`.
3. Crea un archivo nuevo por cada módulo (ícono **+** junto a "Archivos" → **Script**), y ponle el
   mismo nombre (sin la extensión `.gs`, Apps Script la agrega sola):
   - `Code` ← pega el contenido de `apps_script/Code.gs`
   - `ALU` ← pega el contenido de `apps_script/ALU.gs`
   - `Control` ← pega el contenido de `apps_script/Control.gs`
   - `Program` ← pega el contenido de `apps_script/Program.gs`
   - `Setup` ← pega el contenido de `apps_script/Setup.gs`
4. Guarda el proyecto (`Ctrl+S` o el ícono de disquete). Ponle un nombre, ej. "Simulador CPU".

> No importa en qué orden estén los archivos: en Apps Script todas las funciones comparten un
> mismo espacio global, así que cualquier función puede llamar a otra sin importar el archivo.

## Paso 3 — Construir la interfaz

1. En el editor de Apps Script, en el desplegable de funciones (arriba, junto a "Depurar"),
   selecciona **`buildSheet`** y presiona **Ejecutar** (▶).
2. La primera vez te pedirá **autorizar permisos** (el script necesita editar tu hoja de cálculo):
   sigue el flujo "Revisar permisos" → elige tu cuenta → "Avanzado" → "Ir a Simulador CPU (no
   seguro)" → Permitir. Esto es normal para cualquier script propio que no está publicado en el
   Marketplace.
3. Verás un mensaje de confirmación. Vuelve a la pestaña de la hoja de cálculo: debería existir
   ahora una hoja **`CPU_SIMULATOR`** con el panel de registros, banderas, la cuadrícula de
   memoria 16×16 y el área de log.
4. Además aparece un menú nuevo **"CPU Simulador"** en la barra de menús de la hoja (junto a
   Ayuda) — te sirve como control alternativo mientras terminas de armar los botones del paso 4,
   y como respaldo durante la defensa oral si algún botón falla.

## Paso 4 — Insertar los botones de control en la hoja

Los botones se insertan como **Dibujos** (Drawings) asignados a una función, que es el equivalente
de Google Sheets a los botones de formulario de Excel:

1. En la hoja `CPU_SIMULATOR`, ve a **Insertar → Dibujo**.
2. Dibuja un rectángulo pequeño, agrégale texto (ej. "LOAD PROGRAM") con la herramienta de texto,
   y presiona **Guardar y cerrar**.
3. Con el dibujo insertado y seleccionado sobre la hoja (cerca de la fila 24), haz clic en los
   **tres puntos** que aparecen en su esquina → **Asignar script**.
4. Escribe el nombre exacto de la función (sin paréntesis) y Aceptar:

   | Botón          | Función a asignar   |
   |----------------|----------------------|
   | LOAD PROGRAM   | `loadDemoProgram`    |
   | STEP           | `stepCycle`          |
   | RUN            | `runProgram`         |
   | PAUSE          | `pauseProgram`       |
   | RESET          | `resetSimulator`     |

5. Repite para los 5 botones, ubicándolos ordenadamente en las filas 24-25 (debajo del panel de
   controles). Puedes duplicar el primer dibujo (`Ctrl+C` / `Ctrl+V`) y solo cambiarle el texto y
   la función asignada, para que todos se vean iguales.

## Paso 5 — Probar el simulador

1. Haz clic en **LOAD PROGRAM**. La memoria debe llenarse (segmento azul = código, segmento
   amarillo = datos) y el log debe mostrar "Programa 'SUMA 1..N' cargado...".
2. Haz clic varias veces en **STEP** y observa cómo `PC`, `MAR`, `MDR`, `IR`, `AX`, `BX` y las
   banderas cambian en cada micro-paso, con la celda de memoria activa resaltada en verde y el
   registro activo en amarillo.
3. Haz clic en **RESET** y luego en **RUN**: verás la ejecución animarse sola (ajusta la celda
   "Velocidad RUN (ms)" para más o menos velocidad). Se detiene sola al llegar a `HLT`.
   - Puedes hacer clic en **PAUSE** mientras `RUN` está corriendo: como cada botón dispara una
     ejecución de Apps Script independiente, el clic en PAUSE sí llega y detiene el bucle en el
     siguiente ciclo (usa una bandera compartida en `PropertiesService`).
4. Verifica que la celda de memoria `0x81` (fila `80h`, columna `1`) termine en `0x0F` (15
   decimal) = `1+2+3+4+5`.

## Solución de problemas comunes

- **"Se requiere autorización"**: vuelve a ejecutar `buildSheet` desde el editor y repite el flujo
  de permisos del paso 3.2.
- **Los botones no hacen nada**: revisa que el nombre de la función asignada esté escrito
  exactamente igual (sensible a mayúsculas) y sin paréntesis ni espacios.
- **`runProgram` corre pero PAUSE no lo detiene de inmediato**: es normal que tarde hasta un ciclo
  completo en reaccionar (el bucle revisa la bandera al inicio de cada ciclo, no a mitad de uno).
- **Error "No existe la hoja CPU_SIMULATOR..."**: ejecuta `buildSheet` primero (paso 3) antes de
  usar cualquier botón.
- **Quiero reconstruir la hoja desde cero**: vuelve a ejecutar `buildSheet` — borra la hoja
  `CPU_SIMULATOR` anterior y la crea de nuevo (los botones/dibujos que hayas puesto sí se
  pierden con la hoja, tendrás que reinsertarlos).

## Nota sobre la carpeta que subes a GitHub

Sube la carpeta `apps_script/` (los `.gs` tal cual están) junto con `README.md` y `docs/`. Esos
mismos `.gs` son el "código fuente" que pide la consigna para la Opción B — no hace falta exportar
nada adicional de Google Sheets.
