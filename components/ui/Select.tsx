import { SelectHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { label: string; value: string }[];
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, className, id, ...props }, ref) => {
    const selectId = id ?? props.name;
    return (
      <div className="ui-field">
        {label && <label htmlFor={selectId} className="ui-field__label">{label}</label>}
        <select ref={ref} id={selectId} className={cn("ui-input ui-select", className)} {...props}>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
    );
  }
);
Select.displayName = "Select";
export default Select;
