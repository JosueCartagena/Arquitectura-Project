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
   - `Program2` ← pega el contenido de `apps_script/Program2.gs` (5 programas de demostración
     adicionales: Multiplicación, C=A+B, Mayor de dos números, Cuenta regresiva, Fibonacci)
   - `Assembler` ← pega el contenido de `apps_script/Assembler.gs` (ensamblador de 2 pasadas)
   - `Inspector` ← pega el contenido de `apps_script/Inspector.gs` (edición en vivo de memoria +
     inspector de celdas)
   - `Tests` ← pega el contenido de `apps_script/Tests.gs` (suite de pruebas automatizadas)
   - `Teoria` ← pega el contenido de `apps_script/Teoria.gs` (hoja de equivalencias de nombres)
   - `Setup` ← pega el contenido de `apps_script/Setup.gs`
   - `Datapath` ← pega el contenido de `apps_script/Datapath.gs` (diagrama de bloques interactivo
     + modo "Run Lento"; ver paso 6)

> **Importante:** solo puede existir **una** función `onEdit` en todo el proyecto de Apps Script
> (la de `Inspector.gs`, que habilita la edición en vivo de memoria). Si en algún momento agregás
> otro archivo con su propio `onEdit`, Apps Script va a usar solo uno de los dos (el comportamiento
> no está garantizado) — fusioná la lógica en una sola función si eso llega a pasar.
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

   > `Run Lento` y `Conectar Diagrama` (ver paso 6) no necesitan botón propio: ya están en el menú
   > **"CPU Simulador"** de la hoja, que se genera solo al abrir la hoja (función `onOpen`).

5. Repite para los 5 botones, ubicándolos ordenadamente en las filas 24-25 (debajo del panel de
   controles). Puedes duplicar el primer dibujo (`Ctrl+C` / `Ctrl+V`) y solo cambiarle el texto y
   la función asignada, para que todos se vean iguales.

## Paso 5 — Probar el simulador

1. Haz clic en **LOAD PROGRAM**. La memoria debe llenarse (segmento azul = código, segmento
   amarillo = datos) y el log debe mostrar "Programa 'SUMA 1..N' cargado...". Podés cambiar cuántos
   números se suman editando la celda amarilla **`N (suma 1..N)`** (`B22`, rango 1-20) antes de
   cargar el programa.
2. Haz clic varias veces en **STEP** y observa cómo `PC`, `MAR`, `MDR`, `IR`, `AX`, `BX` y las
   banderas cambian en cada micro-paso, con la celda de memoria activa resaltada en verde y el
   registro activo en amarillo.
3. Haz clic en **RESET** y luego en **RUN** (menú o botón): el resultado aparece **de inmediato**
   (memoria, registros y log completos de una sola vez) — `RUN` ya no anima paso a paso, es
   intencionalmente instantáneo. Si querés verlo animarse en vivo (por ejemplo para una
   exposición), usá **Run Lento (1s/fase)** desde el menú "CPU Simulador" en su lugar: anima cada
   fase con 1 segundo de pausa, igual que STEP pero automático.
   - Podés hacer clic en **PAUSE** mientras **Run Lento** está corriendo: como cada botón/menú
     dispara una ejecución de Apps Script independiente, el clic en PAUSE sí llega y detiene el
     bucle al terminar la fase actual (usa una bandera compartida en `PropertiesService`). `RUN`
     (el instantáneo) ya termina antes de que un clic en PAUSE pueda alcanzarlo — es esperado.
4. Verifica que la celda de memoria `0x81` (fila `80h`, columna `1`) termine en `0x0F` (15
   decimal) = `1+2+3+4+5` con `N=5`, o en `N*(N+1)/2` con el `N` que hayas elegido.

## Paso 5.5 — Si ya tenías el simulador armado (hoja ya existente)

Si ya tenías `CPU_SIMULATOR` construida de antes (con `buildSheet` ya corrido una vez) y solo
pegaste los archivos nuevos (`Program2`, `Assembler`, `Inspector`, `Tests`, `Teoria`), **no**
vuelvas a correr `buildSheet` — borra toda la hoja y perdés los botones/dibujos que ya habías
insertado. En su lugar:

1. Recargá la pestaña de Google Sheets (F5) para que el menú **"CPU Simulador"** se regenere con
   las opciones nuevas.
2. Desde el menú, ejecutá **"Actualizar hoja existente (OF, entradas A/B)"**
   (`applyUiUpgrade()`): agrega la fila de la bandera `OF`, las celdas `Valor A`/`Valor B` (para
   los programas de 2 operandos) y la celda de código fuente del ensamblador, sin tocar nada de lo
   que ya tenías.
3. Probá **"Correr pruebas automatizadas"** del menú: debería confirmar `38/38 OK`. Si algo falla,
   revisá que copiaste los 10 archivos completos (no se cortó ningún archivo al pegar).
4. Opcional: **"Construir hoja 'Teoria' (una vez)"** para la hoja de equivalencias de nombres.

## Paso 6 — (Opcional) Diagrama de bloques interactivo

Si además querés un diagrama visual estilo Unidad de Control / ALU / Memoria que se anime junto
con `STEP` y `Run Lento` (ver README.md, sección "Diagrama de bloques interactivo"):

1. Dibujá las cajas a mano en la hoja `CPU_SIMULATOR` (celdas combinadas + bordes), con las
   etiquetas de texto exactas que espera `Datapath.gs` (`Cont Programa`, `Decodificador`,
   `R. Instrucciones`, `Fetch`/`Decode`/`Execute`/`Store`, `Ciclos`, `Acumulador`, `R.Entrada`,
   `ZF`/`CF`/`SF`, `R.Direcciones`, `R. Datos`, y una mini tabla `Dir`/`Contenido`), dejando una
   celda vacía junto a cada una (la "caja de valor").
2. Desde el menú **"CPU Simulador" → "Conectar Diagrama (una vez)"**, ejecutá
   `setupDatapathDiagram()`. Esto conecta cada caja vacía al registro real correspondiente con una
   fórmula, y guarda el mapa de celdas para poder colorearlas después.
3. Probá con **STEP**: las cajas de la fase activa deberían iluminarse (amarillo = registro
   activo, color de fase = indicador Fetch/Decode/Execute/Store).
4. Si movés o rehacés alguna caja, volvé a ejecutar "Conectar Diagrama (una vez)".

## Solución de problemas comunes

- **"Se requiere autorización"**: vuelve a ejecutar `buildSheet` desde el editor y repite el flujo
  de permisos del paso 3.2.
- **Los botones no hacen nada**: revisa que el nombre de la función asignada esté escrito
  exactamente igual (sensible a mayúsculas) y sin paréntesis ni espacios.
- **No aparecen "Run Lento" ni "Conectar Diagrama" en el menú**: el menú se genera al abrir la
  hoja (`onOpen`); si acabás de actualizar `Setup.gs`, recargá la pestaña de Google Sheets (F5)
  para que se regenere con las opciones nuevas.
- **`Run Lento` corre pero PAUSE no lo detiene de inmediato**: es normal que tarde hasta una fase
  completa en reaccionar (el bucle revisa la bandera entre fase y fase, no a mitad de una).
- **`setupDatapathDiagram` avisa que no encontró algún cuadro**: revisá que el texto de esa
  etiqueta esté escrito igual que en la lista del paso 6.1 (no hace falta mayúsculas/tildes
  exactas, pero sí las mismas palabras).
- **Error "No existe la hoja CPU_SIMULATOR..."**: ejecuta `buildSheet` primero (paso 3) antes de
  usar cualquier botón.
- **Quiero reconstruir la hoja desde cero**: vuelve a ejecutar `buildSheet` — borra la hoja
  `CPU_SIMULATOR` anterior y la crea de nuevo (los botones/dibujos que hayas puesto, y el
  diagrama de bloques si lo armaste, se pierden con la hoja: tendrás que reinsertarlos).

## Nota sobre la carpeta que subes a GitHub

Sube la carpeta `apps_script/` completa (los 11 archivos `.gs`) junto con `README.md` y `docs/`.
Esos mismos `.gs` son el "código fuente" que pide la consigna para la Opción B — no hace falta
exportar nada adicional de Google Sheets.
