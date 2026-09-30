# Guía: Repositorio GitHub + Tablero Kanban + Plan de commits

Recordatorio crítico de la consigna: **cualquier commit, PR o movimiento de tarjeta con fecha
posterior al domingo 29 de septiembre 23:59 anula la entrega.** Todo lo de abajo debe quedar
terminado *antes* de esa hora. Además: **un solo commit masivo de última hora está penalizado**
— por eso el plan de commits reparte el trabajo en unidades atómicas y semánticas reales
(no se recomienda "maquillar" fechas de commit; eso además sería fácilmente detectable y viola
la integridad académica exigida en la consigna).

## Paso 1 — Crear el repositorio

1. Entra a GitHub → **New repository**.
2. Nombre sugerido: `simulador-cpu-8bits`.
3. Visibilidad: **Public** o **Private** (si es privado, agrega al docente como colaborador).
4. Marca "Add a README file" **NO** (ya tienes uno propio) — o si lo marcas, lo reemplazas
   luego con el `README.md` de este proyecto.
5. Clona el repo localmente y copia dentro toda la carpeta de este proyecto:
   `apps_script/` (los `.gs`), `docs/` y `README.md`.

```bash
git clone https://github.com/<tu-usuario>/simulador-cpu-8bits.git
cd simulador-cpu-8bits
# copia aquí: README.md, apps_script/, docs/
git add .
git commit -m "chore: estructura inicial del repositorio"
git push
```

> Nota: la consigna pide el "código fuente (.xlsm o .gas)" **dentro** del repositorio de GitHub —
> eso es distinto de subir un `.zip` a la plataforma académica (lo cual sí está prohibido). Los
> archivos `.gs` de `apps_script/` SON ese código fuente para la Opción B (Google Sheets).

## Paso 2 — Configurar el tablero Kanban (GitHub Projects)

1. En el repo → pestaña **Projects** → **New project** → plantilla **Board**.
2. Crea las columnas exactamente como pide la consigna:
   `Backlog` · `To Do` · `In Progress` · `In Review / Testing` · `Done`.
3. Crea un **Issue** por cada componente principal (cada uno con **criterios de aceptación**
   explícitos en la descripción). Sugerencia de issues iniciales:

   | Issue                                             | Criterios de aceptación (ejemplo)                                              |
   |----------------------------------------------------|----------------------------------------------------------------------------------|
   | Matriz de memoria 16×16 (00h-FFh)                  | Cuadrícula visible, direcciones correctas, segmentación código/datos por color. |
   | Registros y banderas visibles                       | PC, IR, MAR, MDR, AX, BX, ZF, CF, SF se actualizan en cada micro-paso.          |
   | ALU: operaciones aritméticas y lógicas              | ADD/SUB/INC/DEC/AND/OR/XOR/NOT/CMP correctos, banderas fieles.                  |
   | Ciclo de instrucción (Fetch/Decode/Execute/Store)   | Cada fase es un paso independiente y visible; PC avanza según tamaño de instr.  |
   | Decodificador de instrucciones (ISA)                | Las 20 instrucciones del set se decodifican y ejecutan sin errores.            |
   | Programa demostrativo (Suma 1..N)                   | Al ejecutar, `Mem[0x81]` termina en `0x0F` (15).                                |
   | Animación / resaltado visual del flujo               | Registro/celda activa se resalta con color en cada fase.                       |
   | Log de micro-operaciones                             | Cada fase agrega una línea cronológica legible al log.                         |
   | Controles STEP/RUN/PAUSE/RESET/LOAD PROGRAM          | Los 5 botones (dibujos) funcionan y están correctamente asignados a sus funciones. |
   | Modo RUN instantáneo + Run Lento (1s/fase)           | `RUN` entrega el resultado de inmediato; `Run Lento` anima cada fase para exposición, y PAUSE lo detiene. |
   | Diagrama de bloques interactivo (Datapath.gs)        | Los cuadros del diagrama muestran los valores reales y se colorean según la fase activa en STEP/Run Lento. |
   | Documentación técnica (README.md)                    | Incluye diagrama Mermaid, tabla ISA, manual de usuario y traza de registros.   |

4. Mueve cada issue por las columnas conforme avances realmente (no todo a `Done` al final).

## Paso 3 — Plan de commits semánticos

Usa prefijos convencionales: `feat:` (funcionalidad nueva), `fix:` (corrección), `docs:`
(documentación), `refactor:` (reordenar sin cambiar comportamiento), `chore:` (tareas de config).

Secuencia sugerida (cada uno es un commit real y separado — como hoy es el día de entrega,
hazlos **a medida que pruebas cada módulo en Apps Script**, en el orden que ya lo vas armando; no
los hagas todos pegados al final):

1. `chore: estructura inicial del repositorio`
2. `feat: estado global del simulador, memoria Read/Write y refresco de hoja (Code.gs)`
3. `feat: implementacion de la ALU - aritmetica y logica (ALU.gs)`
4. `feat: unidad de control - tabla de opcodes y ciclo Fetch-Decode-Execute-Store (Control.gs)`
5. `feat: carga del programa demostrativo Suma 1..N (Program.gs)`
6. `feat: construccion de la interfaz - hoja CPU_SIMULATOR y menu (Setup.gs)`
7. `feat: botones de control Step/Run/Pause/Reset/Load Program`
8. `fix: correccion de banderas CF/SF en operaciones de resta y CMP`
9. `test: validacion de la traza del programa demostrativo (1+2+3+4+5=15)`
10. `feat: N configurable (celda de entrada) para el programa demostrativo`
11. `perf: modo RUN instantaneo (computo en memoria, un solo volcado a la hoja)`
12. `feat: modo Run Lento (1s/fase) y PAUSE funcional para exposicion en vivo`
13. `feat: diagrama de bloques interactivo conectado a los registros reales (Datapath.gs)`
14. `docs: manual de instalacion en Google Sheets / Apps Script`
15. `docs: README con diagrama Mermaid, tabla ISA, manual de usuario y traza de registros`
16. `chore: cierre del tablero Kanban y revision final antes de la entrega`

Cada commit debe corresponder a trabajo real hecho en ese momento (edita el módulo, pruébalo en la
hoja, luego confirma). Mueve la tarjeta del issue relacionado a `In Progress` cuando empiezas y a
`Done` cuando el commit queda hecho y probado. Con 12 commits reales espaciados durante el día de
hoy ya cumples el criterio de "flujo continuo de commits atómicos" de la rúbrica — prioriza que
cada uno represente trabajo genuino antes que la cantidad exacta.

## Paso 4 — Qué enviar en la plataforma académica

Únicamente estos dos enlaces (nada de archivos comprimidos ni el libro de cálculo suelto):

1. **Enlace al repositorio de GitHub:** `https://github.com/<tu-usuario>/simulador-cpu-8bits`
2. **Enlace al tablero de GitHub Projects** (la URL del proyecto, ej.
   `https://github.com/users/<tu-usuario>/projects/<numero>`)

Verifica ambos enlaces en una ventana de incógnito antes de enviarlos, para confirmar que son
públicos o accesibles para el docente.
