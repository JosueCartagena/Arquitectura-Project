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
5. Clona el repo localmente y copia dentro toda la carpeta de este proyecto
   (`vba/`, `docs/`, `README.md`) más el archivo `simulador_cpu.xlsm` una vez que lo hayas
   armado en LibreOffice.

```bash
git clone https://github.com/<tu-usuario>/simulador-cpu-8bits.git
cd simulador-cpu-8bits
# copia aquí: README.md, vba/, docs/, simulador_cpu.xlsm
git add .
git commit -m "chore: estructura inicial del repositorio"
git push
```

> Nota sobre el archivo `.xlsm`: la consigna pide el "código fuente (.xlsm o .gas)" **dentro** del
> repositorio de GitHub — eso es distinto de subir un `.zip` a la plataforma académica (lo cual sí
> está prohibido). Sí debes subir el `.xlsm` a GitHub como parte del código fuente del proyecto.

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
   | Controles STEP/RUN/PAUSE/RESET/LOAD PROGRAM          | Los 5 botones funcionan y están correctamente asignados a sus macros.          |
   | Documentación técnica (README.md)                    | Incluye diagrama Mermaid, tabla ISA, manual de usuario y traza de registros.   |

4. Mueve cada issue por las columnas conforme avances realmente (no todo a `Done` al final).

## Paso 3 — Plan de commits semánticos

Usa prefijos convencionales: `feat:` (funcionalidad nueva), `fix:` (corrección), `docs:`
(documentación), `refactor:` (reordenar sin cambiar comportamiento), `chore:` (tareas de config).

Secuencia sugerida (cada uno es un commit real y separado, a medida que completas cada módulo —
repártelos entre **hoy y mañana**, no los hagas todos de una sentada):

1. `chore: estructura inicial del repositorio`
2. `feat: variables globales de registros, memoria y estado (M0_Globals)`
3. `feat: operaciones primitivas de memoria Read/Write y cuadricula 16x16 (M1_Memory)`
4. `feat: reset y refresco visual de registros del CPU (M2_CPU)`
5. `feat: implementacion de la ALU - aritmetica y logica (M3_ALU)`
6. `feat: unidad de control - tabla de opcodes y ciclo Fetch-Decode-Execute-Store (M4_Control)`
7. `feat: carga del programa demostrativo Suma 1..N (M5_Program)`
8. `feat: resaltado visual y log de micro-operaciones (M6_UI)`
9. `feat: construccion de la interfaz - hoja CPU_SIMULATOR (M7_Setup)`
10. `feat: botones de control Step/Run/Pause/Reset/Load Program`
11. `fix: correccion de banderas CF/SF en operaciones de resta y CMP`
12. `test: validacion de la traza del programa demostrativo (1+2+3+4+5=15)`
13. `docs: manual de instalacion en LibreOffice Calc`
14. `docs: README con diagrama Mermaid, tabla ISA, manual de usuario y traza de registros`
15. `chore: cierre del tablero Kanban y revision final antes de la entrega`

Cada commit debe corresponder a trabajo real hecho en ese momento (edita el módulo, pruébalo,
luego confirma). Mueve la tarjeta del issue relacionado a `In Progress` cuando empiezas y a
`Done` cuando el commit queda hecho y probado.

## Paso 4 — Qué enviar en la plataforma académica

Únicamente estos dos enlaces (nada de archivos comprimidos ni el libro de cálculo suelto):

1. **Enlace al repositorio de GitHub:** `https://github.com/<tu-usuario>/simulador-cpu-8bits`
2. **Enlace al tablero de GitHub Projects** (la URL del proyecto, ej.
   `https://github.com/users/<tu-usuario>/projects/<numero>`)

Verifica ambos enlaces en una ventana de incógnito antes de enviarlos, para confirmar que son
públicos o accesibles para el docente.
