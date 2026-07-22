export function Badge({ value }: { value: string }) {
  return <span className={`badge ${value}`}>{value}</span>;
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="empty">{children}</div>;
}

/** Short id for compact display, full value in a tooltip. */
export function ShortId({ id }: { id: string }) {
  return (
    <span className="mono" title={id}>
      {id.slice(0, 8)}
    </span>
  );
}
