import { InputHTMLAttributes, SelectHTMLAttributes, ReactNode } from "react";

type SharedProps = {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  requiredMark?: boolean;
}

type VitrineFieldProps = SharedProps &
  InputHTMLAttributes<HTMLInputElement> & {
    as?: "input";
  }

type VitrineSelectProps = SharedProps &
  SelectHTMLAttributes<HTMLSelectElement> & {
    as: "select";
    children: ReactNode;
  }

export function VitrineField(props: VitrineFieldProps | VitrineSelectProps) {
  const describedBy = [
    props.hint ? `${props.id}-hint` : null,
    props.error ? `${props.id}-error` : null,
  ]
    .filter(Boolean)
    .join(" ") || undefined;

  const label = (
    <label className="vitrine-label" htmlFor={props.id}>
      {props.label}
      {props.requiredMark ? (
        <span className="vitrine-required" aria-hidden="true">
          {" "}
          *
        </span>
      ) : null}
    </label>
  );

  if (props.as === "select") {
    const { id, label: _label, hint, error, requiredMark, children, as: _as, ...selectProps } = props;
    return (
      <div className="vitrine-field">
        {label}
        <select
          id={id}
          className="vitrine-select"
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          aria-required={selectProps.required}
          {...selectProps}
        >
          {children}
        </select>
        {hint ? (
          <p className="vitrine-hint" id={`${id}-hint`}>
            {hint}
          </p>
        ) : null}
        {error ? (
          <p className="vitrine-error-text" id={`${id}-error`} role="alert">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  const { id, label: _label, hint, error, requiredMark, as: _as, ...inputProps } = props;
  return (
    <div className="vitrine-field">
      {label}
      <input
        id={id}
        className="vitrine-control"
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        aria-required={inputProps.required}
        {...inputProps}
      />
      {hint ? (
        <p className="vitrine-hint" id={`${id}-hint`}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className="vitrine-error-text" id={`${id}-error`} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
