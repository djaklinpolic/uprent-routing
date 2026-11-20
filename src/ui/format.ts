const oneDecimal = new Intl.NumberFormat("hr-HR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const whole = new Intl.NumberFormat("hr-HR");

export const fmtKm = (value: number) => oneDecimal.format(value);
export const fmtMin = (value: number) => oneDecimal.format(value);
export const fmtKg = (value: number) => whole.format(value);
