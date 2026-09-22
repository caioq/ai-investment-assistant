import { useState } from "react";
import { TextField, type TextFieldProps } from "./TextField";

export type PasswordFieldProps = Omit<TextFieldProps, "type" | "trailing">;

/**
 * A `TextField` with a trailing Show/Hide toggle. Hidden by default. The
 * toggle's accessible name ("Show password"/"Hide password") never contains
 * the field's label on its own, so `getByLabelText('Password', { exact: true })`
 * resolves only to the input.
 */
export function PasswordField({ style, ...rest }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <TextField
      {...rest}
      type={visible ? "text" : "password"}
      style={{ paddingRight: 62, ...style }}
      trailing={
        <button
          type="button"
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          onClick={() => setVisible((v) => !v)}
          style={{
            position: "absolute",
            top: "50%",
            right: 8,
            transform: "translateY(-50%)",
            background: "transparent",
            border: "none",
            padding: "4px 6px",
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 700,
            color: "var(--text-secondary)",
            cursor: "pointer",
          }}
        >
          {visible ? "Hide" : "Show"}
        </button>
      }
    />
  );
}
