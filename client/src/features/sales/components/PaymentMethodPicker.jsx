import { PAYMENT_METHODS } from "../types";

export function PaymentMethodPicker({ value, onChange }) {
  return <div className="cards payment-options">
    {PAYMENT_METHODS.map((method) => <button type="button" key={method.nombre}
      className={`tile payment-tile${value === method.nombre ? " on" : ""}`}
      onClick={() => onChange(method.nombre)} aria-pressed={value === method.nombre}>
      <img src={method.imagen} alt="" /><b>{method.nombre}</b>
    </button>)}
  </div>;
}
