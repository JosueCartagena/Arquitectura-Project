/**
 * SIMULADOR DE CPU 8 BITS
 * Archivo: ALU.gs
 *
 * TARJETAS DE GITHUB (Arquitectura-Project):
 *   #3 ALU (operaciones): ADD, SUB, INC, DEC, AND, OR, XOR, NOT y CMP con las banderas ZF, CF y SF.
 *   #7 Bandera OF: desbordamiento con signo en ADD, SUB y CMP; AND/OR/XOR/NOT dejan CF=OF=0.
 *
 * Unidad Aritmetico-Logica. Cada funcion recibe el objeto "flags"
 * ({ZF,CF,SF,OF}) del estado actual y lo muta directamente (los objetos
 * se pasan por referencia en JavaScript), devolviendo el resultado de
 * 8 bits.
 *
 * OF (Overflow Flag) se agrego para igualar la semantica estandar x86
 * (ZF, CF, SF, OF). Es DISTINTA de SF: SF solo mira el bit 7 del
 * resultado (si "parece" negativo en complemento a 2); OF responde una
 * pregunta mas fina -> "¿el resultado, interpretado CON signo, se salio
 * del rango representable en 8 bits (-128 a 127)?", algo que puede pasar
 * aunque el resultado quepa perfecto en los 8 bits del registro.
 *   - ADD: hay overflow si los dos operandos tienen el MISMO signo y el
 *     resultado da un signo DISTINTO (p.ej. 100 + 50 = 150, que en
 *     complemento a 2 de 8 bits se lee como -106: dos positivos no
 *     pueden sumar un negativo real).
 *   - SUB (y CMP, que es una resta sin guardar el resultado): hay
 *     overflow si los operandos tienen signo DISTINTO y el resultado
 *     cambia de signo respecto del primer operando.
 */

// [Tarjeta #7 Bandera OF - bit de signo de 8 bits]
function signBit8_(n) {
  return (n & 0x80) !== 0;
}

// [Tarjeta #3 ALU / #7 OF - suma]
function aluAdd(a, b, flags) {
  var signA = signBit8_(a & 0xFF);
  var signB = signBit8_(b & 0xFF);
  var result = a + b;
  flags.CF = result > 255;
  result = result & 0xFF;
  var signR = signBit8_(result);
  flags.ZF = (result === 0);
  flags.SF = signR;
  flags.OF = (signA === signB) && (signR !== signA);
  return result;
}

// [Tarjeta #3 ALU / #7 OF - resta]
function aluSub(a, b, flags) {
  var signA = signBit8_(a & 0xFF);
  var signB = signBit8_(b & 0xFF);
  var result = a - b;
  flags.CF = result < 0;              // prestamo (borrow)
  result = result & 0xFF;
  var signR = signBit8_(result);
  flags.ZF = (result === 0);
  flags.SF = signR;
  flags.OF = (signA !== signB) && (signR !== signA);
  return result;
}

// [Tarjeta #3 ALU - incremento]
function aluInc(a, flags) {
  return aluAdd(a, 1, flags);
}

// [Tarjeta #3 ALU - decremento]
function aluDec(a, flags) {
  return aluSub(a, 1, flags);
}

// Las operaciones logicas (AND/OR/XOR/NOT) no producen acarreo ni
// desbordamiento con signo en ninguna ALU real: por convencion CF=0 y
// OF=0 siempre, solo ZF/SF reflejan el resultado.
// [Tarjeta #3 ALU - AND logico]
function aluAnd(a, b, flags) {
  var result = a & b;
  flags.CF = false;
  flags.OF = false;
  flags.ZF = (result === 0);
  flags.SF = (result & 0x80) !== 0;
  return result;
}

// [Tarjeta #3 ALU - OR logico]
function aluOr(a, b, flags) {
  var result = a | b;
  flags.CF = false;
  flags.OF = false;
  flags.ZF = (result === 0);
  flags.SF = (result & 0x80) !== 0;
  return result;
}

// [Tarjeta #3 ALU - XOR logico]
function aluXor(a, b, flags) {
  var result = a ^ b;
  flags.CF = false;
  flags.OF = false;
  flags.ZF = (result === 0);
  flags.SF = (result & 0x80) !== 0;
  return result;
}

// [Tarjeta #3 ALU - NOT logico]
function aluNot(a, flags) {
  var result = (~a) & 0xFF;
  flags.CF = false;
  flags.OF = false;
  flags.ZF = (result === 0);
  flags.SF = (result & 0x80) !== 0;
  return result;
}

// CMP no guarda resultado, solo actualiza banderas (como una resta,
// incluida OF: compara igual que SUB, solo que el resultado se descarta).
// [Tarjeta #3 ALU / #7 OF - comparacion (resta sin guardar)]
function aluCmp(a, b, flags) {
  var signA = signBit8_(a & 0xFF);
  var signB = signBit8_(b & 0xFF);
  var result = a - b;
  flags.CF = result < 0;
  result = result & 0xFF;
  var signR = signBit8_(result);
  flags.ZF = (result === 0);
  flags.SF = signR;
  flags.OF = (signA !== signB) && (signR !== signA);
}
