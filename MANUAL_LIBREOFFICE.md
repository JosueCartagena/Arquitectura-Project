# Manual: cómo montar el simulador en LibreOffice Calc (y guardarlo como .xlsm)

La consigna del parcial solo reconoce dos plataformas oficiales: **Excel + VBA (.xlsm/.xlsb)** o
**Google Sheets + Apps Script (.gas)**. LibreOffice Calc no está en esa lista, así que la ruta segura
es: construir el simulador en LibreOffice Calc usando su **modo de compatibilidad VBA**, y guardar
el archivo final en formato **.xlsm**. El código de los módulos (`vba/*.bas`) está escrito en VBA
estándar (sin funciones exclusivas de LibreOffice ni APIs de Windows), por lo que también debería
ejecutarse en Excel real si el docente decide abrirlo ahí.

## Paso 1 — Activar la compatibilidad VBA en LibreOffice

1. Abre LibreOffice Calc.
2. Ve a **Herramientas → Opciones → Cargar/Guardar → Propiedades de VBA**.
3. Marca las casillas:
   - "Guardar código original en formato Basic"
   - "Ejecutar automáticamente macros de Excel"
   - "Guardar VBA propiedades de Basic al guardar"
4. Ve a **Herramientas → Opciones → LibreOffice Calc → General** y marca "Usar formato UTF-8".
   (Opcional, evita problemas con tildes en los mensajes).
5. Crea un libro nuevo y guárdalo inmediatamente como **`simulador_cpu.xlsm`**
   (**Archivo → Guardar como** → tipo "Excel 2007-365 (.xlsm)"). Cuando te pregunte "¿Mantener el
   formato?", elige **Usar formato Excel 2007!**.

## Paso 2 — Importar los módulos de código

1. Abre el editor de macros: **Herramientas → Macros → Editar macros...** (o `Alt+F11`).
2. En el árbol, ubica tu libro `simulador_cpu.xlsm`.
3. Clic derecho sobre él → **Insertar → Módulo** — repite esto **7 veces** (uno por cada archivo
   `.bas` de la carpeta `vba/`), y nómbralos exactamente igual que el archivo:
   `M0_Globals`, `M1_Memory`, `M2_CPU`, `M3_ALU`, `M4_Control`, `M5_Program`, `M6_UI`, `M7_Setup`.
4. Abre cada archivo `.bas` con un editor de texto, copia todo su contenido (sin la primera línea
   `Attribute VB_Name = "..."`, esa la gestiona LibreOffice solo) y pégalo dentro del módulo
   correspondiente en el editor de Basic.
5. Guarda (`Ctrl+S`), manteniendo el formato Excel cuando lo pregunte.

> Orden recomendado de pegado: `M0_Globals` primero (declara las variables globales que usan
> todos los demás), luego el resto en cualquier orden.

## Paso 3 — Construir la interfaz

1. Con el editor de Basic abierto, colócate dentro del módulo `M7_Setup`.
2. Ejecuta la macro **`SetupSheets`** (botón ▶ o `F5`, asegurándote de que el cursor esté dentro
   de esa subrutina). Esto crea la hoja `CPU_SIMULATOR` con el panel de registros, banderas,
   la cuadrícula de memoria 16×16 y el área de log.
3. Verás un mensaje de confirmación. Vuelve a la hoja de cálculo (`Alt+F4` para cerrar el editor,
   o simplemente cambia de ventana).

## Paso 4 — Insertar los botones de control

Los botones se insertan a mano (más confiable entre Excel y LibreOffice que crearlos por código):

1. Activa la barra de controles de formulario: **Insertar → Controles de formulario** (o el ícono
   correspondiente en la barra de herramientas).
2. Elige **"Botón"** (Push Button) y dibuja un botón pequeño sobre las celdas indicadas en la
   hoja (fila 24 en adelante, columna A):
   - Botón 1 en `A24`: texto **"LOAD PROGRAM"**
   - Botón 2 en `A25`: texto **"STEP"**
   - Botón 3 en `B25`: texto **"RUN"**
   - Botón 4 en `C25`: texto **"PAUSE"**
   - Botón 5 en `D25`: texto **"RESET"**
3. Con el botón recién dibujado seleccionado (modo diseño activo), clic derecho → **Macro
   asignada...** → busca en `simulador_cpu.xlsm` → `M4_Control` (o `M5_Program` / `M7_Setup` según
   corresponda) y asigna:

   | Botón          | Macro a asignar   |
   |----------------|-------------------|
   | LOAD PROGRAM   | `LoadDemoProgram` |
   | STEP           | `StepCycle`       |
   | RUN            | `RunProgram`      |
   | PAUSE          | `PauseProgram`    |
   | RESET          | `ResetSimulator`  |

4. Sal del "Modo Diseño" (icono con escuadra y lápiz) para que los botones queden clicables.
5. Guarda el archivo (mantén el formato .xlsm).

## Paso 5 — Probar el simulador

1. Haz clic en **LOAD PROGRAM**. Deberías ver la memoria llenarse (segmento azul = código,
   segmento amarillo = datos) y el log mostrar "Programa 'SUMA 1..N' cargado...".
2. Haz clic varias veces en **STEP** y observa cómo `PC`, `MAR`, `MDR`, `IR`, `AX`, `BX` y las
   banderas cambian en cada micro-paso, y cómo se resaltan en amarillo/verde el registro y la
   celda de memoria activos.
3. Presiona **RESET** y luego **RUN** para ver la ejecución automática (ajusta la celda
   "Velocidad RUN (ms)" para más o menos velocidad). Debe detenerse solo al llegar a `HLT`.
4. Verifica que la celda de memoria `0x81` (fila `80h`, columna `1`) termine en `0x0F` (15 decimal),
   que es el resultado de `1+2+3+4+5`.

## Solución de problemas comunes

- **"No se puede ejecutar la macro en modo protegido"**: habilita las macros al abrir el archivo
  (aviso de seguridad → Habilitar macros).
- **Los botones no responden**: confirma que el "Modo Diseño" esté desactivado.
- **Error de compilación al pegar código**: revisa que no hayas copiado la línea
  `Attribute VB_Name = "..."` dentro del módulo (LibreOffice a veces la rechaza si se pega a mano).
- **Al abrir en Excel real los colores/botones se ven distinto**: es normal por diferencias menores
  de renderizado entre programas; la lógica (macros) es 100% compatible porque no usa APIs de
  Windows ni funciones propietarias de LibreOffice.
