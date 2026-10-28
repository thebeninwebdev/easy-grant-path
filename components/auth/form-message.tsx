export function FormMessage({ id, message }: { id?: string; message?: string }) { return message ? <p id={id} className="text-sm text-destructive" role="alert">{message}</p> : null; }
