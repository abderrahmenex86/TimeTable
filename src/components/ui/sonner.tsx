import { Toaster as Sonner, type ToasterProps } from "sonner"
import {
  FiCheckCircle,
  FiInfo,
  FiAlertTriangle,
  FiXCircle,
  FiLoader,
} from "react-icons/fi"

/**
 * Toasts are part of the paper: same ink border, same sketched radius as a
 * dialog. The theme follows the app, so no separate light/dark handling.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      icons={{
        success: <FiCheckCircle className="size-4" />,
        info: <FiInfo className="size-4" />,
        warning: <FiAlertTriangle className="size-4" />,
        error: <FiXCircle className="size-4" />,
        loading: <FiLoader className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--surface-raised)",
          "--normal-text": "var(--fg)",
          "--normal-border": "var(--fg)",
          "--border-radius": "10px 3px 11px 4px / 4px 11px 3px 10px",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
