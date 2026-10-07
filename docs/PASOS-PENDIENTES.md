# Pasos pendientes (lo que no se pudo hacer desde acá)

Esto se generó después de implementar la bandera `OF`, los opcodes `JC`/`JNC`, 5 programas de
demostración nuevos, el ensamblador, el inspector de memoria con edición en vivo, la suite de
pruebas automatizadas y la hoja "Teoría" — todo verificado con un simulador en Node.js que corre el
código **real** de `Control.gs`/`ALU.gs` (38/38 pruebas OK) antes de entregarlo. Lo que sigue es lo
que necesita tu computadora, tu cuenta de Google, tu GitHub o una decisión tuya, y por eso no se
pudo hacer desde esta sesión.

> **ACTUALIZACIÓN:** el paso 1 ya se hizo directamente en tu proyecto de Apps Script en vivo (los 11
> archivos pegados y guardados, `runAllTests` dio `38/38 OK` y `applyUiUpgrade` terminó sin error).
> Solo te queda: recargar la hoja (F5), revisar visualmente que el menú, `OF` y `D20:E22` se vean
> bien (sección 4), y hacer el git push (sección 2). Opcional: "Construir hoja 'Teoria'".

## 1. Pegar el código nuevo en el Apps Script real (YA HECHO en vivo)

Esta sesión solo tiene acceso a los archivos `.gs` en disco (`apps_script/`), **no** a tu Google
Sheet en vivo. Tenés que copiar el contenido de estos archivos al editor de Apps Script de tu hoja:

- `ALU.gs`, `Code.gs`, `Control.gs`, `Datapath.gs`, `Setup.gs` — **modificados** (tenés que
  reemplazar el contenido completo de cada uno).
- `Program2.gs`, `Assembler.gs`, `Inspector.gs`, `Tests.gs`, `Teoria.gs` — **archivos nuevos**
  (creá un archivo de Apps Script por cada uno, con ese mismo nombre sin la extensión `.gs`).

Después, desde el menú **"CPU Simulador"** de la hoja (recargá la pestaña con F5 primero):

1. Si tu hoja `CPU_SIMULATOR` ya existía: ejecutá **"Actualizar hoja existente (OF, entradas A/B)"**
   (no `buildSheet`, que la borra y la reconstruye desde cero).
2. Ejecutá **"Correr pruebas automatizadas"** y confirmá que diga `38/38 OK`. Si algo falla, lo más
   probable es que algún archivo se cortó al copiar/pegar.
3. Opcional pero recomendado: **"Construir hoja 'Teoria' (una vez)"**.

El detalle paso a paso está en `docs/MANUAL_GOOGLE_SHEETS.md` (pasos 2, 5.5 y 6, actualizados).

## 2. Hacer el `git push` de estos cambios

Dijiste que te encargás vos. Los archivos modificados/nuevos quedaron en:

```
apps_script/ALU.gs            (modificado)
apps_script/Code.gs           (modificado)
apps_script/Control.gs        (modificado)
apps_script/Datapath.gs       (modificado)
apps_script/Setup.gs          (modificado)
apps_script/Program2.gs       (nuevo)
apps_script/Assembler.gs      (nuevo)
apps_script/Inspector.gs      (nuevo)
apps_script/Tests.gs          (nuevo)
apps_script/Teoria.gs         (nuevo)
README.md                     (modificado)
docs/MANUAL_GOOGLE_SHEETS.md  (modificado)
docs/PASOS-PENDIENTES.md      (nuevo, este archivo)
```

Un mensaje de commit sugerido:

```
Agrega bandera OF, JC/JNC, DATA_BASE configurable,
5 programas nuevos, ensamblador, inspector de memoria, pruebas
automatizadas y hoja Teoria.
```

## 3. Crear las tareas nuevas en el tablero de GitHub (Kanban)

También dijiste que lo hacés vos. Si querés una referencia de qué tarjetas tendría sentido agregar
(a partir de lo implementado), estos son los temas, en el mismo estilo que ya usa tu tablero:

- Bandera OF (ALU + panel + datapath + pruebas)
- Opcodes JC/JNC
- Programa: Multiplicación por sumas sucesivas
- Programa: C = A + B
- Programa: Mayor de dos números
- Programa: Cuenta regresiva
- Programa: Fibonacci hasta desbordar (demo de CF/OF)
- Ensamblador de dos pasadas (labels, ORG, DB)
- Inspector de memoria + edición en vivo (onEdit)
- Suite de pruebas automatizadas (Tests.gs)
- Hoja "Teoría" (equivalencias de nombres)
- Documento formal del proyecto (Word)

## 4. Verificación en vivo dentro de Google Sheets

Todo se verificó corriendo el código real en un simulador headless de Node.js (fuera de Sheets),
incluidos los 6 programas completos y el ensamblador reensamblando 2 de ellos byte a byte. Lo que
**no** se pudo probar es la UI real: que los botones nuevos del menú aparezcan bien, que el
`onEdit` no choque con algo que ya tengas, que el layout de las celdas nuevas (`D20:E22`, hoja `ENSAMBLADOR`)
no se superponga con algo que ya hayas dibujado a mano (como los botones o el diagrama de datapath).
Revisalo una vez que pegues el código (paso 1).

## 5. Lo que se decidió NO hacer (y por qué) — no son pasos pendientes, son límites del alcance

Esto ya está explicado en el README (sección 17) y en el documento de Word (sección 11), pero el
resumen:

- **No se rediseñó toda la ISA** con direccionamiento sistemático tipo nibble-alto/nibble-bajo
  (lo que tiene otro enfoque, ~40 opcodes). Hacerlo hubiera invalidado el bytecode de
  los 6 programas ya corregidos/probados, sin poder verificarlo en vivo contra tu hoja real desde
  acá. En su lugar se agregaron `JC`/`JNC` al final de la tabla existente, sin tocar nada de lo que
  ya había.
- **No hay un bus de datos animado** en el diagrama de bloques (el dotro enfoque hace
  que un valor "viaje" visualmente entre registros). Se agregó en cambio una versión textual: líneas
  de log explícitas `Primitiva: Read(dir)=valor` / `Write(dir,valor)`.
- **No se armaron diapositivas de defensa nuevas** ni una versión en PDF del documento de proyecto
  (si querés el PDF, es un paso rápido: abrí el `.docx` en Google Docs o Word y exportalo — no hace
  falta volver a generarlo desde acá).
- Si en algún momento querés ir por el rediseño completo de la ISA o el bus animado, son tareas que
  sí se pueden hacer desde una sesión como esta, pero conviene hacerlas en una rama aparte y con
  acceso a probar contra la hoja real (o aceptando que la primera prueba real sea manual, en tu
  Google Sheet) — avisame si querés que las encare.
