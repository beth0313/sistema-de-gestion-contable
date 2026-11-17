/** @typedef {{ fecha: string, producto_id: number, sabor_id: number|null, sabor_otro: string, cantidad: number, medio_pago: string, jeringas: number, licor_id: number|null, extras: Array<{insumo_id: number, cantidad: number}>, cobro_extra: number }} SaleInput */

export const PAYMENT_METHODS = [
  { nombre: "Efectivo", imagen: "/payments/efectivo.svg" },
  { nombre: "Transferencia", imagen: "/payments/transferencia.svg" },
  { nombre: "Tarjeta", imagen: "/payments/tarjeta.svg" },
];
