import { InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className, id, ...props }, ref) => {
    const inputId = id ?? props.name;
    const describedBy = [error ? `${inputId}-error` : null, hint ? `${inputId}-hint` : null].filter(Boolean).join(" ") || undefined;
    return (
      <div className="ui-field">
        {label && <label htmlFor={inputId} className="ui-field__label">{label}</label>}
        <input
          ref={ref}
          id={inputId}
          className={cn("ui-input", error && "is-invalid", className)}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          {...props}
        />
        {hint && !error && <p id={`${inputId}-hint`} className="ui-field__hint">{hint}</p>}
        {error && <p id={`${inputId}-error`} className="ui-field__error" role="alert">{error}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";
export default Input;
